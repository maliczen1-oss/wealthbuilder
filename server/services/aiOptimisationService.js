"use strict";

/*
==========================================================
WealthBuilder OS

AI Optimisation Service

Version : 2.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides intelligent trade evaluation before execution.

Responsibilities
----------------
✓ Confidence Scoring
✓ Trade Quality Grading
✓ Explainable AI Decision Reports
✓ Risk Optimisation
✓ Session Evaluation
✓ Trend Analysis
✓ Volatility Assessment
✓ Spread Analysis
✓ Margin Assessment
✓ Trade Approval
✓ Warning Generation

Future
------
- Machine Learning
- Trading DNA
- Psychology Engine
- Portfolio Intelligence
- Adaptive Learning
- Economic News Awareness
- Liquidity Intelligence

==========================================================
*/

const logger = require("./logger");
const marketService = require("./marketService");
const accountService = require("./accountService");

/*
==========================================================
Configuration
==========================================================
*/

const CONFIG = {

    MIN_CONFIDENCE: 70,

    MAX_CONFIDENCE: 100,

    DEFAULT_CONFIDENCE: 80,

    MAX_SPREAD_PERCENT: 0.002,

    HIGH_VOLATILITY_PERCENT: 2.5,

    LOW_VOLATILITY_PERCENT: 0.25

};

/*
==========================================================
AI Optimisation Service
==========================================================
*/

class AIOptimisationService {

    constructor() {

        this.VERSION
