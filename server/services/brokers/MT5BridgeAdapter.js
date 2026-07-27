/**
 * server/services/brokers/MT5BridgeAdapter.js
 *
 * Production-ready adapter that translates WealthBuilder broker requests
 * into HTTP requests for the Enterprise Bridge (MetaTrader5).
 *
 * Rules followed:
 * - Reads configuration from environment variables.
 * - Uses a single reusable axios HTTP client with configurable timeout.
 * - Adds Authorization and Content-Type headers to every request.
 * - Implements initialize, health, getAccount, getPositions, getSymbols,
 *   getMarket, getHistory, shutdown.
 * - Implements retry policy (3 attempts, exponential backoff: 250, 500, 1000ms)
 *   for specific transient errors.
 * - Converts bridge errors into WealthBuilder standard errors (normalized).
 * - Does not implement trading methods (returns NotImplementedError / 501).
 * - Uses certified logger (logger.js v3) for required logs.
 *
 * Notes:
 * - This adapter is intentionally thin: no business logic, only translation.
 * - Do not change public interfaces or other services.
 */

'use strict';

const axios = require('axios');

/**
 * Attempt to load the certified logger v3.
 * The adapter expects a project-level logger module named 'logger' reachable
 * from this file's location. If the module cannot be resolved, the adapter
 * will throw during initialization to avoid silent logging failures.
 */
let logger;
try {
  // Common locations relative to server/services/brokers
  // Prefer project-provided logger; path may vary by project layout.
  // The project rule requires using certified logger.js v3.
  logger = require('../../logger'); // server/logger.js or server/logger/index.js
} catch (e1) {
  try {
    logger = require('../../../logger'); // fallback
  } catch (e2) {
    // If logger cannot be found, throw a clear error (no stack trace exposure).
    const err = new Error('Logger module (logger.js v3) not found. MT5BridgeAdapter requires the certified logger.');
    err.code = 'LOGGER_NOT_FOUND';
    throw err;
  }
}

/**
 * Environment configuration (required)
 * - BRIDGE_URL
 * - BRIDGE_AUTH_TOKEN
 * - BRIDGE_TIMEOUT (ms)
 * - BROKER_PROVIDER
 */
const {
  BRIDGE_URL,
  BRIDGE_AUTH_TOKEN,
  BRIDGE_TIMEOUT,
  BROKER_PROVIDER
} = process.env;

if (!BRIDGE_URL || !BRIDGE_AUTH_TOKEN || !BRIDGE_TIMEOUT || !BROKER_PROVIDER) {
  const missing = [];
  if (!BRIDGE_URL) missing.push('BRIDGE_URL');
  if (!BRIDGE_AUTH_TOKEN) missing.push('BRIDGE_AUTH_TOKEN');
  if (!BRIDGE_TIMEOUT) missing.push('BRIDGE_TIMEOUT');
  if (!BROKER_PROVIDER) missing.push('BROKER_PROVIDER');
  const err = new Error(`MT5BridgeAdapter missing required environment variables: ${missing.join(', ')}`);
  err.code = 'CONFIG_MISSING';
  throw err;
}

/**
 * Adapter internal state
 */
let httpClient = null;
let initialized = false;
let connected = false;
let lastHealth = null;
let cancelSource = null;

/**
 * Retry policy configuration
 */
const RETRY_ATTEMPTS = 3;
const BACKOFF_MS = [250, 500, 1000]; // exponential backoff
const RETRY_STATUS_CODES = new Set([429, 502, 503, 504]);

/**
 * WealthBuilder standardized error factory
 * Returns an object with { name, code, status, message }
 */
function makeError({ name = 'BridgeError', code = 'BRIDGE_ERROR', status = 500, message = 'Bridge error' }) {
  const err = new Error(message);
  err.name = name;
  err.code = code;
  err.status = status;
  return err;
}

/**
 * Map HTTP / network errors to WealthBuilder standard errors.
 * Never expose raw axios error objects or stack traces.
 *
 * @param {Error} err - original error
 * @returns {Error} normalized error
 */
function normalizeError(err) {
  // Axios network error (no response)
  if (err.code === 'ECONNABORTED' || err.message && err.message.includes('timeout')) {
    return makeError({
      name: 'BridgeTimeoutError',
      code: 'BRIDGE_TIMEOUT',
      status: 504,
      message: 'Connection Timeout'
    });
  }

  // If axios provided a response
  if (err.response && err.response.status) {
    const status = err.response.status;
    switch (status) {
      case 401:
        return makeError({
          name: 'AuthenticationFailure',
          code: 'BRIDGE_AUTH_FAILURE',
          status: 401,
          message: 'Authentication Failure'
        });
      case 403:
        return makeError({
          name: 'Forbidden',
          code: 'BRIDGE_FORBIDDEN',
          status: 403,
          message: 'Forbidden'
        });
      case 404:
        return makeError({
          name: 'NotFound',
          code: 'BRIDGE_NOT_FOUND',
          status: 404,
          message: 'Not Found'
        });
      case 503:
        return makeError({
          name: 'BridgeUnavailable',
          code: 'BRIDGE_UNAVAILABLE',
          status: 503,
          message: 'Bridge Unavailable'
        });
      case 500:
        return makeError({
          name: 'BridgeInternalError',
          code: 'BRIDGE_INTERNAL_ERROR',
          status: 500,
          message: 'Bridge Internal Error'
        });
      default:
        return makeError({
          name: 'BridgeProtocolError',
          code: 'BRIDGE_PROTOCOL_ERROR',
          status,
          message: `Bridge Protocol Error (${status})`
        });
    }
  }

  // Network / unknown
  return makeError({
    name: 'BridgeConnectionError',
    code: 'BRIDGE_CONNECTION_ERROR',
    status: 503,
    message: 'Bridge Offline or Network Error'
  });
}

/**
 * Build headers for each request. Do NOT log the token.
 * @returns {Object}
 */
function buildHeaders() {
  return {
    'Authorization': `Bearer ${BRIDGE_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Broker-Provider': BROKER_PROVIDER
  };
}

/**
 * Create or return the singleton axios client.
 * Uses configured timeout and a cancel token source for graceful shutdown.
 */
function getHttpClient() {
  if (httpClient) return httpClient;

  const timeout = Number(BRIDGE_TIMEOUT) || 5000;

  cancelSource = axios.CancelToken.source();

  httpClient = axios.create({
    baseURL: BRIDGE_URL.replace(/\/+$/, ''), // strip trailing slash
    timeout,
    headers: buildHeaders(),
    validateStatus: () => true // we'll handle status codes manually
  });

  // Request interceptor for logging (without sensitive data)
  httpClient.interceptors.request.use((config) => {
    try {
      const safe = {
        method: config.method,
        url: config.url,
        params: config.params,
        timeout: config.timeout
      };
      logger.info('HTTP request', safe);
    } catch (e) {
      // swallow logging errors to avoid breaking requests
    }
    return config;
  });

  // Response interceptor for logging
  httpClient.interceptors.response.use((response) => {
    try {
      const safe = {
        method: response.config.method,
        url: response.config.url,
        status: response.status,
        duration: response.headers && response.headers['x-response-time'] ? response.headers['x-response-time'] : undefined
      };
      logger.info('HTTP response', safe);
    } catch (e) {
      // swallow
    }
    return response;
  }, (error) => {
    // Do not expose raw error; log a safe message
    try {
      const cfg = error.config || {};
      logger.warn('HTTP request failed', { method: cfg.method, url: cfg.url, message: error.message });
    } catch (e) {
      // swallow
    }
    return Promise.reject(error);
  });

  return httpClient;
}

/**
 * Perform an HTTP GET with retry logic according to the retry policy.
 *
 * @param {string} path - endpoint path (leading slash optional)
 * @param {Object} [params] - query parameters
 * @returns {Promise<Object>} - resolved bridge response data (normalized)
 */
async function httpGet(path, params = {}) {
  const client = getHttpClient();
  const url = path.startsWith('/') ? path : `/${path}`;

  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    const attemptNum = attempt + 1;
    try {
      const start = Date.now();
      const response = await client.get(url, {
        params,
        cancelToken: cancelSource.token
      });
      const latency = Date.now() - start;

      // Successful HTTP status (2xx)
      if (response.status >= 200 && response.status < 300) {
        return {
          status: response.status,
          data: response.data,
          latency
        };
      }

      // Do not retry on client errors or auth errors
      if (!RETRY_STATUS_CODES.has(response.status)) {
        // Map to normalized error
        const err = normalizeError({ response });
        throw err;
      }

      // Retryable status
      logger.warn('Retry', { url, status: response.status, attempt: attemptNum });
      if (attempt < RETRY_ATTEMPTS - 1) {
        await delay(BACKOFF_MS[attempt]);
        continue;
      }

      // Exhausted retries
      const err = normalizeError({ response });
      throw err;
    } catch (err) {
      // Axios cancel or normalized error
      // If it's an axios error with response/status, normalize accordingly
      // If it's a network error or timeout, decide whether to retry
      const isAxios = !!(err.isAxiosError || err.code || err.response);
      // If axios cancel (shutdown), rethrow as BridgeOffline
      if (axios.isCancel && axios.isCancel(err)) {
        throw makeError({
          name: 'BridgeOffline',
          code: 'BRIDGE_OFFLINE',
          status: 503,
          message: 'Bridge Offline'
        });
      }

      // If it's already a normalized error (we created it), rethrow
      if (err && err.code && typeof err.status === 'number') {
        // Determine if retryable
        const status = err.status;
        const shouldRetry = (status && RETRY_STATUS_CODES.has(status)) || (err.name === 'BridgeTimeoutError') || (err.code === 'BRIDGE_CONNECTION_ERROR');
        if (shouldRetry && attempt < RETRY_ATTEMPTS - 1) {
          logger.warn('Retry', { url, attempt: attemptNum, reason: err.code || err.message });
          await delay(BACKOFF_MS[attempt]);
          continue;
        }
        throw err;
      }

      // Unknown error (likely axios network error)
      const normalized = normalizeError(err);
      const shouldRetry = (normalized && (RETRY_STATUS_CODES.has(normalized.status) || normalized.code === 'BRIDGE_TIMEOUT' || normalized.code === 'BRIDGE_CONNECTION_ERROR'));
      if (shouldRetry && attempt < RETRY_ATTEMPTS - 1) {
        logger.warn('Retry', { url, attempt: attemptNum, reason: normalized.code || normalized.message });
        await delay(BACKOFF_MS[attempt]);
        continue;
      }
      throw normalized;
    }
  }

  // If somehow falls through
  throw makeError({
    name: 'BridgeProtocolError',
    code: 'BRIDGE_PROTOCOL_ERROR',
    status: 502,
    message: 'Unknown Response'
  });
}

/**
 * Simple delay helper
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize bridge /account response into WealthBuilder broker format.
 * This function should be conservative and preserve backward compatibility.
 *
 * @param {Object} raw
 * @returns {Object}
 */
function normalizeAccount(raw) {
  // Expected raw may contain fields like: id, balance, equity, margin, currency, leverage
  // Map to WealthBuilder expected shape while preserving unknown fields under 'raw'
  const account = {
    id: raw && (raw.id || raw.accountId || raw.account_id) || null,
    balance: raw && (raw.balance != null ? Number(raw.balance) : null),
    equity: raw && (raw.equity != null ? Number(raw.equity) : null),
    margin: raw && (raw.margin != null ? Number(raw.margin) : null),
    currency: raw && (raw.currency || raw.ccy || null),
    leverage: raw && (raw.leverage != null ? Number(raw.leverage) : null),
    raw: raw
  };
  return account;
}

/**
 * Normalize positions list
 * @param {Array} rawList
 * @returns {Array}
 */
function normalizePositions(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((p) => ({
    ticket: p.ticket || p.id || p.positionId || null,
    symbol: p.symbol || p.instrument || null,
    volume: p.volume != null ? Number(p.volume) : null,
    openPrice: p.openPrice != null ? Number(p.openPrice) : null,
    currentPrice: p.currentPrice != null ? Number(p.currentPrice) : null,
    profit: p.profit != null ? Number(p.profit) : null,
    direction: p.direction || p.side || null,
    openTime: p.openTime || p.open_at || null,
    raw: p
  }));
}

/**
 * Normalize symbols list
 * @param {Array} rawList
 * @returns {Array}
 */
function normalizeSymbols(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((s) => ({
    symbol: s.symbol || s.name || null,
    description: s.description || s.desc || null,
    tickSize: s.tickSize != null ? Number(s.tickSize) : null,
    lotSize: s.lotSize != null ? Number(s.lotSize) : null,
    currency: s.currency || null,
    raw: s
  }));
}

/**
 * Normalize market data for a symbol
 * @param {Object} raw
 * @returns {Object}
 */
function normalizeMarket(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return {
    symbol: raw.symbol || raw.name || null,
    bid: raw.bid != null ? Number(raw.bid) : null,
    ask: raw.ask != null ? Number(raw.ask) : null,
    spread: raw.spread != null ? Number(raw.spread) : null,
    timestamp: raw.timestamp || raw.time || null,
    raw: raw
  };
}

/**
 * Normalize history response
 * @param {Object} raw
 * @returns {Object}
 */
function normalizeHistory(raw) {
  // Expect raw to be an array of candles or trades depending on bridge implementation.
  return {
    items: Array.isArray(raw) ? raw : (raw && raw.items) || [],
    raw: raw
  };
}

/**
 * Public Adapter API
 */
const MT5BridgeAdapter = {

  /**
   * initialize
   * - Creates HTTP client
   * - Performs a health check against /health
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    if (initialized) {
      logger.info('Adapter already initialized');
      return;
    }

    logger.info('Adapter initialized', { provider: BROKER_PROVIDER });

    // Create client
    getHttpClient();

    // Perform initial health check
    try {
      const start = Date.now();
      const res = await httpGet('/health');
      const latency = res.latency != null ? res.latency : (Date.now() - start);
      lastHealth = {
        connected: true,
        version: (res.data && (res.data.version || res.data.bridgeVersion || res.data.versionString)) || null,
        backend: (res.data && res.data.backend) || null,
        latency,
        timestamp: new Date().toISOString()
      };
      connected = true;
      initialized = true;
      logger.info('Bridge connected', { provider: BROKER_PROVIDER, version: lastHealth.version });
    } catch (err) {
      // Mark as not connected but still mark initialized so higher-level services can handle it
      connected = false;
      initialized = true;
      lastHealth = {
        connected: false,
        version: null,
        backend: null,
        latency: null,
        timestamp: new Date().toISOString()
      };
      logger.warn('Bridge unavailable', { provider: BROKER_PROVIDER, reason: err.code || err.message });
      // Do not throw here; allow system to continue and health() will report status
    }
  },

  /**
   * health
   * - GET /health
   * - Returns normalized health object:
   *   { bridgeConnected, bridgeVersion, connectionState, backend, latency, timestamp }
   *
   * @returns {Promise<Object>}
   */
  async health() {
    if (!initialized) {
      // If not initialized, attempt to initialize
      await this.initialize();
    }

    try {
      const start = Date.now();
      const res = await httpGet('/health');
      const latency = res.latency != null ? res.latency : (Date.now() - start);
      const version = (res.data && (res.data.version || res.data.bridgeVersion || res.data.versionString)) || null;
      const backend = (res.data && res.data.backend) || null;
      lastHealth = {
        connected: true,
        version,
        backend,
        latency,
        timestamp: new Date().toISOString()
      };
      connected = true;

      const out = {
        bridgeConnected: true,
        bridgeVersion: version,
        connectionState: 'connected',
        backend,
        latency,
        timestamp: lastHealth.timestamp
      };

      logger.info('Health check', { provider: BROKER_PROVIDER, bridgeVersion: version, latency });
      return out;
    } catch (err) {
      // Normalize and return offline state
      connected = false;
      lastHealth = {
        connected: false,
        version: null,
        backend: null,
        latency: null,
        timestamp: new Date().toISOString()
      };
      logger.warn('Bridge unavailable', { provider: BROKER_PROVIDER, reason: err.code || err.message });
      return {
        bridgeConnected: false,
        bridgeVersion: null,
        connectionState: 'unavailable',
        backend: null,
        latency: null,
        timestamp: lastHealth.timestamp
      };
    }
  },

  /**
   * getAccount
   * - GET /account
   *
   * @returns {Promise<Object>} normalized account
   */
  async getAccount() {
    try {
      const res = await httpGet('/account');
      const data = res.data || {};
      const account = normalizeAccount(data);
      return account;
    } catch (err) {
      logger.warn('getAccount failure', { provider: BROKER_PROVIDER, reason: err.code || err.message });
      throw err;
    }
  },

  /**
   * getPositions
   * - GET /positions
   *
   * @returns {Promise<Array>} normalized positions
   */
  async getPositions() {
    try {
      const res = await httpGet('/positions');
      const data = res.data || [];
      const positions = normalizePositions(data);
      return positions;
    } catch (err) {
      logger.warn('getPositions failure', { provider: BROKER_PROVIDER, reason: err.code || err.message });
      throw err;
    }
  },

  /**
   * getSymbols
   * - GET /symbols
   *
   * @returns {Promise<Array>} normalized symbols
   */
  async getSymbols() {
    try {
      const res = await httpGet('/symbols');
      const data = res.data || [];
      const symbols = normalizeSymbols(data);
      return symbols;
    } catch (err) {
      logger.warn('getSymbols failure', { provider: BROKER_PROVIDER, reason: err.code || err.message });
      throw err;
    }
  },

  /**
   * getMarket
   * - GET /market/{symbol}
   *
   * @param {string} symbol
   * @returns {Promise<Object>} normalized market data
   */
  async getMarket(symbol) {
    if (!symbol) {
      throw makeError({
        name: 'InvalidArgument',
        code: 'INVALID_ARGUMENT',
        status: 400,
        message: 'Symbol is required'
      });
    }
    const path = `/market/${encodeURIComponent(symbol)}`;
    try {
      const res = await httpGet(path);
      const data = res.data || {};
      const market = normalizeMarket(data);
      return market;
    } catch (err) {
      logger.warn('getMarket failure', { provider: BROKER_PROVIDER, symbol, reason: err.code || err.message });
      throw err;
    }
  },

  /**
   * getHistory
   * - GET /history with query parameters:
   *   from, to, symbol, ticket, limit
   *
   * @param {Object} options
   * @param {string|number} [options.from]
   * @param {string|number} [options.to]
   * @param {string} [options.symbol]
   * @param {string|number} [options.ticket]
   * @param {number} [options.limit]
   * @returns {Promise<Object>} normalized history
   */
  async getHistory(options = {}) {
    const params = {};
    if (options.from != null) params.from = options.from;
    if (options.to != null) params.to = options.to;
    if (options.symbol != null) params.symbol = options.symbol;
    if (options.ticket != null) params.ticket = options.ticket;
    if (options.limit != null) params.limit = options.limit;

    try {
      const res = await httpGet('/history', params);
      const data = res.data || [];
      const history = normalizeHistory(data);
      return history;
    } catch (err) {
      logger.warn('getHistory failure', { provider: BROKER_PROVIDER, params, reason: err.code || err.message });
      throw err;
    }
  },

  /**
   * Trading methods are intentionally not implemented here.
   * They should return HTTP 501 equivalent or throw NotImplementedError
   * with structured WealthBuilder errors.
   */

  async placeTrade() {
    const err = makeError({
      name: 'NotImplementedError',
      code: 'NOT_IMPLEMENTED',
      status: 501,
      message: 'Trading is not implemented in MT5BridgeAdapter'
    });
    throw err;
  },

  async modifyTrade() {
    const err = makeError({
      name: 'NotImplementedError',
      code: 'NOT_IMPLEMENTED',
      status: 501,
      message: 'Trading is not implemented in MT5BridgeAdapter'
    });
    throw err;
  },

  async closeTrade() {
    const err = makeError({
      name: 'NotImplementedError',
      code: 'NOT_IMPLEMENTED',
      status: 501,
      message: 'Trading is not implemented in MT5BridgeAdapter'
    });
    throw err;
  },

  /**
   * shutdown
   * - Gracefully release resources (cancel pending requests)
   *
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      if (cancelSource) {
        // Cancel any in-flight requests
        cancelSource.cancel('Adapter shutdown');
      }
      httpClient = null;
      cancelSource = null;
      initialized = false;
      connected = false;
      logger.info('Shutdown', { provider: BROKER_PROVIDER });
    } catch (e) {
      // Do not expose stack traces; log a safe message
      logger.warn('Shutdown failure', { provider: BROKER_PROVIDER, reason: e && e.message });
    }
  }
};

module.exports = MT5BridgeAdapter;

