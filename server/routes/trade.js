"use strict";

/*
==========================================================
WealthBuilder OS

Trade Route

Version : 1.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
HTTP API for trade execution.

Responsibilities
----------------
✓ BUY
✓ SELL
✓ Execute Trade
✓ Close Position
✓ Close All Positions
✓ Health
✓ Version

Business logic belongs exclusively to tradeService.
==========================================================
*/

const express = require("express");

const router = express.Router();

const logger = require("../services/logger");
const validationService = require("../services/validationService");
const tradeService = require("../services/tradeService");

/*
==========================================================
Response Helpers
==========================================================
*/

function sendSuccess(res, data, message = "Success") {

    return res.json({

        success: true,

        message,

        data

    });

}

function sendError(res, status, error) {

    return res.status(status).json({

        success: false,

        error

    });

}

/*
==========================================================
POST /execute
==========================================================
*/

router.post("/execute", async (req, res) => {

    try {

        validationService.validateTradeRequest(req.body);

        const result =
            await tradeService.executeTrade(req.body);

        return sendSuccess(

            res,

            result,

            result.message

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.EXECUTION,

            "Trade execution failed.",

            {

                error: error.message

            }

        );

        return sendError(

            res,

            400,

            error.message

        );

    }

});

/*
==========================================================
POST /buy
==========================================================
*/

router.post("/buy", async (req, res) => {

    try {

        const {

            symbol,

            stopLoss,

            takeProfit,

            riskPercent

        } = req.body;

        const result =

            await tradeService.openBuy(

                symbol,

                stopLoss,

                takeProfit,

                riskPercent

            );

        return sendSuccess(

            res,

            result,

            result.message

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.EXECUTION,

            "BUY failed.",

            {

                error: error.message

            }

        );

        return sendError(

            res,

            400,

            error.message

        );

    }

});

/*
==========================================================
POST /sell
==========================================================
*/

router.post("/sell", async (req, res) => {

    try {

        const {

            symbol,

            stopLoss,

            takeProfit,

            riskPercent

        } = req.body;

        const result =

            await tradeService.openSell(

                symbol,

                stopLoss,

                takeProfit,

                riskPercent

            );

        return sendSuccess(

            res,

            result,

            result.message

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.EXECUTION,

            "SELL failed.",

            {

                error: error.message

            }

        );

        return sendError(

            res,

            400,

            error.message

        );

    }

});

/*
==========================================================
POST /close
==========================================================
*/

router.post("/close", async (req, res) => {

    try {

        const { positionId } = req.body;

        if (!positionId) {

            return sendError(

                res,

                400,

                "positionId is required."

            );

        }

        const result =

            await tradeService.closePosition(

                positionId

            );

        return sendSuccess(

            res,

            result,

            result.message

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.EXECUTION,

            "Close position failed.",

            {

                error: error.message

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
POST /close-all
==========================================================
*/

router.post("/close-all", async (req, res) => {

    try {

        const result =

            await tradeService.closeAllPositions();

        return sendSuccess(

            res,

            result,

            "All positions processed."

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.EXECUTION,

            "Close all positions failed.",

            {

                error: error.message

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
GET /version
==========================================================
*/

router.get("/version", (req, res) => {

    return sendSuccess(

        res,

        {

            version:

                tradeService.getVersion()

        },

        "Trade Service Version"

    );

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

            service: "trade",

            status: "healthy",

            version:

                tradeService.getVersion()

        },

        "Trade Route Healthy"

    );

});

/*
==========================================================
Export
==========================================================
*/

module.exports = router;
