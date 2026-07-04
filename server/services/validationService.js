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
