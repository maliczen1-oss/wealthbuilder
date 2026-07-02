/*
==========================================================
WealthBuilder OS
Strategy Engine
Powered by Jarvis Intelligence
==========================================================
*/

class StrategyEngine {

    evaluate(market = {}) {

        const signals = [];

        /*
        Trend Continuation
        */

        if (market.trend === "bullish") {

            signals.push({

                strategy: "Trend Continuation",

                direction: "BUY",

                confidence: 80,

                reason:
                    "Bullish higher timeframe trend."

            });

        }

        if (market.trend === "bearish") {

            signals.push({

                strategy: "Trend Continuation",

                direction: "SELL",

                confidence: 80,

                reason:
                    "Bearish higher timeframe trend."

            });

        }

        return signals;

    }

}

module.exports = new StrategyEngine();
