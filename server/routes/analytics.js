const express = require('express');

const router = express.Router();

const {
  buildPerformanceReport
} = require('../services/performance');

module.exports = function(connection) {

  router.get('/', async (req, res) => {

    try {

      const account =
        await connection.getAccountInformation();

      const positions =
        await connection.getPositions();

      const startTime = new Date(
        Date.now() - 90 * 24 * 60 * 60 * 1000
      );

      const endTime = new Date();

      const result =
        await connection.getDealsByTimeRange(
          startTime,
          endTime
        );

      const deals =
        Array.isArray(result)
          ? result
          : result.deals ||
            result.items ||
            result.history ||
            [];

      const performance =
        buildPerformanceReport(deals);

      res.json({

        account,

        positions,

        performance,

        history: deals

      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: err.message
      });

    }

  });

  return router;

};
