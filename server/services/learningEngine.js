"use strict";

/*
==========================================================
WealthBuilder OS
Jarvis Learning Engine

Version : 2.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Central learning boundary for WealthBuilder OS.

Responsibilities
----------------
✓ Preserve recordTrade()
✓ Preserve getJournal()
✓ Ingest Enterprise Bridge historical records
✓ Maintain deterministic learning-record identities
✓ Deduplicate historical/live observations
✓ Preserve broker-native symbols
✓ Maintain unified learning records
✓ Maintain symbol-specific statistics
✓ Analyze entry outcomes
✓ Analyze exit outcomes
✓ Persist learning knowledge
✓ Preserve raw source observations
✓ Support continuous trade-learning
✓ Atomic persistence
✓ Corruption-tolerant storage
✓ Backward-compatible trade lifecycle integration

Architecture
------------
Enterprise Bridge
    DATA AUTHORITY
        │
        │ /api/history
        ▼
WealthBuilder OS
    INTELLIGENCE AUTHORITY
        │
        ▼
learningEngine
        │
        ├── historical observations
        ├── completed live trades
        ├── normalized learning records
        └── derived knowledge
                │
                ▼
        aiOptimisationService

Safety Boundary
---------------
This service DOES NOT:
✓ change trading parameters
✓ modify risk limits
✓ alter strategy configuration
✓ execute trades
✓ approve trades
✓ reject trades

Learning produces evidence and knowledge only.

Trading decisions remain owned by the existing
decision/optimisation architecture.

==========================================================
*/

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/*
==========================================================
Storage
==========================================================
*/

const DATA_DIR = path.join(
    __dirname,
    "..",
    "..",
    "data"
);

const JOURNAL = path.join(
    DATA_DIR,
    "tradeJournal.json"
);

const LEARNING_DATASET = path.join(
    DATA_DIR,
    "learningDataset.json"
);

const KNOWLEDGE = path.join(
    DATA_DIR,
    "jarvisKnowledge.json"
);

const FILE_ENCODING = "utf8";

/*
==========================================================
Configuration
==========================================================
*/

const MAX_JOURNAL_RECORDS = 50000;

const MAX_LEARNING_RECORDS = 100000;

const MAX_KNOWLEDGE_SYMBOLS = 500;

const MAX_KNOWLEDGE_STRATEGIES = 500;

const MAX_CONTEXT_KEYS = 100;

const ENGINE_VERSION = "2.0.0";

/*
==========================================================
Utility
==========================================================
*/

function nowIso() {

    return new Date().toISOString();

}

function isObject(value) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );

}

function asString(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value).trim();

}

function finiteNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;

}

function clamp(
    value,
    minimum,
    maximum
) {

    return Math.min(
        maximum,
        Math.max(
            minimum,
            value
        )
    );

}

/*
==========================================================
JSON Safety
==========================================================
*/

function jsonSafe(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;

    }

    if (
        typeof value === "string" ||
        typeof value === "boolean"
    ) {

        return value;

    }

    if (typeof value === "number") {

        return Number.isFinite(value)
            ? value
            : null;

    }

    if (value instanceof Date) {

        return value.toISOString();

    }

    if (Array.isArray(value)) {

        return value.map(
            item => jsonSafe(item)
        );

    }

    if (isObject(value)) {

        const result = {};

        for (
            const [key, item]
            of Object.entries(value)
        ) {

            result[String(key)] =
                jsonSafe(item);

        }

        return result;

    }

    return String(value);

}

/*
==========================================================
Canonical Serialization
==========================================================
*/

function canonicalize(value) {

    if (Array.isArray(value)) {

        return value.map(
            item => canonicalize(item)
        );

    }

    if (isObject(value)) {

        const result = {};

        const keys =
            Object.keys(value)
                .sort();

        for (const key of keys) {

            result[key] =
                canonicalize(
                    value[key]
                );

        }

        return result;

    }

    return jsonSafe(value);

}

function canonicalJson(value) {

    return JSON.stringify(
        canonicalize(value)
    );

}

/*
==========================================================
Deterministic Hash
==========================================================
*/

function sha256(value) {

    return crypto
        .createHash("sha256")
        .update(
            String(value),
            "utf8"
        )
        .digest("hex");

}

/*
==========================================================
Timestamp Normalization
==========================================================
*/

function normalizeTimestamp(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }

    if (value instanceof Date) {

        return value.toISOString();

    }

    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {

        let milliseconds =
            value;

        /*
        MT5 timestamps may be represented
        in seconds or milliseconds.
        */

        if (
            Math.abs(milliseconds) <
            100000000000
        ) {

            milliseconds *= 1000;

        }

        const date =
            new Date(milliseconds);

        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date.toISOString();

    }

    if (typeof value === "string") {

        const raw =
            value.trim();

        if (!raw) {

            return null;

        }

        /*
        Numeric timestamp represented
        as a string.
        */

        if (
            /^-?\d+(\.\d+)?$/.test(raw)
        ) {

            return normalizeTimestamp(
                Number(raw)
            );

        }

        const candidate =
            raw.endsWith("Z")
                ? raw
                : raw;

        const date =
            new Date(candidate);

        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date.toISOString();

        }

    }

    return null;

}

/*
==========================================================
Timestamp Discovery
==========================================================
*/

const TIMESTAMP_FIELDS = [
    "event_time_utc",
    "timestamp",
    "time",
    "time_done",
    "time_created",
    "time_updated",
    "open_time",
    "close_time",
    "entry_time",
    "exit_time",
    "created",
    "closed"
];

function findTimestamp(record) {

    for (
        const field
        of TIMESTAMP_FIELDS
    ) {

        if (
            record[field] !==
            undefined
        ) {

            const normalized =
                normalizeTimestamp(
                    record[field]
                );

            if (normalized) {

                return normalized;

            }

        }

    }

    return null;

}

/*
==========================================================
Symbol Preservation
==========================================================
*/

function extractSymbol(record) {

    const candidates = [
        record.symbol,
        record.Symbol,
        record.learning &&
            record.learning.symbol,
        record.market &&
            record.market.symbol
    ];

    for (
        const candidate
        of candidates
    ) {

        const symbol =
            asString(candidate);

        if (symbol) {

            /*
            Deliberately do not normalize
            broker suffixes.

            EURUSD.mic remains EURUSD.mic.
            XAUUSD.mic remains XAUUSD.mic.
            USTECH.mic remains USTECH.mic.
            DE30.mic remains DE30.mic.
            */

            return symbol;

        }

    }

    return null;

}

/*
==========================================================
Record Type
==========================================================
*/

function inferRecordType(record) {

    const explicit =
        asString(
            record.record_type ||
            record.recordType
        ).toLowerCase();

    if (
        explicit === "deal" ||
        explicit === "order" ||
        explicit === "trade"
    ) {

        return explicit;

    }

    if (
        record.dealId !== undefined ||
        record.deal_id !== undefined
    ) {

        return "deal";

    }

    if (
        record.orderId !== undefined ||
        record.order_id !== undefined
    ) {

        return "order";

    }

    return "trade";

}

/*
==========================================================
Broker Identity
==========================================================
*/

function brokerIdentifier(record) {

    const fields = [

        "record_id",

        "recordId",

        "dealId",

        "deal_id",

        "orderId",

        "order_id",

        "ticket",

        "id",

        "positionId",

        "position_id"

    ];

    for (
        const field
        of fields
    ) {

        const value =
            asString(
                record[field]
            );

        if (value) {

            return value;

        }

    }

    return "";

}

/*
==========================================================
Deterministic Record Identity
==========================================================
*/

function buildRecordId(
    record,
    source
) {

    const recordType =
        inferRecordType(record);

    const symbol =
        extractSymbol(record);

    const brokerId =
        brokerIdentifier(record);

    if (
        recordType !== "trade" &&
        brokerId
    ) {

        return (
            `${source}_${recordType}_` +
            `${sha256(
                `${recordType}|${brokerId}|${symbol || ""}`
            ).slice(0, 24)}`
        );

    }

    /*
    Live completed trades may not
    have a broker ticket available.

    Use stable trade properties instead
    of a random identifier.
    */

    const identity = {

        source,

        recordType,

        symbol,

        brokerId,

        timestamp:
            findTimestamp(record),

        id:
            asString(
                record.id ||
                record.tradeId ||
                record.trade_id
            ),

        positionId:
            asString(
                record.positionId ||
                record.position_id
            ),

        orderId:
            asString(
                record.orderId ||
                record.order_id
            ),

        direction:
            asString(
                record.direction ||
                record.type
            ),

        volume:
            finiteNumber(
                record.volume
            ),

        price:
            finiteNumber(
                record.price ||
                record.entryPrice
            ),

        closePrice:
            finiteNumber(
                record.closePrice ||
                record.exitPrice
            )

    };

    return (
        `${source}_` +
        `${recordType}_` +
        `${sha256(
            canonicalJson(identity)
        ).slice(0, 24)}`
    );

}

/*
==========================================================
Outcome Extraction
==========================================================
*/

function extractProfit(record) {

    const candidates = [

        record.profit,

        record.result &&
            record.result.profit,

        record.outcome &&
            record.outcome.profit,

        record.result &&
            record.result.pnl,

        record.pnl

    ];

    for (
        const candidate
        of candidates
    ) {

        const value =
            finiteNumber(candidate);

        if (value !== null) {

            return value;

        }

    }

    return null;

}

function extractCommission(record) {

    const candidates = [

        record.commission,

        record.result &&
            record.result.commission,

        record.outcome &&
            record.outcome.commission

    ];

    for (
        const candidate
        of candidates
    ) {

        const value =
            finiteNumber(candidate);

        if (value !== null) {

            return value;

        }

    }

    return null;

}

function extractSwap(record) {

    const candidates = [

        record.swap,

        record.result &&
            record.result.swap,

        record.outcome &&
            record.outcome.swap

    ];

    for (
        const candidate
        of candidates
    ) {

        const value =
            finiteNumber(candidate);

        if (value !== null) {

            return value;

        }

    }

    return null;

}

function calculateNetProfit(record) {

    const profit =
        extractProfit(record);

    const commission =
        extractCommission(record) || 0;

    const swap =
        extractSwap(record) || 0;

    if (profit === null) {

        return null;

    }

    return (
        profit +
        commission +
        swap
    );

}

/*
==========================================================
Direction
==========================================================
*/

function extractDirection(record) {

    const value =
        asString(
            record.direction ||
            record.type ||
            record.side ||
            record.action
        ).toUpperCase();

    if (
        value.includes("BUY") ||
        value === "LONG"
    ) {

        return "BUY";

    }

    if (
        value.includes("SELL") ||
        value === "SHORT"
    ) {

        return "SELL";

    }

    return value || null;

}

/*
==========================================================
Strategy Extraction
==========================================================
*/

function extractStrategy(record) {

    const candidates = [

        record.strategy,

        record.strategyName,

        record.strategy_name,

        record.decision &&
            record.decision.strategy,

        record.setup &&
            record.setup.strategy,

        record.learning &&
            record.learning.strategy

    ];

    for (
        const candidate
        of candidates
    ) {

        const value =
            asString(candidate);

        if (value) {

            return value;

        }

    }

    return "UNKNOWN";

}

/*
==========================================================
Entry Analysis
==========================================================
*/

function analyzeEntry(record) {

    const decision =
        isObject(record.decision)
            ? record.decision
            : {};

    const setup =
        isObject(record.setup)
            ? record.setup
            : {};

    const entryPrice =
        finiteNumber(
            record.entryPrice ||
            record.entry_price ||
            record.entry ||
            record.price
        );

    const confidence =
        finiteNumber(
            decision.confidence ||
            record.confidence
        );

    const grade =
        asString(
            decision.grade ||
            record.grade
        ) || null;

    return {

        price: entryPrice,

        direction:
            extractDirection(record),

        confidence:
            confidence !== null
                ? clamp(
                    confidence,
                    0,
                    100
                )
                : null,

        grade,

        setup:
            jsonSafe(setup),

        decision:
            jsonSafe(decision)

    };

}

/*
==========================================================
Exit Analysis
==========================================================
*/

function analyzeExit(record) {

    const result =
        isObject(record.result)
            ? record.result
            : {};

    const outcome =
        isObject(record.outcome)
            ? record.outcome
            : {};

    const exitPrice =
        finiteNumber(
            record.exitPrice ||
            record.closePrice ||
            record.close_price ||
            result.exitPrice ||
            outcome.exitPrice
        );

    const exitReason =
        asString(
            record.exitReason ||
            record.exit_reason ||
            result.reason ||
            outcome.reason ||
            record.reason
        ) || null;

    const closeTime =
        normalizeTimestamp(
            record.closed ||
            record.closeTime ||
            record.close_time ||
            result.closed ||
            outcome.closed
        );

    return {

        price: exitPrice,

        reason: exitReason,

        timestamp:
            closeTime

    };

}

/*
==========================================================
Unified Learning Record
==========================================================
*/

function buildLearningRecord(
    source,
    record,
    options = {}
) {

    if (!isObject(record)) {

        return null;

    }

    const safeRecord =
        jsonSafe(record);

    const recordType =
        inferRecordType(safeRecord);

    const symbol =
        extractSymbol(safeRecord);

    const eventTime =
        findTimestamp(safeRecord) ||
        nowIso();

    const recordId =
        buildRecordId(
            safeRecord,
            source
        );

    const profit =
        extractProfit(safeRecord);

    const commission =
        extractCommission(safeRecord);

    const swap =
        extractSwap(safeRecord);

    const netProfit =
        calculateNetProfit(safeRecord);

    const learning = {

        profitable:
            netProfit !== null
                ? netProfit > 0
                : null,

        loss:
            netProfit !== null
                ? netProfit < 0
                : null,

        breakeven:
            netProfit !== null
                ? netProfit === 0
                : null,

        direction:
            extractDirection(safeRecord),

        strategy:
            extractStrategy(safeRecord),

        entry:
            analyzeEntry(safeRecord),

        exit:
            analyzeExit(safeRecord)

    };

    return {

        schemaVersion: "2.0",

        engineVersion:
            ENGINE_VERSION,

        record_id:
            recordId,

        record_type:
            recordType,

        source,

        ingested_at:
            nowIso(),

        event_time_utc:
            eventTime,

        symbol,

        broker: {

            brokerId:
                brokerIdentifier(
                    safeRecord
                ),

            positionId:
                asString(
                    safeRecord.positionId ||
                    safeRecord.position_id
                ) || null,

            orderId:
                asString(
                    safeRecord.orderId ||
                    safeRecord.order_id
                ) || null,

            dealId:
                asString(
                    safeRecord.dealId ||
                    safeRecord.deal_id
                ) || null

        },

        outcome: {

            profit,

            commission,

            swap,

            netProfit

        },

        learning,

        raw: safeRecord

    };

}

/*
==========================================================
Persistent Storage
==========================================================
*/

function ensureStorage() {

    if (!fs.existsSync(DATA_DIR)) {

        fs.mkdirSync(
            DATA_DIR,
            {
                recursive: true
            }
        );

    }

    ensureJsonFile(
        JOURNAL,
        []
    );

    ensureJsonFile(
        LEARNING_DATASET,
        []
    );

    ensureJsonFile(
        KNOWLEDGE,
        createEmptyKnowledge()
    );

}

function ensureJsonFile(
    file,
    fallback
) {

    if (!fs.existsSync(file)) {

        writeJsonAtomic(
            file,
            fallback
        );

    }

}

function readJson(
    file,
    fallback
) {

    ensureStorageDirectory();

    if (!fs.existsSync(file)) {

        writeJsonAtomic(
            file,
            fallback
        );

        return fallback;

    }

    try {

        const content =
            fs.readFileSync(
                file,
                FILE_ENCODING
            );

        if (!content.trim()) {

            return fallback;

        }

        const parsed =
            JSON.parse(content);

        return parsed;

    }
    catch (error) {

        /*
        Never destroy the existing file
        when it is malformed.

        Preserve the corrupted file and
        return the safe fallback so the
        application can continue.
        */

        try {

            const backup =
                `${file}.corrupt.${Date.now()}`;

            fs.copyFileSync(
                file,
                backup
            );

        }
        catch (_) {

            // Best-effort backup only.

        }

        return fallback;

    }

}

function ensureStorageDirectory() {

    if (!fs.existsSync(DATA_DIR)) {

        fs.mkdirSync(
            DATA_DIR,
            {
                recursive: true
            }
        );

    }

}

function writeJsonAtomic(
    file,
    data
) {

    ensureStorageDirectory();

    const temporary =
        `${file}.tmp-${process.pid}-${Date.now()}`;

    const payload =
        JSON.stringify(
            jsonSafe(data),
            null,
            2
        );

    fs.writeFileSync(
        temporary,
        payload,
        FILE_ENCODING
    );

    fs.renameSync(
        temporary,
        file
    );

}

/*
==========================================================
Journal Compatibility
==========================================================
*/

function loadJournal() {

    ensureStorage();

    const journal =
        readJson(
            JOURNAL,
            []
        );

    return Array.isArray(journal)
        ? journal
        : [];

}

function saveJournal(
    journal
) {

    ensureStorage();

    writeJsonAtomic(
        JOURNAL,
        journal
    );

}

/*
==========================================================
Backward-Compatible recordTrade()
==========================================================
*/

function recordTrade(
    trade
) {

    const journal =
        loadJournal();

    const safeTrade =
        isObject(trade)
            ? jsonSafe(trade)
            : {
                value: jsonSafe(trade)
            };

    /*
    Preserve the existing journal contract:
    timestamp + trade fields.
    */

    const journalRecord = {

        timestamp:
            nowIso(),

        ...safeTrade

    };

    /*
    Build the corresponding unified
    learning record.

    This does not replace the journal
    record. It creates the richer learning
    observation separately.
    */

    const learningRecord =
        buildLearningRecord(
            "wealthbuilder_live",
            journalRecord,
            {
                completedTrade: true
            }
        );

    /*
    Existing callers receive no required
    return value. We continue to preserve
    that behaviour.
    */

    if (
        learningRecord &&
        !hasLearningRecord(
            learningRecord.record_id
        )
    ) {

        appendLearningRecord(
            learningRecord
        );

        rebuildKnowledge();

    }

    /*
    Bound the legacy journal so the
    synchronous JSON store cannot grow
    without limit.
    */

    journal.push(
        journalRecord
    );

    const boundedJournal =
        journal.length >
        MAX_JOURNAL_RECORDS

            ? journal.slice(
                journal.length -
                MAX_JOURNAL_RECORDS
            )

            : journal;

    saveJournal(
        boundedJournal
    );

}

/*
==========================================================
Backward-Compatible getJournal()
==========================================================
*/

function getJournal() {

    return loadJournal();

}

/*
==========================================================
Learning Dataset
==========================================================
*/

function loadLearningDataset() {

    ensureStorage();

    const dataset =
        readJson(
            LEARNING_DATASET,
            []
        );

    return Array.isArray(dataset)
        ? dataset
        : [];

}

function saveLearningDataset(
    dataset
) {

    const bounded =
        dataset.length >
        MAX_LEARNING_RECORDS

            ? dataset.slice(
                dataset.length -
                MAX_LEARNING_RECORDS
            )

            : dataset;

    writeJsonAtomic(
        LEARNING_DATASET,
        bounded
    );

}

function hasLearningRecord(
    recordId
) {

    const id =
        asString(recordId);

    if (!id) {

        return false;

    }

    const dataset =
        loadLearningDataset();

    return dataset.some(
        record =>
            asString(
                record.record_id
            ) === id
    );

}

/*
==========================================================
Append Learning Record
==========================================================
*/

function appendLearningRecord(
    record
) {

    if (!record) {

        return false;

    }

    const dataset =
        loadLearningDataset();

    const id =
        asString(
            record.record_id
        );

    if (!id) {

        return false;

    }

    const existingIndex =
        dataset.findIndex(
            item =>
                asString(
                    item.record_id
                ) === id
        );

    if (
        existingIndex >= 0
    ) {

        /*
        Deterministic idempotency:
        retain the first canonical
        observation instead of creating
        duplicates.
        */

        return false;

    }

    dataset.push(
        record
    );

    saveLearningDataset(
        dataset
    );

    return true;

}

/*
==========================================================
History Normalization
==========================================================
*/

function extractHistoryCollections(
    history
) {

    if (!isObject(history)) {

        return {
            deals: [],
            orders: []
        };

    }

    const deals =
        Array.isArray(
            history.deals
        )
            ? history.deals
            : [];

    const orders =
        Array.isArray(
            history.orders
        )
            ? history.orders
            : [];

    return {
        deals,
        orders
    };

}

/*
==========================================================
Historical Ingestion
==========================================================
*/

function ingestHistory(
    history
) {

    const {
        deals,
        orders
    } =
        extractHistoryCollections(
            history
        );

    let inserted = 0;

    let duplicates = 0;

    let invalid = 0;

    const records = [

        ...deals.map(
            record => ({
                sourceRecord:
                    record,
                sourceType:
                    "deal"
            })
        ),

        ...orders.map(
            record => ({
                sourceRecord:
                    record,
                sourceType:
                    "order"
            })
        )

    ];

    for (
        const item
        of records
    ) {

        const learningRecord =
            buildLearningRecord(
                "enterprise_history",
                {
                    ...jsonSafe(
                        item.sourceRecord
                    ),
                    record_type:
                        item.sourceType
                }
            );

        if (!learningRecord) {

            invalid += 1;

            continue;

        }

        if (
            appendLearningRecord(
                learningRecord
            )
        ) {

            inserted += 1;

        }
        else {

            duplicates += 1;

        }

    }

    if (inserted > 0) {

        rebuildKnowledge();

    }

    return {

        success: true,

        source:
            "enterprise_history",

        processed:
            records.length,

        inserted,

        duplicates,

        invalid,

        totalRecords:
            loadLearningDataset().length

    };

}

/*
==========================================================
Learning Knowledge
==========================================================
*/

function createEmptyKnowledge() {

    return {

        schemaVersion: "2.0",

        engineVersion:
            ENGINE_VERSION,

        generatedAt:
            nowIso(),

        totalRecords: 0,

        completedTrades: 0,

        profitableTrades: 0,

        losingTrades: 0,

        breakevenTrades: 0,

        totalNetProfit: 0,

        symbols: {},

        strategies: {},

        entries: {

            evaluated: 0,

            profitable: 0,

            losing: 0,

            breakeven: 0,

            totalProfit: 0

        },

        exits: {

            evaluated: 0,

            profitable: 0,

            losing: 0,

            breakeven: 0,

            totalProfit: 0,

            reasons: {}

        },

        safety: {

            autonomousParameterChanges:
                false,

            tradingConfigurationWrites:
                false,

            tradeExecution:
                false,

            strategyMutation:
                false

        }

    };

}

function loadKnowledge() {

    ensureStorage();

    const knowledge =
        readJson(
            KNOWLEDGE,
            createEmptyKnowledge()
        );

    return isObject(knowledge)
        ? knowledge
        : createEmptyKnowledge();

}

function saveKnowledge(
    knowledge
) {

    writeJsonAtomic(
        KNOWLEDGE,
        knowledge
    );

}

/*
==========================================================
Statistics Helpers
==========================================================
*/

function createSymbolStats() {

    return {

        records: 0,

        deals: 0,

        orders: 0,

        trades: 0,

        wins: 0,

        losses: 0,

        breakeven: 0,

        profit: 0,

        commission: 0,

        swap: 0,

        netProfit: 0,

        winningProfit: 0,

        losingProfit: 0,

        averageNetProfit: 0,

        winRate: 0,

        expectancy: 0,

        entriesEvaluated: 0,

        entryWins: 0,

        entryLosses: 0,

        entryBreakeven: 0,

        exitsEvaluated: 0,

        exitWins: 0,

        exitLosses: 0,

        exitBreakeven: 0,

        exitReasons: {}

    };

}

function updateOutcomeStats(
    stats,
    record
) {

    const netProfit =
        finiteNumber(
            record.outcome &&
            record.outcome.netProfit
        );

    const recordType =
        asString(
            record.record_type
        );

    stats.records += 1;

    if (recordType === "deal") {

        stats.deals += 1;

    }

    if (recordType === "order") {

        stats.orders += 1;

    }

    if (
        recordType === "trade" ||
        record.source ===
            "wealthbuilder_live"
    ) {

        stats.trades += 1;

    }

    if (netProfit === null) {

        return;

    }

    stats.netProfit +=
        netProfit;

    const profit =
        finiteNumber(
            record.outcome.profit
        );

    const commission =
        finiteNumber(
            record.outcome.commission
        );

    const swap =
        finiteNumber(
            record.outcome.swap
        );

    if (profit !== null) {

        stats.profit += profit;

    }

    if (commission !== null) {

        stats.commission +=
            commission;

    }

    if (swap !== null) {

        stats.swap += swap;

    }

    if (netProfit > 0) {

        stats.wins += 1;

        stats.winningProfit +=
            netProfit;

    }
    else if (netProfit < 0) {

        stats.losses += 1;

        stats.losingProfit +=
            netProfit;

    }
    else {

        stats.breakeven += 1;

    }

}

function finalizeStats(
    stats
) {

    const completed =
        stats.wins +
        stats.losses +
        stats.breakeven;

    stats.winRate =
        completed > 0

            ? (
                stats.wins /
                completed
            )

            : 0;

    stats.averageNetProfit =
        completed > 0

            ? (
                stats.netProfit /
                completed
            )

            : 0;

    /*
    Expectancy is the average
    outcome per completed observation.

    It is deliberately descriptive.
    It does not alter strategy settings.
    */

    stats.expectancy =
        stats.averageNetProfit;

    return stats;

}

/*
==========================================================
Entry / Exit Statistics
==========================================================
*/

function updateEntryStats(
    stats,
    record
) {

    const netProfit =
        finiteNumber(
            record.outcome &&
            record.outcome.netProfit
        );

    if (netProfit === null) {

        return;

    }

    stats.entriesEvaluated += 1;

    if (netProfit > 0) {

        stats.entryWins += 1;

    }
    else if (netProfit < 0) {

        stats.entryLosses += 1;

    }
    else {

        stats.entryBreakeven += 1;

    }

}

function updateExitStats(
    stats,
    record
) {

    const exit =
        record.learning &&
        record.learning.exit;

    if (!isObject(exit)) {

        return;

    }

    const netProfit =
        finiteNumber(
            record.outcome &&
            record.outcome.netProfit
        );

    if (netProfit === null) {

        return;

    }

    stats.exitsEvaluated += 1;

    if (netProfit > 0) {

        stats.exitWins += 1;

    }
    else if (netProfit < 0) {

        stats.exitLosses += 1;

    }
    else {

        stats.exitBreakeven += 1;

    }

    const reason =
        asString(
            exit.reason
        );

    if (reason) {

        stats.exitReasons[reason] =
            (
                stats.exitReasons[reason] ||
                0
            ) + 1;

    }

}

/*
==========================================================
Knowledge Rebuild
==========================================================
*/

function rebuildKnowledge() {

    const dataset =
        loadLearningDataset();

    const knowledge =
        createEmptyKnowledge();

    knowledge.generatedAt =
        nowIso();

    knowledge.totalRecords =
        dataset.length;

    for (
        const record
        of dataset
    ) {

        if (!isObject(record)) {

            continue;

        }

        const symbol =
            asString(
                record.symbol
            ) || "UNKNOWN";

        if (
            !knowledge.symbols[symbol] &&
            Object.keys(
                knowledge.symbols
            ).length <
                MAX_KNOWLEDGE_SYMBOLS
        ) {

            knowledge.symbols[symbol] =
                createSymbolStats();

        }

        const symbolStats =
            knowledge.symbols[symbol];

        if (symbolStats) {

            updateOutcomeStats(
                symbolStats,
                record
            );

            updateEntryStats(
                symbolStats,
                record
            );

            updateExitStats(
                symbolStats,
                record
            );

        }

        const strategy =
            extractStrategy(
                record.raw || record
            );

        if (
            strategy &&
            strategy !== "UNKNOWN"
        ) {

            if (
                !knowledge.strategies[
                    strategy
                ] &&
                Object.keys(
                    knowledge.strategies
                ).length <
                    MAX_KNOWLEDGE_STRATEGIES
            ) {

                knowledge.strategies[
                    strategy
                ] =
                    createSymbolStats();

            }

            if (
                knowledge.strategies[
                    strategy
                ]
            ) {

                updateOutcomeStats(
                    knowledge.strategies[
                        strategy
                    ],
                    record
                );

                updateEntryStats(
                    knowledge.strategies[
                        strategy
                    ],
                    record
                );

                updateExitStats(
                    knowledge.strategies[
                        strategy
                    ],
                    record
                );

            }

        }

        const netProfit =
            finiteNumber(
                record.outcome &&
                record.outcome.netProfit
            );

        if (netProfit !== null) {

            knowledge.completedTrades += 1;

            knowledge.totalNetProfit +=
                netProfit;

            if (netProfit > 0) {

                knowledge.profitableTrades += 1;

            }
            else if (
                netProfit < 0
            ) {

                knowledge.losingTrades += 1;

            }
            else {

                knowledge.breakevenTrades += 1;

            }

        }

        if (
            record.learning &&
            record.learning.entry
        ) {

            knowledge.entries.evaluated += 1;

            if (netProfit !== null) {

                if (netProfit > 0) {

                    knowledge.entries.profitable += 1;

                }
                else if (
                    netProfit < 0
                ) {

                    knowledge.entries.losing += 1;

                }
                else {

                    knowledge.entries.breakeven += 1;

                }

                knowledge.entries.totalProfit +=
                    netProfit;

            }

        }

        if (
            record.learning &&
            record.learning.exit
        ) {

            knowledge.exits.evaluated += 1;

            if (netProfit !== null) {

                if (netProfit > 0) {

                    knowledge.exits.profitable += 1;

                }
                else if (
                    netProfit < 0
                ) {

                    knowledge.exits.losing += 1;

                }
                else {

                    knowledge.exits.breakeven += 1;

                }

                knowledge.exits.totalProfit +=
                    netProfit;

            }

            const reason =
                asString(
                    record.learning
                        .exit
                        .reason
                );

            if (reason) {

                knowledge.exits.reasons[
                    reason
                ] =
                    (
                        knowledge.exits.reasons[
                            reason
                        ] || 0
                    ) + 1;

            }

        }

    }

    /*
    Finalize symbol statistics.
    */

    for (
        const stats
        of Object.values(
            knowledge.symbols
        )
    ) {

        finalizeStats(
            stats
        );

    }

    for (
        const stats
        of Object.values(
            knowledge.strategies
        )
    ) {

        finalizeStats(
            stats
        );

    }

    knowledge.safety = {

        autonomousParameterChanges:
            false,

        tradingConfigurationWrites:
            false,

        tradeExecution:
            false,

        strategyMutation:
            false

    };

    saveKnowledge(
        jsonSafe(knowledge)
    );

    return knowledge;

}

/*
==========================================================
Public Knowledge Access
==========================================================
*/

function getKnowledge() {

    return loadKnowledge();

}

function getLearningDataset() {

    return loadLearningDataset();

}

function getSymbolInsights(
    symbol
) {

    const requested =
        asString(symbol);

    if (!requested) {

        return null;

    }

    const knowledge =
        loadKnowledge();

    return (
        knowledge.symbols[
            requested
        ] || null
    );

}

function getStrategyInsights(
    strategy
) {

    const requested =
        asString(strategy);

    if (!requested) {

        return null;

    }

    const knowledge =
        loadKnowledge();

    return (
        knowledge.strategies[
            requested
        ] || null
    );

}

/*
==========================================================
Knowledge Refresh
==========================================================
*/

function refreshKnowledge() {

    return rebuildKnowledge();

}

/*
==========================================================
Dataset Statistics
==========================================================
*/

function getLearningStats() {

    const knowledge =
        loadKnowledge();

    return {

        engineVersion:
            ENGINE_VERSION,

        totalRecords:
            knowledge.totalRecords,

        completedTrades:
            knowledge.completedTrades,

        profitableTrades:
            knowledge.profitableTrades,

        losingTrades:
            knowledge.losingTrades,

        breakevenTrades:
            knowledge.breakevenTrades,

        totalNetProfit:
            knowledge.totalNetProfit,

        symbols:
            Object.keys(
                knowledge.symbols
            ).length,

        strategies:
            Object.keys(
                knowledge.strategies
            ).length,

        safety:
            knowledge.safety

    };

}

/*
==========================================================
Initialization
==========================================================
*/

ensureStorage();

/*
==========================================================
Exports
==========================================================
*/

module.exports = {

    /*
    Existing public interface.
    */

    recordTrade,

    getJournal,

    /*
    Historical learning.
    */

    ingestHistory,

    /*
    Learning dataset.
    */

    getLearningDataset,

    /*
    Knowledge.
    */

    getKnowledge,

    refreshKnowledge,

    getLearningStats,

    getSymbolInsights,

    getStrategyInsights

};
