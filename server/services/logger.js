/*
==========================================================
WealthBuilder OS
Logger Service

Version : 3.0.0
Status  : Enterprise
Owner   : Atlas Architecture
Powered by Jarvis Intelligence

Description:
Central logging service for the entire WealthBuilder
Operating System.

Every module reports through this logger.

Supported Levels:
- DEBUG
- INFO
- SUCCESS
- WARNING
- ERROR
- CRITICAL
==========================================================
*/

const { randomUUID } = require("crypto");

/*
==========================================================
Configuration
==========================================================
*/

const CONFIG = {

    MAX_LOGS: 5000,

    LOG_TO_CONSOLE:
        process.env.LOG_TO_CONSOLE !== "false",

    LOG_LEVEL:
        process.env.LOG_LEVEL || "DEBUG"

};

/*
==========================================================
Log Levels
==========================================================
*/

const LEVELS = {

    DEBUG: 0,

    INFO: 1,

    SUCCESS: 2,

    WARNING: 3,

    ERROR: 4,

    CRITICAL: 5

};

/*
==========================================================
Standard Sources

Every service should use one of these.
==========================================================
*/

const SOURCES = {

    SYSTEM: "SYSTEM",

    API: "API",

    METAAPI: "METAAPI",

    BROKER: "BROKER",

    ACCOUNT: "ACCOUNT",

    MARKET: "MARKET",

    STRATEGY: "STRATEGY",

    DECISION: "DECISION",

    EXECUTION: "EXECUTION",

    GUARDIAN: "GUARDIAN",

    RISK: "RISK",

    AUTOMATION: "AUTOMATION",

    LEARNING: "LEARNING",

    DNA: "DNA",

    PSYCHOLOGY: "PSYCHOLOGY",

    JARVIS: "JARVIS",

    NOTIFICATION: "NOTIFICATION",

    USER: "USER"

};

/*
==========================================================
Logger Service
==========================================================
*/

class Logger {

    constructor() {

        this.logs = [];

        this.started =
            new Date();

    }

    /*
    ======================================================
    Internal Helpers
    ======================================================
    */

    shouldLog(level) {

        return (

            LEVELS[level] >=

            LEVELS[CONFIG.LOG_LEVEL]

        );

    }

    createEntry({

        level,

        source,

        message,

        context = {}

    }) {

        return {

            id: randomUUID(),

            level,

            source,

            message,

            context,

            timestamp:
                new Date().toISOString(),

            epoch:
                Date.now()

        };

    }

    add(entry) {

        this.logs.push(entry);

        if (

            this.logs.length >

            CONFIG.MAX_LOGS

        ) {

            this.logs.shift();

        }

        return entry;

    }
