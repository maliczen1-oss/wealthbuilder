/*
==========================================================
WealthBuilder OS
Global Error Handler
==========================================================
*/

const api = require("../utils/apiResponse");

function errorHandler(err, req, res, next) {

    console.error(err);

    return res.status(500).json(

        api.failure(

            "Unexpected server error.",

            err.message

        )

    );

}

module.exports = errorHandler;
