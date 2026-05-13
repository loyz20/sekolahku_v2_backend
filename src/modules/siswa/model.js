const crypto = require('crypto');
const { pool } = require('../../config/db');

async function listSiswa({ search, page, limit, sortField, sortDirection, sekolahId, jenisKelamin, rombelId }) {
  const filters = [];
  const values = [];

  if (sekolahId) {
    filters.push('p.sekolah_id = ?');
    values.push(sekolahId);
  }

  if (jenisKelamin) {
    filters.push('p.jenis_kelamin = ?');
    values.push(jenisKelamin);
  }

  if (rombelId) {
    filters.push('ar.rombel_id = ?');
    values.push(rombelId);
  }

  if (search) {
    filters.push('(p.nama LIKE ? OR p.nis LIKE ? OR p.nisn LIKE ? OR p.tempat_lahir LIKE ?)');
    const keyword = `%${search}%`;
    values.push(keyword, keyword, keyword, keyword);
  }

  const joinClause = `
    LEFT JOIN anggota_rombel ar ON p.id = ar.peserta_didik_id
    LEFT JOIN rombel r ON ar.rombel_id = r.id
  `;

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [countRows] = await pool.query(
    `SELECT COUNT(DISTINCT p.id) AS total FROM peserta_didik p ${joinClause} ${whereClause}`, 
    values
  );
  
  const total = Number(countRows[0]?.total || 0);
  const offset = (page - 1) * limit;

  const sortMap = {
    nama: 'p.nama',
    nis: 'p.nis',
    nisn: 'p.nisn',
    jenis_kelamin: 'p.jenis_kelamin',
    kelas: 'r.nama',
    tingkat: 'r.tingkat'
  };
  const orderBy = sortMap[sortField] || 'p.nama';

  const [rows] = await pool.query(
    `SELECT p.id, p.sekolah_id, p.nama, p.tempat_lahir, p.nis, p.nisn, p.jenis_kelamin, p.tanggal_lahir, p.nama_ayah, p.nama_ibu, r.tingkat, r.nama as kelas, ar.rombel_id
     FROM peserta_didik p
     ${joinClause}
     ${whereClause}
     ORDER BY ${orderBy} ${sortDirection}
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

async function findSiswaById(id, sekolahId) {
  const values = [id];
  let filter = '';
  
  if (sekolahId) {
    filter = ' AND p.sekolah_id = ?';
    values.push(sekolahId);
  }

  const [rows] = await pool.query(
    `SELECT p.id, p.sekolah_id, p.nama, p.tempat_lahir, p.nis, p.nisn, p.jenis_kelamin, p.tanggal_lahir, p.nama_ayah, p.nama_ibu, ar.rombel_id, r.nama as kelas, r.tingkat
     FROM peserta_didik p
     LEFT JOIN anggota_rombel ar ON p.id = ar.peserta_didik_id
     LEFT JOIN rombel r ON ar.rombel_id = r.id
     WHERE p.id = ?${filter}
     LIMIT 1`,
    values
  );

  return rows[0] || null;
}

async function findSiswaConflicts({ nisn, nik }, exceptId) {
  const conditions = [];
  const values = [];

  if (nisn) {
    conditions.push('nisn = ?');
    values.push(nisn);
  }

  if (nik) {
    conditions.push('nik = ?');
    values.push(nik);
  }

  if (!conditions.length) {
    return [];
  }

  let query = `SELECT id, nisn FROM peserta_didik WHERE (${conditions.join(' OR ')})`;
  if (exceptId) {
    query += ' AND id <> ?';
    values.push(exceptId);
  }

  const [rows] = await pool.query(query, values);
  return rows;
}

async function createSiswa(data) {
  const id = crypto.randomUUID();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO peserta_didik (
        id, sekolah_id, nama, tempat_lahir, nis, nisn, jenis_kelamin, tanggal_lahir, nama_ayah, nama_ibu
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.sekolah_id || null,
        data.nama,
        data.tempat_lahir || null,
        data.nis,
        data.nisn || null,
        data.jenis_kelamin || null,
        data.tanggal_lahir || null,
        data.nama_ayah || null,
        data.nama_ibu || null,
      ]
    );

    if (data.rombel_id) {
      await connection.query(
        `INSERT INTO anggota_rombel (id, rombel_id, peserta_didik_id) VALUES (?, ?, ?)`,
        [crypto.randomUUID(), data.rombel_id, id]
      );
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return findSiswaById(id);
}

const SISWA_UPDATABLE_FIELDS = new Set([
  'sekolah_id', 'nama', 'tempat_lahir', 'nis', 'nisn', 'jenis_kelamin',
  'tanggal_lahir', 'nama_ayah', 'nama_ibu',
]);

async function updateSiswa(id, data, sekolahId) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(data)) {
    if (SISWA_UPDATABLE_FIELDS.has(key)) {
      fields.push(`${key} = ?`);
      if (['nisn', 'jenis_kelamin', 'tanggal_lahir', 'nama_ayah', 'nama_ibu', 'tempat_lahir'].includes(key) && value === '') {
        values.push(null);
      } else {
        values.push(value);
      }
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (fields.length > 0) {
      values.push(id, sekolahId);
      await connection.query(`UPDATE peserta_didik SET ${fields.join(', ')} WHERE id = ? AND sekolah_id = ?`, values);
    }

    if (data.rombel_id !== undefined) {
      await connection.query(`DELETE FROM anggota_rombel WHERE peserta_didik_id = ?`, [id]);
      if (data.rombel_id) {
        await connection.query(
          `INSERT INTO anggota_rombel (id, rombel_id, peserta_didik_id) VALUES (?, ?, ?)`,
          [crypto.randomUUID(), data.rombel_id, id]
        );
      }
    }
    
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return findSiswaById(id);
}

async function deleteSiswa(id, sekolahId) {
  const values = [id];
  let filter = '';
  if (sekolahId) {
    filter = ' AND sekolah_id = ?';
    values.push(sekolahId);
  }
  const [result] = await pool.query(`DELETE FROM peserta_didik WHERE id = ?${filter}`, values);
  return result.affectedRows > 0;
}

async function findSiswaByNis(nis, sekolahId) {
  const [rows] = await pool.query(
    'SELECT id, nama FROM peserta_didik WHERE nis = ? AND sekolah_id = ? LIMIT 1',
    [nis, sekolahId]
  );
  return rows[0] || null;
}

async function getSiswaStats(sekolahId) {
  const [totalStudents] = await pool.query(
    'SELECT COUNT(*) as count FROM peserta_didik WHERE sekolah_id = ?',
    [sekolahId]
  );

  const [genderStats] = await pool.query(
    'SELECT jenis_kelamin, COUNT(*) as count FROM peserta_didik WHERE sekolah_id = ? GROUP BY jenis_kelamin',
    [sekolahId]
  );

  const [activeClasses] = await pool.query(
    'SELECT COUNT(DISTINCT rombel_id) as count FROM anggota_rombel ar JOIN peserta_didik p ON p.id = ar.peserta_didik_id WHERE p.sekolah_id = ?',
    [sekolahId]
  );

  return {
    totalStudents: totalStudents[0].count,
    lakiLaki: genderStats.find(g => g.jenis_kelamin === 'L')?.count || 0,
    perempuan: genderStats.find(g => g.jenis_kelamin === 'P')?.count || 0,
    activeClasses: activeClasses[0].count
  };
}

async function getStudentGrades(studentId, rombelId, sekolahId) {
  // Get active semester
  const [semesters] = await pool.query('SELECT id FROM semester WHERE aktif = 1 LIMIT 1');
  const semesterId = semesters[0]?.id;

  // Get all subjects in the rombel
  const [pembelajarans] = await pool.query(`
      SELECT p.id as pembelajaran_id, mp.nama as mapel_nama, p.ptk_id
      FROM pembelajaran p
      JOIN mata_pelajaran mp ON p.mata_pelajaran_id = mp.id
      WHERE p.rombel_id = ? AND p.sekolah_id = ?
  `, [rombelId, sekolahId]);

  // For each subject, calculate grades
  const results = [];
  for (const p of pembelajarans) {
      // 1. Get categories and weights
      const [categories] = await pool.query(
          'SELECT id, nama, bobot FROM kategori_penilaian WHERE sekolah_id = ? AND ptk_id = ?',
          [sekolahId, p.ptk_id]
      );
      const totalWeight = categories.reduce((sum, c) => sum + Number(c.bobot), 0);

      // 2. Get average grade per category for this student
      const [grades] = await pool.query(`
          SELECT p.kategori_id, AVG(ns.nilai) as rata_rata
          FROM penilaian p
          JOIN nilai_siswa ns ON p.id = ns.penilaian_id
          WHERE p.sekolah_id = ? AND ns.peserta_didik_id = ? AND p.pembelajaran_id = ? AND p.semester_id = ?
          GROUP BY p.kategori_id
      `, [sekolahId, studentId, p.pembelajaran_id, semesterId]);

      let weightedSum = 0;
      const details = {};
      categories.forEach(cat => {
          const entry = grades.find(g => g.kategori_id === cat.id);
          const score = entry ? Number(entry.rata_rata) : 0;
          weightedSum += score * (Number(cat.bobot) / (totalWeight || 1));
          details[cat.nama.toLowerCase()] = score;
      });

      results.push({
          id: p.pembelajaran_id,
          nama_mapel: p.mapel_nama,
          nilai_tugas: details['tugas'] || 0,
          nilai_uh: details['uh'] || details['ulangan harian'] || 0,
          nilai_uts: details['uts'] || 0,
          nilai_uas: details['uas'] || 0,
          nilai_akhir: Math.round(weightedSum),
          grade: weightedSum >= 90 ? 'A' : weightedSum >= 80 ? 'B' : weightedSum >= 70 ? 'C' : weightedSum >= 60 ? 'D' : 'E'
      });
  }
  return results;
}

async function getStudentSchedule(rombelId, sekolahId) {
  const [rows] = await pool.query(`
      SELECT j.id, mp.nama as nama_mapel, p.nama as nama_guru, j.hari, j.jam_mulai, j.jam_selesai, j.ruangan
      FROM jadwal_pembelajaran j
      JOIN pembelajaran pb ON j.pembelajaran_id = pb.id
      JOIN mata_pelajaran mp ON pb.mata_pelajaran_id = mp.id
      JOIN ptk p ON pb.ptk_id = p.id
      WHERE pb.rombel_id = ? AND j.sekolah_id = ?
      ORDER BY FIELD(j.hari, "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"), j.jam_mulai ASC
  `, [rombelId, sekolahId]);
  return rows;
}

module.exports = {
  listSiswa,
  findSiswaById,
  findSiswaByNis,
  findSiswaConflicts,
  createSiswa,
  updateSiswa,
  deleteSiswa,
  getSiswaStats,
  getStudentGrades,
  getStudentSchedule
};
