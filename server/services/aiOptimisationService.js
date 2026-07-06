"use strict";

/*
==========================================================
WealthBuilder OS

AI Optimisation Service

Version : 1.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides intelligent trade evaluation before execution.

Responsibilities
----------------
✓ Confidence Scoring
✓ Risk Optimisation
✓ Session Evaluation
✓ Trend Analysis
✓ Volatility Assessment
✓ Spread Analysis
✓ Trade Approval
✓ Warning Generation

Future
------
- Machine Learning
- Trading DNA
- Psychology Engine
- Portfolio Intelligence
- Adaptive Learning

==========================================================
*/

const logger = require("./logger");
const marketService = require("./marketService");
const accountService = require("./accountService");

/*
==========================================================
Configuration
==========================================================
*/

const CONFIG = {

    MIN_CONFIDENCE: 70,

    MAX_CONFIDENCE: 100,

    DEFAULT_CONFIDENCE: 80,

    MAX_SPREAD_PERCENT: 0.002,

    HIGH_VOLATILITY_PERCENT: 2.5,

    LOW_VOLATILITY_PERCENT: 0.25

};

/*
==========================================================
AI Optimisation Service
==========================================================
*/

class AIOptimisationService {

    constructor() {

        this.VERSION = "1.0.0";

    }

    /*
    ======================================================
    Response Factory
    ======================================================
    */

    createResult() {

        return {

            approved: true,

            confidence:
                CONFIG.DEFAULT_CONFIDENCE,

            score: 0,

            adjustments: {

                riskPercent: 1,

                stopLoss: null,

                takeProfit: null

            },

            warnings: [],

            analysis: {

                trend: null,

                volatility: null,

                spread: null,

                session: null,

                accountRisk: null

            }

        };

    }

    /*
    ======================================================
    Evaluate Trade
    ======================================================
    */

    async evaluateTrade(request) {

        const result =
            this.createResult();

        /*
        ======================================================
        Test Hook: Deterministic Rejection for Integration Tests
        ======================================================
        */

        if (request.strategy === "AI_REJECTION_TEST") {

            result.approved = false;

            result.confidence = 0;

            result.warnings.push(
                "Forced AI rejection for integration testing."
            );

            return result;

        }

        logger.info(

            logger.SOURCES.AI,

            "AI trade evaluation started.",

            {

                symbol:
                    request.symbol,

                action:
                    request.action

            }

        );

        const account =
            await accountService.getAccount();

        const market =
            await marketService.getMarketSnapshot(

                request.symbol

            );

        result.analysis.accountRisk =
            account.marginLevel;

        /*
        ======================================================
        Trend Analysis
        ======================================================
        */

        if (
            market.bid > market.ask
        ) {

            result.analysis.trend =
                "UNKNOWN";

            result.warnings.push(

                "Market data appears inconsistent."

            );

            result.confidence -= 20;

        }

        else {

            result.analysis.trend =
                "VALID";

            result.score += 20;

        }

        /*
        ======================================================
        Spread Analysis
        ======================================================
        */

        const spreadPercent =

            market.spread /

            Math.max(market.bid, 1);

        result.analysis.spread =
            spreadPercent;

        if (
            spreadPercent >
            CONFIG.MAX_SPREAD_PERCENT
        ) {

            result.warnings.push(

                "Spread is above preferred threshold."

            );

            result.confidence -= 10;

        }

        else {

            result.score += 20;

        }

        /*
        ======================================================
        Volatility
        ======================================================
        */

        const volatility =

            Math.abs(

                market.ask -

                market.bid

            ) /

            Math.max(market.bid, 1) *

            100;

        result.analysis.volatility =
            volatility;

        if (
            volatility >
            CONFIG.HIGH_VOLATILITY_PERCENT
        ) {

            result.warnings.push(

                "High market volatility detected."

            );

            result.adjustments.riskPercent =
                0.50;

            result.confidence -= 15;

        }

        else if (

            volatility <
            CONFIG.LOW_VOLATILITY_PERCENT

        ) {

            result.warnings.push(

                "Very low volatility."

            );

            result.adjustments.riskPercent =
                0.75;

            result.confidence -= 5;

        }

        else {

            result.score += 20;

        }

        /*
        ======================================================
        Session Quality
        ======================================================
        */

        const hour =
            new Date().getUTCHours();

        let session = "OFF";

        if (
            hour >= 7 &&
            hour < 16
        ) {

            session = "LONDON";

            result.score += 20;

        }

        else if (
            hour >= 12 &&
            hour < 21
        ) {

            session = "NEW_YORK";

            result.score += 20;

        }

        else {

            result.warnings.push(

                "Outside preferred trading sessions."

            );

            result.confidence -= 10;

        }

        result.analysis.session =
            session;

        /*
        ======================================================
        Margin Level
        ======================================================
        */

        if (

            account.marginLevel &&
            account.marginLevel < 150

        ) {

            result.warnings.push(

                "Low margin level."

            );

            result.adjustments.riskPercent =
                Math.min(

                    result.adjustments.riskPercent,

                    0.50

                );

            result.confidence -= 20;

        }

        /*
        ======================================================
        Confidence Clamp
        ======================================================
        */

        result.confidence =

            Math.max(

                0,

                Math.min(

                    CONFIG.MAX_CONFIDENCE,

                    result.confidence

                )

            );

        result.approved =

            result.confidence >=

            CONFIG.MIN_CONFIDENCE;

        logger.info(

            logger.SOURCES.AI,

            "AI evaluation completed.",

            {

                confidence:
                    result.confidence,

                approved:
                    result.approved,

                score:
                    result.score

            }

        );

        /*
        ======================================================
        Final Risk Adjustment
        ======================================================
        */

        if (

            result.approved &&

            request.riskPercent

        ) {

            result.adjustments.riskPercent =

                Math.min(

                    request.riskPercent,

                    result.adjustments.riskPercent

                );

        }

        /*
        ======================================================
        Default SL / TP
        ======================================================
        */

        result.adjustments.stopLoss =

            request.stopLoss ?? null;

        result.adjustments.takeProfit =

            request.takeProfit ?? null;

        return result;

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
    Configuration
    ======================================================
    */

    getConfiguration() {

        return {

            ...CONFIG

        };

    }

}

/*
==========================================================
Singleton Export
==========================================================
*/

module.exports = new AIOptimisationService();
