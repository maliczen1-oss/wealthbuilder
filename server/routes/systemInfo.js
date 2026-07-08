"use strict";

/*
==========================================================
WealthBuilder OS

System Information Route

Version : 2.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides WealthBuilder OS system information.

Responsibilities
----------------
✓ System Information
✓ Structured Logging
✓ Health Endpoint
✓ Version Endpoint
✓ Standard API Responses

Business logic belongs exclusively to
systemInfoService.

==========================================================
*/

const express = require("express");

const router = express.Router();

const logger = require("../services/logger");

const systemInfoService =
    require("../services/systemInfoService");

const api =
    require("../utils/apiResponse");

/*
==========================================================
GET /
==========================================================
*/

router.get("/", (req, res) => {

    try {

        logger.info(

            logger.SOURCES.SYSTEM,

            "System information requested."

        );

        const info =
            systemInfoService.getInfo();

        logger.info(

            logger.SOURCES.SYSTEM,

            "System information retrieved successfully."

        );

        return res.json(

            api.success(

                info,

                "System information loaded successfully."

            )

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.SYSTEM,

            "System information retrieval failed.",

            {

                error: error.message

            }

        );

        return res.status(500).json(

            api.failure(

                "Unable to load system information.",

                error.message

            )

        );

    }

});

/*
==========================================================
GET /health
==========================================================
*/

router.get("/health", (req, res) => {

    try {

        const health =

            systemInfoService.getHealth
                ? systemInfoService.getHealth()
                : {

                    service: "system-info",

                    status: "READY"

                };

        return res.json(

            api.success(

                health,

                "System Information service healthy."

            )

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.SYSTEM,

            "System Information health check failed.",

            {

                error: error.message

            }

        );

        return res.status(500).json(

            api.failure(

                "Health check failed.",

                error.message

            )

        );

    }

});

/*
==========================================================
GET /version
==========================================================
*/

router.get("/version", (req, res) => {

    try {

        const version =

            systemInfoService.getVersion
                ? systemInfoService.getVersion()
                : "2.0.0";

        return res.json(

            api.success(

                {

                    version

                },

                "System Information Service Version"

            )

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.SYSTEM,

            "Version retrieval failed.",

            {

                error: error.message

            }

        );

        return res.status(500).json(

            api.failure(

                "Unable to retrieve version.",

                error.message

            )

        );

    }

});

/*
==========================================================
Export
==========================================================
*/

module.exports = router;
