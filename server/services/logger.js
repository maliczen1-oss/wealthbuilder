/*
==========================================================
WealthBuilder OS
Central Logger
Powered by Jarvis Intelligence
==========================================================
*/

const logs = [];

const MAX_LOGS = 1000;

function write(level, source, message, data = {}) {

    const entry = {

        id: Date.now(),

        level,

        source,

        message,

        data,

        timestamp: new Date().toISOString()

    };

    logs.unshift(entry);

    if (logs.length > MAX_LOGS) {

        logs.pop();

    }

    console.log(
        `[${level}] [${source}] ${message}`
    );

}

function info(source, message, data = {}) {

    write("INFO", source, message, data);

}

function success(source, message, data = {}) {

    write("SUCCESS", source, message, data);

}

function warning(source, message, data = {}) {

    write("WARNING", source, message, data);

}

function error(source, message, data = {}) {

    write("ERROR", source, message, data);

}

function getLogs() {

    return logs;

}

module.exports = {

    info,

    success,

    warning,

    error,

    getLogs

};
