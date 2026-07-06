"use strict";

/*
==========================================================
WealthBuilder OS

Health Integration Test

Version : 1.0.0
Status  : Production

Purpose
-------
Verifies the system health endpoint returns
a valid response structure.

==========================================================
*/

const http = require("node:http");

const { assert } =
    require("../helpers/assertions");

exports.run = async () => {

    console.log(

        "Testing System Health..."

    );

    const response = await new Promise(

        (resolve, reject) => {

            const request = http.get(

                "http://localhost:3000/api/system/health",

                res => {

                    let body = "";

                    res.on(

                        "data",

                        chunk =>

                            body += chunk

                    );

                    res.on(

                        "end",

                        () => {

                            try {

                                resolve({

                                    status:

                                        res.statusCode,

                                    body:

                                        JSON.parse(body)

                                });

                            }

                            catch (error) {

                                reject(error);

                            }

                        }

                    );

                }

            );

            request.on(

                "error",

                reject

            );

        }

    );

    assert(

        response.status === 200,

        "Health endpoint did not return HTTP 200."

    );

    assert(

        response.body.overallStatus,

        "overallStatus missing."

    );

    assert(

        response.body.services,

        "services object missing."

    );

    assert(

        response.body.timestamp,

        "timestamp missing."

    );

    console.log(

        "Health endpoint verified."

    );

};
