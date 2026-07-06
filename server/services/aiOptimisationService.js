"use strict";

/*
==========================================================
WealthBuilder OS

AI Optimisation Service

Version : 2.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides intelligent trade evaluation before execution.

Responsibilities
----------------
✓ Confidence Scoring
✓ Trade Quality Grading
✓ Explainable AI Decision Reports
✓ Risk Optimisation
✓ Session Evaluation
✓ Trend Analysis
✓ Volatility Assessment
✓ Spread Analysis
✓ Margin Assessment
✓ Trade Approval
✓ Warning Generation

Future
------
- Machine Learning
- Trading DNA
- Psychology Engine
- Portfolio Intelligence
- Adaptive Learning
- Economic News Awareness
- Liquidity Intelligence

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

        this.VERSION = "2.0.0";

    }

    /*
    ======================================================
    Response Factory
    ======================================================
    */

    createResult() {

        return {

            approved: true,

            confidence: CONFIG.DEFAULT_CONFIDENCE,

            grade: null,

            score: 0,

            adjustments: {

                riskPercent: 1,

                stopLoss: null,

                takeProfit: null

            },

            warnings: [],

/*
======================================================
Confidence Breakdown
======================================================
*/

confidenceBreakdown: [],

analysis: {

    trend: null,

    volatility: null,

    spread: null,

    session: null,

    liquidity: null,

    accountRisk: null

},

            decisionReport: {

                summary: "",

                strengths: [],

                risks: [],

                recommendations: []

            }

        };

    }

    /*
    ======================================================
    Trade Grade
    ======================================================
    */

    calculateTradeGrade(confidence) {

        if (confidence >= 95) return "A+";

        if (confidence >= 90) return "A";

        if (confidence >= 85) return "B+";

        if (confidence >= 80) return "B";

        if (confidence >= 70) return "C";

        return "REJECT";

    }

    /*
    ======================================================
    Decision Report Builder
    ======================================================
    */

    buildDecisionReport(result) {

        const report = {

            summary: "",

            strengths: [],

            risks: [],

            recommendations: []

        };

        if (result.analysis.trend === "VALID") {

            report.strengths.push(
                "Market structure appears valid."
            );

        }

        if (
            result.analysis.session === "LONDON" ||
            result.analysis.session === "NEW_YORK"
        ) {

            report.strengths.push(
                `Trading during the ${result.analysis.session} session.`
            );

        }

        if (
            result.analysis.accountRisk &&
            result.analysis.accountRisk >= 150
        ) {

            report.strengths.push(
                "Healthy account margin level."
            );

        }

        for (const warning of result.warnings) {

            report.risks.push(warning);

        }

        if (result.adjustments.riskPercent < 1) {

            report.recommendations.push(
                `Risk reduced to ${result.adjustments.riskPercent}% due to market conditions.`
            );

        }

        if (!result.approved) {

            report.recommendations.push(
                "Wait for stronger market conditions before entering."
            );

        }

        report.summary = result.approved
            ? `Trade approved with ${result.confidence}% confidence (${result.grade}).`
            : `Trade rejected with ${result.confidence}% confidence.`;

        return report;

    }
/*
======================================================
Liquidity Analysis
======================================================
*/

evaluateLiquidity(session, spreadPercent) {

    if (
        (session === "LONDON" || session === "NEW_YORK") &&
        spreadPercent <= CONFIG.MAX_SPREAD_PERCENT
    ) {

        return {
            status: "HIGH",
            confidenceAdjustment: 5,
            warning: null
        };

    }

    if (spreadPercent > CONFIG.MAX_SPREAD_PERCENT) {

        return {
            status: "LOW",
            confidenceAdjustment: -10,
            warning: "Low market liquidity detected."
        };

    }

    return {
        status: "MEDIUM",
        confidenceAdjustment: 0,
        warning: null
    };

                }
    /*
    ======================================================
    Evaluate Trade
    ======================================================
    */

        async evaluateTrade(request) {

        const result = this.createResult();

        /*
        ======================================================
        Integration Test Hook
        ======================================================
        */

        if (request.strategy === "AI_REJECTION_TEST") {

            result.approved = false;
            result.confidence = 0;
            result.grade = "REJECT";

            result.warnings.push(
                "Forced AI rejection for integration testing."
            );

            result.decisionReport = this.buildDecisionReport(result);

            return result;

        }

        logger.info(

            logger.SOURCES.AI,

            "AI trade evaluation started.",

            {

                symbol: request.symbol,

                action: request.action

            }

        );

        /*
        ======================================================
        Account & Market Information
        ======================================================
        */

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

        if (market.bid > market.ask) {

            result.analysis.trend = "UNKNOWN";

            result.warnings.push(
                "Market data appears inconsistent."
            );

            result.confidence -= 20;

result.confidenceBreakdown.push({

    factor: "Trend",

    adjustment: -20,

    reason: "Market data appears inconsistent."

});

        }

        else {

            result.analysis.trend = "VALID";

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

        result.analysis.spread = spreadPercent;

        if (spreadPercent > CONFIG.MAX_SPREAD_PERCENT) {

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
        Volatility Analysis
        ======================================================
        */

        const volatility =

            Math.abs(

                market.ask -

                market.bid

            )

            /

            Math.max(market.bid, 1)

            * 100;

        result.analysis.volatility = volatility;

        if (volatility > CONFIG.HIGH_VOLATILITY_PERCENT) {

            result.warnings.push(
                "High market volatility detected."
            );

            result.adjustments.riskPercent = 0.50;

            result.confidence -= 15;

        }

        else if (volatility < CONFIG.LOW_VOLATILITY_PERCENT) {

            result.warnings.push(
                "Very low volatility."
            );

            result.adjustments.riskPercent = 0.75;

            result.confidence -= 5;

        }

        else {

            result.score += 20;

        }

        /*
        ======================================================
        Session Evaluation
        ======================================================
        */

        const hour =
            new Date().getUTCHours();

        let session = "OFF";

        if (hour >= 7 && hour < 16) {

            session = "LONDON";

            result.score += 20;

        }

        else if (hour >= 12 && hour < 21) {

            session = "NEW_YORK";

            result.score += 20;

        }

        else {

            result.warnings.push(
                "Outside preferred trading sessions."
            );

            result.confidence -= 10;

        }

        result.analysis.session = session;
/*
======================================================
Liquidity Analysis
======================================================
*/

const liquidity =

    this.evaluateLiquidity(

        session,

        spreadPercent

    );

result.analysis.liquidity =

    liquidity.status;

result.confidence +=

    liquidity.confidenceAdjustment;

if (liquidity.warning) {

    result.warnings.push(

        liquidity.warning

    );

}

switch (liquidity.status) {

    case "HIGH":

        result.score += 10;

        break;

    case "MEDIUM":

        result.score += 5;

        break;

    case "LOW":

        result.score -= 10;

        break;

}
        /*
        ======================================================
        Margin Assessment
        ======================================================
        */

        if (

            account.marginLevel &&

            account.marginLevel < 150

        ) {

            result.warnings.push(
                "Low margin level."
            );

            result.adjustments.riskPercent = Math.min(

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

        result.confidence = Math.max(

            0,

            Math.min(

                CONFIG.MAX_CONFIDENCE,

                result.confidence

            )

        );

        result.approved =

            result.confidence >=

            CONFIG.MIN_CONFIDENCE;

        /*
        ======================================================
        Trade Grade
        ======================================================
        */

        result.grade =

            this.calculateTradeGrade(

                result.confidence

            );

        /*
        ======================================================
        Explainable AI
        ======================================================
        */

        result.decisionReport =

            this.buildDecisionReport(

                result

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

        result.adjustments.stopLoss =

            request.stopLoss ?? null;

        result.adjustments.takeProfit =

            request.takeProfit ?? null;

        logger.info(

            logger.SOURCES.AI,

            "AI evaluation completed.",

            {

                confidence: result.confidence,

                grade: result.grade,

                approved: result.approved,

                score: result.score

            }

        );

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
