/*
==========================================================
WealthBuilder OS
Async Route Wrapper
==========================================================
*/

module.exports = function (handler) {

    return function (req, res, next) {

        Promise.resolve(

            handler(req, res, next)

        ).catch(next);

    };

};
