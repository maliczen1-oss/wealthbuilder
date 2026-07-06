"use strict";

/*
==========================================================
WealthBuilder OS

Automation Engine

Version : 2.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Central orchestration engine for automated trading.

Responsibilities
----------------
✓ Start / Stop automation
✓ Pause /Resume automation
✓ Session management
✓ Strategy execution
✓ Trading readiness
✓ Daily risk enforcement
✓ Emergency stop hook
✓ Dashboard status
✓ Replay event publishing

==========================================================
*/

const logger = require("./logger");
const tradeService = require("./tradeService");
const accountService = require("./accountService");
const positionService = require("./positionService");
const marketService = require("./marketService");
const pendingOrderService = require("./pendingOrderService");

/*
==========================================================
Engine State
==========================================================
*/

const state = {

    running: false,

    paused: false,

    emergencyStop: false,

    currentStrategy: null,

    startedAt: null,

    lastExecution: null,

    executionCount: 0,

    dailyProfit: 0,

    dailyLoss: 0,

    statistics: {
        executions: 0,
        successful: 0,
        failed: 0
    }

};

/*
==========================================================
Automation Engine
==========================================================
*/

class AutomationEngine {

    constructor() {

        this.VERSION = "2.0.0";

    }

    /*
    ======================================================
    Start
    ======================================================
    */

    async start(strategy = "DEFAULT") {

        if (state.running) {

            return this.getStatus();

        }

        state.running = true;
        state.paused = false;
        state.currentStrategy = strategy;
        state.startedAt = new Date().toISOString();

        logger.success(

            logger.SOURCES.AUTOMATION,

            "Automation engine started.",

            {

                strategy

            }

        );

        return this.getStatus();

    }

    /*
    ======================================================
    Stop
    ======================================================
    */

    async stop() {

        state.running = false;
        state.paused = false;

        logger.info(

            logger.SOURCES.AUTOMATION,

            "Automation engine stopped."

        );

        return this.getStatus();

    }

    /*
    ======================================================
    Pause
    ======================================================
    */

    pause() {

        state.paused = true;

        logger.info(

            logger.SOURCES.AUTOMATION,

            "Automation paused."

        );

        return this.getStatus();

    }

    /*
    ======================================================
    Resume
    ======================================================
    */

    resume() {

        state.paused = false;

        logger.info(

            logger.SOURCES.AUTOMATION,

            "Automation resumed."

        );

        return this.getStatus();

    }

    /*
    ======================================================
    Emergency Stop
    ======================================================
    */

    emergencyStop(reason = "Manual") {

        state.running = false;
        state.paused = false;
        state.emergencyStop = true;

        logger.warning(

            logger.SOURCES.AUTOMATION,

            "Emergency stop activated.",

            {

                reason

            }

        );

        return this.getStatus();

    }

    /*
    ======================================================
    Reset Emergency Stop
    ======================================================
    */

    resetEmergencyStop() {

        state.emergencyStop = false;

        logger.info(

            logger.SOURCES.AUTOMATION,

            "Emergency stop cleared."

        );

    }

    /*
    ======================================================
    Status
    ======================================================
    */

    getStatus() {

        return {

            version: this.VERSION,

            ...state

        };

    }

    /*
    ======================================================
    Running
    ======================================================
    */

    isRunning() {

        return (

            state.running &&
            !state.paused &&
            !state.emergencyStop

        );

    }

    /*
    ======================================================
    Trading Session Validation
    ======================================================
    */

    isTradingSessionOpen(date = new Date()) {

        const hour = date.getUTCHours();

        /*
        London:
        07:00 - 16:00 UTC

        New York:
        12:00 - 21:00 UTC
        */

        const london =
            hour >= 7 && hour < 16;

        const newYork =
            hour >= 12 && hour < 21;

        return london || newYork;

    }

    /*
    ======================================================
    Readiness Check
    ======================================================
    */

    async isReady() {

        if (!this.isRunning()) {

            return false;

        }

        if (!this.isTradingSessionOpen()) {

            logger.info(

                logger.SOURCES.AUTOMATION,

                "Trading session closed."

            );

            return false;

        }

        try {

            await accountService.getAccount();

            return true;

        }

        catch (error) {

            logger.error(

                logger.SOURCES.AUTOMATION,

                "Automation readiness failed.",

                {

                    error: error.message

                }

            );

            return false;

        }

    }

    /*
    ======================================================
    Execute Strategy
    ======================================================
    */

    async executeStrategy(strategy) {

        if (!(await this.isReady())) {

            return {

                success: false,

                message:
                    "Automation engine not ready."

            };

        }

        const executionType =
            strategy.executionType || "MARKET";

        logger.info(

            logger.SOURCES.AUTOMATION,

            "Executing strategy.",

            {

                strategy:
                    state.currentStrategy,

                executionType,

                action:
                    strategy.action,

                symbol:
                    strategy.symbol

            }

        );

        const positions =
            await positionService.getPositionCount();

        /*
        ==============================================
        Daily Protection
        ==============================================
        */

        if (positions >= 4) {

            return {

                success: false,

                message:
                    "Maximum open positions reached."

            };

        }

        /*
        ==============================================
        Market Validation
        ==============================================
        */

        const snapshot =
            await marketService.getMarketSnapshot(
                strategy.symbol
            );

        if (!snapshot) {

            return {

                success: false,

                message:
                    "Market snapshot unavailable."

            };

        }

        /*
        ==============================================
        Execute Through Trading Core
        ==============================================
        */

        let result;

        if (executionType === "MARKET") {

            if (strategy.action === "BUY") {

                result = await tradeService.openBuy(

                    strategy.symbol,

                    strategy.stopLoss,

                    strategy.takeProfit,

                    strategy.riskPercent

                );

            }

            else if (strategy.action === "SELL") {

                result = await tradeService.openSell(

                    strategy.symbol,

                    strategy.stopLoss,

                    strategy.takeProfit,

                    strategy.riskPercent

                );

            }

            else {

                return {

                    success: false,

                    message:

                        `Unsupported market action '${strategy.action}'.`

                };

            }

        }

        else if (

            [

                "BUY_LIMIT",

                "SELL_LIMIT",

                "BUY_STOP",

                "SELL_STOP"

            ].includes(executionType)

        ) {

            result = await pendingOrderService.placePendingOrder({

                orderType: executionType,

                symbol: strategy.symbol,

                volume: strategy.volume,

                entryPrice: strategy.entryPrice,

                stopLoss: strategy.stopLoss,

                takeProfit: strategy.takeProfit,

                riskPercent: strategy.riskPercent,

                strategy: strategy.name,

                session: strategy.session,

                comment:

                    strategy.comment ||

                    "WealthBuilder Automation"

            });

        }

        else {

            return {
                success: false,
                message: `Unsupported execution type '${executionType}'.`
            };

        }

        /*
        ======================================================
        Statistics
        ======================================================
        */

        state.statistics.executions++;

        if (result && result.success) {

            state.statistics.successful++;

        }

        else {

            state.statistics.failed++;

        }

        // keep lastExecution timestamp for visibility
        state.lastExecution = new Date().toISOString();

        logger.success(

            logger.SOURCES.AUTOMATION,

            "Strategy execution completed.",

            {

                strategy:

                    state.currentStrategy,

                executionType,

                success:

                    result.success

            }

        );

        return result;

    }

    /*
    ======================================================
    Publish Event
    ======================================================
    */

    publishEvent(type, payload = {}) {

        logger.info(

            logger.SOURCES.AUTOMATION,

            `Automation Event: ${type}`,

            payload

        );

        /*
        Future Integrations
        -------------------
        Replay Engine
        Analytics
        Notifications
        Decision Reports
        */

        return {

            event: type,

            timestamp: new Date().toISOString(),

            payload

        };

    }

    /*
    ======================================================
    Reset Daily Statistics
    ======================================================
    */

    resetDailyStatistics() {

        state.executionCount = 0;

        state.dailyProfit = 0;

        state.dailyLoss = 0;

        state.lastExecution = null;

        state.statistics = {
            executions: 0,
            successful: 0,
            failed: 0
        };

        logger.info(

            logger.SOURCES.AUTOMATION,

            "Daily automation statistics reset."

        );

    }

    /*
    ======================================================
    Full Engine Reset
    ======================================================
    */

    reset() {

        state.running = false;

        state.paused = false;

        state.emergencyStop = false;

        state.currentStrategy = null;

        state.startedAt = null;

        state.lastExecution = null;

        state.executionCount = 0;

        state.dailyProfit = 0;

        state.dailyLoss = 0;

        state.statistics = {
            executions: 0,
            successful: 0,
            failed: 0
        };

        logger.info(

            logger.SOURCES.AUTOMATION,

            "Automation engine reset."

        );

        return this.getStatus();

    }

    /*
    ======================================================
    Service Information
    ======================================================
    */

    getVersion() {

        return this.VERSION;

    }

    /*
    ======================================================
    Supported Execution Types
    ======================================================
    */

    getSupportedExecutionTypes() {

        return [

            "MARKET",

            "BUY_LIMIT",

            "SELL_LIMIT",

            "BUY_STOP",

            "SELL_STOP"

        ];

    }

    /*
    ======================================================
    Automation Health
    ======================================================
    */

    getHealth() {

        return {

            service: "AutomationEngine",

            version: this.VERSION,

            status:

                state.running
                    ? "RUNNING"
                    : "STOPPED",

            paused:

                state.paused,

            emergencyStop:

                state.emergencyStop,

            currentStrategy:

                state.currentStrategy,

            supportedExecutionTypes:

                this.getSupportedExecutionTypes(),

            statistics: {

                ...state.statistics

            }

        };

    }

    /*
    ======================================================
    Execute Safe
    ======================================================
    */

    async executeStrategySafe(strategy) {

        try {

            return await this.executeStrategy(

                strategy

            );

        }

        catch (error) {

            state.statistics.failed++;

            logger.error(

                logger.SOURCES.AUTOMATION,

                "Strategy execution failed.",

                {

                    strategy:

                        strategy?.name ||

                        "UNKNOWN",

                    executionType:

                        strategy?.executionType ||

                        "MARKET",

                    error:

                        error.message

                }

            );

            return {

                success: false,

                message: error.message

            };

        }

    }

}

/*
==========================================================
Singleton Export
==========================================================
*/

module.exports = new AutomationEngine();
