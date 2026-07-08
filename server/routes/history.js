"use strict";

/*
==========================================================
WealthBuilder OS

History Route

Version : 2.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides historical trade information retrieved
from MetaApi.

Responsibilities
----------------
✓ Trade History
✓ Historical Deal Retrieval
✓ MetaApi Integration
✓ Health Endpoint
✓ Version Endpoint
✓ Structured Responses
✓ Structured Logging

Business logic belongs exclusively to
MetaApi/history services.

==========================================================
*/

const express = require("express");

const router = express.Router();

const logger = require("../services/logger");

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
    error
) {

    return res.status(status).json({

        success: false,

        error

    });

}

/*
==========================================================
GET /
==========================================================
*/

router.get("/", async (req, res) => {

    try {

        const connection = req.connection;

        if (!connection) {

            return sendError(

                res,

                503,

                "MetaApi connection unavailable."

            );

        }

        logger.info(

            logger.SOURCES.HISTORY,

            "Trade history requested."

        );

        const startTime = new Date(

            Date.now() -

            90 * 24 * 60 * 60 * 1000

        );

        const endTime = new Date();

        const result =
            await connection.getDealsByTimeRange(

                startTime,

                endTime

            );

        const deals =

            Array.isArray(result)

                ? result

                : result?.deals ||

                  result?.items ||

                  result?.history ||

                  [];

        logger.info(

            logger.SOURCES.HISTORY,

            "Trade history retrieved.",

            {

                dealCount:

                    deals.length

            }

        );

        return sendSuccess(

            res,

            {

                startTime,

                endTime,

                dealCount:

                    deals.length,

                deals

            },

            "Trade history retrieved."

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.HISTORY,

            "Trade history retrieval failed.",

            {

                error:

                    error.message

            }

        );

        return sendError(

            res,

            500,

            error.message

        );

    }

});

/*
==========================================================
GET /health
==========================================================
*/

router.get("/health", (req, res) => {

    return sendSuccess(

        res,

        {

            service: "history",

            status:

                req.connection
                    ? "READY"
                    : "DISCONNECTED",

            version: "2.0.0"

        },

        "History route healthy."

    );

});

/*
==========================================================
GET /version
==========================================================
*/

router.get("/version", (req, res) => {

    return sendSuccess(

        res,

        {

            version: "2.0.0"

        },

        "History Route Version"

    );

});

/*
==========================================================
Export
==========================================================
*/

module.exports = router;
