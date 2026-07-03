/*
==========================================================
WealthBuilder OS
MetaApi Service
Version: 2.0.0
Status: Production
Powered by Jarvis Intelligence
==========================================================
*/

const MetaApi = require("metaapi.cloud-sdk").default;

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

    connected: false,

    synchronized: false,

    initialized: false,

    lastConnected: null,

    lastError: null,

    retryCount: 0

};

/*
==========================================================
MetaApi Service
==========================================================
*/

class MetaApiService {

    /*
    ======================================================
    Initialize
    ======================================================
    */

    async initialize(token, accountId) {

        if (state.initialized) {

            return;

        }

        if (initializing) {

            return;

        }

        initializing = true;

        console.log("");

        console.log("======================================");
        console.log("MetaApi Initialization");
        console.log("======================================");

        try {

            api = new MetaApi(token);

            account =
                await api
                    .metatraderAccountApi
                    .getAccount(accountId);

            console.log(
                "Account Found:",
                account.name
            );

        }

        catch (err) {

            state.lastError =
                err.message;

            initializing = false;

            throw err;

        }
