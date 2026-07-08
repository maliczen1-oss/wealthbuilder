"use strict";

/*
==========================================================
WealthBuilder OS

Logger Service

Version : 3.1.0
Status  : Production
Atlas Certification : Certified

Owner   : Atlas Architecture
Powered by Jarvis Intelligence

Purpose
-------
Enterprise-grade centralized logging service used
throughout WealthBuilder OS.

Responsibilities
----------------
✓ Centralized Logging
✓ Structured Log Entries
✓ Enterprise Log Levels
✓ Runtime Statistics
✓ Health Reporting
✓ Performance Timers
✓ Search & Filtering
✓ Memory Protection
✓ Railway Compatible
✓ Atlas Certified

Backward Compatibility
----------------------
✓ Version 3.0 Compatible
✓ getLogs()
✓ getHealth()
✓ getVersion()
✓ history getter
✓ latest()
✓ getByLevel()
✓ getBySource()

==========================================================
*/

const { randomUUID } = require("crypto");

/*
==========================================================
Configuration
==========================================================
*/

const CONFIG = Object.freeze({

    VERSION: "3.1.0",

    MAX_LOGS:
        Number(
            process.env.MAX_LOGS || 5000
        ),

    LOG_TO_CONSOLE:
        process.env.LOG_TO_CONSOLE !== "false",

    LOG_LEVEL:
        process.env.LOG_LEVEL || "DEBUG"

});

/*
==========================================================
Log Levels
==========================================================
*/

const LEVELS = Object.freeze({

    DEBUG: 0,

    INFO: 1,

    SUCCESS: 2,

    WARNING: 3,

    ERROR: 4,

    CRITICAL: 5

});

/*
==========================================================
Standard Sources

Every certified module should use one of these.

==========================================================
*/

const SOURCES = Object.freeze({

    SYSTEM: "SYSTEM",

    API: "API",

    METAAPI: "METAAPI",

    BROKER: "BROKER",

    ACCOUNT: "ACCOUNT",

    MARKET: "MARKET",

    POSITION: "POSITION",

    SYMBOL: "SYMBOL",

    STRATEGY: "STRATEGY",

    DECISION: "DECISION",

    DECISION_REPORT: "DECISION_REPORT",

    EXECUTION: "EXECUTION",

    TRADE: "TRADE",

    TRADE_LIFECYCLE: "TRADE_LIFECYCLE",

    PERFORMANCE: "PERFORMANCE",

    ANALYTICS: "ANALYTICS",

    HISTORY: "HISTORY",

    AUTOMATION: "AUTOMATION",

    READINESS: "READINESS",

    GUARDIAN: "GUARDIAN",

    RISK: "RISK",

    VALIDATION: "VALIDATION",

    LEARNING: "LEARNING",

    DNA: "DNA",

    PSYCHOLOGY: "PSYCHOLOGY",

    MORNING_BRIEF: "MORNING_BRIEF",

    NOTIFICATION: "NOTIFICATION",

    MARKET_CONTEXT: "MARKET_CONTEXT",

    MARKET_STATE: "MARKET_STATE",

    SENTINEL: "SENTINEL",

    ORCHESTRATOR: "ORCHESTRATOR",

    JARVIS: "JARVIS",

    USER: "USER",

    LOGS: "LOGS"

});

/*
==========================================================
Logger Service
==========================================================
*/

class Logger {

    constructor() {

        this.logs = [];

        this.started = new Date();

        this.timers = new Map();

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

        while (

            this.logs.length >

            CONFIG.MAX_LOGS

        ) {

            this.logs.shift();

        }

        return entry;

    }

    /*
    ======================================================
    Console Output
    ======================================================
    */

    write(entry) {

        if (!CONFIG.LOG_TO_CONSOLE) {

            return;

        }

        const prefix =

            `[${entry.timestamp}] ` +
            `[${entry.level}] ` +
            `[${entry.source}]`;

        switch (entry.level) {

            case "DEBUG":

                console.debug(
                    prefix,
                    entry.message,
                    entry.context
                );

                break;

            case "INFO":

                console.info(
                    prefix,
                    entry.message,
                    entry.context
                );

                break;

            case "SUCCESS":

                console.log(
                    prefix,
                    entry.message,
                    entry.context
                );

                break;

            case "WARNING":

                console.warn(
                    prefix,
                    entry.message,
                    entry.context
                );

                break;

            case "ERROR":

            case "CRITICAL":

                console.error(
                    prefix,
                    entry.message,
                    entry.context
                );

                break;

        }

    }

    /*
    ======================================================
    Core Logging Engine
    ======================================================
    */

    log(

        level,

        source,

        message,

        context = {}

    ) {

        if (

            !this.shouldLog(level)

        ) {

            return null;

        }

        const entry =

            this.createEntry({

                level,

                source,

                message,

                context

            });

        this.add(entry);

        this.write(entry);

        return entry;

    }

        /*
    ======================================================
    Public Logging API
    ======================================================
    */

    debug(source, message, context = {}) {

        return this.log(
            "DEBUG",
            source,
            message,
            context
        );

    }

    info(source, message, context = {}) {

        return this.log(
            "INFO",
            source,
            message,
            context
        );

    }

    success(source, message, context = {}) {

        return this.log(
            "SUCCESS",
            source,
            message,
            context
        );

    }

    warning(source, message, context = {}) {

        return this.log(
            "WARNING",
            source,
            message,
            context
        );

    }

    error(source, message, context = {}) {

        return this.log(
            "ERROR",
            source,
            message,
            context
        );

    }

    critical(source, message, context = {}) {

        return this.log(
            "CRITICAL",
            source,
            message,
            context
        );

    }

    /*
    ======================================================
    Compatibility Methods
    ======================================================
    */

    getLogs() {

        return [...this.logs];

    }

    getHealth() {

        return this.health;

    }

    getVersion() {

        return CONFIG.VERSION;

    }

    /*
    ======================================================
    Read Only Properties
    ======================================================
    */

    get history() {

        return [...this.logs];

    }

    get health() {

        return {

            version: CONFIG.VERSION,

            started: this.started,

            uptime:

                Math.floor(

                    (

                        Date.now()

                        -

                        this.started.getTime()

                    ) / 1000

                ),

            totalLogs:

                this.logs.length,

            maxLogs:

                CONFIG.MAX_LOGS,

            logLevel:

                CONFIG.LOG_LEVEL,

            console:

                CONFIG.LOG_TO_CONSOLE

        };

    }

    /*
    ======================================================
    Statistics
    ======================================================
    */

    getStatistics() {

        const statistics = {

            total:

                this.logs.length,

            levels: {},

            sources: {}

        };

        for (const log of this.logs) {

            statistics.levels[log.level] =

                (

                    statistics.levels[log.level]

                    ||

                    0

                ) + 1;

            statistics.sources[log.source] =

                (

                    statistics.sources[log.source]

                    ||

                    0

                ) + 1;

        }

        return statistics;

    }

    /*
    ======================================================
    Search
    ======================================================
    */

    getByLevel(level) {

        return this.logs.filter(

            log =>

                log.level === level

        );

    }

    getBySource(source) {

        return this.logs.filter(

            log =>

                log.source === source

        );

    }

    latest(count = 25) {

        return this.logs

            .slice(-count)

            .reverse();

    }

    /*
    ======================================================
    Maintenance
    ======================================================
    */

    clear() {

        this.logs = [];

        this.info(

            SOURCES.SYSTEM,

            "Logger history cleared."

        );

    }

    /*
    ======================================================
    Performance Timers
    ======================================================
    */

    startTimer(name) {

        this.timers.set(

            name,

            Date.now()

        );

    }

    endTimer(

        name,

        source = SOURCES.SYSTEM

    ) {

        if (

            !this.timers.has(name)

        ) {

            return null;

        }

        const started =

            this.timers.get(name);

        const duration =

            Date.now()

            -

            started;

        this.timers.delete(name);

        this.debug(

            source,

            `${name} completed`,

            {

                duration,

                unit: "ms"

            }

        );

        return duration;

    }

}
/*
==========================================================
Singleton
==========================================================
*/

const logger = new Logger();

/*
==========================================================
Expose Constants
==========================================================
*/

logger.LEVELS = LEVELS;

logger.SOURCES = SOURCES;

logger.CONFIG = CONFIG;

/*
==========================================================
Compatibility Methods
==========================================================

These aliases preserve compatibility with
earlier WealthBuilder OS releases while
providing a consistent API for all certified
routes and services.

==========================================================
*/

logger.getLogs = logger.getLogs.bind(logger);

logger.getHealth = logger.getHealth.bind(logger);

logger.getVersion = logger.getVersion.bind(logger);

logger.getStatistics =
    logger.getStatistics.bind(logger);

logger.getByLevel =
    logger.getByLevel.bind(logger);

logger.getBySource =
    logger.getBySource.bind(logger);

logger.latest =
    logger.latest.bind(logger);

logger.clear =
    logger.clear.bind(logger);

logger.startTimer =
    logger.startTimer.bind(logger);

logger.endTimer =
    logger.endTimer.bind(logger);

/*
==========================================================
Freeze Public Configuration
==========================================================
*/

Object.freeze(logger.LEVELS);

Object.freeze(logger.SOURCES);

Object.freeze(logger.CONFIG);

/*
==========================================================
Export
==========================================================
*/

module.exports = logger;

/*
==========================================================
ATLAS CERTIFICATION

WealthBuilder OS

File:
server/services/logger.js

Version:
3.1.0

Certification:
ATLAS CERTIFIED

Status:
Production Ready

Compatibility:
✓ Version 3.0
✓ Existing Services
✓ Existing Routes
✓ Existing API

Features
--------
✓ Enterprise Logger
✓ UUID Log Entries
✓ Structured Context
✓ Runtime Statistics
✓ Health Reporting
✓ Performance Timers
✓ Search API
✓ Compatibility Methods
✓ Memory Protection
✓ Railway Compatible
✓ Immutable Configuration

Approved For
------------
✓ Development
✓ Staging
✓ Production

==========================================================
*/
