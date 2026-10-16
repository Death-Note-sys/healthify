/**
 * Weight API Routes
 * 
 * GET  /api/weight/aggregate — Aggregated timeline metrics (weekly, monthly, yearly)
 * POST /api/weight/validate  — Validate weight log inputs
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getWeightAggregations, validateWeightLog } from '../controllers/weightController.js';

const router = Router();

const weightLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests. Please wait a moment and try again.',
    },
  },
});

router.get('/aggregate', weightLimiter, asyncHandler(getWeightAggregations));
router.post('/validate', weightLimiter, asyncHandler(validateWeightLog));

export default router;
