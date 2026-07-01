const learningEngine = require("./learningEngine");

function generateMorningBrief() {

  const journal =
    learningEngine.getJournal();

  if (!journal.length) {

    return {

      greeting:
        "Good morning.",

      summary:
        "No trades have been recorded yet.",

      lesson:
        "Your journey begins today.",

      confidence: 100

    };

  }

  const lastFive =
    journal.slice(-5);

  const wins =
    lastFive.filter(
      t => t.result === "WIN"
    ).length;

  const losses =
    lastFive.filter(
      t => t.result === "LOSS"
    ).length;

  const confidence =
    Math.max(
      50,
      100 - losses * 10 + wins * 5
    );

  let lesson =
    "Continue following your trading plan.";

  if (losses > wins) {

    lesson =
      "Slow down today. Focus on patience before taking new trades.";

  }

  return {

    greeting:
      "Good morning, Founder.",

    summary:

      `${wins} wins • ${losses} losses in your recent trades.`,

    lesson,

    confidence

  };

}

module.exports = {

  generateMorningBrief

};
