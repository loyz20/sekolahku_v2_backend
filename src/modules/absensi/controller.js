const { successResponse } = require('../../utils/response');
const absensiService = require('./service');

async function masuk(req, res, next) {
  try {
    const data = {
      ...req.body,
      sekolah_id: req.user.sekolah_id // Always use sekolah_id from token for security
    };
    const result = await absensiService.masuk(data);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function keluar(req, res, next) {
  try {
    const data = {
      ...req.body,
      sekolah_id: req.user.sekolah_id // Always use sekolah_id from token for security
    };
    const result = await absensiService.keluar(data);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function rekap(req, res, next) {
  try {
    const result = await absensiService.rekap(req.query);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getSettings(req, res, next) {
  try {
    const result = await absensiService.getSettings(req.user.sekolah_id);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const result = await absensiService.updateSettings(req.user.sekolah_id, req.body);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getHolidays(req, res, next) {
  try {
    const result = await absensiService.getHolidays(req.user.sekolah_id);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function addHoliday(req, res, next) {
  try {
    const result = await absensiService.addHoliday(req.user.sekolah_id, req.body);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function deleteHoliday(req, res, next) {
  try {
    const result = await absensiService.deleteHoliday(req.params.id);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  masuk,
  keluar,
  rekap,
  getSettings,
  updateSettings,
  getHolidays,
  addHoliday,
  deleteHoliday
};
