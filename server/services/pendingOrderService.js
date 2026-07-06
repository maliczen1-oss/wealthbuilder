"use strict";

/*
==========================================================
WealthBuilder OS

Pending Order Service

Version : 1.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Centralized pending order management.

Responsibilities
----------------
✓ BUY_LIMIT
✓ SELL_LIMIT
✓ BUY_STOP
✓ SELL_STOP
✓ Modify Pending Orders
✓ Cancel Pending Orders
✓ Retrieve Pending Orders
✓ Validation
✓ Audit Logging

==========================================================
*/

const crypto = require("node:crypto");

const logger = require("./logger");
const metaapi = require("./metaapi");

const validationService = require("./validationService");
const symbolService = require("./symbolService");
const marketService = require("./marketService");

/*
==========================================================
Supported Order Types
==========================================================
*/

const ORDER_TYPES = {

    BUY_LIMIT: "BUY_LIMIT",

    SELL_LIMIT: "SELL_LIMIT",

    BUY_STOP: "BUY_STOP",

    SELL_STOP: "SELL_STOP"

};

/*
==========================================================
Pending Order Service
==========================================================
*/

class PendingOrderService {

    constructor() {

        this.VERSION = "1.0.0";

    }

    /*
    ======================================================
    Response Factory
    ======================================================
    */

    createResponse() {

        return {

            success: false,

            requestId: crypto.randomUUID(),

            orderId: null,

            symbol: null,

            orderType: null,

            volume: 0,

            entryPrice: null,

            stopLoss: null,

            takeProfit: null,

            createdAt: null,

            message: "",

            warnings: []

        };

    }

    /*
    ======================================================
    Supported Types
    ======================================================
    */

    getSupportedOrderTypes() {

        return Object.values(

            ORDER_TYPES

        );

    }

    /*
    ======================================================
    Validation
    ======================================================
    */

    async validateRequest(request) {

        validationService.validateTradeRequest(

            request

        );

        if (

            !this.getSupportedOrderTypes()

                .includes(request.orderType)

        ) {

            throw new Error(

                `Unsupported pending order type '${request.orderType}'.`

            );

        }

        const symbol =

            await symbolService.findSymbol(

                request.symbol

            );

        if (!symbol) {

            throw new Error(

                `Unable to resolve trading symbol '${request.symbol}'.`

            );

        }

        const market =

            await marketService.getMarketSnapshot(

                symbol

            );

        return {

            symbol,

            market

        };

    }

    /*
    ======================================================
    Place Pending Order
    ======================================================
    */

    async placePendingOrder(request) {

        const response =

            this.createResponse();

        logger.info(

            logger.SOURCES.EXECUTION,

            "Pending order requested.",

            {

                symbol: request.symbol,

                type: request.orderType

            }

        );

        /*
        ======================================================
        Validation
        ======================================================
        */

        const {

            symbol,

            market

        } = await this.validateRequest(request);

        const connection =
            await metaapi.getConnection();

        let execution;

        /*
        ======================================================
        Pending Order Routing
        ======================================================
        */

        switch (request.orderType) {

            case ORDER_TYPES.BUY_LIMIT:

                execution =
                    await connection.createLimitBuyOrder(

                        symbol,

                        request.volume,

                        request.entryPrice,

                        request.stopLoss,

                        request.takeProfit,

                        request.comment || "WealthBuilder"

                    );

                break;

            case ORDER_TYPES.SELL_LIMIT:

                execution =
                    await connection.createLimitSellOrder(

                        symbol,

                        request.volume,

                        request.entryPrice,

                        request.stopLoss,

                        request.takeProfit,

                        request.comment || "WealthBuilder"

                    );

                break;

            case ORDER_TYPES.BUY_STOP:

                execution =
                    await connection.createStopBuyOrder(

                        symbol,

                        request.volume,

                        request.entryPrice,

                        request.stopLoss,

                        request.takeProfit,

                        request.comment || "WealthBuilder"

                    );

                break;

            case ORDER_TYPES.SELL_STOP:

                execution =
                    await connection.createStopSellOrder(

                        symbol,

                        request.volume,

                        request.entryPrice,

                        request.stopLoss,

                        request.takeProfit,

                        request.comment || "WealthBuilder"

                    );

                break;

            default:

                throw new Error(

                    `Unsupported pending order type '${request.orderType}'.`

                );

        }

        /*
        ======================================================
        Response
        ======================================================
        */

        response.success = true;

        response.orderId =
            execution.orderId ||
            execution.id ||
            null;

        response.symbol = symbol;

        response.orderType =
            request.orderType;

        response.volume =
            request.volume;

        response.entryPrice =
            request.entryPrice;

        response.stopLoss =
            request.stopLoss;

        response.takeProfit =
            request.takeProfit;

        response.createdAt =
            new Date().toISOString();

        response.message =
            "Pending order placed successfully.";

        logger.success(

            logger.SOURCES.EXECUTION,

            response.message,

            {

                orderId:
                    response.orderId,

                symbol,

                orderType:
                    request.orderType

            }

        );

        return response;

    }

    /*
    ======================================================
    Modify Pending Order
    ======================================================
    */

    async modifyPendingOrder(orderId, updates) {

        const connection =
            await metaapi.getConnection();

        await connection.modifyOrder(

            orderId,

            updates

        );

        logger.info(

            logger.SOURCES.EXECUTION,

            "Pending order modified.",

            {

                orderId

            }

        );

        return true;

    }

    /*
    ======================================================
    Cancel Pending Order
    ======================================================
    */

    async cancelPendingOrder(orderId) {

        const connection =
            await metaapi.getConnection();

        await connection.cancelOrder(

            orderId

        );

        logger.info(

            logger.SOURCES.EXECUTION,

            "Pending order cancelled.",

            {

                orderId

            }

        );

        return true;

    }

    /*
    ======================================================
    Get Pending Orders
    ======================================================
    */

    async getPendingOrders() {

        const connection =
            await metaapi.getConnection();

        return connection.getOrders();

    }

    /*
    ======================================================
    Get Pending Order
    ======================================================
    */

    async getPendingOrder(orderId) {

        const orders =
            await this.getPendingOrders();

        return (

            orders.find(

                order =>

                    order.id === orderId ||

                    order.orderId === orderId

            ) || null

        );

    }

    /*
    ======================================================
    Cancel All Pending Orders
    ======================================================
    */

    async cancelAllPendingOrders() {

        const orders = await this.getPendingOrders();

        let cancelled = 0;

        for (const order of orders) {

            try {

                await this.cancelPendingOrder(

                    order.id || order.orderId

                );

                cancelled++;

            }

            catch (error) {

                logger.warning(

                    logger.SOURCES.EXECUTION,

                    "Unable to cancel pending order.",

                    {

                        orderId:

                            order.id ||

                            order.orderId,

                        error:

                            error.message

                    }

                );

            }

        }

        logger.info(

            logger.SOURCES.EXECUTION,

            "Pending order cleanup complete.",

            {

                cancelled

            }

        );

        return cancelled;

    }

    /*
    ======================================================
    Health
    ======================================================
    */

    async getHealth() {

        try {

            const orders =

                await this.getPendingOrders();

            return {

                service:

                    "PendingOrderService",

                version:

                    this.VERSION,

                status:

                    "READY",

                supportedTypes:

                    this.getSupportedOrderTypes(),

                pendingOrders:

                    orders.length

            };

        }

        catch (error) {

            return {

                service:

                    "PendingOrderService",

                version:

                    this.VERSION,

                status:

                    "ERROR",

                error:

                    error.message

            };

        }

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

module.exports = new PendingOrderService();
