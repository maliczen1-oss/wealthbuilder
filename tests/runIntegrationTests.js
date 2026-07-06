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
    .then(async () => {

        console.log("Environment Ready");

        const fs = require("node:fs");
const path = require("node:path");

const integrationDirectory = path.join(

    __dirname,

    "integration"

);

const files = fs

    .readdirSync(integrationDirectory)

    .filter(file => file.endsWith(".test.js"))

    .sort();

console.log(

    `Discovered ${files.length} integration test(s).\n`

);

let passed = 0;

let failed = 0;

for (const file of files) {

    try {

        console.log(

            `Running ${file}...`

        );

        const test = require(

            path.join(

                integrationDirectory,

                file

            )

        );

        if (

            typeof test.run !== "function"

        ) {

            throw new Error(

                "Missing exported run() function."

            );

        }

        await test.run();

        console.log(

            `PASS  ${file}\n`

        );

        passed++;

    }

    catch (error) {

        console.error(

            `FAIL  ${file}`

        );

        console.error(

            error.message,

            "\n"

        );

        failed++;

    }

}

console.log(

    "======================================="

);

console.log(

    " Integration Test Summary"

);

console.log(

    "======================================="

);

console.log(

    `Passed : ${passed}`

);

console.log(

    `Failed : ${failed}`

);

console.log(

    `Total  : ${passed + failed}`

);

console.log("");

if (failed > 0) {

    process.exit(1);

}

console.log(

    "All integration tests passed."

);

process.exit(0);

    })
    .catch(error => {

        console.error(error);

        process.exit(1);

    });
