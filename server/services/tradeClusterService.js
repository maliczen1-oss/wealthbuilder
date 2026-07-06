"use strict";

/*
==========================================================
WealthBuilder OS

Trade Cluster Service

Version : 1.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Manages logical groups of related trades.

Responsibilities
----------------
✓ Create Trade Clusters
✓ Track Trades
✓ Calculate Statistics
✓ Portfolio Exposure
✓ Strategy Grouping
✓ Session Tracking
✓ Replay Support

Future
------
- Database Persistence
- AI Learning
- Portfolio Analytics
- Replay Intelligence

==========================================================
*/

const crypto = require("node:crypto");

const logger = require("./logger");

/*
==========================================================
Cluster Storage
==========================================================
*/

const clusters = new Map();

/*
==========================================================
Trade Cluster Service
==========================================================
*/

class TradeClusterService {

    constructor() {

        this.VERSION = "1.0.0";

    }

    /*
    ======================================================
    Cluster ID
    ======================================================
    */

    createClusterId(symbol) {

        return [

            "CLUSTER",

            symbol,

            crypto.randomUUID()

        ].join("-");

    }

    /*
    ======================================================
    Create Cluster
    ======================================================
    */

    createCluster({

        symbol,

        strategy = "DEFAULT",

        session = "UNKNOWN",

        direction = "UNKNOWN"

    }) {

        const clusterId =
            this.createClusterId(symbol);

        const cluster = {

            id: clusterId,

            symbol,

            strategy,

            session,

            direction,

            createdAt:
                new Date().toISOString(),

            closedAt: null,

            status: "OPEN",

            confidence: null,

            riskPercent: null,

            trades: [],

            statistics: {

                totalTrades: 0,

                winningTrades: 0,

                losingTrades: 0,

                totalProfit: 0,

                totalLoss: 0,

                averageEntry: 0,

                averageExit: 0

            }

        };

        clusters.set(

            clusterId,

            cluster

        );

        logger.info(

            logger.SOURCES.CLUSTER,

            "Trade cluster created.",

            {

                clusterId,

                symbol,

                strategy

            }

        );

        return cluster;

    }

    /*
    ======================================================
    Retrieve Cluster
    ======================================================
    */

    getCluster(clusterId) {

        return (

            clusters.get(clusterId)

            || null

        );

    }

    /*
    ======================================================
    Find Matching Open Cluster
    ======================================================
    */

    findOpenCluster({

        symbol,

        strategy = "DEFAULT",

        session = "UNKNOWN",

        direction = "UNKNOWN"

    }) {

        const today = new Date()
            .toISOString()
            .substring(0, 10);

        for (const cluster of clusters.values()) {

            if (cluster.status !== "OPEN") {

                continue;

            }

            if (cluster.symbol !== symbol) {

                continue;

            }

            if (cluster.strategy !== strategy) {

                continue;

            }

            if (cluster.session !== session) {

                continue;

            }

            if (cluster.direction !== direction) {

                continue;

            }

            const clusterDate =
                cluster.createdAt.substring(0, 10);

            if (clusterDate !== today) {

                continue;

            }

            return cluster;

        }

        return null;

    }

    /*
    ======================================================
    Get Or Create Cluster
    ======================================================
    */

    getOrCreateCluster(options) {

        const existing =
            this.findOpenCluster(options);

        if (existing) {

            logger.info(

                logger.SOURCES.CLUSTER,

                "Existing trade cluster reused.",

                {

                    clusterId: existing.id,

                    symbol: existing.symbol,

                    strategy: existing.strategy

                }

            );

            return existing;

        }

        return this.createCluster(options);

    }

    /*
    ======================================================
    All Clusters
    ======================================================
    */

    getClusters() {

        return [

            ...clusters.values()

        ];

    }

    /*
    ======================================================
    Cluster Count
    ======================================================
    */

    getClusterCount() {

        return clusters.size;

    }

    /*
    ======================================================
    Add Trade
    ======================================================
    */

    addTrade(clusterId, trade) {

        const cluster = this.getCluster(clusterId);

        if (!cluster) {

            throw new Error(

                `Cluster '${clusterId}' not found.`

            );

        }

        cluster.trades.push(trade);

        this.updateStatistics(cluster);

        logger.info(

            logger.SOURCES.CLUSTER,

            "Trade added to cluster.",

            {

                clusterId,

                tradeId: trade.positionId ||

                         trade.orderId ||

                         "UNKNOWN"

            }

        );

        return cluster;

    }

    /*
    ======================================================
    Remove Trade
    ======================================================
    */

    removeTrade(clusterId, positionId) {

        const cluster = this.getCluster(clusterId);

        if (!cluster) {

            throw new Error(

                `Cluster '${clusterId}' not found.`

            );

        }

        cluster.trades =

            cluster.trades.filter(

                trade =>

                    trade.positionId !==

                    positionId

            );

        this.updateStatistics(cluster);

        logger.info(

            logger.SOURCES.CLUSTER,

            "Trade removed from cluster.",

            {

                clusterId,

                positionId

            }

        );

        return cluster;

    }

    /*
    ======================================================
    Update Statistics
    ======================================================
    */

    updateStatistics(cluster) {

        const stats = {

            totalTrades: cluster.trades.length,

            winningTrades: 0,

            losingTrades: 0,

            totalProfit: 0,

            totalLoss: 0,

            averageEntry: 0,

            averageExit: 0,

            exposure: 0

        };

        let totalEntry = 0;

        let totalExit = 0;

        for (const trade of cluster.trades) {

            const profit =

                Number(trade.profit || 0);

            if (profit >= 0) {

                stats.winningTrades++;

                stats.totalProfit +=

                    profit;

            }

            else {

                stats.losingTrades++;

                stats.totalLoss +=

                    Math.abs(profit);

            }

            totalEntry +=

                Number(

                    trade.entryPrice || 0

                );

            totalExit +=

                Number(

                    trade.exitPrice ||

                    trade.entryPrice ||

                    0

                );

            stats.exposure +=

                Number(

                    trade.volume || 0

                );

        }

        if (stats.totalTrades > 0) {

            stats.averageEntry =

                totalEntry /

                stats.totalTrades;

            stats.averageExit =

                totalExit /

                stats.totalTrades;

        }

        cluster.statistics = stats;

    }

    /*
    ======================================================
    Cluster Statistics
    ======================================================
    */

    getClusterStatistics(clusterId) {

        const cluster =

            this.getCluster(clusterId);

        if (!cluster) {

            return null;

        }

        this.updateStatistics(cluster);

        return cluster.statistics;

    }

    /*
    ======================================================
    Portfolio Exposure
    ======================================================
    */

    getPortfolioExposure() {

        let exposure = 0;

        for (

            const cluster of

            clusters.values()

        ) {

            this.updateStatistics(cluster);

            exposure +=

                cluster.statistics.exposure;

        }

        return exposure;

    }

    /*
    ======================================================
    Close Cluster
    ======================================================
    */

    closeCluster(clusterId) {

        const cluster = this.getCluster(clusterId);

        if (!cluster) {

            throw new Error(

                `Cluster '${clusterId}' not found.`

            );

        }

        cluster.status = "CLOSED";

        cluster.closedAt = new Date().toISOString();

        this.updateStatistics(cluster);

        logger.info(

            logger.SOURCES.CLUSTER,

            "Trade cluster closed.",

            {

                clusterId,

                totalTrades:
                    cluster.statistics.totalTrades,

                totalProfit:
                    cluster.statistics.totalProfit,

                totalLoss:
                    cluster.statistics.totalLoss

            }

        );

        return cluster;

    }

    /*
    ======================================================
    Archive Cluster
    ======================================================
    */

    archiveCluster(clusterId) {

        const cluster = this.closeCluster(clusterId);

        cluster.status = "ARCHIVED";

        logger.info(

            logger.SOURCES.CLUSTER,

            "Trade cluster archived.",

            {

                clusterId

            }

        );

        return cluster;

    }

    /*
    ======================================================
    Clear Clusters
    ======================================================
    */

    clear() {

        clusters.clear();

        logger.info(

            logger.SOURCES.CLUSTER,

            "All trade clusters cleared."

        );

    }

    /*
    ======================================================
    Service Information
    ======================================================
    */

    getVersion() {

        return this.VERSION;

    }

    /*
    ======================================================
    Service Health
    ======================================================
    */

    getHealth() {

        return {

            service: "TradeClusterService",

            version: this.VERSION,

            clusters: clusters.size,

            status: "READY"

        };

    }

}

/*
==========================================================
Singleton Export
==========================================================
*/

module.exports = new TradeClusterService();
