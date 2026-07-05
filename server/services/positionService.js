"use strict";

/*
==========================================================
WealthBuilder OS

Position Service

Version : 2.0.0
Status  : Production
Atlas Certified

Purpose
-------
Provides centralized access to open MetaTrader positions.

Dependencies
------------
metaapi.js
logger.js

==========================================================
*/

const metaapi = require("./metaapi");
const logger = require("./logger");

const CACHE_TTL = 2000;

let positionCache = null;
let cacheTimestamp = 0;

/*
==========================================================
Internal Helpers
==========================================================
*/

function cacheValid() {

    return (
        Array.isArray(positionCache) &&
        (Date.now() - cacheTimestamp) < CACHE_TTL
    );

}

async function fetchPositions() {

    if (cacheValid()) {
        return positionCache;
    }

    try {

        const connection = await metaapi.getConnection();

        const positions = await connection.getPositions();

        positionCache = positions;
        cacheTimestamp = Date.now();

        logger.info(
            logger.SOURCES.EXECUTION,
            "Open positions updated.",
            {
                count: positions.length
            }
        );

        return positions;

    } catch (error) {

        logger.error(
            logger.SOURCES.EXECUTION,
            "Failed to retrieve open positions.",
            {
                error: error.message
            }
        );

        throw error;

    }

}

/*
==========================================================
Public API
==========================================================
*/

async function getPositions() {

    return fetchPositions();

}

async function getPositionCount() {

    const positions = await fetchPositions();

    return positions.length;

}

async function hasOpenPosition(symbol) {

    const positions = await fetchPositions();

    const normalized =
        String(symbol).toUpperCase();

    return positions.some(position =>
        String(position.symbol)
            .toUpperCase() === normalized
    );

}

async function getPosition(symbol) {

    const positions = await fetchPositions();

    const normalized =
        String(symbol).toUpperCase();

    return (

        positions.find(position =>
            String(position.symbol)
                .toUpperCase() === normalized
        ) || null

    );

}

async function getBuyPositions() {

    const positions = await fetchPositions();

    return positions.filter(position =>
        position.type === "POSITION_TYPE_BUY"
    );

}

async function getSellPositions() {

    const positions = await fetchPositions();

    return positions.filter(position =>
        position.type === "POSITION_TYPE_SELL"
    );

}

async function getTotalVolume() {

    const positions = await fetchPositions();

    return positions.reduce(

        (total, position) =>

            total + Number(position.volume || 0),

        0

    );

}

async function canOpenPosition(maxPositions = 4) {

    return (await getPositionCount()) < maxPositions;

}

/*
==========================================================
Cache Management
==========================================================
*/

function clearCache() {

    positionCache = null;
    cacheTimestamp = 0;

}

/*
==========================================================
Exports
==========================================================
*/

module.exports = {

    getPositions,
    getPositionCount,
    hasOpenPosition,
    getPosition,
    getBuyPositions,
    getSellPositions,
    getTotalVolume,
    canOpenPosition,
    clearCache

};
