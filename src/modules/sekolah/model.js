const crypto = require('crypto');
const { pool } = require('../../config/db');

async function listSekolah({ search, page, limit, sortField, sortDirection }) {
	const filters = [];
	const values = [];

	if (search) {
		filters.push(`(
			nama LIKE ? OR
			npsn LIKE ? OR
			status LIKE ? OR
			provinsi LIKE ? OR
			kabupaten LIKE ? OR
			kecamatan LIKE ? OR
			desa LIKE ?
		)`);

		const keyword = `%${search}%`;
		values.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword);
	}

	const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
	const [countRows] = await pool.query(
		`SELECT COUNT(*) AS total FROM sekolah ${whereClause}`,
		values
	);

	const total = Number(countRows[0]?.total || 0);
	const offset = (page - 1) * limit;

	const [rows] = await pool.query(
		`SELECT id, nama, npsn, logo_url, status, alamat, provinsi, kabupaten, kecamatan, desa, kode_pos, lintang, bujur, radius_presensi, kepala_sekolah, akreditasi, email, no_telepon, website, created_at
		 FROM sekolah
		 ${whereClause}
		 ORDER BY ${sortField} ${sortDirection}
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

async function findSekolahById(id) {
	const [rows] = await pool.query(
		`SELECT id, nama, npsn, logo_url, status, alamat, provinsi, kabupaten, kecamatan, desa, kode_pos, lintang, bujur, radius_presensi, kepala_sekolah, akreditasi, email, no_telepon, website, created_at
		 FROM sekolah
		 WHERE id = ?
		 LIMIT 1`,
		[id]
	);

	return rows[0] || null;
}

async function createSekolah(data) {
	const id = crypto.randomUUID();

	await pool.query(
		`INSERT INTO sekolah (
			id, nama, npsn, status, alamat, provinsi, kabupaten, kecamatan, desa, kode_pos, lintang, bujur,
      kepala_sekolah, akreditasi, email, no_telepon, website
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			id,
			data.nama,
			data.npsn,
			data.status,
			data.alamat,
			data.provinsi,
			data.kabupaten,
			data.kecamatan,
			data.desa,
			data.kode_pos,
			data.lintang,
			data.bujur,
      data.kepala_sekolah,
      data.akreditasi,
      data.email,
      data.no_telepon,
      data.website
		]
	);

	return findSekolahById(id);
}

const SEKOLAH_UPDATABLE_FIELDS = new Set([
	'nama', 'npsn', 'status', 'alamat', 'provinsi', 'kabupaten',
	'kecamatan', 'desa', 'kode_pos', 'lintang', 'bujur', 'radius_presensi',
  'kepala_sekolah', 'akreditasi', 'email', 'no_telepon', 'website',
]);

async function updateSekolah(id, data) {
	const fields = [];
	const values = [];

	for (const [key, value] of Object.entries(data)) {
		if (SEKOLAH_UPDATABLE_FIELDS.has(key)) {
			fields.push(`${key} = ?`);
			values.push(value);
		}
	}

	if (fields.length === 0) {
		return findSekolahById(id);
	}

	values.push(id);

	await pool.query(
		`UPDATE sekolah SET ${fields.join(', ')} WHERE id = ?`,
		values
	);

	return findSekolahById(id);
}

async function deleteSekolah(id) {
	const [result] = await pool.query('DELETE FROM sekolah WHERE id = ?', [id]);
	return result.affectedRows > 0;
}

async function getSekolahStats() {
	const [rows] = await pool.query(`
		SELECT 
			COUNT(*) as total,
			COUNT(CASE WHEN status = 'Negeri' THEN 1 END) as negeri,
			COUNT(CASE WHEN status = 'Swasta' THEN 1 END) as swasta
		FROM sekolah
	`);
	return rows[0];
}

async function updateLogo(id, logoUrl) {
  await pool.query(
    'UPDATE sekolah SET logo_url = ? WHERE id = ?',
    [logoUrl, id]
  );
  return await findSekolahById(id);
}

module.exports = {
	listSekolah,
	findSekolahById,
	createSekolah,
	updateSekolah,
	updateLogo,
	deleteSekolah,
	getSekolahStats,
};
