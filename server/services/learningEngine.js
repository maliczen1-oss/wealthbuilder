const fs = require("fs");
const path = require("path");

const JOURNAL = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "tradeJournal.json"
);

function ensureJournal() {

  const folder =
    path.dirname(JOURNAL);

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, {
      recursive: true
    });
  }

  if (!fs.existsSync(JOURNAL)) {
    fs.writeFileSync(
      JOURNAL,
      JSON.stringify([], null, 2)
    );
  }

}

function loadJournal() {

  ensureJournal();

  return JSON.parse(
    fs.readFileSync(JOURNAL)
  );

}

function saveJournal(data) {

  ensureJournal();

  fs.writeFileSync(
    JOURNAL,
    JSON.stringify(
      data,
      null,
      2
    )
  );

}

function recordTrade(trade) {

  const journal =
    loadJournal();

  journal.push({

    timestamp:
      new Date().toISOString(),

    ...trade

  });

  saveJournal(journal);

}

function getJournal() {

  return loadJournal();

}

module.exports = {

  recordTrade,

  getJournal

};
