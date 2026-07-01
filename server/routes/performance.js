const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {

    try {

        const connection = req.connection;

        const startTime = new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000
        );

        const endTime = new Date();

        const history =
            await connection.getDealsByTimeRange(
                startTime,
                endTime
            );

        const deals = history.deals || [];

        const trades = deals.filter(d =>
            d.type === "DEAL_TYPE_BUY" ||
            d.type === "DEAL_TYPE_SELL"
        );

        const winners = trades.filter(t => t.profit > 0);

        const losers = trades.filter(t => t.profit < 0);

        const grossProfit =
            winners.reduce(
                (sum, t) => sum + t.profit,
                0
            );

        const grossLoss =
            Math.abs(
                losers.reduce(
                    (sum, t) => sum + t.profit,
                    0
                )
            );

        const netProfit =
            grossProfit - grossLoss;

        res.json({

            totalTrades: trades.length,

            winningTrades: winners.length,

            losingTrades: losers.length,

            winRate:
                trades.length
                    ? (
                        winners.length /
                        trades.length *
                        100
                      ).toFixed(2)
                    : 0,

            grossProfit,

            grossLoss,

            netProfit,

            profitFactor:
                grossLoss
                    ? (
                        grossProfit /
                        grossLoss
                      ).toFixed(2)
                    : "∞"

        });

    }

    catch(err){

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;
