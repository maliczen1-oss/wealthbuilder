/*
==========================================================
WealthBuilder OS
Execution Pipeline
==========================================================
*/

const guardian = require("./guardianService");
const decisionReport = require("./decisionReportService");
const replay = require("./replayService");
const logger = require("./logger");
const notifications = require("./notificationService");

class ExecutionPipeline {

    execute({

        account,

        automation,

        trade

    }) {

        const guardianReport =
            guardian.evaluate(
                account,
                automation
            );

        if (guardianReport.status !== "APPROVED") {

            logger.warning(

                "Guardian",

                "Trade rejected.",

                guardianReport

            );

            notifications.add(

                "warning",

                "Guardian",

                "Trade rejected by Guardian."

            );

            return {

                approved: false,

                guardian: guardianReport

            };

        }

        const report =
            decisionReport.build({

                symbol:
                    trade.symbol,

                confidence:
                    trade.confidence,

                strategy:
                    trade.strategy,

                guardian:
                    guardianReport.status,

                recommendation:
                    trade.recommendation,

                risk:
                    trade.risk

            });

        replay.add(report);

        logger.success(

            "Execution",

            "Trade approved.",

            report

        );

        notifications.add(

            "success",

            "Trade Approved",

            trade.symbol

        );

        return {

            approved: true,

            report

        };

    }

}

module.exports =
new ExecutionPipeline();
