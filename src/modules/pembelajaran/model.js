const crypto = require('crypto');
const { pool } = require('../../config/db');
const { logActivity } = require('../../utils/logger');

async function createPembelajaran(data) {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO pembelajaran (id, rombel_id, mata_pelajaran_id, ptk_id, jam_per_minggu)
     VALUES (?, ?, ?, ?, ?)`,
    [id, data.rombel_id, data.mata_pelajaran_id, data.ptk_id, data.jam_per_minggu]
  );

  return findPembelajaranById(id);
}

async function findPembelajaranById(id) {
  const [rows] = await pool.query(
    `SELECT pb.id, pb.rombel_id, pb.mata_pelajaran_id, pb.ptk_id, pb.jam_per_minggu,
            mp.nama AS mata_pelajaran_nama,
            mp.kode AS mata_pelajaran_kode,
            p.nama AS ptk_nama,
            r.fase AS fase
     FROM pembelajaran pb
     JOIN mata_pelajaran mp ON mp.id = pb.mata_pelajaran_id
     JOIN ptk p ON p.id = pb.ptk_id
     JOIN rombel r ON r.id = pb.rombel_id
     WHERE pb.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function updatePembelajaran(id, data, sekolahId) {
  // Verify tenant through rombel
  const [result] = await pool.query(
    `UPDATE pembelajaran pb
     JOIN rombel r ON r.id = pb.rombel_id
     SET pb.mata_pelajaran_id = ?, pb.ptk_id = ?, pb.jam_per_minggu = ?
     WHERE pb.id = ? AND r.sekolah_id = ?`,
    [data.mata_pelajaran_id, data.ptk_id, data.jam_per_minggu, id, sekolahId]
  );
  return result.affectedRows > 0;
}

async function deletePembelajaran(id, sekolahId) {
  const [result] = await pool.query(
    `DELETE pb FROM pembelajaran pb
     JOIN rombel r ON r.id = pb.rombel_id
     WHERE pb.id = ? AND r.sekolah_id = ?`,
    [id, sekolahId]
  );
  return result.affectedRows > 0;
}

async function listPembelajaranByRombel(rombelId, sekolahId) {
  const [rows] = await pool.query(
    `SELECT pb.id, pb.rombel_id, pb.mata_pelajaran_id, pb.ptk_id, pb.jam_per_minggu,
            mp.nama AS mata_pelajaran_nama,
            mp.kode AS mata_pelajaran_kode,
            p.nama AS ptk_nama,
            r.fase AS fase
     FROM pembelajaran pb
     JOIN mata_pelajaran mp ON mp.id = pb.mata_pelajaran_id
     JOIN ptk p ON p.id = pb.ptk_id
     JOIN rombel r ON r.id = pb.rombel_id
     WHERE pb.rombel_id = ? AND r.sekolah_id = ?
     ORDER BY mp.nama ASC`,
    [rombelId, sekolahId]
  );

  return rows;
}

async function listPembelajaran(sekolahId, limit = 50, offset = 0, ptkId = null) {
  let query = `
     SELECT pb.id, pb.rombel_id, pb.mata_pelajaran_id, pb.ptk_id, pb.jam_per_minggu,
            mp.nama AS mata_pelajaran_nama,
            mp.kode AS mata_pelajaran_kode,
            p.nama AS ptk_nama,
            r.nama AS rombel_nama,
            r.fase AS fase
     FROM pembelajaran pb
     JOIN mata_pelajaran mp ON mp.id = pb.mata_pelajaran_id
     JOIN ptk p ON p.id = pb.ptk_id
     JOIN rombel r ON r.id = pb.rombel_id
     WHERE r.sekolah_id = ?
  `;
  const values = [sekolahId];

  if (ptkId) {
    query += ' AND pb.ptk_id = ?';
    values.push(ptkId);
  }

  query += ' ORDER BY r.nama ASC, mp.nama ASC LIMIT ? OFFSET ?';
  values.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, values);

  let countQuery = `
    SELECT COUNT(*) as total FROM pembelajaran pb
    JOIN rombel r ON r.id = pb.rombel_id
    WHERE r.sekolah_id = ?
  `;
  const countValues = [sekolahId];
  if (ptkId) {
    countQuery += ' AND pb.ptk_id = ?';
    countValues.push(ptkId);
  }

  const [totalRes] = await pool.query(countQuery, countValues);
  return { items: rows, total: totalRes[0].total };
}

async function listKomponen(pembelajaranId, semesterId) {
  const [rows] = await pool.query(
    `SELECT id, jenis, nama, bobot
     FROM pembelajaran_komponen
     WHERE pembelajaran_id = ? AND semester_id = ?
     ORDER BY created_at ASC`,
    [pembelajaranId, semesterId]
  );
  return rows;
}

async function saveKomponen(pembelajaranId, semesterId, sekolahId, komponenList, userId) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    await connection.query(
      'DELETE FROM pembelajaran_komponen WHERE pembelajaran_id = ? AND semester_id = ? AND sekolah_id = ?',
      [pembelajaranId, semesterId, sekolahId]
    );

    for (const k of komponenList) {
      await connection.query(
        `INSERT INTO pembelajaran_komponen (id, sekolah_id, pembelajaran_id, semester_id, jenis, nama, bobot)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), sekolahId, pembelajaranId, semesterId, k.jenis, k.nama, k.bobot]
      );
    }

    await connection.commit();

    // Audit Log
    const [pembelajaran] = await connection.query(
      `SELECT m.nama as mapel_nama, r.nama as rombel_nama 
       FROM pembelajaran pb 
       JOIN mata_pelajaran m ON pb.mata_pelajaran_id = m.id
       JOIN rombel r ON pb.rombel_id = r.id
       WHERE pb.id = ?`, 
      [pembelajaranId]
    );
    const info = pembelajaran[0] || { mapel_nama: '', rombel_nama: '' };

    logActivity({
      user_id: userId,
      action: 'UPDATE_KOMPONEN_PENILAIAN',
      entity_type: 'pembelajaran',
      entity_id: pembelajaranId,
      description: `Mengubah konfigurasi komponen penilaian mata pelajaran ${info.mapel_nama} di kelas ${info.rombel_nama}. Jumlah komponen: ${komponenList.length}`
    });

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createPembelajaran,
  findPembelajaranById,
  updatePembelajaran,
  deletePembelajaran,
  listPembelajaran,
  listPembelajaranByRombel,
  listKomponen,
  saveKomponen,
};
