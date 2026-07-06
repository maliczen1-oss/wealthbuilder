"use strict";

/*
==========================================================
WealthBuilder OS

Integration Test Runner

Version : 1.0.0

==========================================================
*/

console.log("");

console.log("=======================================");

console.log(" WealthBuilder Integration Test Suite ");

console.log("=======================================");

console.log("");

require("./helpers/testEnvironment")
    .initialize()
    .then(() => {

        console.log("Environment Ready");

        /*
        Response 2 continues here.
        */

    })
    .catch(error => {

        console.error(error);

        process.exit(1);

    });
