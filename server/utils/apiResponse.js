/*
==========================================================
WealthBuilder OS
Standard API Response Helper
==========================================================
*/

function success(data = {}, message = "Success") {

    return {

        success: true,

        timestamp: new Date().toISOString(),

        message,

        data

    };

}

function failure(message = "Request Failed", error = null) {

    return {

        success: false,

        timestamp: new Date().toISOString(),

        message,

        error

    };

}

module.exports = {

    success,

    failure

};
