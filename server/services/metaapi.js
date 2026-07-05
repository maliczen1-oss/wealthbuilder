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

    }    /*
    ======================================================
    Get RPC Connection
    ======================================================
    */

    getConnection() {

        if (!connection) {

            throw new Error(
                "MetaApi connection is not available. Call initialize() first."
            );

        }

        return connection;

    }

    /*
    ======================================================
    Get MetaTrader Account
    ======================================================
    */

    getAccount() {

        if (!account) {

            throw new Error(
                "MetaTrader account has not been initialized."
            );

        }

        return account;

    }

    /*
    ======================================================
    Get MetaApi SDK
    ======================================================
    */

    getApi() {

        return api;

    }

    /*
    ======================================================
    Service State
    ======================================================
    */

    getState() {

        return {

            ...state

        };

    }

    /*
    ======================================================
    Status Helpers
    ======================================================
    */

    isInitialized() {

        return state.initialized;

    }

    isConnected() {

        return state.connected;

    }

    isSynchronized() {

        return state.synchronized;

    }

    /*
    ======================================================
    Health Report
    ======================================================
    */

    getHealth() {

        return {

            service: "MetaApi",

            version: this.VERSION,

            initialized: state.initialized,

            connected: state.connected,

            synchronized: state.synchronized,

            retryCount: state.retryCount,

            lastConnected: state.lastConnected,

            lastError: state.lastError,

            account: account
                ? {
                    id: account.id,
                    name: account.name,
                    state: account.state
                }
                : null

        };

    }

    /*
    ======================================================
    Synchronize Connection
    ======================================================
    */

    async synchronize() {

        const rpc = this.getConnection();

        logger.info(

            logger.SOURCES.METAAPI,

            "Synchronizing MetaApi connection."

        );

        await rpc.waitSynchronized();

        state.connected = true;

        state.synchronized = true;

        state.lastConnected = new Date().toISOString();

        logger.success(

            logger.SOURCES.METAAPI,

            "Synchronization complete."

        );

        return true;

    }

    /*
    ======================================================
    Verify Connection
    ======================================================
    */

    async verifyConnection() {

        if (!connection) {

            return false;

        }

        try {

            await connection.getAccountInformation();

            state.connected = true;

            return true;

        }

        catch (error) {

            state.connected = false;

            state.lastError = error.message;

            logger.warning(

                logger.SOURCES.METAAPI,

                "MetaApi connection verification failed.",

                {

                    error: error.message

                }

            );

            return false;

        }

    }

    /*
    ======================================================
    Retry Counter
    ======================================================
    */

    getRetryCount()    /*
    ======================================================
    Disconnect
    ======================================================
    */

    async disconnect() {

        logger.info(

            logger.SOURCES.METAAPI,

            "Disconnecting MetaApi service."

        );

        try {

            if (connection) {

                if (typeof connection.close === "function") {

                    await connection.close();

                }

            }

        } catch (error) {

            logger.warning(

                logger.SOURCES.METAAPI,

                "Failed to close RPC connection.",

                {

                    error: error.message

                }

            );

        }

        connection = null;

        state.connected = false;

        state.synchronized = false;

        logger.success(

            logger.SOURCES.METAAPI,

            "MetaApi disconnected."

        );

    }

    /*
    ======================================================
    Reset Service
    ======================================================
    */

    reset() {

        api = null;

        account = null;

        connection = null;

        initializing = false;

        state.initialized = false;

        state.connected = false;

        state.synchronized = false;

        state.retryCount = 0;

        state.lastConnected = null;

        state.lastError = null;

        logger.info(

            logger.SOURCES.METAAPI,

            "MetaApi service reset."

        );

    }

    /*
    ======================================================
    Restart Service
    ======================================================
    */

    async restart(token, accountId) {

        await this.disconnect();

        this.reset();

        return this.initialize(

            token,

            accountId

        );

    }

    /*
    ======================================================
    Readiness
    ======================================================
    */

    isReady() {

        return (

            state.initialized &&

            state.connected &&

            state.synchronized

        );

    }

    /*
    ======================================================
    Version
    ======================================================
    */

    getVersion() {

        return this.VERSION;

    }

}

/*
==========================================================
Singleton Export
==========================================================
*/

const metaApiService = new MetaApiService();

module.exports = metaApiService; {

        return state.retryCount;

    }
