/*
==========================================================
WealthBuilder OS
Decision Report Service
==========================================================
*/

class DecisionReportService {

    build({
        symbol,
        confidence,
        strategy,
        guardian,
        recommendation,
        risk
    }) {

        return {

            timestamp: new Date(),

            symbol,

            confidence,

            strategy,

            guardian,

            recommendation,

            risk

        };

    }

}

module.exports =
    new DecisionReportService();
