const waliKelasModel = require('./model');
const { createError } = require('../shared/service');

async function getClassDashboardStats(ptkId, sekolahId) {
  const myClass = await waliKelasModel.getMyClass(ptkId, sekolahId);
  if (!myClass) {
    throw createError('Anda tidak terdaftar sebagai wali kelas aktif', 404);
  }

  const today = new Date().toISOString().split('T')[0];
  
  const [students, attendance, topViolations, upcomingBirthdays, unrecorded] = await Promise.all([
    waliKelasModel.getClassStudents(myClass.id),
    waliKelasModel.getClassAttendanceStats(myClass.id, today),
    waliKelasModel.getTopViolationClass(myClass.id),
    waliKelasModel.getClassUpcomingBirthdays(myClass.id),
    waliKelasModel.getUnrecordedStudents(myClass.id, today)
  ]);

  return {
    class_info: myClass,
    total_students: students.length,
    gender_stats: {
        L: students.filter(s => s.jenis_kelamin === 'L').length,
        P: students.filter(s => s.jenis_kelamin === 'P').length
    },
    attendance_today: attendance,
    top_violations: topViolations,
    upcoming_birthdays: upcomingBirthdays,
    unrecorded_today: unrecorded,
    students: students // Optional: might want to separate this for large classes
  };
}

async function getMyStudents(ptkId, sekolahId) {
    const myClass = await waliKelasModel.getMyClass(ptkId, sekolahId);
    if (!myClass) throw createError('Anda bukan wali kelas', 404);
    
    return waliKelasModel.getClassStudents(myClass.id);
}

async function getAttendanceRecap(ptkId, sekolahId, month, year) {
    const myClass = await waliKelasModel.getMyClass(ptkId, sekolahId);
    if (!myClass) throw createError('Anda bukan wali kelas', 404);
    
    const recap = await waliKelasModel.getClassAttendanceRecap(myClass.id, month, year);
    
    // --- AUTOMATIC ALPA CALCULATION FOR RECAP ---
    const settings = await require('../absensi/settingsModel').getSettings(sekolahId);
    const holidays = await require('../absensi/service').getHolidays(sekolahId);
    const semester = await require('../semester/model').getActiveSemester(sekolahId);

    // Calculate effective school days in the selected month/year up to TODAY (if month is current)
    let totalEffectiveDays = 0;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const today = new Date();
    const limitDate = (month == today.getMonth() + 1 && year == today.getFullYear()) ? today : endOfMonth;
    
    // Boundary check with semester dates
    const semStart = semester?.tanggal_mulai ? new Date(semester.tanggal_mulai) : startOfMonth;
    const semEnd = semester?.tanggal_selesai ? new Date(semester.tanggal_selesai) : endOfMonth;
    
    const calculationStart = startOfMonth > semStart ? startOfMonth : semStart;
    const calculationEnd = limitDate < semEnd ? limitDate : semEnd;

    if (calculationStart <= calculationEnd) {
        const hariKerjaSet = new Set(settings?.hari_kerja ? (typeof settings.hari_kerja === 'string' ? JSON.parse(settings.hari_kerja) : settings.hari_kerja) : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
        const liburSet = new Set(holidays.map(h => new Date(h.tanggal).toISOString().slice(0, 10)));
        const dayMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

        let current = new Date(calculationStart);
        while (current <= calculationEnd) {
            const dateStr = current.toISOString().slice(0, 10);
            const dayName = dayMap[current.getDay()];
            if (hariKerjaSet.has(dayName) && !liburSet.has(dateStr)) {
                totalEffectiveDays++;
            }
            current.setDate(current.getDate() + 1);
        }
    }

    // Map Alpa for each student based on effective days
    return recap.map(student => {
        const recordedDays = Number(student.Hadir) + Number(student.Izin) + Number(student.Sakit);
        return {
            ...student,
            Alpa: Math.max(0, totalEffectiveDays - recordedDays)
        };
    });
}

async function updateStudentAttendance(ptkId, sekolahId, data) {
    const myClass = await waliKelasModel.getMyClass(ptkId, sekolahId);
    if (!myClass) throw createError('Anda bukan wali kelas', 404);

    // Verify student belongs to this class
    const students = await waliKelasModel.getClassStudents(myClass.id);
    const isOurStudent = students.find(s => s.id === data.peserta_didik_id);
    if (!isOurStudent) throw createError('Siswa tidak ditemukan di kelas Anda', 404);

    const absensiModel = require('../absensi/model');
    return await absensiModel.saveManualAttendance({
        ...data,
        sekolah_id: sekolahId
    });
}

module.exports = {
  getClassDashboardStats,
  getMyStudents,
  getAttendanceRecap,
  updateStudentAttendance,
};
