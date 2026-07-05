"use strict";

/*
==========================================================
WealthBuilder OS

Symbol Service

Version : 2.0.0
Status  : Production
Atlas Certified

Purpose
-------
Provides broker-independent symbol discovery and
normalization for the trading engine.

Dependencies
------------
metaapi.js
logger.js

==========================================================
*/

const metaapi = require("./metaapi");
const logger = require("./logger");

const CACHE_TTL = 60000;

let symbolCache = [];
let cacheTimestamp = 0;

/*
==========================================================
Internal Helpers
==========================================================
*/

function cacheValid() {

    return (
        Array.isArray(symbolCache) &&
        (Date.now() - cacheTimestamp) < CACHE_TTL
    );

}

async function fetchSymbols() {

    if (cacheValid()) {
        return symbolCache;
    }

    try {

        const connection = await metaapi.getConnection();

        const symbols = await connection.getSymbols();

        symbolCache = symbols;
        cacheTimestamp = Date.now();

        logger.info(
            logger.SOURCES.MARKET,
            "Trading symbols refreshed.",
            {
                count: symbols.length
            }
        );

        return symbols;

    } catch (error) {

        logger.error(
            logger.SOURCES.MARKET,
            "Failed to retrieve trading symbols.",
            {
                error: error.message
            }
        );

        throw error;

    }

}

function normalize(value) {

    return String(value || "")
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase();

}

/*
==========================================================
Public API
==========================================================
*/

async function getAvailableSymbols() {

    return fetchSymbols();

}

async function findSymbol(baseSymbol) {

    const symbols = await fetchSymbols();

    const target = normalize(baseSymbol);

    const exact = symbols.find(symbol =>
        normalize(symbol.symbol) === target
    );

    if (exact) {
        return exact.symbol;
    }

    const partial = symbols.find(symbol => {

        const brokerSymbol = normalize(symbol.symbol);

        return (
            brokerSymbol.includes(target) ||
            brokerSymbol.startsWith(target) ||
            brokerSymbol.endsWith(target)
        );

    });

    return partial ? partial.symbol : null;

}

async function getEURUSD() {

    return findSymbol("EURUSD");

}

async function getGBPUSD() {

    return findSymbol("GBPUSD");

}

async function getUSDJPY() {

    return findSymbol("USDJPY");

}

async function getXAUUSD() {

    return (
        await findSymbol("XAUUSD") ||
        await findSymbol("GOLD")
    );

}

async function getNAS100() {

    return (
        await findSymbol("NAS100") ||
        await findSymbol("USTEC") ||
        await findSymbol("US100")
    );

}

/*
==========================================================
Cache Management
==========================================================
*/

function clearCache() {

    symbolCache = [];
    cacheTimestamp = 0;

}

/*
==========================================================
Exports
==========================================================
*/

module.exports = {

    getAvailableSymbols,
    findSymbol,

    getEURUSD,
    getGBPUSD,
    getUSDJPY,
    getXAUUSD,
    getNAS100,

    clearCache

};
