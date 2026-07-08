"use strict";

/*
==========================================================
WealthBuilder OS

Risk Service

Version : 2.1.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides centralized risk calculations for WealthBuilder.

Responsibilities
----------------
✓ Risk Validation
✓ Position Sizing
✓ Lot Calculation
✓ Broker Volume Validation
✓ Volume Rounding
✓ Capital Protection

Future
------
- Dynamic Portfolio Risk
- Correlation Analysis
- Exposure Engine
- AI Risk Optimisation
- Drawdown Protection

==========================================================
*/

const logger = require("./logger");
const accountService = require("./accountService");
const marketService = require("./marketService");

/*
==========================================================
Configuration
==========================================================
*/

const CONFIG = {

    DEFAULT_RISK_PERCENT: 1,

    MAX_RISK_PERCENT: 5,

    MIN_RISK_PERCENT: 0.10,

    DEFAULT_MIN_LOT: 0.01,

    DEFAULT_MAX_LOT: 100,

    DEFAULT_VOLUME_STEP: 0.01

};

/*
==========================================================
Risk Service
==========================================================
*/

class RiskService {

    constructor() {

        this.VERSION = "2.1.0";

    }

    /*
    ======================================================
    Validation Helpers
    ======================================================
    */

    validatePositiveNumber(value, name) {

        if (
            typeof value !== "number" ||
            Number.isNaN(value) ||
            !Number.isFinite(value)
        ) {

            throw new TypeError(
                `${name} must be a valid number.`
            );

        }

        if (value <= 0) {

            throw new RangeError(
                `${name} must be greater than zero.`
            );

        }

    }

    validateRiskPercent(riskPercent) {

        this.validatePositiveNumber(
            riskPercent,
            "Risk percentage"
        );

        if (riskPercent > CONFIG.MAX_RISK_PERCENT) {

            throw new RangeError(
                `Risk percentage cannot exceed ${CONFIG.MAX_RISK_PERCENT}%.`
            );

        }

    }

    /*
    ======================================================
    Volume Helpers
    ======================================================
    */

    roundToStep(volume, step) {

        return (
            Math.round(volume / step) * step
        );

    }

    clampVolume(volume, minimum, maximum) {

        return Math.max(
            minimum,
            Math.min(maximum, volume)
        );

    }

        /*
    ======================================================
    Risk Amount
    ======================================================
    */

    async calculateRiskAmount(
        riskPercent = CONFIG.DEFAULT_RISK_PERCENT
    ) {

        try {

            this.validateRiskPercent(riskPercent);

            const balance =
                await accountService.getBalance();

            this.validatePositiveNumber(
                balance,
                "Account balance"
            );

            return balance * (riskPercent / 100);

        } catch (error) {

            logger.error(
                logger.SOURCES.RISK,
                "Failed to calculate risk amount.",
                {
                    riskPercent,
                    error: error.message
                }
            );

            throw error;

        }

    }

    /*
    ======================================================
    Lot Size
    ======================================================
    */

    async calculateLotSize(
        stopLossPips,
        pipValue = 10,
        riskPercent = CONFIG.DEFAULT_RISK_PERCENT,
        symbol = null
    ) {

        try {

            this.validatePositiveNumber(
                stopLossPips,
                "Stop loss"
            );

            this.validatePositiveNumber(
                pipValue,
                "Pip value"
            );

            this.validateRiskPercent(riskPercent);

            const riskAmount =
                await this.calculateRiskAmount(
                    riskPercent
                );

            let volume = riskAmount / (stopLossPips * pipValue);
            let minimum = CONFIG.DEFAULT_MIN_LOT;
            let maximum = CONFIG.DEFAULT_MAX_LOT;
            let step = CONFIG.DEFAULT_VOLUME_STEP;

            if (symbol) {

                try {

                    const snapshot =
                        await marketService.getMarketSnapshot(symbol);

                    minimum = snapshot.minLot ?? minimum;
                    maximum = snapshot.maxLot ?? maximum;
                    step = snapshot.lotStep ?? step;

                } catch (error) {

                    logger.warn(
                        logger.SOURCES.RISK,
                        "Unable to retrieve broker volume specification. Using defaults.",
                        {
                            symbol,
                            error: error.message
                        }
                    );

                }

            }

            volume = this.roundToStep(volume, step);

            volume = this.clampVolume(
                volume,
                minimum,
                maximum
            );

            return volume;

        } catch (error) {

            logger.error(
                logger.SOURCES.RISK,
                "Lot size calculation failed.",
                {
                    stopLossPips,
                    pipValue,
                    riskPercent,
                    symbol,
                    error: error.message
                }
            );

            throw error;

        }

    }

    /*
    ======================================================
    Volume Rounding
    ======================================================
    */

    roundLotSize(
        volume,
        step = CONFIG.DEFAULT_VOLUME_STEP
    ) {

        this.validatePositiveNumber(
            volume,
            "Volume"
        );

        this.validatePositiveNumber(
            step,
            "Volume step"
        );

        return this.roundToStep(
            volume,
            step
        );

    }

    /*
    ======================================================
    Maximum Risk
    ======================================================
    */

    getMaxRisk() {

        return CONFIG.MAX_RISK_PERCENT;

    }

    /*
    ======================================================
    Trade Validation
    ======================================================
    */

    canRiskTrade(riskPercent) {

        try {

            this.validateRiskPercent(riskPercent);

            return true;

        } catch {

            return false;

        }

    }

        /*
    ======================================================
    Configuration
    ======================================================
    */

    getConfiguration() {

        return {
            ...CONFIG
        };

    }

    /*
    ======================================================
    Health
    ======================================================
    */

    getHealth() {

        return {

            service: "riskService",

            version: this.VERSION,

            status: "healthy",

            configuration: this.getConfiguration()

        };

    }

    /*
    ======================================================
    Service Information
    ======================================================
    */

    getVersion() {

        return this.VERSION;

    }

}

/*
==========================================================
Singleton Export
==========================================================
*/

module.exports = new RiskService();
