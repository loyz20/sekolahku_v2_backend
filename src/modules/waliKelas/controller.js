const waliKelasService = require('./service');
const waliModel = require('./model');
const NotificationService = require('../notification/service');
const { successResponse } = require('../../utils/response');

async function getDashboardStats(req, res, next) {
  try {
    const ptkId = req.user.ref_id;
    const sekolahId = req.user.sekolah_id;

    if (req.user.role !== 'guru' || !ptkId) {
      return res.status(403).json({ message: 'Hanya guru yang dapat mengakses fitur ini' });
    }

    const stats = await waliKelasService.getClassDashboardStats(ptkId, sekolahId);
    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
}

async function getStudents(req, res, next) {
  try {
    const ptkId = req.user.ref_id;
    const sekolahId = req.user.sekolah_id;

    const students = await waliKelasService.getMyStudents(ptkId, sekolahId);
    res.json({ data: students });
  } catch (error) {
    next(error);
  }
}

async function getAttendanceRecap(req, res, next) {
    try {
      const ptkId = req.user.ref_id;
      const sekolahId = req.user.sekolah_id;
      const { month, year } = req.query;
  
      const recap = await waliKelasService.getAttendanceRecap(
          ptkId, 
          sekolahId, 
          month || new Date().getMonth() + 1, 
          year || new Date().getFullYear()
      );
      res.json({ data: recap });
    } catch (error) {
      next(error);
    }
}

async function updateAttendance(req, res, next) {
  try {
    const ptkId = req.user.ref_id;
    const sekolahId = req.user.sekolah_id;
    const { peserta_didik_id, tanggal, status, catatan } = req.body;

    const result = await waliKelasService.updateStudentAttendance(ptkId, sekolahId, {
      peserta_didik_id,
      tanggal,
      status,
      catatan
    });

    return successResponse(res, { message: 'Absensi berhasil diperbarui', data: result });
  } catch (error) {
    next(error);
  }
}

async function broadcastMessage(req, res, next) {
  try {
    const { message, title = 'Pesan Wali Kelas' } = req.body;
    if (!message) {
      const error = new Error('Pesan tidak boleh kosong');
      error.statusCode = 400;
      throw error;
    }

    const myClass = await waliModel.getMyClass(req.user.ref_id, req.user.sekolah_id);
    if (!myClass) {
      const error = new Error('Anda bukan wali kelas di tahun ajaran aktif');
      error.statusCode = 403;
      throw error;
    }

    const count = await NotificationService.broadcastToClass(myClass.id, {
      title,
      message,
      type: 'info',
      metadata: { from_wali_kelas_id: req.user.id }
    });

    return successResponse(res, { 
      message: 'Broadcast terkirim', 
      recipient_count: count 
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardStats,
  getStudents,
  getAttendanceRecap,
  updateAttendance,
  broadcastMessage,
};
