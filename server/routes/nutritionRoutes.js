/**
 * Nutrition API Routes
 * 
 * POST /api/nutrition/analyze — Full nutrition analysis pipeline
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/errorHandler.js';
import { analyzeFood } from '../controllers/nutritionController.js';

const router = Router();

// Rate limiter: 10 nutrition analysis requests per minute per IP
// (each request makes multiple external API calls)
const nutritionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many nutrition analysis requests. Please wait a moment and try again.',
    },
  },
});

/**
 * POST /api/nutrition/analyze
 * 
 * Request body:
 * {
 *   "foodText": "2 eggs, 250 ml milk, 100g paneer, 3 chapatis, 1 banana"
 * }
 * 
 * Response:
 * {
 *   "foods": [
 *     {
 *       "food_name": "egg",
 *       "quantity": 2,
 *       "unit": "piece",
 *       "grams": 100,
 *       "usdaMatch": { "fdcId": 171287, "description": "Egg, whole, cooked" },
 *       "nutrition": { "calories": 143, "protein": 12.6, "carbs": 0.7, "fat": 9.5, "fiber": 0 }
 *     },
 *     ...
 *   ],
 *   "totals": {
 *     "calories": 892,
 *     "protein": 48.3,
 *     "carbs": 76.2,
 *     "fat": 38.1,
 *     "fiber": 5.4,
 *     "iron": 4.21,
 *     "calcium": 412.5,
 *     "magnesium": 89.3,
 *     "zinc": 3.67,
 *     "potassium": 821.4,
 *     "vitamin_b12": 2.45,
 *     "vitamin_d": 1.82,
 *     "vitamin_a": 198.2,
 *     "vitamin_c": 12.3,
 *     "folate": 45.6
 *   },
 *   "analysis": {
 *     "summary": "This meal provides a good balance of...",
 *     "strengths": ["High protein content", ...],
 *     "deficiencies": ["Low vitamin C", ...],
 *     "recommendations": ["Add citrus fruit for vitamin C", ...]
 *   },
 *   "meta": {
 *     "processingTimeMs": 3200,
 *     "foodsFound": 5,
 *     "foodsTotal": 5
 *   }
 * }
 */
router.post('/analyze', nutritionLimiter, asyncHandler(analyzeFood));

export default router;
