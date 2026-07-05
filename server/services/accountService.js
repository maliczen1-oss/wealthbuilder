"use strict";

/*
==========================================================
WealthBuilder OS

Account Service

Version : 2.0.0
Status  : Production
Atlas Certified

Purpose
-------
Provides centralized access to MetaTrader account
information through the MetaApi service.

Dependencies
------------
metaapi.js
logger.js

==========================================================
*/

const metaapi = require("./metaapi");
const logger = require("./logger");

const CACHE_TTL = 5000;

let accountCache = null;
let cacheTimestamp = 0;

/*
==========================================================
Internal Helpers
==========================================================
*/

function cacheValid() {
    return (
        accountCache &&
        (Date.now() - cacheTimestamp) < CACHE_TTL
    );
}

async function fetchAccountInformation() {

    if (cacheValid()) {
        return accountCache;
    }

    try {

        const connection = await metaapi.getConnection();

        const account =
            await connection.getAccountInformation();

        accountCache = account;
        cacheTimestamp = Date.now();

        logger.info(
            logger.SOURCES.ACCOUNT,
            "Account information updated."
        );

        return account;

    } catch (error) {

        logger.error(
            logger.SOURCES.ACCOUNT,
            "Failed to retrieve account information.",
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

async function getAccount() {

    return fetchAccountInformation();

}

async function getBroker() {

    const account = await fetchAccountInformation();

    return account.broker;

}

async function getAccountName() {

    const account = await fetchAccountInformation();

    return account.name;

}

async function getBalance() {

    const account = await fetchAccountInformation();

    return account.balance;

}

async function getEquity() {

    const account = await fetchAccountInformation();

    return account.equity;

}

async function getFreeMargin() {

    const account = await fetchAccountInformation();

    return account.freeMargin;

}

async function getLeverage() {

    const account = await fetchAccountInformation();

    return account.leverage;

}

async function getCurrency() {

    const account = await fetchAccountInformation();

    return account.currency;

}

async function getAccountType() {

    const account = await fetchAccountInformation();

    const broker =
        String(account.broker || "").toLowerCase();

    if (broker.includes("cent")) {
        return "CENT";
    }

    if (broker.includes("micro")) {
        return "MICRO";
    }

    return "STANDARD";

}

/*
==========================================================
Cache Management
==========================================================
*/

function clearCache() {

    accountCache = null;
    cacheTimestamp = 0;

}

/*
==========================================================
Exports
==========================================================
*/

module.exports = {

    getAccount,
    getBroker,
    getAccountName,
    getBalance,
    getEquity,
    getFreeMargin,
    getLeverage,
    getCurrency,
    getAccountType,
    clearCache

};
