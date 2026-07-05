"use strict";

/*
==========================================================
WealthBuilder OS

Market Service

Version : 2.0.0
Status  : Production
Atlas Certified

Purpose
-------
Provides centralized access to live market prices,
symbol specifications and market snapshots.

Dependencies
------------
metaapi.js
symbolService.js
logger.js

==========================================================
*/

const metaapi = require("./metaapi");
const symbolService = require("./symbolService");
const logger = require("./logger");

const CACHE_TTL = 1000;

const priceCache = new Map();
const specificationCache = new Map();

/*
==========================================================
Internal Helpers
==========================================================
*/

function getCached(cache, key) {

    const item = cache.get(key);

    if (!item) {
        return null;
    }

    if ((Date.now() - item.timestamp) > CACHE_TTL) {

        cache.delete(key);

        return null;

    }

    return item.value;

}

function setCached(cache, key, value) {

    cache.set(key, {

        value,

        timestamp: Date.now()

    });

}

async function getConnection() {

    return await metaapi.getConnection();

}

/*
==========================================================
Price
==========================================================
*/

async function getPrice(symbol) {

    const cached = getCached(priceCache, symbol);

    if (cached) {

        return cached;

    }

    try {

        const connection = await getConnection();

        const price =
            await connection.getSymbolPrice(symbol);

        setCached(priceCache, symbol, price);

        logger.info(

            logger.SOURCES.MARKET,

            "Market price updated.",

            {

                symbol

            }

        );

        return price;

    }

    catch (error) {

        logger.error(

            logger.SOURCES.MARKET,

            "Unable to retrieve market price.",

            {

                symbol,

                error: error.message

            }

        );

        throw error;

    }

}

/*
==========================================================
Specification
==========================================================
*/

async function getSpecification(symbol) {

    const cached =
        getCached(specificationCache, symbol);

    if (cached) {

        return cached;

    }

    try {

        const connection = await getConnection();

        const specification =
            await connection.getSymbolSpecification(symbol);

        setCached(
            specificationCache,
            symbol,
            specification
        );

        return specification;

    }

    catch (error) {

        logger.error(

            logger.SOURCES.MARKET,

            "Unable to retrieve symbol specification.",

            {

                symbol,

                error: error.message

            }

        );

        throw error;

    }

}

/*
==========================================================
Market Snapshot
==========================================================
*/

async function getMarketSnapshot(baseSymbol) {

    const symbol =
        await symbolService.findSymbol(baseSymbol);

    if (!symbol) {

        throw new Error(

            `Trading symbol '${baseSymbol}' not found.`

        );

    }

    const price =
        await getPrice(symbol);

    const specification =
        await getSpecification(symbol);

    return {

        symbol,

        bid: price.bid,

        ask: price.ask,

        spread: Math.abs(

            Number(price.ask) -

            Number(price.bid)

        ),

        digits: specification.digits,

        point: specification.point,

        contractSize: specification.contractSize,

        minLot: specification.minVolume,

        maxLot: specification.maxVolume,

        lotStep: specification.volumeStep,

        tradeMode: specification.tradeMode,

        executionMode: specification.executionMode

    };

}

/*
==========================================================
Cache Management
==========================================================
*/

function clearCache() {

    priceCache.clear();

    specificationCache.clear();

}

/*
==========================================================
Exports
==========================================================
*/

module.exports = {

    getPrice,

    getSpecification,

    getMarketSnapshot,

    clearCache

};
