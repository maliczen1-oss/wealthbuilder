/*
==========================================================
WealthBuilder OS
Trade Service

Version : 2.0.0
Status  : Production
Powered by Jarvis Intelligence

Purpose:
Central trading service responsible for executing
validated trades.

All trade requests pass through this service.

==========================================================
*/

const brokerGateway = require("./brokerGateway");
const validationService = require("./validationService");
const positionService = require("./positionService");
const riskService = require("./riskService");
const logger = require("./logger");

class TradeService {

    constructor() {

        this.VERSION = "2.0.0";

    }

    /*
    ======================================================
    Response Factory
    ======================================================
    */

    createResponse() {

        return {

            success: false,

            action: null,

            symbol: null,

            volume: 0,

            tradeId: null,

            validation: null,

            execution: null,

            message: ""

        };

    }

    /*
    ======================================================
    Core Trade Execution
    ======================================================
    */

    async executeTrade({

        action,

        symbol,

        stopLoss,

        takeProfit,

        riskPercent = 1

    }) {

        const response =

            this.createResponse();

        response.action = action;

        response.symbol = symbol;

        logger.info(

            logger.SOURCES.EXECUTION,

            "Trade execution requested.",

            {

                action,

                symbol,

                riskPercent

            }

        );

        /*
        Stage 2 will continue here...
        */

        return response;

    }
        const transactionId =

            `TX-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase()}`;

        response.transactionId = transactionId;

        /*
        --------------------------------------
        Validation
        --------------------------------------
        */

        const validation =

            validationService.validateTrade({

                action,

                volume: 1

            });

        response.validation = validation;

        if (!validation.valid) {

            response.message =

                "Trade validation failed.";

            logger.warning(

                logger.SOURCES.EXECUTION,

                response.message,

                {

                    transactionId,

                    validation

                }

            );

            return response;

        }

        /*
        --------------------------------------
        Position Checks
        --------------------------------------
        */

        if (

            !(await positionService.canOpenPosition())

        ) {

            throw new Error(

                "Maximum number of positions reached."

            );

        }

        if (

            await positionService.hasOpenPosition(

                symbol

            )

        ) {

            throw new Error(

                `${symbol} already has an open position.`

            );

        }

        /*
        --------------------------------------
        Lot Size
        --------------------------------------
        */

        const volume =

            await riskService.calculateLotSize(

                stopLoss,

                10,

                riskPercent

            );

        response.volume = volume;

        /*
        --------------------------------------
        Broker Connection
        --------------------------------------
        */

        const connection =

            brokerGateway.connection;

        if (!connection) {

            throw new Error(

                "Broker connection unavailable."

            );

        }

        response.execution = {

            transactionId,

            ready: true

        };
