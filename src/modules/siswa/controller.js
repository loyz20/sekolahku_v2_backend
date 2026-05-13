const { successResponse } = require('../../utils/response');
const siswaService = require('./service');
const { logActivity } = require('../../shared/activityLog');

async function list(req, res, next) {
  try {
    const result = await siswaService.list(req.query);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function detail(req, res, next) {
  try {
    const result = await siswaService.detail(req.params.id, req.query);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await siswaService.create(req.body);
    await logActivity({
      userId: req.user.id,
      action: 'CREATE_SISWA',
      entityType: 'siswa',
      entityId: result.id,
      description: `Menambahkan data siswa baru: ${result.nama}`
    });
    return successResponse(res, result, 'Success', 201);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await siswaService.update(req.params.id, req.body);
    await logActivity({
      userId: req.user.id,
      action: 'UPDATE_SISWA',
      entityType: 'siswa',
      entityId: result.id,
      description: `Memperbarui data siswa: ${result.nama}`
    });
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await siswaService.remove(req.params.id, req.query);
    await logActivity({
      userId: req.user.id,
      action: 'DELETE_SISWA',
      entityType: 'siswa',
      entityId: req.params.id,
      description: `Menghapus data siswa dengan ID: ${req.params.id}`
    });
    return successResponse(res, null, 'Success');
  } catch (error) {
    return next(error);
  }
}

async function importData(req, res, next) {
  try {
    const result = await siswaService.importData(req.body.items, req.user.sekolah_id);
    await logActivity({
      userId: req.user.id,
      action: 'IMPORT_SISWA',
      entityType: 'siswa',
      entityId: null,
      description: `Mengimpor ${result.successCount} data siswa`
    });
    return successResponse(res, result, 'Import completed', 201);
  } catch (error) {
    return next(error);
  }
}

async function stats(req, res, next) {
  try {
    const result = await siswaService.stats(req.query);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getDashboard(req, res, next) {
  try {
    const result = await siswaService.getDashboard(req.user);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getGrades(req, res, next) {
  try {
    const result = await siswaService.getGrades(req.user);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getSchedule(req, res, next) {
  try {
    const result = await siswaService.getSchedule(req.user);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getViolations(req, res, next) {
  try {
    const result = await siswaService.getViolations(req.user);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getAttendance(req, res, next) {
  try {
    const result = await siswaService.getAttendance(req.user);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getNotifications(req, res, next) {
  try {
    const result = await siswaService.getNotifications(req.user);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function markNotificationAsRead(req, res, next) {
  try {
    const result = await siswaService.markNotificationAsRead(req.user, req.params.id);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function markAllNotificationsAsRead(req, res, next) {
  try {
    const result = await siswaService.markAllNotificationsAsRead(req.user);
    return successResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  importData,
  stats,
  getDashboard,
  getGrades,
  getSchedule,
  getViolations,
  getAttendance,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
