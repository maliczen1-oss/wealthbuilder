const { getConnection } = require("./metaapi");

async function getAccount() {
  const connection = getConnection();

  return await connection.getAccountInformation();
}

async function getBroker() {
  const account = await getAccount();
  return account.broker;
}

async function getAccountName() {
  const account = await getAccount();
  return account.name;
}

async function getBalance() {
  const account = await getAccount();
  return account.balance;
}

async function getEquity() {
  const account = await getAccount();
  return account.equity;
}

async function getFreeMargin() {
  const account = await getAccount();
  return account.freeMargin;
}

async function getLeverage() {
  const account = await getAccount();
  return account.leverage;
}

async function getCurrency() {
  const account = await getAccount();
  return account.currency;
}

async function getAccountType() {
  const account = await getAccount();

  const broker = (account.broker || "").toLowerCase();

  if (broker.includes("cent")) {
    return "CENT";
  }

  if (broker.includes("micro")) {
    return "MICRO";
  }

  return "STANDARD";
}

module.exports = {
  getAccount,
  getBroker,
  getAccountName,
  getBalance,
  getEquity,
  getFreeMargin,
  getLeverage,
  getCurrency,
  getAccountType
};
