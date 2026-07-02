/*
==========================================================
WealthBuilder OS
Decision Engine
Powered by Jarvis Intelligence
==========================================================
*/

class DecisionEngine {

    evaluate(signals = [], profile = {}) {

        if (!signals.length) {

            return {

                approved: false,

                confidence: 0,

                reason:
                    "No valid trading opportunities found."

            };

        }

        const minimumConfidence =
            profile.minimumConfidence ?? 75;

        const rankedSignals =
            signals.sort(

                (a, b) =>

                    b.confidence - a.confidence

            );

        const bestSignal =
            rankedSignals[0];

        if (

            bestSignal.confidence <
            minimumConfidence

        ) {

            return {

                approved: false,

                confidence:
                    bestSignal.confidence,

                reason:
                    "Signal confidence below required threshold.",

                signal:
                    bestSignal

            };

        }

        return {

            approved: true,

            confidence:
                bestSignal.confidence,

            reason:
                "Signal approved.",

            signal:
                bestSignal

        };

    }

}

module.exports =
new DecisionEngine();
