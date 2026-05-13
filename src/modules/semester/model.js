const crypto = require('crypto');
const { pool } = require('../../config/db');

async function listSemester({ search, page, limit, sortField, sortDirection, tahunAjaranId }) {
  const filters = [];
  const values = [];

  if (tahunAjaranId) {
    filters.push('s.tahun_ajaran_id = ?');
    values.push(tahunAjaranId);
  }

  if (search) {
    filters.push('(s.nama LIKE ? OR ta.tahun LIKE ?)');
    const keyword = `%${search}%`;
    values.push(keyword, keyword);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM semester s
     LEFT JOIN tahun_ajaran ta ON ta.id = s.tahun_ajaran_id
     ${whereClause}`,
    values
  );

  const total = Number(countRows[0]?.total || 0);
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT s.id, s.tahun_ajaran_id, s.nama, s.aktif, ta.tahun
     FROM semester s
     LEFT JOIN tahun_ajaran ta ON ta.id = s.tahun_ajaran_id
     ${whereClause}
     ORDER BY s.${sortField} ${sortDirection}
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

async function createSemester(data) {
  const id = crypto.randomUUID();
  await pool.query('INSERT INTO semester (id, tahun_ajaran_id, nama, aktif) VALUES (?, ?, ?, ?)', [
    id,
    data.tahun_ajaran_id,
    data.nama,
    Boolean(data.aktif),
  ]);

  const [rows] = await pool.query('SELECT id, tahun_ajaran_id, nama, aktif FROM semester WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function updateSemester(id, data, sekolahId) {
  // Verify that the semester belongs to a tahun_ajaran of this school
  const [result] = await pool.query(
    `UPDATE semester s
     JOIN tahun_ajaran ta ON ta.id = s.tahun_ajaran_id
     SET s.nama = ?, s.aktif = ?
     WHERE s.id = ? AND ta.sekolah_id = ?`,
    [data.nama, Boolean(data.aktif), id, sekolahId]
  );
  return result.affectedRows > 0;
}

async function deleteSemester(id, sekolahId) {
  const [result] = await pool.query(
    `DELETE s FROM semester s
     JOIN tahun_ajaran ta ON ta.id = s.tahun_ajaran_id
     WHERE s.id = ? AND ta.sekolah_id = ?`,
    [id, sekolahId]
  );
  return result.affectedRows > 0;
}

async function getActiveSemester(sekolahId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.tahun_ajaran_id, s.nama, s.aktif, ta.tahun
     FROM semester s
     JOIN tahun_ajaran ta ON ta.id = s.tahun_ajaran_id
     WHERE ta.sekolah_id = ? AND s.aktif = 1
     LIMIT 1`,
    [sekolahId]
  );
  return rows[0] || null;
}

module.exports = {
  listSemester,
  createSemester,
  updateSemester,
  deleteSemester,
  getActiveSemester,
};