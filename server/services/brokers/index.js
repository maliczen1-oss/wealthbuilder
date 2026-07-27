/**
 * server/services/brokers/index.js
 *
 * Provider selection and single-adapter facade for WealthBuilder broker layer.
 *
 * Responsibilities
 * - Select adapter based on BROKER_PROVIDER environment variable.
 * - Support providers: "bridge" -> MT5BridgeAdapter, "metaapi" -> MetaApiAdapter.
 * - Initialize the selected adapter exactly once.
 * - Prevent duplicate initialization and duplicate adapter instances.
 * - Expose the BrokerAdapter interface to higher-level services unchanged.
 * - Provide descriptive configuration errors for unknown providers.
 *
 * Notes
 * - Does not modify MetaApiAdapter; existing require("./metaapi") continues to work.
 * - Does not change public interfaces of higher-level services.
 * - Uses certified logger.js v3 for logging.
 */

'use strict';

const path = require('path');

let logger;
try {
  logger = require('../../logger');
} catch (e) {
  try {
    logger = require('../../../logger');
  } catch (err) {
    const errOut = new Error('Logger module (logger.js v3) not found. Broker index requires the certified logger.');
    errOut.code = 'LOGGER_NOT_FOUND';
    throw errOut;
  }
}

/**
 * Read provider configuration
 */
const { BROKER_PROVIDER } = process.env;

if (!BROKER_PROVIDER) {
  const err = new Error('BROKER_PROVIDER is not set. Set BROKER_PROVIDER to "bridge" or "metaapi".');
  err.code = 'CONFIG_MISSING_BROKER_PROVIDER';
  throw err;
}

/**
 * Provider mapping
 * - bridge  -> MT5BridgeAdapter (server/services/brokers/MT5BridgeAdapter.js)
 * - metaapi -> MetaApiAdapter (server/services/brokers/metaapi.js)
 */
const PROVIDERS = {
  bridge: './MT5BridgeAdapter',
  metaapi: './metaapi'
};

/**
 * Validate provider
 */
if (!Object.prototype.hasOwnProperty.call(PROVIDERS, BROKER_PROVIDER)) {
  const allowed = Object.keys(PROVIDERS).join(', ');
  const err = new Error(`Unsupported BROKER_PROVIDER "${BROKER_PROVIDER}". Supported providers: ${allowed}.`);
  err.code = 'CONFIG_INVALID_BROKER_PROVIDER';
  throw err;
}

/**
 * Lazy-loaded adapter instance and initialization guard
 */
let adapterModule = null;
let adapterInstance = null;
let initialized = false;
let initializingPromise = null;

/**
 * Load adapter module (no initialization)
 * This preserves backward compatibility for direct requires like require('./metaapi')
 */
function loadAdapterModule() {
  if (adapterModule) return adapterModule;

  const relPath = PROVIDERS[BROKER_PROVIDER];
  try {
    // Use require relative to this file
    adapterModule = require(relPath);
    return adapterModule;
  } catch (e) {
    const err = new Error(`Failed to load adapter module for provider "${BROKER_PROVIDER}": ${e && e.message}`);
    err.code = 'ADAPTER_LOAD_FAILURE';
    throw err;
  }
}

/**
 * Ensure single initialization. Returns a promise that resolves when initialization completes.
 * If initialization already succeeded, resolves immediately.
 * If initialization is in progress, returns the same promise.
 */
async function ensureInitialized() {
  if (initialized) {
    return;
  }
  if (initializingPromise) {
    return initializingPromise;
  }

  const mod = loadAdapterModule();

  if (!mod || typeof mod.initialize !== 'function') {
    const err = new Error(`Adapter for provider "${BROKER_PROVIDER}" does not implement initialize().`);
    err.code = 'ADAPTER_INTERFACE_ERROR';
    throw err;
  }

  initializingPromise = (async () => {
    try {
      logger.info('Initializing broker adapter', { provider: BROKER_PROVIDER });
      // Call adapter.initialize() and await completion
      await mod.initialize();
      adapterInstance = mod;
      initialized = true;
      logger.info('Broker adapter initialized', { provider: BROKER_PROVIDER });
    } catch (e) {
      // Normalize error for higher-level handling; do not expose internal stack traces
      const err = new Error(`Failed to initialize broker adapter "${BROKER_PROVIDER}": ${e && e.message}`);
      err.code = 'ADAPTER_INITIALIZATION_FAILED';
      // Reset state so subsequent attempts can retry initialization if desired
      initializingPromise = null;
      initialized = false;
      adapterInstance = null;
      logger.warn('Adapter initialization failed', { provider: BROKER_PROVIDER, reason: e && e.message });
      throw err;
    } finally {
      // keep initializingPromise set to the resolved/rejected promise until callers observe it
    }
  })();

  return initializingPromise;
}

/**
 * Delegate helper: ensures adapter is initialized then calls the method.
 * Preserves method signature (passes through arguments).
 *
 * @param {string} methodName
 * @returns {Function}
 */
function delegate(methodName) {
  return async function delegated(...args) {
    await ensureInitialized();
    const adapter = adapterInstance;
    if (!adapter || typeof adapter[methodName] !== 'function') {
      const err = new Error(`Adapter for provider "${BROKER_PROVIDER}" does not implement ${methodName}().`);
      err.code = 'ADAPTER_INTERFACE_ERROR';
      throw err;
    }
    return adapter[methodName](...args);
  };
}

/**
 * Expose the BrokerAdapter facade.
 * Methods are lazily delegated to the selected adapter after initialization.
 *
 * The facade implements the common BrokerAdapter interface expected by higher-level services.
 */
const BrokerFacade = {
  /**
   * initialize
   * - Explicit initialization entrypoint. Safe to call multiple times; adapter will initialize exactly once.
   */
  async initialize() {
    return ensureInitialized();
  },

  /**
   * health
   */
  health: delegate('health'),

  /**
   * getAccount
   */
  getAccount: delegate('getAccount'),

  /**
   * getPositions
   */
  getPositions: delegate('getPositions'),

  /**
   * getSymbols
   */
  getSymbols: delegate('getSymbols'),

  /**
   * getMarket
   */
  getMarket: delegate('getMarket'),

  /**
   * getHistory
   */
  getHistory: delegate('getHistory'),

  /**
   * Trading methods (may be implemented by adapters or intentionally not implemented)
   * Delegated so that higher-level services calling these methods receive adapter-specific behavior/errors.
   */
  placeTrade: delegate('placeTrade'),
  modifyTrade: delegate('modifyTrade'),
  closeTrade: delegate('closeTrade'),

  /**
   * shutdown
   * - Delegates to adapter.shutdown() if available.
   * - Resets internal state to allow clean re-initialization if process continues.
   */
  async shutdown() {
    if (!adapterInstance) {
      // Nothing to do
      initialized = false;
      initializingPromise = null;
      adapterModule = null;
      logger.info('Broker facade shutdown (no adapter instance)', { provider: BROKER_PROVIDER });
      return;
    }
    try {
      if (typeof adapterInstance.shutdown === 'function') {
        await adapterInstance.shutdown();
      }
      logger.info('Broker adapter shutdown completed', { provider: BROKER_PROVIDER });
    } catch (e) {
      logger.warn('Broker adapter shutdown error', { provider: BROKER_PROVIDER, reason: e && e.message });
      // swallow to avoid throwing during shutdown sequence
    } finally {
      // Reset internal state
      initialized = false;
      initializingPromise = null;
      adapterModule = null;
      adapterInstance = null;
    }
  }
};

/**
 * Log provider selection at load time (do not log secrets)
 */
logger.info('Broker provider selected', { provider: BROKER_PROVIDER });

module.exports = BrokerFacade;
