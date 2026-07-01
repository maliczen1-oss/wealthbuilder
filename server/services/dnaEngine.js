const learningEngine = require("./learningEngine");

function analyse() {

    const journal =
        learningEngine.getJournal();

    const dna = {

        totalTrades:
            journal.length,

        wins: 0,

        losses: 0,

        winRate: 0,

        strengths: [],

        weaknesses: [],

        recommendations: []

    };

    journal.forEach(trade => {

        if (trade.result === "WIN") {

            dna.wins++;

        }

        if (trade.result === "LOSS") {

            dna.losses++;

        }

    });

    if (dna.totalTrades) {

        dna.winRate =
            Number(

                (
                    dna.wins /
                    dna.totalTrades *
                    100

                ).toFixed(2)

            );

    }

    if (dna.winRate >= 60) {

        dna.strengths.push(

            "Winning consistency"

        );

    }

    if (dna.winRate < 50) {

        dna.weaknesses.push(

            "Trade selection"

        );

        dna.recommendations.push(

            "Focus on higher-confidence setups."

        );

    }

    if (!dna.recommendations.length) {

        dna.recommendations.push(

            "Continue following your trading plan."

        );

    }

    return dna;

}

module.exports = {

    analyse

};
