const crypto = require('crypto');
const { pool } = require('../../config/db');

async function upsertPresensi(sekolahId, data, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { pembelajaran_id, semester_id, tanggal, items } = data;

    for (const item of items) {
      // Check if exists
      const [existing] = await connection.query(
        `SELECT id FROM presensi_pembelajaran 
         WHERE sekolah_id = ? AND pembelajaran_id = ? AND peserta_didik_id = ? AND tanggal = ?`,
        [sekolahId, pembelajaran_id, item.peserta_didik_id, tanggal]
      );

      if (existing.length > 0) {
        await connection.query(
          `UPDATE presensi_pembelajaran SET status = ?, catatan = ? WHERE id = ?`,
          [item.status, item.catatan || '', existing[0].id]
        );
      } else {
        await connection.query(
          `INSERT INTO presensi_pembelajaran (id, sekolah_id, pembelajaran_id, peserta_didik_id, semester_id, tanggal, status, catatan, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), sekolahId, pembelajaran_id, item.peserta_didik_id, semester_id, tanggal, item.status, item.catatan || '', userId]
        );
      }
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listPresensi(sekolahId, pembelajaranId, tanggal) {
  const [rows] = await pool.query(
    `SELECT pp.*, pd.nama as peserta_didik_nama, pd.nis
     FROM presensi_pembelajaran pp
     JOIN peserta_didik pd ON pp.peserta_didik_id = pd.id
     WHERE pp.sekolah_id = ? AND pp.pembelajaran_id = ? AND pp.tanggal = ?`,
    [sekolahId, pembelajaranId, tanggal]
  );
  return rows;
}

async function getRekapPresensi(sekolahId, pembelajaranId, semesterId) {
  const [rows] = await pool.query(
    `SELECT 
        pd.id as peserta_didik_id,
        pd.nama as nama_siswa,
        pd.nis,
        SUM(CASE WHEN pp.status = 'Hadir' THEN 1 ELSE 0 END) as hadir,
        SUM(CASE WHEN pp.status = 'Izin' THEN 1 ELSE 0 END) as izin,
        SUM(CASE WHEN pp.status = 'Sakit' THEN 1 ELSE 0 END) as sakit,
        SUM(CASE WHEN pp.status = 'Alpa' THEN 1 ELSE 0 END) as alpa,
        COUNT(pp.id) as total_pertemuan
     FROM peserta_didik pd
     JOIN anggota_rombel ar ON pd.id = ar.peserta_didik_id
     JOIN rombel r ON ar.rombel_id = r.id
     JOIN pembelajaran pb ON r.id = pb.rombel_id
     LEFT JOIN presensi_pembelajaran pp ON pd.id = pp.peserta_didik_id 
        AND pp.pembelajaran_id = pb.id 
        AND pp.semester_id = ?
     WHERE pb.id = ? AND r.sekolah_id = ?
     GROUP BY pd.id, pd.nama, pd.nis
     ORDER BY pd.nama ASC`,
    [semesterId, pembelajaranId, sekolahId]
  );
  return rows;
}

async function getStudentAttendanceHistory(studentId, sekolahId, semesterId) {
  const [rows] = await pool.query(
    `SELECT pp.*, mp.nama as mata_pelajaran
     FROM presensi_pembelajaran pp
     JOIN pembelajaran pb ON pp.pembelajaran_id = pb.id
     JOIN mata_pelajaran mp ON pb.mata_pelajaran_id = mp.id
     WHERE pp.peserta_didik_id = ? AND pp.sekolah_id = ? AND pp.semester_id = ?
     ORDER BY pp.tanggal DESC, mp.nama ASC`,
    [studentId, sekolahId, semesterId]
  );
  return rows;
}

async function getStudentAttendanceSummary(studentId, sekolahId, semesterId) {
  const [rows] = await pool.query(
    `SELECT 
        SUM(CASE WHEN status = 'Hadir' THEN 1 ELSE 0 END) as hadir,
        SUM(CASE WHEN status = 'Izin' THEN 1 ELSE 0 END) as izin,
        SUM(CASE WHEN status = 'Sakit' THEN 1 ELSE 0 END) as sakit,
        SUM(CASE WHEN status = 'Alpa' THEN 1 ELSE 0 END) as alpa,
        COUNT(*) as total
     FROM presensi_pembelajaran
     WHERE peserta_didik_id = ? AND sekolah_id = ? AND semester_id = ?`,
    [studentId, sekolahId, semesterId]
  );
  return rows[0];
}

module.exports = {
  upsertPresensi,
  listPresensi,
  getRekapPresensi,
  getStudentAttendanceHistory,
  getStudentAttendanceSummary
};
