/*
==========================================================
WealthBuilder OS
Service Registry

Version : 2.0.0
Status  : Production
Powered by Jarvis Intelligence
==========================================================

All services should be accessed through this registry
where practical.

Avoid importing services directly between services
unless there is a strong architectural reason.
==========================================================
*/

const registry = {

    account:
        require("./accountService"),

    automation:
        require("./automationEngine"),

    broker:
        require("./brokerService"),

    brokerGateway:
        require("./brokerGateway"),

    coach:
        require("./coachEngine"),

    confidence:
        require("./confidenceEngine"),

    decision:
        require("./decisionEngine"),

    decisionReport:
        require("./decisionReportService"),

    dna:
        require("./dnaEngine"),

    execution:
        require("./executionPipeline"),

    guardian:
        require("./guardianService"),

    jarvis:
        require("./jarvisService"),

    learning:
        require("./learningEngine"),

    logger:
        require("./logger"),

    market:
        require("./marketService"),

    marketContext:
        require("./marketContextService"),

    marketState:
        require("./marketStateEngine"),

    metaapi:
        require("./metaapi"),

    notifications:
        require("./notificationService"),

    position:
        require("./positionService"),

    psychology:
        require("./psychologyEngine"),

    replay:
        require("./replayService"),

    risk:
        require("./riskService"),

    sentinel:
        require("./sentinelService"),

    strategy:
        require("./strategyEngine"),

    symbol:
        require("./symbolService"),

    system:
        require("./systemInfoService"),

    orchestrator:
        require("./systemOrchestrator"),

    trade:
        require("./tradeService"),

    tradeLifecycle:
        require("./tradeLifecycle"),

    validation:
        require("./validationService")

};

module.exports = Object.freeze(registry);
