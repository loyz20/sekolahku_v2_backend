const { verifyCsrfToken } = require('../utils/csrf');
const { errorResponse } = require('../utils/response');
const ErrorCode = require('../constants/errorCodes');

/**
 * Middleware that validates CSRF tokens on state-changing requests (POST, PUT, DELETE)
 * CSRF token should be provided as:
 * - X-CSRF-Token header, or
 * - csrf_token in request body
 */
function validateCsrf(req, res, next) {
  // Skip validation for GET requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Skip CSRF for API requests using Bearer tokens (safe from CSRF as browsers can't set headers cross-origin)
  if (req.headers.authorization) {
    return next();
  }

  const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!csrfSecret) {
    console.error('CSRF_SECRET or JWT_ACCESS_SECRET must be set');
    return errorResponse(res, 'Server configuration error', null, 500, ErrorCode.INTERNAL_ERROR);
  }

  // Try to get CSRF token from header first, then body
  const csrfToken = req.headers['x-csrf-token'] || req.body?.csrf_token;

  if (!csrfToken) {
    return errorResponse(
      res,
      'CSRF token tidak ditemukan',
      null,
      403,
      ErrorCode.FORBIDDEN
    );
  }

  // Verify token
  const isValid = verifyCsrfToken(csrfToken, csrfSecret);
  if (!isValid) {
    return errorResponse(
      res,
      'CSRF token tidak valid atau sudah kadaluarsa',
      null,
      403,
      ErrorCode.FORBIDDEN
    );
  }

  return next();
}

module.exports = {
  validateCsrf,
};
