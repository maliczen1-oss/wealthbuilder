/*
==========================================================
WealthBuilder OS
System Orchestrator
Powered by Jarvis Intelligence
==========================================================
*/

const services =
    require("./serviceRegistry");

class SystemOrchestrator {

    async initialize() {

        services.logger.info(

            "System",

            "Initializing WealthBuilder OS."

        );

        return {

            initialized: true,

            version: "0.95",

            codename: "MISSION CONTROL",

            startedAt: new Date()

        };

    }

    async executeTradingCycle(data) {

        return services.execution.execute(data);

    }

    async generateMorningBrief() {

        if (

            services.jarvis.generateMorningBrief

        ) {

            return services.jarvis.generateMorningBrief();

        }

        return null;

    }

    health() {

        return {

            intelligence: true,

            guardian: true,

            execution: true,

            notifications: true,

            replay: true,

            learning: true

        };

    }

}

module.exports =
new SystemOrchestrator();
