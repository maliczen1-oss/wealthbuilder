/*
==========================================================
WealthBuilder OS
Notification Service
Powered by Jarvis Intelligence
==========================================================
*/

const notifications = [];

const MAX_NOTIFICATIONS = 200;

function add(type, title, message) {

    notifications.unshift({

        id: Date.now(),

        type,

        title,

        message,

        timestamp: new Date()

    });

    if (notifications.length > MAX_NOTIFICATIONS) {

        notifications.pop();

    }

}

function getAll() {

    return notifications;

}

function clear() {

    notifications.length = 0;

}

module.exports = {

    add,

    getAll,

    clear

};
