const { pool } = require('../../config/db');

async function getMyClass(ptkId, sekolahId) {
  const [rows] = await pool.query(
    `SELECT r.*, ta.tahun as tahun_ajaran_nama
     FROM rombel r
     JOIN tahun_ajaran ta ON r.tahun_ajaran_id = ta.id
     WHERE r.wali_kelas_ptk_id = ? AND r.sekolah_id = ? AND ta.aktif = 1
     LIMIT 1`,
    [ptkId, sekolahId]
  );
  return rows[0] || null;
}

async function getClassStudents(rombelId) {
  const [rows] = await pool.query(
    `SELECT 
        pd.id, pd.nama, pd.nis, pd.nisn, pd.jenis_kelamin,
        (SELECT SUM(poin_snapshot) FROM pelanggaran_siswa WHERE peserta_didik_id = pd.id) as total_poin
     FROM peserta_didik pd
     JOIN anggota_rombel ar ON pd.id = ar.peserta_didik_id
     WHERE ar.rombel_id = ?
     ORDER BY pd.nama ASC`,
    [rombelId]
  );
  return rows;
}

async function getClassAttendanceStats(rombelId, tanggal) {
  const [rows] = await pool.query(
    `SELECT 
        CASE 
          WHEN status_masuk IN ('Valid', 'Terlambat') THEN 'Hadir'
          ELSE status_masuk 
        END as status, 
        COUNT(*) as count
     FROM absensi a
     JOIN anggota_rombel ar ON a.peserta_didik_id = ar.peserta_didik_id
     WHERE ar.rombel_id = ? AND a.tanggal = ?
     GROUP BY status`,
    [rombelId, tanggal]
  );
  
  const stats = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
  rows.forEach(row => {
    if (stats[row.status] !== undefined) {
      stats[row.status] = row.count;
    }
  });
  return stats;
}

async function getTopViolationClass(rombelId) {
  const [rows] = await pool.query(
    `SELECT 
        pd.id, pd.nama, pd.nis, 
        SUM(ps.poin_snapshot) as total_poin
     FROM peserta_didik pd
     JOIN anggota_rombel ar ON pd.id = ar.peserta_didik_id
     JOIN pelanggaran_siswa ps ON pd.id = ps.peserta_didik_id
     WHERE ar.rombel_id = ?
     GROUP BY pd.id
     HAVING total_poin > 0
     ORDER BY total_poin DESC
     LIMIT 5`,
    [rombelId]
  );
  return rows;
}

async function getClassAttendanceRecap(rombelId, month, year) {
  const [rows] = await pool.query(
    `SELECT 
        pd.id, pd.nama, pd.nis,
        SUM(CASE WHEN a.status_masuk IN ('Valid', 'Terlambat') THEN 1 ELSE 0 END) as Hadir,
        SUM(CASE WHEN a.status_masuk = 'Izin' THEN 1 ELSE 0 END) as Izin,
        SUM(CASE WHEN a.status_masuk = 'Sakit' THEN 1 ELSE 0 END) as Sakit,
        SUM(CASE WHEN a.status_masuk = 'Alpa' THEN 1 ELSE 0 END) as Alpa
     FROM peserta_didik pd
     JOIN anggota_rombel ar ON pd.id = ar.peserta_didik_id
     LEFT JOIN absensi a ON pd.id = a.peserta_didik_id 
        AND MONTH(a.tanggal) = ? AND YEAR(a.tanggal) = ?
     WHERE ar.rombel_id = ?
     GROUP BY pd.id, pd.nama, pd.nis
     ORDER BY pd.nama ASC`,
    [month, year, rombelId]
  );
  return rows;
}

async function getClassUpcomingBirthdays(rombelId) {
  const [rows] = await pool.query(
    `SELECT pd.id, pd.nama, pd.tanggal_lahir,
            TIMESTAMPDIFF(YEAR, pd.tanggal_lahir, CURDATE()) + 1 as turning_age
     FROM peserta_didik pd
     JOIN anggota_rombel ar ON pd.id = ar.peserta_didik_id
     WHERE ar.rombel_id = ?
     AND (
       (DATE_FORMAT(pd.tanggal_lahir, '%m%d') >= DATE_FORMAT(CURDATE(), '%m%d')
        AND DATE_FORMAT(pd.tanggal_lahir, '%m%d') <= DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 30 DAY), '%m%d'))
       OR 
       (DATE_FORMAT(CURDATE(), '%m%d') > DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 30 DAY), '%m%d')
        AND (DATE_FORMAT(pd.tanggal_lahir, '%m%d') >= DATE_FORMAT(CURDATE(), '%m%d')
             OR DATE_FORMAT(pd.tanggal_lahir, '%m%d') <= DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 30 DAY), '%m%d')))
     )
     ORDER BY 
       CASE 
         WHEN DATE_FORMAT(pd.tanggal_lahir, '%m%d') >= DATE_FORMAT(CURDATE(), '%m%d') THEN 0 
         ELSE 1 
       END,
       DATE_FORMAT(pd.tanggal_lahir, '%m%d') ASC`,
    [rombelId]
  );
  return rows;
}

async function getUnrecordedStudents(rombelId, tanggal) {
    const [rows] = await pool.query(
        `SELECT pd.id, pd.nama, pd.nis
         FROM peserta_didik pd
         JOIN anggota_rombel ar ON pd.id = ar.peserta_didik_id
         LEFT JOIN absensi a ON pd.id = a.peserta_didik_id AND a.tanggal = ?
         WHERE ar.rombel_id = ? AND a.id IS NULL
         ORDER BY pd.nama ASC`,
        [tanggal, rombelId]
    );
    return rows;
}

module.exports = {
  getMyClass,
  getClassStudents,
  getClassAttendanceStats,
  getTopViolationClass,
  getClassAttendanceRecap,
  getClassUpcomingBirthdays,
  getUnrecordedStudents,
};
