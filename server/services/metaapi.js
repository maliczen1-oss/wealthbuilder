"use strict";

/*
==========================================================
WealthBuilder OS
MetaApi Service

Version : 3.0.0
Status  : Production
Atlas Certification : Pending
Powered by Jarvis Intelligence

Purpose
-------
Centralized MetaApi lifecycle management.

Responsibilities
- Initialize MetaApi
- Deploy account
- Maintain RPC connection
- Synchronize terminal
- Expose a single connection to all services
- Report health
- Graceful shutdown

Used By
-------
accountService
positionService
symbolService
marketService
tradeService

==========================================================
*/

const MetaApi = require("metaapi.cloud-sdk").default;
const logger = require("./logger");

/*
==========================================================
Internal State
==========================================================
*/

let api = null;
let account = null;
let connection = null;

let initializing = false;

const state = {

    initialized: false,

    connected: false,

    synchronized: false,

    retryCount: 0,

    lastConnected: null,

    lastError: null

};

/*
==========================================================
MetaApi Service
==========================================================
*/

class MetaApiService {

    constructor() {

        this.VERSION = "3.0.0";

    }

    /*
    ======================================================
    Initialize
    ======================================================
    */

    async initialize(token, accountId) {

        if (state.initialized) {

            return connection;

        }

        if (initializing) {

            logger.info(

                logger.SOURCES.METAAPI,

                "Initialization already in progress."

            );

            return;

        }

        initializing = true;

        logger.info(

            logger.SOURCES.METAAPI,

            "Initializing MetaApi.",

            {

                accountId

            }

        );

        try {

            api = new MetaApi(token);

            account =
                await api
                    .metatraderAccountApi
                    .getAccount(accountId);

            if (!account) {

                throw new Error(
                    "MetaTrader account not found."
                );

            }

            logger.success(

                logger.SOURCES.METAAPI,

                "MetaTrader account located.",

                {

                    accountId,

                    accountName: account.name,

                    state: account.state

                }

            );

            /*
            ==================================================
            Deploy Account
            ==================================================
            */

            if (account.state !== "DEPLOYED") {

                logger.info(

                    logger.SOURCES.METAAPI,

                    "Deploying trading account."

                );

                await account.deploy();

            }

            logger.info(

                logger.SOURCES.METAAPI,

                "Waiting for broker connection."

            );

            await account.waitConnected();

            /*
            ==================================================
            RPC Connection
            ==================================================
            */

            connection =
                account.getRPCConnection();

            await connection.connect();

            logger.info(

                logger.SOURCES.METAAPI,

                "Synchronizing terminal."

            );

            await connection.waitSynchronized();

            state.initialized = true;

            state.connected = true;

            state.synchronized = true;

            state.lastConnected =
                new Date().toISOString();

            state.lastError = null;

            state.retryCount = 0;

            initializing = false;

            logger.success(

                logger.SOURCES.METAAPI,

                "MetaApi synchronization complete.",

                {

                    account: account.name

                }

            );

            return connection;

        }

        catch (error) {

            initializing = false;

            state.initialized = false;

            state.connected = false;

            state.synchronized = false;

            state.retryCount++;

            state.lastError = error.message;

            logger.error(

                logger.SOURCES.METAAPI,

                "MetaApi initialization failed.",

                {

                    retryCount: state.retryCount,

                    error: error.message

                }

            );

            throw error;

        }

    }
