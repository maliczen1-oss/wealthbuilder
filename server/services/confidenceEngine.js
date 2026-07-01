const riskService = require("./riskService");
const marketService = require("./marketService");
const positionService = require("./positionService");

async function evaluate(setup = {}) {

  let score = 100;

  const reasons = [];

  try {

    if (setup.symbol) {

      const market =
        await marketService.getMarketSnapshot(
          setup.symbol
        );

      if (market.spread > 5 * market.point) {

        score -= 15;

        reasons.push(
          "Spread is higher than preferred."
        );

      } else {

        reasons.push(
          "Spread acceptable."
        );

      }

    }

    if (
      setup.stopLoss &&
      !(await riskService.canRiskTrade(
        setup.stopLoss,
        10,
        setup.riskPercent || 1
      ))
    ) {

      score -= 20;

      reasons.push(
        "Risk exceeds configured limits."
      );

    } else {

      reasons.push(
        "Risk approved."
      );

    }

    if (
      setup.symbol &&
      await positionService.hasOpenPosition(
        setup.symbol
      )
    ) {

      score -= 25;

      reasons.push(
        "Existing position detected."
      );

    }

    if (
      !(await positionService.canOpenPosition())
    ) {

      score -= 30;

      reasons.push(
        "Maximum positions reached."
      );

    }

  } catch (err) {

    score -= 40;

    reasons.push(
      err.message
    );

  }

  score = Math.max(0, score);

  return {

    score,

    approved: score >= 85,

    reasons

  };

}

module.exports = {

  evaluate

};
