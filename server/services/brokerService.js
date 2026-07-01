const accountService = require("./accountService");
const symbolService = require("./symbolService");

const {
  getBrokerProfile
} = require("../config/brokerProfiles");

async function detectBroker() {

  const account =
    await accountService.getAccount();

  const profile =
    getBrokerProfile(
      account.broker || ""
    );

  return {

    broker: account.broker,

    server: account.server,

    currency: account.currency,

    leverage: account.leverage,

    profile

  };

}

async function detectSymbols() {

  return {

    EURUSD:
      await symbolService.getEURUSD(),

    GBPUSD:
      await symbolService.getGBPUSD(),

    USDJPY:
      await symbolService.getUSDJPY(),

    XAUUSD:
      await symbolService.getXAUUSD(),

    NAS100:
      await symbolService.getNAS100()

  };

}

async function getEnvironment() {

  const broker =
    await detectBroker();

  const symbols =
    await detectSymbols();

  return {

    broker,

    symbols

  };

}

module.exports = {

  detectBroker,

  detectSymbols,

  getEnvironment

};
