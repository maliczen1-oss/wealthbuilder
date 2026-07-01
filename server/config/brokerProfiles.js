const brokerProfiles = {

  default: {

    name: "Generic MT5",

    accountTypes: [
      "STANDARD",
      "MICRO",
      "CENT"
    ],

    symbolAliases: {

      EURUSD: [
        "EURUSD",
        "EURUSD.a",
        "EURUSDm",
        "mEURUSD",
        "EURUSD.pro"
      ],

      GBPUSD: [
        "GBPUSD",
        "GBPUSD.a",
        "GBPUSDm",
        "mGBPUSD"
      ],

      USDJPY: [
        "USDJPY",
        "USDJPYm",
        "mUSDJPY"
      ],

      XAUUSD: [
        "XAUUSD",
        "XAUUSDm",
        "GOLD"
      ],

      NAS100: [
        "NAS100",
        "mNAS100",
        "USTEC",
        "US100",
        "NAS100.cash"
      ]

    }

  },

  vaultMarkets: {

    name: "Vault Markets",

    accountTypes: [

      "STANDARD",

      "MICRO",

      "CENT"

    ],

    baseCurrency: "ZAR",

    preferredSymbols: {

      EURUSD: "mEURUSD",

      NAS100: "mNAS100",

      XAUUSD: "XAUUSD"

    },

    risk: {

      defaultRiskPercent: 1,

      maxOpenPositions: 4,

      maxDailyLossPercent: 5

    }

  }

};

function getBrokerProfile(brokerName = "") {

  const broker = brokerName.toLowerCase();

  if (broker.includes("vault")) {

    return brokerProfiles.vaultMarkets;

  }

  return brokerProfiles.default;

}

module.exports = {

  brokerProfiles,

  getBrokerProfile

};
