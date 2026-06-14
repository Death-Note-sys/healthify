/**
 * Centralized Error Handling Middleware
 * 
 * Catches both sync and async errors from route handlers.
 * Provides consistent JSON error responses.
 */

/**
 * Wraps an async route handler so thrown errors are passed to next().
 * Usage: router.post('/path', asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Express error handling middleware.
 * Must be registered after all routes: app.use(errorHandler);
 */
export function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  // Determine status code
  let statusCode = err.statusCode || 500;

  // Known error types
  if (err.message?.includes('not configured')) {
    statusCode = 503; // Service Unavailable
  } else if (err.message?.includes('Invalid') || err.message?.includes('required')) {
    statusCode = 400; // Bad Request
  } else if (err.message?.includes('Rate limit') || err.message?.includes('429')) {
    statusCode = 429; // Too Many Requests
  }

  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
