"use strict";

/*
==========================================================
WealthBuilder OS

Broker Adapter

Version : 1.0.0
Status  : Production
Atlas Certification : Certified

Purpose
-------
Defines the broker interface used throughout
WealthBuilder OS.

Every broker implementation MUST extend this class.

Current Implementations
-----------------------
✓ MetaApiAdapter
✓ MT5BridgeAdapter

Future Implementations
----------------------
- MT4
- cTrader
- Interactive Brokers
- FIX API

==========================================================
*/

class BrokerAdapter {

    constructor() {

        if (new.target === BrokerAdapter) {

            throw new Error(

                "BrokerAdapter is abstract and cannot be instantiated directly."

            );

        }

    }

    /*
    ======================================================
    Lifecycle
    ======================================================
    */

    async initialize(/* config */) {

        throw new Error("initialize() not implemented.");

    }

    async disconnect() {

        throw new Error("disconnect() not implemented.");

    }

    async restart(/* config */) {

        throw new Error("restart() not implemented.");

    }

    /*
    ======================================================
    Connection
    ======================================================
    */

    async getConnection() {

        throw new Error("getConnection() not implemented.");

    }

    async synchronize() {

        throw new Error("synchronize() not implemented.");

    }

    async verifyConnection() {

        throw new Error("verifyConnection() not implemented.");

    }

    /*
    ======================================================
    Broker Objects
    ======================================================
    */

    getAccount() {

        throw new Error("getAccount() not implemented.");

    }

    getApi() {

        throw new Error("getApi() not implemented.");

    }

    /*
    ======================================================
    Status
    ======================================================
    */

    getState() {

        throw new Error("getState() not implemented.");

    }

    getHealth() {

        throw new Error("getHealth() not implemented.");

    }

    isInitialized() {

        throw new Error("isInitialized() not implemented.");

    }

    isConnected() {

        throw new Error("isConnected() not implemented.");

    }

    isSynchronized() {

        throw new Error("isSynchronized() not implemented.");

    }

    isReady() {

        throw new Error("isReady() not implemented.");

    }

    /*
    ======================================================
    Diagnostics
    ======================================================
    */

    getRetryCount() {

        throw new Error("getRetryCount() not implemented.");

    }

    reset() {

        throw new Error("reset() not implemented.");

    }

    /*
    ======================================================
    Metadata
    ======================================================
    */

    getVersion() {

        throw new Error("getVersion() not implemented.");

    }

    getProvider() {

        throw new Error("getProvider() not implemented.");

    }

}

/*
==========================================================
Export
==========================================================
*/

module.exports = BrokerAdapter;
