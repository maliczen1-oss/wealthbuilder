"use strict";

/*
==========================================================
WealthBuilder OS
Historical Learning Service
Powered by Jarvis Intelligence

Version : 1.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Controlled historical-data synchronization layer between
Enterprise Bridge and the WealthBuilder Jarvis Learning
Engine.

Architecture
------------
Enterprise Bridge
    DATA AUTHORITY
        │
        │ GET /api/history
        ▼
historicalLearningService
        │
        ▼
learningEngine.ingestHistory()
        │
        ├── learningDataset.json
        └── jarvisKnowledge.json

Responsibilities
----------------
✓ Retrieve historical broker observations
✓ Preserve Enterprise Bridge as data authority
✓ Feed deals and orders to learningEngine
✓ Support deterministic/idempotent re-sync
✓ Handle Bridge response envelopes
✓ Handle empty history safely
✓ Handle upstream failures safely
✓ Enforce bounded request timeout
✓ Preserve broker-native symbols
✓ Never execute trades
✓ Never modify risk parameters
✓ Never modify strategy parameters
✓ Provide deterministic synchronization metadata
✓ Provide read-only synchronization status
✓ Railway compatible
✓ Node.js 22 compatible
✓ No additional npm dependency required

Safety Boundary
---------------
This service DOES NOT:
✓ execute trades
✓ modify trades
✓ modify risk
✓ modify strategy parameters
✓ approve trades
✓ reject trades
✓ mutate trading configuration

It only retrieves historical observations and passes
them to the existing learning engine.

==========================================================
*/

const crypto = require("crypto");

const learningEngine =
    require("./learningEngine");

const logger =
    require("./logger");


/*
==========================================================
Configuration
==========================================================
*/

const VERSION =
    "1.0.0";

const DEFAULT_BRIDGE_URL =
    "http://localhost:8000";

const DEFAULT_HISTORY_PATH =
    "/api/history";

const DEFAULT_TIMEOUT_MS =
    30000;

const DEFAULT_HISTORY_DAYS =
    90;

const DEFAULT_LIMIT =
    1000;

const MAX_LIMIT =
    10000;


/*
==========================================================
Environment Helpers
==========================================================
*/

function readPositiveInteger(
    name,
    fallback,
    maximum = Number.MAX_SAFE_INTEGER
) {

    const raw =
        process.env[name];

    if (
        raw === undefined ||
        raw === null ||
        String(raw).trim() === ""
    ) {

        return fallback;

    }

    const value =
        Number.parseInt(
            String(raw),
            10
        );

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {

        return fallback;

    }

    return Math.min(
        value,
        maximum
    );

}


/*
==========================================================
Bridge Configuration
==========================================================
*/

function getBridgeBaseUrl() {

    const configured =
        process.env.ENTERPRISE_BRIDGE_URL ||
        process.env.BRIDGE_BASE_URL ||
        process.env.BRIDGE_URL ||
        DEFAULT_BRIDGE_URL;

    return String(
        configured
    )
        .trim()
        .replace(
            /\/+$/,
            ""
        );

}


function getHistoryPath() {

    const configured =
        process.env.ENTERPRISE_BRIDGE_HISTORY_PATH ||
        process.env.BRIDGE_HISTORY_PATH ||
        DEFAULT_HISTORY_PATH;

    let value =
        String(
            configured
        ).trim();

    if (!value) {

        return DEFAULT_HISTORY_PATH;

    }

    if (!value.startsWith("/")) {

        value =
            `/${value}`;

    }

    return value;

}


function getTimeoutMs() {

    return readPositiveInteger(
        "HISTORICAL_LEARNING_TIMEOUT_MS",
        DEFAULT_TIMEOUT_MS,
        120000
    );

}


function getDefaultHistoryDays() {

    return readPositiveInteger(
        "HISTORICAL_LEARNING_DAYS",
        DEFAULT_HISTORY_DAYS,
        3650
    );

}


function getDefaultLimit() {

    return readPositiveInteger(
        "HISTORICAL_LEARNING_LIMIT",
        DEFAULT_LIMIT,
        MAX_LIMIT
    );

}


/*
==========================================================
Authentication
==========================================================
*/

/*
The Enterprise Bridge currently protects its /api routes
with Bearer authentication.

The token is read from the environment and NEVER logged.
*/

function getBridgeToken() {

    return (
        process.env.ENTERPRISE_BRIDGE_TOKEN ||
        process.env.BRIDGE_API_TOKEN ||
        process.env.WEALTHBUILDER_BRIDGE_TOKEN ||
        ""
    ).trim();

}


/*
==========================================================
Safe Logging
==========================================================
*/

function logInfo(
    message,
    metadata = {}
) {

    try {

        if (
            logger &&
            typeof logger.info === "function"
        ) {

            logger.info(
                logger.SOURCES.LEARNING ||
                "LEARNING",
                message,
                metadata
            );

            return;

        }

    }
    catch (_) {

        // Fall through to console.

    }

    console.log(
        `[HISTORICAL_LEARNING] ${message}`,
        metadata
    );

}


function logSuccess(
    message,
    metadata = {}
) {

    try {

        if (
            logger &&
            typeof logger.success === "function"
        ) {

            logger.success(
                logger.SOURCES.LEARNING ||
                "LEARNING",
                message,
                metadata
            );

            return;

        }

    }
    catch (_) {

        // Fall through to console.

    }

    console.log(
        `[HISTORICAL_LEARNING] ${message}`,
        metadata
    );

}


function logWarning(
    message,
    metadata = {}
) {

    try {

        if (
            logger &&
            typeof logger.warning === "function"
        ) {

            logger.warning(
                logger.SOURCES.LEARNING ||
                "LEARNING",
                message,
                metadata
            );

            return;

        }

    }
    catch (_) {

        // Fall through to console.

    }

    console.warn(
        `[HISTORICAL_LEARNING] ${message}`,
        metadata
    );

}


function logError(
    message,
    metadata = {}
) {

    try {

        if (
            logger &&
            typeof logger.error === "function"
        ) {

            logger.error(
                logger.SOURCES.LEARNING ||
                "LEARNING",
                message,
                metadata
            );

            return;

        }

    }
    catch (_) {

        // Fall through to console.

    }

    console.error(
        `[HISTORICAL_LEARNING] ${message}`,
        metadata
    );

}


/*
==========================================================
Utilities
==========================================================
*/

function nowIso() {

    return new Date()
        .toISOString();

}


function isObject(
    value
) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );

}


function asString(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(
        value
    ).trim();

}


function safeInteger(
    value,
    fallback
) {

    const parsed =
        Number.parseInt(
            String(value),
            10
        );

    if (
        !Number.isFinite(parsed)
    ) {

        return fallback;

    }

    return parsed;

}


function clamp(
    value,
    minimum,
    maximum
) {

    return Math.min(
        maximum,
        Math.max(
            minimum,
            value
        )
    );

}


/*
==========================================================
Deterministic Request Identity
==========================================================
*/

function buildSyncId(
    parameters
) {

    const canonical = {

        start:
            parameters.start,

        end:
            parameters.end,

        ticket:
            parameters.ticket || null,

        symbol:
            parameters.symbol || null,

        limit:
            parameters.limit

    };

    return crypto
        .createHash("sha256")
        .update(
            JSON.stringify(
                canonical
            )
        )
        .digest("hex")
        .slice(
            0,
            32
        );

}


/*
==========================================================
Date Normalization
==========================================================
*/

function normalizeDate(
    value
) {

    if (
        value instanceof Date
    ) {

        if (
            Number.isNaN(
                value.getTime()
            )
        ) {

            return null;

        }

        return value.toISOString();

    }

    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {

        const milliseconds =
            Math.abs(value) >=
            100000000000
                ? value
                : value * 1000;

        const date =
            new Date(
                milliseconds
            );

        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date.toISOString();

    }

    if (
        typeof value === "string"
    ) {

        const trimmed =
            value.trim();

        if (!trimmed) {

            return null;

        }

        const date =
            new Date(
                trimmed
            );

        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date.toISOString();

    }

    return null;

}


/*
==========================================================
History Window
==========================================================
*/

function resolveDateRange(
    options = {}
) {

    const requestedStart =
        normalizeDate(
            options.start
        );

    const requestedEnd =
        normalizeDate(
            options.end
        );

    const end =
        requestedEnd ||
        nowIso();

    const endDate =
        new Date(
            end
        );

    let start =
        requestedStart;

    if (!start) {

        const days =
            getDefaultHistoryDays();

        const startDate =
            new Date(
                endDate.getTime() -
                (
                    days *
                    24 *
                    60 *
                    60 *
                    1000
                )
            );

        start =
            startDate.toISOString();

    }

    if (
        new Date(start).getTime() >
        new Date(end).getTime()
    ) {

        throw new Error(
            "Historical learning start date must be before end date."
        );

    }

    return {

        start,

        end

    };

}


/*
==========================================================
Query Validation
==========================================================
*/

function normalizeOptions(
    options = {}
) {

    if (
        options === null ||
        typeof options !== "object"
    ) {

        options = {};

    }

    const range =
        resolveDateRange(
            options
        );

    const ticket =
        options.ticket !== undefined &&
        options.ticket !== null &&
        String(options.ticket).trim() !== ""
            ? safeInteger(
                options.ticket,
                null
            )
            : null;

    const symbol =
        asString(
            options.symbol
        ) || null;

    const limit =
        clamp(
            safeInteger(
                options.limit,
                getDefaultLimit()
            ),
            1,
            MAX_LIMIT
        );

    return {

        start:
            range.start,

        end:
            range.end,

        ticket,

        symbol,

        limit

    };

}


/*
==========================================================
Bridge URL
==========================================================
*/

function buildHistoryUrl(
    options
) {

    const base =
        getBridgeBaseUrl();

    const route =
        getHistoryPath();

    const url =
        new URL(
            `${base}${route}`
        );

    url.searchParams.set(
        "start",
        options.start
    );

    url.searchParams.set(
        "end",
        options.end
    );

    url.searchParams.set(
        "limit",
        String(
            options.limit
        )
    );

    if (
        options.ticket !== null
    ) {

        url.searchParams.set(
            "ticket",
            String(
                options.ticket
            )
        );

    }

    if (
        options.symbol
    ) {

        url.searchParams.set(
            "symbol",
            options.symbol
        );

    }

    return url;

}


/*
==========================================================
Response Envelope Handling
==========================================================
*/

function extractHistoryPayload(
    payload
) {

    /*
    Supported Enterprise Bridge
    response shapes.

    Primary current shape:

        {
            success: true,
            data: {
                deals: [],
                orders: []
            }
        }

    Also tolerate:

        {
            deals: [],
            orders: []
        }

    and:

        {
            data: {
                history: {
                    deals: [],
                    orders: []
                }
            }
        }

    No broker records are altered.
    */

    if (
        !isObject(payload)
    ) {

        return {

            deals: [],

            orders: [],

            envelope: "invalid"

        };

    }

    let candidate =
        payload;

    if (
        isObject(
            payload.data
        )
    ) {

        candidate =
            payload.data;

    }

    if (
        isObject(
            candidate.history
        )
    ) {

        candidate =
            candidate.history;

    }

    const deals =
        Array.isArray(
            candidate.deals
        )
            ? candidate.deals
            : [];

    const orders =
        Array.isArray(
            candidate.orders
        )
            ? candidate.orders
            : [];

    return {

        deals,

        orders,

        envelope:
            payload.data
                ? "success-data"
                : "direct"

    };

}


/*
==========================================================
Safe Array Validation
==========================================================
*/

function sanitizeCollection(
    value
) {

    if (
        !Array.isArray(value)
    ) {

        return [];

    }

    return value.filter(
        item =>
            isObject(item)
    );

}


/*
==========================================================
HTTP Request
==========================================================
*/

async function requestHistory(
    options
) {

    const url =
        buildHistoryUrl(
            options
        );

    const timeoutMs =
        getTimeoutMs();

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => {

                controller.abort();

            },
            timeoutMs
        );

    const headers = {

        Accept:
            "application/json",

        "User-Agent":
            `WealthBuilder-OS-HistoricalLearning/${VERSION}`

    };

    const token =
        getBridgeToken();

    if (token) {

        headers.Authorization =
            `Bearer ${token}`;

    }

    try {

        logInfo(
            "Requesting historical broker data from Enterprise Bridge.",
            {

                start:
                    options.start,

                end:
                    options.end,

                symbol:
                    options.symbol,

                limit:
                    options.limit,

                timeoutMs

            }
        );

        const response =
            await fetch(
                url,
                {

                    method:
                        "GET",

                    headers,

                    signal:
                        controller.signal

                }
            );

        const text =
            await response.text();

        let payload = null;

        if (text) {

            try {

                payload =
                    JSON.parse(
                        text
                    );

            }
            catch (_) {

                throw new Error(
                    "Enterprise Bridge returned invalid JSON."
                );

            }

        }

        if (!response.ok) {

            let message =
                `Enterprise Bridge history request failed with HTTP ${response.status}.`;

            if (
                isObject(payload)
            ) {

                const candidate =
                    payload.error ||
                    payload.message;

                if (
                    typeof candidate === "string" &&
                    candidate.trim()
                ) {

                    message =
                        candidate.trim();

                }

            }

            const error =
                new Error(
                    message
                );

            error.code =
                "BRIDGE_HISTORY_HTTP_ERROR";

            error.statusCode =
                response.status;

            throw error;

        }

        return {

            payload,

            statusCode:
                response.status

        };

    }
    catch (error) {

        if (
            error &&
            error.name === "AbortError"
        ) {

            const timeoutError =
                new Error(
                    `Enterprise Bridge history request timed out after ${timeoutMs}ms.`
                );

            timeoutError.code =
                "BRIDGE_HISTORY_TIMEOUT";

            throw timeoutError;

        }

        throw error;

    }
    finally {

        clearTimeout(
            timeout
        );

    }

}


/*
==========================================================
Learning Engine Validation
==========================================================
*/

function assertLearningEngine() {

    if (
        !learningEngine ||
        typeof learningEngine.ingestHistory !==
            "function"
    ) {

        const error =
            new Error(
                "learningEngine.ingestHistory() is unavailable."
            );

        error.code =
            "LEARNING_ENGINE_UNAVAILABLE";

        throw error;

    }

}


/*
==========================================================
History Synchronization
==========================================================
*/

async function syncHistory(
    options = {}
) {

    const startedAt =
        Date.now();

    let parameters;

    try {

        parameters =
            normalizeOptions(
                options
            );

    }
    catch (error) {

        logError(
            "Historical learning request validation failed.",
            {

                error:
                    error.message

            }
        );

        throw error;

    }

    const syncId =
        buildSyncId(
            parameters
        );

    logInfo(
        "Starting historical learning synchronization.",
        {

            syncId,

            ...parameters

        }
    );

    assertLearningEngine();

    let response;

    try {

        response =
            await requestHistory(
                parameters
            );

    }
    catch (error) {

        const failure = {

            success:
                false,

            syncId,

            source:
                "enterprise_history",

            parameters,

            processed:
                0,

            inserted:
                0,

            duplicates:
                0,

            invalid:
                0,

            totalRecords:
                null,

            durationMs:
                Date.now() -
                startedAt,

            status:
                "UPSTREAM_FAILED",

            error: {

                code:
                    error.code ||
                    "BRIDGE_HISTORY_REQUEST_FAILED",

                message:
                    String(
                        error.message ||
                        "Historical data request failed."
                    ).slice(
                        0,
                        500
                    ),

                statusCode:
                    error.statusCode ||
                    null

            },

            completedAt:
                nowIso()

        };

        /*
        Critical safety rule:
        no call to ingestHistory() is made
        when the upstream request fails.

        Existing learning data therefore
        remains untouched.
        */

        logError(
            "Historical learning synchronization failed before ingestion.",
            {

                syncId,

                code:
                    failure.error.code,

                statusCode:
                    failure.error.statusCode

            }
        );

        return failure;

    }

    const extracted =
        extractHistoryPayload(
            response.payload
        );

    const deals =
        sanitizeCollection(
            extracted.deals
        );

    const orders =
        sanitizeCollection(
            extracted.orders
        );

    const history = {

        deals,

        orders

    };

    /*
    Empty history is a valid observation.

    We intentionally call ingestHistory()
    with empty collections so the learning
    engine maintains a consistent contract.
    */

    let ingestion;

    try {

        ingestion =
            learningEngine.ingestHistory(
                history
            );

    }
    catch (error) {

        const failure = {

            success:
                false,

            syncId,

            source:
                "enterprise_history",

            parameters,

            processed:
                deals.length +
                orders.length,

            inserted:
                0,

            duplicates:
                0,

            invalid:
                0,

            totalRecords:
                null,

            durationMs:
                Date.now() -
                startedAt,

            status:
                "LEARNING_ENGINE_FAILED",

            error: {

                code:
                    error.code ||
                    "LEARNING_INGESTION_FAILED",

                message:
                    String(
                        error.message ||
                        "Learning ingestion failed."
                    ).slice(
                        0,
                        500
                    )

            },

            completedAt:
                nowIso()

        };

        logError(
            "Historical data was retrieved but learning ingestion failed.",
            {

                syncId,

                processed:
                    failure.processed,

                error:
                    failure.error.message

            }
        );

        return failure;

    }

    const result = {

        success:
            ingestion?.success !== false,

        syncId,

        source:
            "enterprise_history",

        parameters,

        bridge: {

            statusCode:
                response.statusCode,

            envelope:
                extracted.envelope,

            deals:
                deals.length,

            orders:
                orders.length,

            total:
                deals.length +
                orders.length

        },

        learning: {

            processed:
                Number(
                    ingestion?.processed || 0
                ),

            inserted:
                Number(
                    ingestion?.inserted || 0
                ),

            duplicates:
                Number(
                    ingestion?.duplicates || 0
                ),

            invalid:
                Number(
                    ingestion?.invalid || 0
                ),

            totalRecords:
                Number.isFinite(
                    Number(
                        ingestion?.totalRecords
                    )
                )
                    ? Number(
                        ingestion.totalRecords
                    )
                    : null

        },

        durationMs:
            Date.now() -
            startedAt,

        status:
            (
                deals.length === 0 &&
                orders.length === 0
            )
                ? "EMPTY"
                : "INGESTED",

        completedAt:
            nowIso()

    };

    logSuccess(
        "Historical learning synchronization completed.",
        {

            syncId,

            status:
                result.status,

            processed:
                result.learning.processed,

            inserted:
                result.learning.inserted,

            duplicates:
                result.learning.duplicates,

            invalid:
                result.learning.invalid,

            durationMs:
                result.durationMs

        }
    );

    return result;

}


/*
==========================================================
Symbol Synchronization
==========================================================
*/

async function syncSymbol(
    symbol,
    options = {}
) {

    const requested =
        asString(
            symbol
        );

    if (!requested) {

        const error =
            new Error(
                "A broker-native symbol is required."
            );

        error.code =
            "INVALID_SYMBOL";

        throw error;

    }

    return syncHistory({

        ...options,

        symbol:
            requested

    });

}


/*
==========================================================
Four Initial Broker Symbols
==========================================================
*/

async function syncInitialSymbols(
    options = {}
) {

    const symbols = [

        "EURUSD.mic",

        "XAUUSD.mic",

        "USTECH.mic",

        "DE30.mic"

    ];

    const results = [];

    for (
        const symbol
        of symbols
    ) {

        /*
        Sequential execution is intentional.

        It prevents four large history
        requests from competing for network
        resources and makes diagnostics
        deterministic.
        */

        try {

            const result =
                await syncSymbol(
                    symbol,
                    options
                );

            results.push(
                result
            );

        }
        catch (error) {

            results.push({

                success:
                    false,

                symbol,

                status:
                    "FAILED",

                error: {

                    code:
                        error.code ||
                        "SYMBOL_SYNC_FAILED",

                    message:
                        String(
                            error.message ||
                            "Symbol synchronization failed."
                        ).slice(
                            0,
                            500
                        )

                }

            });

        }

    }

    return {

        success:
            results.every(
                result =>
                    result.success !== false
            ),

        source:
            "enterprise_history",

        symbols,

        results,

        completedAt:
            nowIso()

    };

}


/*
==========================================================
Read-Only Status
==========================================================
*/

function getStatus() {

    let learningStats = null;

    try {

        if (
            learningEngine &&
            typeof learningEngine.getLearningStats ===
                "function"
        ) {

            learningStats =
                learningEngine.getLearningStats();

        }

    }
    catch (error) {

        learningStats = {

            available:
                false,

            error:
                String(
                    error.message ||
                    "Unable to read learning statistics."
                ).slice(
                    0,
                    500
                )

        };

    }

    return {

        service:
            "historicalLearningService",

        version:
            VERSION,

        status:
            "READY",

        bridge: {

            baseUrl:
                getBridgeBaseUrl(),

            historyPath:
                getHistoryPath(),

            authenticationConfigured:
                Boolean(
                    getBridgeToken()
                ),

            timeoutMs:
                getTimeoutMs()

        },

        defaults: {

            historyDays:
                getDefaultHistoryDays(),

            limit:
                getDefaultLimit(),

            maxLimit:
                MAX_LIMIT

        },

        learning: {

            engineAvailable:
                Boolean(
                    learningEngine &&
                    typeof learningEngine.ingestHistory ===
                        "function"
                ),

            stats:
                learningStats

        },

        safety: {

            tradeExecution:
                false,

            tradingParameterWrites:
                false,

            riskParameterWrites:
                false,

            strategyMutation:
                false,

            autonomousDecision:
                false

        },

        checkedAt:
            nowIso()

    };

}


/*
==========================================================
Public Configuration
==========================================================
*/

function getConfiguration() {

    return {

        version:
            VERSION,

        bridgeBaseUrl:
            getBridgeBaseUrl(),

        historyPath:
            getHistoryPath(),

        timeoutMs:
            getTimeoutMs(),

        defaultHistoryDays:
            getDefaultHistoryDays(),

        defaultLimit:
            getDefaultLimit(),

        maxLimit:
            MAX_LIMIT,

        authenticationConfigured:
            Boolean(
                getBridgeToken()
            )

    };

}


/*
==========================================================
Certification
==========================================================
*/

const SERVICE = {

    VERSION,

    syncHistory,

    syncSymbol,

    syncInitialSymbols,

    getStatus,

    getConfiguration

};


module.exports =
    SERVICE;
