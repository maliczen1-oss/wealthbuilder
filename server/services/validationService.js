/*
==========================================================
WealthBuilder OS
Validation Service
Powered by Jarvis Intelligence
==========================================================
*/

class ValidationService {

    validateDecision(decision = {}) {

        const issues = [];

        if (!decision.signal) {

            issues.push("No trading signal.");

        }

        if (!decision.reason) {

            issues.push("Decision reason missing.");

        }

        if (decision.confidence === undefined) {

            issues.push("Confidence score missing.");

        }

        return {

            valid: issues.length === 0,

            issues

        };

    }

}

module.exports = new ValidationService();
