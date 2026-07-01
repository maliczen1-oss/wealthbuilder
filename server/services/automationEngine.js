const decisionEngine = require("./decisionEngine");
const tradeService = require("./tradeService");
const learningEngine = require("./learningEngine");

const automation = {

  enabled: true,

  marketScanner: true,

  tradeEntry: true,

  tradeManagement: true,

  tradeExit: true,

  breakEven: true,

  trailingStop: true,

  partialClose: false,

  notifications: true,

  learning: true,

  coach: true

};

function getSettings() {

  return automation;

}

function updateSettings(settings = {}) {

  Object.assign(
    automation,
    settings
  );

  return automation;

}

async function executeTrade(setup) {

  if (
    !automation.enabled ||
    !automation.tradeEntry
  ) {

    return {

      executed: false,

      reason:
        "Trade entry automation disabled."

    };

  }

  const decision =
    await decisionEngine.evaluateTrade(
      setup
    );

  if (!decision.approved) {

    return {

      executed: false,

      decision

    };

  }

  let result;

  if (setup.direction === "BUY") {

    result =
      await tradeService.openBuy(

        setup.symbol,

        setup.stopLoss,

        setup.takeProfit,

        setup.riskPercent

      );

  } else {

    result =
      await tradeService.openSell(

        setup.symbol,

        setup.stopLoss,

        setup.takeProfit,

        setup.riskPercent

      );

  }

  if (automation.learning) {

    learningEngine.recordTrade({

      result: "OPEN",

      setup,

      decision

    });

  }

  return {

    executed: true,

    decision,

    result

  };

}

module.exports = {

  getSettings,

  updateSettings,

  executeTrade

};
