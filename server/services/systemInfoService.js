/*
==========================================================
WealthBuilder OS
System Information Service
Powered by Jarvis Intelligence
==========================================================
*/

const constants = require("../config/constants");

class SystemInfoService {

    getInfo() {

        return {

            company: constants.COMPANY,

            version: constants.VERSION,

            codename: constants.CODENAME,

            ai: constants.AI_NAME,

            uptime: Math.floor(process.uptime()),

            refreshInterval:
                constants.DEFAULT_REFRESH_INTERVAL,

            guardian: {

                minimumMargin:
                    constants.GUARDIAN.MIN_MARGIN_LEVEL,

                maxOpenPositions:
                    constants.GUARDIAN.MAX_OPEN_POSITIONS,

                defaultRisk:
                    constants.GUARDIAN.DEFAULT_RISK

            }

        };

    }

}

module.exports = new SystemInfoService();
