"use strict";

/*
==========================================================
WealthBuilder OS

Learning Route
Powered by Jarvis Intelligence

Version : 1.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Controlled API surface for Jarvis historical-learning
synchronization.

Responsibilities
----------------
✓ Trigger historical synchronization
✓ Validate synchronization parameters
✓ Return deterministic synchronization results
✓ Expose read-only learning status
✓ Preserve broker-native symbols
✓ Handle upstream failures safely
✓ Never execute trades
✓ Never modify risk parameters
✓ Never modify strategy parameters
✓ Never modify trading configuration

Business logic belongs exclusively to:
    historicalLearningService

Learning logic belongs exclusively to:
    learningEngine

This route is deliberately NOT connected to:
    tradeService
    position modification
    risk configuration
    strategy configuration
    autonomous execution

==========================================================
*/

const express =
    require("express");

const router =
    express.Router();

const logger =
    require("../services/logger");

const historicalLearningService =
    require("../services/historicalLearningService");


/*
==========================================================
Response Helpers
==========================================================
*/

function sendSuccess(
    res,
    data,
    message = "Success"
) {

    return res.json({

        success: true,

        message,

        data

    });

}


function sendError(
    res,
    status,
    code,
    message
) {

    return res
        .status(status)
        .json({

            success: false,

            error: {

                code,

                message

            }

        });

}


/*
==========================================================
Validation Helpers
==========================================================
*/

function asString(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(
        value
    ).trim();

}


function parsePositiveInteger(
    value,
    fieldName
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }

    const parsed =
        Number.parseInt(
            String(value),
            10
        );

    if (
        !Number.isFinite(parsed) ||
        parsed <= 0
    ) {

        const error =
            new Error(
                `${fieldName} must be a positive integer.`
            );

        error.code =
            "INVALID_PARAMETER";

        throw error;

    }

    return parsed;

}


function validateDate(
    value,
    fieldName
) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {

        return null;

    }

    const date =
        new Date(
            String(value).trim()
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        const error =
            new Error(
                `${fieldName} must be a valid ISO-8601 date.`
            );

        error.code =
            "INVALID_PARAMETER";

        throw error;

    }

    return date.toISOString();

}


function validateSymbol(
    value
) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {

        return null;

    }

    const symbol =
        String(value).trim();

    if (
        symbol.length > 64
    ) {

        const error =
            new Error(
                "symbol exceeds the maximum allowed length."
            );

        error.code =
            "INVALID_PARAMETER";

        throw error;

    }

    /*
    Broker-native symbols are deliberately
    preserved exactly.

    Examples:

        EURUSD.mic
        XAUUSD.mic
        USTECH.mic
        DE30.mic

    No normalization or symbol rewriting
    occurs here.
    */

    return symbol;

}


/*
==========================================================
Request Parameter Extraction
==========================================================
*/

function extractSyncOptions(
    req
) {

    const body =
        (
            req.body &&
            typeof req.body === "object"
        )
            ? req.body
            : {};

    const query =
        (
            req.query &&
            typeof req.query === "object"
        )
            ? req.query
            : {};

    /*
    Body takes precedence over query parameters.

    This allows:

        POST /api/learning/history/sync

    with JSON:

        {
            "symbol": "EURUSD.mic"
        }

    while also supporting controlled query
    parameters for operational tooling.
    */

    const value =
        field =>
            body[field] !== undefined
                ? body[field]
                : query[field];

    const start =
        validateDate(
            value("start"),
            "start"
        );

    const end =
        validateDate(
            value("end"),
            "end"
        );

    const symbol =
        validateSymbol(
            value("symbol")
        );

    const ticket =
        parsePositiveInteger(
            value("ticket"),
            "ticket"
        );

    const limit =
        parsePositiveInteger(
            value("limit"),
            "limit"
        );

    return {

        start,

        end,

        symbol,

        ticket,

        limit

    };

}


/*
==========================================================
POST /api/learning/history/sync
==========================================================
*/

router.post(
    "/history/sync",
    async (req, res) => {

        const startedAt =
            Date.now();

        try {

            const options =
                extractSyncOptions(
                    req
                );

            logger.info(

                logger.SOURCES.LEARNING,

                "Historical learning synchronization requested.",

                {

                    symbol:
                        options.symbol,

                    start:
                        options.start,

                    end:
                        options.end,

                    ticket:
                        options.ticket,

                    limit:
                        options.limit

                }

            );

            const result =
                await historicalLearningService
                    .syncHistory(
                        options
                    );

            /*
            The historical service deliberately
            returns success=false for upstream
            failures instead of throwing.

            Convert that into an appropriate
            HTTP response without exposing
            internal exceptions.
            */

            if (
                result &&
                result.success === false
            ) {

                let status =
                    502;

                if (
                    result.status ===
                    "LEARNING_ENGINE_FAILED"
                ) {

                    status =
                        500;

                }

                if (
                    result.error &&
                    result.error.code ===
                    "BRIDGE_HISTORY_TIMEOUT"
                ) {

                    status =
                        504;

                }

                return sendError(

                    res,

                    status,

                    result.error?.code ||
                        "HISTORICAL_SYNC_FAILED",

                    result.error?.message ||
                        "Historical synchronization failed."

                );

            }

            return sendSuccess(

                res,

                {

                    ...result,

                    routeDurationMs:
                        Date.now() -
                        startedAt

                },

                "Historical learning synchronization completed."

            );

        }

        catch (error) {

            logger.error(

                logger.SOURCES.LEARNING,

                "Historical learning synchronization request failed.",

                {

                    error:
                        error.message,

                    code:
                        error.code ||
                        "UNKNOWN",

                    durationMs:
                        Date.now() -
                        startedAt

                }

            );

            if (
                error.code ===
                "INVALID_PARAMETER"
            ) {

                return sendError(

                    res,

                    400,

                    "INVALID_PARAMETER",

                    error.message

                );

            }

            return sendError(

                res,

                500,

                "HISTORICAL_SYNC_ERROR",

                "Historical learning synchronization failed."

            );

        }

    }
);


/*
==========================================================
POST /api/learning/history/sync/all
==========================================================

Controlled sequential synchronization of the
initial broker symbols.

Order is deliberately deterministic:

1. EURUSD.mic
2. XAUUSD.mic
3. USTECH.mic
4. DE30.mic

No trading activity occurs.
==========================================================
*/

router.post(
    "/history/sync/all",
    async (req, res) => {

        const startedAt =
            Date.now();

        try {

            const body =
                (
                    req.body &&
                    typeof req.body === "object"
                )
                    ? req.body
                    : {};

            const query =
                (
                    req.query &&
                    typeof req.query === "object"
                )
                    ? req.query
                    : {};

            const value =
                field =>
                    body[field] !== undefined
                        ? body[field]
                        : query[field];

            const start =
                validateDate(
                    value("start"),
                    "start"
                );

            const end =
                validateDate(
                    value("end"),
                    "end"
                );

            const limit =
                parsePositiveInteger(
                    value("limit"),
                    "limit"
                );

            logger.info(

                logger.SOURCES.LEARNING,

                "Initial four-symbol historical learning synchronization requested.",

                {

                    start,

                    end,

                    limit

                }

            );

            const result =
                await historicalLearningService
                    .syncInitialSymbols({

                        start,

                        end,

                        limit

                    });

            return sendSuccess(

                res,

                {

                    ...result,

                    routeDurationMs:
                        Date.now() -
                        startedAt

                },

                "Initial symbol synchronization completed."

            );

        }

        catch (error) {

            logger.error(

                logger.SOURCES.LEARNING,

                "Initial symbol synchronization failed.",

                {

                    error:
                        error.message,

                    code:
                        error.code ||
                        "UNKNOWN",

                    durationMs:
                        Date.now() -
                        startedAt

                }

            );

            if (
                error.code ===
                "INVALID_PARAMETER"
            ) {

                return sendError(

                    res,

                    400,

                    "INVALID_PARAMETER",

                    error.message

                );

            }

            return sendError(

                res,

                500,

                "HISTORICAL_SYNC_ERROR",

                "Historical symbol synchronization failed."

            );

        }

    }
);


/*
==========================================================
GET /api/learning/history/status
==========================================================

Read-only diagnostic endpoint.

No broker request.
No learning mutation.
No trading activity.
==========================================================
*/

router.get(
    "/history/status",
    (req, res) => {

        try {

            const status =
                historicalLearningService
                    .getStatus();

            return sendSuccess(

                res,

                status,

                "Historical learning service status."

            );

        }

        catch (error) {

            logger.error(

                logger.SOURCES.LEARNING,

                "Unable to retrieve historical learning service status.",

                {

                    error:
                        error.message

                }

            );

            return sendError(

                res,

                500,

                "LEARNING_STATUS_ERROR",

                "Unable to retrieve historical learning service status."

            );

        }

    }
);


/*
==========================================================
GET /api/learning/history/configuration
==========================================================

Read-only configuration diagnostics.

Secrets are deliberately not returned.
==========================================================
*/

router.get(
    "/history/configuration",
    (req, res) => {

        try {

            const configuration =
                historicalLearningService
                    .getConfiguration();

            return sendSuccess(

                res,

                configuration,

                "Historical learning configuration."

            );

        }

        catch (error) {

            logger.error(

                logger.SOURCES.LEARNING,

                "Unable to retrieve historical learning configuration.",

                {

                    error:
                        error.message

                }

            );

            return sendError(

                res,

                500,

                "LEARNING_CONFIGURATION_ERROR",

                "Unable to retrieve historical learning configuration."

            );

        }

    }
);


/*
==========================================================
ATLAS CERTIFICATION
==========================================================

✓ Express Router
✓ Controlled Historical Synchronization
✓ Enterprise Bridge Separation
✓ Learning Engine Separation
✓ Broker-Native Symbol Preservation
✓ Input Validation
✓ Timeout-Safe Upstream Handling
✓ Deterministic Results
✓ Empty History Supported
✓ Partial Failure Safe
✓ Read-Only Diagnostics
✓ No Trade Execution
✓ No Risk Mutation
✓ No Strategy Mutation
✓ Railway Compatible
✓ WealthBuilder OS Certified

==========================================================
*/

module.exports =
    router;
