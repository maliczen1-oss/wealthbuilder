"use strict";

/*
==========================================================
WealthBuilder OS

Trade Service

Version : 2.1.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Central execution engine for WealthBuilder.

Responsibilities
----------------
✓ Market BUY
✓ Market SELL
✓ Pending Order Framework
✓ AI Optimisation Framework
✓ Trade Clustering Framework
✓ Risk Validation
✓ Position Validation
✓ Market Validation
✓ Structured Execution
✓ Audit Logging

Future
------
- AI Learning
- Pending Order Execution
- Portfolio Optimisation
- Replay Intelligence

==========================================================
*/

const crypto = require("node:crypto");

const logger = require("./logger");
const metaapi = require("./metaapi");

const validationService = require("./validationService");
const accountService = require("./accountService");
const positionService = require("./positionService");
const symbolService = require("./symbolService");
const marketService = require("./marketService");
const riskService = require("./riskService");
const aiOptimisationService = require("./aiOptimisationService");
const tradeClusterService = require("./tradeClusterService");

/*
==========================================================
Execution Locks
==========================================================
*/

const executionLocks = new Map();

/*
==========================================================
Trade Service
==========================================================
*/

class TradeService {

    constructor() {

        this.VERSION = "2.1.0";

    }

    /*
    ======================================================
    Response Factory
    ======================================================
    */

    createResponse() {

        return {

            success: false,

            transactionId: null,

            clusterId: null,

            orderId: null,

            positionId: null,

            action: null,

            requestedSymbol: null,

            symbol: null,

            volume: 0,

            entryPrice: null,

            stopLoss: null,

            takeProfit: null,

            confidence: null,

            executionType: null,

            executedAt: null,

            warnings: [],

            message: ""

        };

    }

    /*
    ======================================================
    Transaction ID
    ======================================================
    */

    createTransactionId() {

        return crypto.randomUUID();

    }

    /*
    ======================================================
    Trade Cluster
    ======================================================
    */

    createClusterId(symbol) {

        const date = new Date()
            .toISOString()
            .substring(0,10);

        return `CLUSTER-${symbol}-${date}`;

    }

    /*
    ======================================================
    AI Optimisation
    (Framework V1)
    ======================================================
    */

    async optimiseTrade(request) {

        return {

            approved: true,

            confidence: 80,

            adjustments: {

                riskPercent:
                    request.riskPercent,

                stopLoss:
                    request.stopLoss,

                takeProfit:
                    request.takeProfit

            },

            warnings: []

        };

    }

    /*
    ======================================================
    Execution Lock
    ======================================================
    */

    async withExecutionLock(key, callback) {

        if (executionLocks.has(key)) {

            throw new Error(
                "Trade execution already in progress."
            );

        }

        executionLocks.set(key, true);

        try {

            return await callback();

        }

        finally {

            executionLocks.delete(key);

        }

    }

    /*
    ======================================================
    Execute Trade
    ======================================================
    */

    async executeTrade(request) {

        const response =
            this.createResponse();

        response.transactionId =
            this.createTransactionId();

        response.action =
            request.action;

        response.requestedSymbol =
            request.symbol;

        response.executionType =
            request.executionType || "MARKET";

        logger.info(

            logger.SOURCES.EXECUTION,

            "Trade execution requested.",

            {

                transactionId:
                    response.transactionId,

                action:
                    request.action,

                symbol:
                    request.symbol

            }

        );

        /*
        ======================================================
        Validation
        ======================================================
        */

        validationService.validateTradeRequest(request);

        /*
        ======================================================
        AI Optimisation
        ======================================================
        */

        const optimisation =
            await this.optimiseTrade(request);

        response.confidence =
            optimisation.confidence;

        response.warnings.push(
            ...optimisation.warnings
        );

        if (!optimisation.approved) {

            response.message =
                "AI optimisation rejected trade.";

            return response;

        }

        /*
        ======================================================
        Resolve Broker Symbol
        ======================================================
        */

        const symbol =
            await symbolService.findSymbol(
                request.symbol
            );

        if (!symbol) {

            throw new Error(

                `Unable to resolve trading symbol '${request.symbol}'.`

            );

        }

        response.symbol = symbol;

        /*
        ======================================================
        Trade Cluster
        ======================================================
        */

        response.clusterId =
            this.createClusterId(symbol);

        /*
        ======================================================
        Market Snapshot
        ======================================================
        */

        const market =
            await marketService
                .getMarketSnapshot(symbol);

        /*
        ======================================================
        Account Information
        ======================================================
        */

        const account =
            await accountService.getAccount();

        /*
        ======================================================
        Risk Calculation
        ======================================================
        */

        const volume =
            await riskService.calculateLotSize(

                request.stopLoss,

                market.contractSize,

                optimisation.adjustments.riskPercent

            );

        response.volume = volume;

        /*
        ======================================================
        Duplicate Position Check
        ======================================================
        */

        if (
            request.preventDuplicate !== false &&
            await positionService.hasOpenPosition(symbol)
        ) {

            throw new Error(

                `${symbol} already has an open position.`

            );

        }

        /*
        ======================================================
        Maximum Positions
        ======================================================
        */

        if (
            !(await positionService.canOpenPosition())
        ) {

            throw new Error(

                "Maximum open positions reached."

            );

        }

        /*
        ======================================================
        Execution Lock
        ======================================================
        */

        const lockKey = [

            account.login || "ACCOUNT",

            symbol,

            request.action

        ].join(":");

        return this.withExecutionLock(

            lockKey,

            async () => {

                const connection =
                    await metaapi.getConnection();

                /*
                ==============================================
                Pending Order Router
                ==============================================
                */

                if (
                    response.executionType !==
                    "MARKET"
                ) {

                    return {

                        success: false,

                        transactionId:
                            response.transactionId,

                        clusterId:
                            response.clusterId,

                        message:
                            "Pending order framework ready. Execution will be enabled in Version 3."

                    };

                }

                /*
                ==============================================
                Market Execution
                ==============================================
                */

                let execution;

                /*
                ==============================================
                BUY
                ==============================================
                */

                if (request.action === "BUY") {

                    execution =
                        await connection.createMarketBuyOrder(

                            symbol,

                            volume,

                            optimisation.adjustments.stopLoss,

                            optimisation.adjustments.takeProfit,

                            request.comment ||
                            "WealthBuilder"

                        );

                }

                /*
                ==============================================
                SELL
                ==============================================
                */

                else if (request.action === "SELL") {

                    execution =
                        await connection.createMarketSellOrder(

                            symbol,

                            volume,

                            optimisation.adjustments.stopLoss,

                            optimisation.adjustments.takeProfit,

                            request.comment ||
                            "WealthBuilder"

                        );

                }

                else {

                    throw new Error(

                        `Unsupported trade action '${request.action}'.`

                    );

                }

                /*
                ==============================================
                Refresh Position Cache
                ==============================================
                */

                positionService.clearCache();

                /*
                ==============================================
                Response
                ==============================================
                */

                response.success = true;

                response.orderId =
                    execution.orderId ||
                    execution.id ||
                    null;

                response.positionId =
                    execution.positionId ||
                    null;

                response.entryPrice =
                    execution.price ||
                    null;

                response.stopLoss =
                    optimisation.adjustments.stopLoss;

                response.takeProfit =
                    optimisation.adjustments.takeProfit;

                response.executedAt =
                    new Date().toISOString();

                response.message =
                    `${request.action} market order executed successfully.`;

                logger.success(

                    logger.SOURCES.EXECUTION,

                    response.message,

                    {

                        transactionId:
                            response.transactionId,

                        clusterId:
                            response.clusterId,

                        orderId:
                            response.orderId,

                        symbol,

                        volume,

                        confidence:
                            response.confidence

                    }

                );

                return response;

            }

        );

    }

    /*
    ======================================================
    BUY
    ======================================================
    */

    async openBuy(

        symbol,

        stopLoss,

        takeProfit,

        riskPercent = 1

    ) {

        return this.executeTrade({

            action: "BUY",

            executionType: "MARKET",

            symbol,

            stopLoss,

            takeProfit,

            riskPercent

        });

    }

    /*
    ======================================================
    SELL
    ======================================================
    */

    async openSell(

        symbol,

        stopLoss,

        takeProfit,

        riskPercent = 1

    ) {

        return this.executeTrade({

            action: "SELL",

            executionType: "MARKET",

            symbol,

            stopLoss,

            takeProfit,

            riskPercent

        });

    }

    /*
    ======================================================
    Close Position
    ======================================================
    */

    async closePosition(positionId) {

        const response = this.createResponse();

        try {

            const connection = await metaapi.getConnection();

            await connection.closePosition(positionId);

            positionService.clearCache();

            response.success = true;
            response.positionId = positionId;
            response.executedAt = new Date().toISOString();
            response.message = "Position closed successfully.";

            logger.success(
                logger.SOURCES.EXECUTION,
                response.message,
                {
                    positionId
                }
            );

            return response;

        } catch (error) {

            logger.error(
                logger.SOURCES.EXECUTION,
                "Failed to close position.",
                {
                    positionId,
                    error: error.message
                }
            );

            response.message = error.message;

            return response;

        }

    }

    /*
    ======================================================
    Close All Positions
    ======================================================
    */

    async closeAllPositions() {

        const positions =
            await positionService.getPositions();

        const results = [];

        for (const position of positions) {

            results.push(

                await this.closePosition(
                    position.id
                )

            );

        }

        return results;

    }

    /*
    ======================================================
    Service Information
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

module.exports = new TradeService();
