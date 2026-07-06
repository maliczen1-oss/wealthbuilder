"use strict";

/*
==========================================================
WealthBuilder OS

System Route

Version : 1.1.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides consolidated health information for all
core WealthBuilder services while maintaining
backward compatibility.

Routes
------
GET /api/system/
GET /api/system/health

==========================================================
*/

const express = require("express");

const router = express.Router();

const metaapi = require("../services/metaapi");
const accountService = require("../services/accountService");
const positionService = require("../services/positionService");
const symbolService = require("../services/symbolService");
const marketService = require("../services/marketService");
const tradeService = require("../services/tradeService");
const automationEngine = require("../services/automationEngine");
const aiOptimisationService = require("../services/aiOptimisationService");
const tradeClusterService = require("../services/tradeClusterService");
const pendingOrderService = require("../services/pendingOrderService");

/*
==========================================================
Legacy Route
Maintained for backward compatibility
==========================================================
*/

router.get("/", async (req, res) => {

    try {

        const account = metaapi.getAccount();
        const connection = metaapi.getConnection();

        const status = {

            timestamp: new Date().toISOString(),

            services: {

                metaApi: !!connection,

                account: !!account,

                broker: account?.broker || null,

                connected: !!connection

            },

            overallHealth: 100

        };

        if (!connection)
            status.overallHealth -= 40;

        if (!account)
            status.overallHealth -= 30;

        res.json(status);

    }

    catch (error) {

        res.status(500).json({

            error: error.message

        });

    }

});

/*
==========================================================
GET /api/system/health
==========================================================
*/

router.get("/health", async (req, res) => {

    try {

        const services = {

            metaApi:
                metaapi.getHealth(),

            account:
                accountService.getHealth
                    ? await accountService.getHealth()
                    : { status: "UNKNOWN" },

            positions:
                positionService.getHealth
                    ? await positionService.getHealth()
                    : { status: "UNKNOWN" },

            symbols:
                symbolService.getHealth
                    ? await symbolService.getHealth()
                    : { status: "UNKNOWN" },

            market:
                marketService.getHealth
                    ? await marketService.getHealth()
                    : { status: "UNKNOWN" },

            trading:
                tradeService.getHealth
                    ? await tradeService.getHealth()
                    : { status: "UNKNOWN" },

            automation:
                automationEngine.getHealth
                    ? automationEngine.getHealth()
                    : { status: "UNKNOWN" },

            ai:
                aiOptimisationService.getHealth
                    ? await aiOptimisationService.getHealth()
                    : {
                          status: "READY",
                          version:
                              aiOptimisationService.getVersion
                                  ? aiOptimisationService.getVersion()
                                  : "Unknown"
                      },

            clusters:
                tradeClusterService.getHealth(),

            pendingOrders:
                await pendingOrderService.getHealth()

        };

        const unhealthy = Object.values(services).filter(service =>

            service.status === "ERROR" ||

            service.status === "FAILED"

        );

        const response = {

            platform: "WealthBuilder OS",

            version: "3.0.0",

            timestamp: new Date().toISOString(),

            overallStatus:

                unhealthy.length === 0
                    ? "HEALTHY"
                    : "DEGRADED",

            healthyServices:

                Object.keys(services).length -

                unhealthy.length,

            totalServices:

                Object.keys(services).length,

            services

        };

        res.json(response);

    }

    catch (error) {

        res.status(500).json({

            platform: "WealthBuilder OS",

            overallStatus: "ERROR",

            timestamp: new Date().toISOString(),

            error: error.message

        });

    }

});

module.exports = router;
