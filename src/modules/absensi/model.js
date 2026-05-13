const crypto = require('crypto');
const { pool } = require('../../config/db');

async function upsertAbsensiMasuk(data) {
  const tanggal = new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT id
     FROM absensi
     WHERE peserta_didik_id = ? AND tanggal = ?
     LIMIT 1`,
    [data.peserta_didik_id, tanggal]
  );

  if (rows[0]?.id) {
    await pool.query(
      `UPDATE absensi
       SET jam_masuk = COALESCE(jam_masuk, NOW()), 
           latitude_masuk = ?, 
           longitude_masuk = ?,
           distance_masuk = ?,
           is_mock_location_masuk = ?,
           status_masuk = ?,
           foto_masuk = COALESCE(?, foto_masuk)
       WHERE id = ?`,
      [
        data.latitude, 
        data.longitude, 
        data.distance, 
        data.is_mock_location || false, 
        data.status || 'Valid',
        data.foto_masuk || null,
        rows[0].id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM absensi WHERE id = ? LIMIT 1', [rows[0].id]);
    return updated[0] || null;
  }

  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO absensi (
      id, peserta_didik_id, tanggal, jam_masuk, 
      latitude_masuk, longitude_masuk, distance_masuk, 
      is_mock_location_masuk, status_masuk, foto_masuk
    ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
    [
      id, 
      data.peserta_didik_id, 
      tanggal, 
      data.latitude, 
      data.longitude, 
      data.distance, 
      data.is_mock_location || false, 
      data.status || 'Valid',
      data.foto_masuk || null
    ]
  );

  const [created] = await pool.query('SELECT * FROM absensi WHERE id = ? LIMIT 1', [id]);
  return created[0] || null;
}

async function updateAbsensiKeluar(data) {
  const tanggal = new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT id
     FROM absensi
     WHERE peserta_didik_id = ? AND tanggal = ?
     LIMIT 1`,
    [data.peserta_didik_id, tanggal]
  );

  if (!rows[0]?.id) {
    return null;
  }

  await pool.query(
    `UPDATE absensi
     SET jam_keluar = NOW(), 
         latitude_keluar = ?, 
         longitude_keluar = ?,
         distance_keluar = ?,
         is_mock_location_keluar = ?,
         status_keluar = ?,
         foto_keluar = ?
     WHERE id = ?`,
    [
      data.latitude, 
      data.longitude, 
      data.distance, 
      data.is_mock_location || false, 
      data.status || 'Valid',
      data.foto_keluar || null,
      rows[0].id
    ]
  );

  const [updated] = await pool.query('SELECT * FROM absensi WHERE id = ? LIMIT 1', [rows[0].id]);
  return updated[0] || null;
}

async function rekapAbsensi({ pesertaDidikId, bulan, tahun, tanggal, page, limit }) {
  const filters = [];
  const values = [];

  if (pesertaDidikId) {
    filters.push('a.peserta_didik_id = ?');
    values.push(pesertaDidikId);
  }

  if (bulan) {
    filters.push('MONTH(a.tanggal) = ?');
    values.push(Number(bulan));
  }

  if (tahun) {
    filters.push('YEAR(a.tanggal) = ?');
    values.push(Number(tahun));
  }

  if (tanggal) {
    filters.push('a.tanggal = ?');
    values.push(tanggal);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM absensi a ${whereClause}`, values);

  const total = Number(countRows[0]?.total || 0);
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT a.*, pd.nama AS peserta_didik_nama
     FROM absensi a
     JOIN peserta_didik pd ON pd.id = a.peserta_didik_id
     ${whereClause}
     ORDER BY a.tanggal DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return {
    items: rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
  };
}

async function getDailyAttendanceHistory(studentId) {
  const [rows] = await pool.query(
    `SELECT * FROM absensi 
     WHERE peserta_didik_id = ? 
     ORDER BY tanggal DESC 
     LIMIT 30`,
    [studentId]
  );
  return rows;
}

async function getDailyAttendanceSummary(studentId) {
  const [rows] = await pool.query(
    `SELECT 
        COUNT(CASE WHEN status_masuk IN ('Valid', 'Terlambat') THEN 1 END) as hadir,
        COUNT(CASE WHEN status_masuk = 'Terlambat' THEN 1 END) as terlambat,
        COUNT(CASE WHEN status_masuk = 'Izin' THEN 1 END) as izin,
        COUNT(CASE WHEN status_masuk = 'Sakit' THEN 1 END) as sakit,
        COUNT(CASE WHEN status_masuk = 'Alpa' THEN 1 END) as alpa,
        COUNT(CASE WHEN status_masuk = 'Luar Radius' THEN 1 END) as luar_radius,
        COUNT(*) as total
     FROM absensi
     WHERE peserta_didik_id = ?`,
    [studentId]
  );
  return rows[0];
}

async function saveManualAttendance(data) {
  const { peserta_didik_id, tanggal, status, catatan } = data;
  
  const [rows] = await pool.query(
    `SELECT id FROM absensi WHERE peserta_didik_id = ? AND tanggal = ? LIMIT 1`,
    [peserta_didik_id, tanggal]
  );

  if (rows[0]?.id) {
    await pool.query(
      `UPDATE absensi 
       SET status_masuk = ?, catatan = ?, jam_masuk = COALESCE(jam_masuk, NOW())
       WHERE id = ?`,
      [status, catatan || null, rows[0].id]
    );
    const [updated] = await pool.query('SELECT * FROM absensi WHERE id = ?', [rows[0].id]);
    return updated[0];
  }

  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO absensi (id, peserta_didik_id, tanggal, status_masuk, catatan, jam_masuk)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [id, peserta_didik_id, tanggal, status, catatan || null]
  );
  const [created] = await pool.query('SELECT * FROM absensi WHERE id = ?', [id]);
  return created[0];
}

module.exports = {
  upsertAbsensiMasuk,
  updateAbsensiKeluar,
  rekapAbsensi,
  getDailyAttendanceHistory,
  getDailyAttendanceSummary,
  saveManualAttendance,
};
