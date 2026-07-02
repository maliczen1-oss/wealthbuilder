/*
==========================================================
WealthBuilder OS
Execution Pipeline
Version 2.0
Powered by Jarvis Intelligence
==========================================================
*/

const strategyEngine =
    require("./strategyEngine");

const decisionEngine =
    require("./decisionEngine");

const validationService =
    require("./validationService");

const guardianService =
    require("./guardianService");

const decisionReportService =
    require("./decisionReportService");

const replayService =
    require("./replayService");

const learningEngine =
    require("./learningEngine");

const dnaEngine =
    require("./dnaEngine");

const logger =
    require("./logger");

const notifications =
    require("./notificationService");

class ExecutionPipeline {

    execute({

        marketContext,

        marketState,

        account,

        automation,

        profile = {}

    }) {

        logger.info(

            "Execution Pipeline",

            "Pipeline started."

        );

        /*
        ======================================
        Strategy Engine
        ======================================
        */

        const signals =
            strategyEngine.evaluate({

                ...marketContext,

                marketState

            });

        /*
        ======================================
        Decision Engine
        ======================================
        */

        const decision =
            decisionEngine.evaluate(

                signals,

                profile

            );

        /*
        ======================================
        Validation
        ======================================
        */

        const validation =
            validationService.validateDecision(

                decision

            );

        if (!validation.valid) {

            logger.warning(

                "Validation",

                "Decision validation failed.",

                validation

            );

            return {

                approved: false,

                stage: "Validation",

                validation

            };

        }

        /*
        ======================================
        Guardian
        ======================================
        */

        const guardian =
            guardianService.evaluate(

                account,

                automation

            );

        if (

            guardian.status !== "APPROVED"

        ) {

            logger.warning(

                "Guardian",

                "Trade rejected.",

                guardian

            );

            notifications.add(

                "warning",

                "Guardian",

                "Trade rejected."

            );

            return {

                approved: false,

                stage: "Guardian",

                guardian

            };

        }

        /*
        ======================================
        Decision Report
        ======================================
        */

        const report =
            decisionReportService.build({

                symbol:
                    marketContext.symbol,

                confidence:
                    decision.confidence,

                strategy:
                    decision.signal.strategy,

                guardian:
                    guardian.status,

                recommendation:
                    decision.reason,

                risk:
                    automation.risk || "1%"

            });

        /*
        ======================================
        Replay
        ======================================
        */

        replayService.add(

            report

        );

        /*
        ======================================
        Learning
        ======================================
        */

        if (

            learningEngine.recordDecision

        ) {

            learningEngine.recordDecision(

                report

            );

        }

        /*
        ======================================
        DNA
        ======================================
        */

        if (

            dnaEngine.recordDecision

        ) {

            dnaEngine.recordDecision(

                report

            );

        }

        /*
        ======================================
        Logging
        ======================================
        */

        logger.success(

            "Execution",

            "Trade approved.",

            report

        );

        /*
        ======================================
        Notifications
        ======================================
        */

        notifications.add(

            "success",

            "Trade Approved",

            marketContext.symbol

        );

        /*
        ======================================
        Complete
        ======================================
        */

        return {

            approved: true,

            stage: "Completed",

            report

        };

    }

}

module.exports =
new ExecutionPipeline();
