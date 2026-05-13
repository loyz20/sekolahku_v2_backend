const { errorResponse } = require('../utils/response');
const ErrorCode = require('../constants/errorCodes');

function notFound(req, res) {
  const message = `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}. Silakan periksa dokumentasi API di /docs`;
  return errorResponse(res, message, null, 404, ErrorCode.NOT_FOUND);
}

module.exports = notFound;
