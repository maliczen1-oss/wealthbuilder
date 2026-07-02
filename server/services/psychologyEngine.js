/*
=========================================================
WealthBuilder OS
Psychology Engine
AI Trading Coach
=========================================================
*/

class PsychologyEngine {

    analyze(account = {}, history = []) {

        const report = {
            discipline: 100,
            confidence: 100,
            emotion: "Stable",
            riskControl: "Excellent",
            strengths: [],
            weaknesses: [],
            recommendations: [],
            readiness: 100
        };

        if (!history.length) {

            report.strengths.push(
                "No negative trading behaviour detected."
            );

            report.recommendations.push(
                "Continue following your trading plan."
            );

            return report;
        }

        let wins = 0;
        let losses = 0;

        history.forEach(trade => {

            if ((trade.profit || 0) >= 0)
                wins++;
            else
                losses++;

        });

        const total = wins + losses;

        const winRate =
            total === 0 ? 0 :
            (wins / total) * 100;

        report.confidence = Math.round(winRate);

        if (losses > wins) {

            report.discipline -= 20;

            report.readiness -= 20;

            report.weaknesses.push(
                "Recent losing streak."
            );

            report.recommendations.push(
                "Reduce position size until consistency improves."
            );

        }

        if (wins > losses) {

            report.strengths.push(
                "Positive trading consistency."
            );

        }

        if (report.discipline >= 90)
            report.emotion = "Calm";

        else if (report.discipline >= 70)
            report.emotion = "Neutral";

        else
            report.emotion = "High Risk";

        return report;

    }

}

module.exports = new PsychologyEngine();
