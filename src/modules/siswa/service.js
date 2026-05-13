const ErrorCode = require('../../constants/errorCodes');
const siswaModel = require('./model');
const userManagementModel = require('../userManagement/model');
const authModel = require('../auth/model');
const pelanggaranModel = require('../pelanggaran/model');
const presensiModel = require('../presensi/model');
const semesterModel = require('../semester/model');
const pengumumanModel = require('../pengumuman/model');
const NotificationModel = require('../notification/model');
const { createError, parsePagination } = require('../shared/service');

async function list(query) {
  const pagination = parsePagination(query, 'nama', new Set(['nama', 'nis', 'nisn', 'nik', 'tanggal_lahir', 'kelas', 'jenis_kelamin']));
  const sekolahId = query.sekolah_id ? String(query.sekolah_id).trim() : '';
  const jenisKelamin = query.jenis_kelamin;
  const rombelId = query.rombel_id;

  return siswaModel.listSiswa({
    ...pagination,
    sekolahId,
    jenisKelamin,
    rombelId
  });
}

async function detail(id, query) {
  const sekolahId = query.sekolah_id ? String(query.sekolah_id).trim() : '';
  const siswa = await siswaModel.findSiswaById(id, sekolahId);
  if (!siswa) {
    throw createError('Data siswa tidak ditemukan', 404, ErrorCode.NOT_FOUND);
  }

  return siswa;
}

async function create(data) {
  if (!data.nama || !data.nis) {
    throw createError('Nama dan NIS wajib diisi', 400, ErrorCode.VALIDATION_ERROR);
  }

  try {
    const siswa = await siswaModel.createSiswa(data);

    // Auto-create user account for student
    // Username: NIS, Password: NIS
    try {
      await userManagementModel.createUser({
        sekolah_id: siswa.sekolah_id,
        username: siswa.nis,
        password: siswa.nis,
        role: 'siswa',
        ref_id: siswa.id,
      });
    } catch (userError) {
      // If user creation fails (e.g. duplicate username), we still return the siswa
      console.error('Failed to create user for student:', userError.message);
    }

    return siswa;
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw createError('Data sekolah tidak ditemukan', 404, ErrorCode.NOT_FOUND);
    }
    if (error.code === 'ER_DUP_ENTRY') {
      throw createError('Data siswa duplikat', 409, ErrorCode.DUPLICATE_DATA);
    }
    throw error;
  }
}

async function update(id, data) {
  const sekolahId = data.sekolah_id ? String(data.sekolah_id).trim() : '';
  const siswa = await siswaModel.findSiswaById(id, sekolahId);
  if (!siswa) {
    throw createError('Data siswa tidak ditemukan', 404, ErrorCode.NOT_FOUND);
  }

  try {
    return await siswaModel.updateSiswa(id, data, sekolahId);
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw createError('Data sekolah tidak ditemukan', 404, ErrorCode.NOT_FOUND);
    }
    if (error.code === 'ER_DUP_ENTRY') {
      throw createError('Data siswa duplikat', 409, ErrorCode.DUPLICATE_DATA);
    }
    throw error;
  }
}

async function remove(id, query) {
  const sekolahId = query.sekolah_id ? String(query.sekolah_id).trim() : '';
  const deleted = await siswaModel.deleteSiswa(id, sekolahId);
  if (!deleted) {
    throw createError('Data siswa tidak ditemukan', 404, ErrorCode.NOT_FOUND);
  }

  // Delete associated user account
  try {
    await userManagementModel.deleteUserByRefId(id, 'siswa');
  } catch (userError) {
    console.error('Failed to delete user for student:', userError.message);
  }

  return true;
}

async function importData(dataList, sekolahId) {
  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  for (const item of dataList) {
    try {
      item.sekolah_id = sekolahId;
      // Check if NIS already exists in this school
      const existing = await siswaModel.findSiswaByNis(item.nis, sekolahId);

      if (existing) {
        await update(existing.id, item);
      } else {
        await create(item);
      }

      successCount++;
    } catch (error) {
      failedCount++;
      errors.push({ item, error: error.message || 'Gagal mengimpor' });
    }
  }

  return { successCount, failedCount, errors };
}

async function stats(query) {
  const sekolahId = query.sekolah_id;
  return await siswaModel.getSiswaStats(sekolahId);
}

const dashboardModel = require('../dashboard/model');

async function getDashboard(actor) {
  if (actor.role !== 'siswa') {
    throw createError('Hanya siswa yang dapat mengakses dashboard ini', 403, ErrorCode.FORBIDDEN);
  }

  const [studentData, announcements] = await Promise.all([
    dashboardModel.getStudentDashboardData(actor.sekolah_id, actor.ref_id),
    pengumumanModel.listPengumuman(actor.sekolah_id, 'siswa')
  ]);

  // Map backend data to mobile app expected format
  return {
    average_grade: 0, 
    absent_count: studentData.attendance.total - studentData.attendance.hadir,
    task_count: 0, 
    net_poin: studentData.netPoin,
    total_pelanggaran: studentData.totalPelanggaran,
    status_bk: studentData.status,
    announcements: announcements.slice(0, 3)
  };
}

async function getGrades(actor) {
  if (actor.role !== 'siswa') {
    throw createError('Hanya siswa yang dapat mengakses nilai', 403, ErrorCode.FORBIDDEN);
  }
  
  // Need rombel_id for grades
  const user = await authModel.findUserById(actor.id);
  return await siswaModel.getStudentGrades(actor.ref_id, user.rombel_id, actor.sekolah_id);
}

async function getSchedule(actor) {
  if (actor.role !== 'siswa') {
    throw createError('Hanya siswa yang dapat mengakses jadwal', 403, ErrorCode.FORBIDDEN);
  }

  // Need rombel_id for schedule
  const user = await authModel.findUserById(actor.id);
  return await siswaModel.getStudentSchedule(user.rombel_id, actor.sekolah_id);
}

async function getViolations(actor) {
  if (actor.role !== 'siswa') {
    throw createError('Hanya siswa yang dapat mengakses data pelanggaran', 403, ErrorCode.FORBIDDEN);
  }

  const [violations, rewards, summary] = await Promise.all([
    pelanggaranModel.getStudentHistory(actor.sekolah_id, actor.ref_id),
    pelanggaranModel.getStudentRewardHistory(actor.sekolah_id, actor.ref_id),
    pelanggaranModel.getStudentBKSummary(actor.sekolah_id, actor.ref_id)
  ]);

  return {
    violations,
    rewards,
    summary
  };
}

const sekolahModel = require('../sekolah/model');
const absensiModel = require('../absensi/model');

async function getAttendance(actor) {
  if (actor.role !== 'siswa') {
    throw createError('Hanya siswa yang dapat mengakses data absensi', 403, ErrorCode.FORBIDDEN);
  }

  const activeSemester = await semesterModel.getActiveSemester(actor.sekolah_id);
  if (!activeSemester) {
    throw createError('Tidak ada semester aktif', 404, ErrorCode.NOT_FOUND);
  }

  const tanggalHariIni = new Date().toISOString().slice(0, 10);

  const [history, summary, school, todayRes, settings, holidays] = await Promise.all([
    absensiModel.getDailyAttendanceHistory(actor.ref_id),
    absensiModel.getDailyAttendanceSummary(actor.ref_id),
    sekolahModel.findSekolahById(actor.sekolah_id),
    absensiModel.rekapAbsensi({ pesertaDidikId: actor.ref_id, tanggal: tanggalHariIni, page: 1, limit: 1 }),
    require('../absensi/settingsModel').getSettings(actor.sekolah_id),
    require('../absensi/service').getHolidays(actor.sekolah_id)
  ]);

  const today = todayRes.items[0] || null;
  const isLibur = await require('../absensi/settingsModel').isHoliday(actor.sekolah_id, tanggalHariIni);

  // --- AUTOMATIC ALPA CALCULATION ---
  let totalEffectiveDays = 0;
  if (activeSemester.tanggal_mulai) {
    const start = new Date(activeSemester.tanggal_mulai);
    const end = new Date(); // To today
    const hariKerjaSet = new Set(settings?.hari_kerja ? (typeof settings.hari_kerja === 'string' ? JSON.parse(settings.hari_kerja) : settings.hari_kerja) : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
    const liburSet = new Set(holidays.map(h => new Date(h.tanggal).toISOString().slice(0, 10)));

    const dayMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    
    let current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      const dayName = dayMap[current.getDay()];
      
      if (hariKerjaSet.has(dayName) && !liburSet.has(dateStr)) {
        totalEffectiveDays++;
      }
      current.setDate(current.getDate() + 1);
    }
  }

  // Adjusted summary
  const adjustedSummary = {
    ...summary,
    total: totalEffectiveDays || summary.total,
    alpa: Math.max(0, (totalEffectiveDays || 0) - (summary.hadir + summary.izin + summary.sakit))
  };

  return {
    history,
    summary: adjustedSummary,
    school: school ? {
      id: school.id,
      nama: school.nama,
      lintang: Number(school.lintang),
      bujur: Number(school.bujur),
      radius_presensi: school.radius_presensi
    } : null,
    today,
    settings,
    isLibur
  };
}

async function getNotifications(actor) {
  return await NotificationModel.listByUserId(actor.id);
}

async function markNotificationAsRead(actor, notificationId) {
  return await NotificationModel.markAsRead(notificationId, actor.id);
}

async function markAllNotificationsAsRead(actor) {
  return await NotificationModel.markAllAsRead(actor.id);
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

