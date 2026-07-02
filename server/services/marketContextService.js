/*
==========================================================
WealthBuilder OS
Market Context Service
Powered by Jarvis Intelligence
==========================================================
*/

class MarketContextService {

    build(market = {}) {

        return {

            symbol:
                market.symbol ?? "UNKNOWN",

            timeframe:
                market.timeframe ?? "H1",

            trend:
                market.trend ?? "neutral",

            volatility:
                market.volatility ?? "normal",

            session:
                market.session ?? "Unknown",

            spread:
                market.spread ?? 0,

            timestamp:
                new Date()

        };

    }

}

module.exports =
new MarketContextService();
