/*
==========================================================
WealthBuilder OS
Validation Service

Version : 2.0.0
Status  : Production
Powered by Jarvis Intelligence

Purpose:
Provides centralized validation for every trade before
execution.

All validation methods return a consistent response object.

==========================================================
*/

const logger = require("./logger");

class ValidationService {

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

            valid: true,

            severity: "success",

            score: 100,

            warnings: [],

            errors: [],

            checks: {}

        };

    }

    /*
    ======================================================
    Internal Helpers
    ======================================================
    */

    addError(result, key, message) {

        result.valid = false;

        result.severity = "critical";

        result.score = Math.max(0, result.score - 20);

        result.errors.push(message);

        result.checks[key] = false;

    }

    addWarning(result, key, message) {

        if (result.valid) {

            result.severity = "warning";

        }

        result.score = Math.max(0, result.score - 5);

        result.warnings.push(message);

        result.checks[key] = true;

    }

    addSuccess(result, key) {

        result.checks[key] = true;

    }

    /*
    ======================================================
    Decision Validation
    (Backward Compatible)
    ======================================================
    */

    validateDecision(decision = {}) {

        const result = this.createResult();

        if (!decision.signal) {

            this.addError(

                result,

                "signal",

                "No trading signal."

            );

        } else {

            this.addSuccess(

                result,

                "signal"

            );

        }

        if (!decision.reason) {

            this.addError(

                result,

                "reason",

                "Decision reason missing."

            );

        } else {

            this.addSuccess(

                result,

                "reason"

            );

        }

        if (

            decision.confidence === undefined ||

            decision.confidence === null

        ) {

            this.addError(

                result,

                "confidence",

                "Confidence score missing."

            );

        }

        else {

            this.addSuccess(

                result,

                "confidence"

            );

            if (

                decision.confidence < 60

            ) {

                this.addWarning(

                    result,

                    "confidence",

                    "Confidence below recommended threshold."

                );

            }

        }

        if (!result.valid) {

            logger.warning(

                logger.SOURCES.DECISION,

                "Decision validation failed.",

                {

                    errors: result.errors,

                    warnings: result.warnings

                }

            );

        }

        return result;

    }
    /*
    ======================================================
    Connection Validation
    ======================================================
    */

    validateConnection(connection = null) {

        const result = this.createResult();

        if (!connection) {

            this.addError(
                result,
                "connection",
                "Trading connection unavailable."
            );

            logger.error(
                logger.SOURCES.METAAPI,
                "Connection validation failed."
            );

            return result;

        }

        this.addSuccess(
            result,
            "connection"
        );

        return result;

    }

    /*
    ======================================================
    Broker Validation
    ======================================================
    */

    validateBroker(broker = {}) {

        const result = this.createResult();

        if (!broker.name) {

            this.addError(
                result,
                "broker",
                "Broker not detected."
            );

        } else {

            this.addSuccess(
                result,
                "broker"
            );

        }

        if (!broker.accountType) {

            this.addWarning(
                result,
                "accountType",
                "Account type not identified."
            );

        }

        return result;

    }

    /*
    ======================================================
    Account Validation
    ======================================================
    */

    validateAccount(account = {}) {

        const result = this.createResult();

        if (!account.id) {

            this.addError(
                result,
                "account",
                "Account not available."
            );

            return result;

        }

        this.addSuccess(
            result,
            "account"
        );

        if (

            account.balance !== undefined &&
            account.balance <= 0

        ) {

            this.addWarning(
                result,
                "balance",
                "Account balance is zero."
            );

        }

        if (

            account.equity !== undefined &&
            account.equity < 0

        ) {

            this.addError(
                result,
                "equity",
                "Negative account equity."
            );

        }

        return result;

    }

    /*
    ======================================================
    Symbol Validation
    ======================================================
    */

    validateSymbol(symbol = {}) {

        const result = this.createResult();

        if (!symbol.name) {

            this.addError(
                result,
                "symbol",
                "Trading symbol missing."
            );

            return result;

        }

        this.addSuccess(
            result,
            "symbol"
        );

        if (

            symbol.tradeAllowed === false

        ) {

            this.addError(
                result,
                "tradable",
                "Symbol is not tradable."
            );

        }

        return result;

            }
