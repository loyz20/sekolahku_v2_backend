const { verifyAccessToken } = require('../utils/token');
const { errorResponse } = require('../utils/response');
const ErrorCode = require('../constants/errorCodes');

/**
 * Middleware that verifies JWT access token from httpOnly cookies or Authorization header.
 * On success, attaches decoded payload to req.user with:
 *   - id (from sub)
 *   - role
 *   - sekolah_id
 *   - jti
 */
function authenticate(req, res, next) {
  // Skip authentication for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Try to get token from httpOnly cookie first, then fallback to Authorization header
  let token = req.cookies?.access_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return errorResponse(
      res, 
      'Anda harus login terlebih dahulu. Silakan gunakan endpoint /api/v1/auth/login',
      null, 
      401, 
      ErrorCode.UNAUTHORIZED
    );
  }

  try {
    const decoded = verifyAccessToken(token);

    req.user = {
      id: decoded.sub,
      role: decoded.role,
      sekolah_id: decoded.sekolah_id,
      ref_id: decoded.ref_id,
      jti: decoded.jti,
    };

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(
        res, 
        'Sesi Anda telah berakhir. Silakan login kembali untuk melanjutkan',
        null, 
        401, 
        ErrorCode.TOKEN_EXPIRED
      );
    }

    return errorResponse(
      res, 
      'Token tidak valid atau rusak. Silakan login kembali',
      null, 
      401, 
      ErrorCode.TOKEN_INVALID
    );
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Sesi berakhir, silakan login kembali', null, 401, ErrorCode.UNAUTHORIZED);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Anda tidak memiliki akses untuk melakukan aksi ini', null, 403, ErrorCode.FORBIDDEN);
    }

    return next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
