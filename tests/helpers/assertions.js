"use strict";

/*
==========================================================
Assertion Helpers
==========================================================
*/

function assert(condition, message) {

    if (!condition) {

        throw new Error(message);

    }

}

function assertEqual(actual, expected, message) {

    if (actual !== expected) {

        throw new Error(

            `${message}

Expected: ${expected}

Actual: ${actual}`

        );

    }

}

module.exports = {

    assert,

    assertEqual

};
