/*
==========================================================
WealthBuilder OS
Market State Engine
Powered by Jarvis Intelligence
==========================================================
*/

class MarketStateEngine {

    evaluate(context = {}) {

        const state = {

            trend: context.trend,

            volatility: context.volatility,

            session: context.session,

            marketState: "UNKNOWN"

        };

        if (

            context.trend === "bullish" ||

            context.trend === "bearish"

        ) {

            state.marketState = "TRENDING";

        }

        if (

            context.trend === "neutral"

        ) {

            state.marketState = "RANGING";

        }

        if (

            context.volatility === "high"

        ) {

            state.marketState += " + HIGH VOLATILITY";

        }

        return state;

    }

}

module.exports =
new MarketStateEngine();
