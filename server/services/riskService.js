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

        if (

            riskPercent >

            CONFIG.MAX_RISK_PERCENT

        ) {

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

    roundToStep(

        volume,

        step

    ) {

        return (

            Math.round(

                volume / step

            ) * step

        );

    }

    clampVolume(

        volume,

        minimum,

        maximum

    ) {

        return Math.max(

            minimum,

            Math.min(

                maximum,

                volume

            )

        );

    }

    /*
    ======================================================
    RESPONSE 2 STARTS HERE

    Replace everything from this marker down to the
    Service Information section when Response 2 arrives.

    Do NOT modify anything above this line.

    ======================================================
    */
