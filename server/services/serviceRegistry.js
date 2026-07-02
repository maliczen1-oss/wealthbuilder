/*
==========================================================
WealthBuilder OS
Service Registry
Powered by Jarvis Intelligence
==========================================================
*/

module.exports = {

    marketContext:
        require("./marketContextService"),

    marketState:
        require("./marketStateEngine"),

    strategy:
        require("./strategyEngine"),

    decision:
        require("./decisionEngine"),

    validation:
        require("./validationService"),

    guardian:
        require("./guardianService"),

    execution:
        require("./executionPipeline"),

    replay:
        require("./replayService"),

    decisionReport:
        require("./decisionReportService"),

    learning:
        require("./learningEngine"),

    dna:
        require("./dnaEngine"),

    psychology:
        require("./psychologyEngine"),

    automation:
        require("./automationEngine"),

    notifications:
        require("./notificationService"),

    logger:
        require("./logger"),

    jarvis:
        require("./jarvisService")

};
