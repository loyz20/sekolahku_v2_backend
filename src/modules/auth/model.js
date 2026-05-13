const crypto = require('crypto');
const { pool } = require('../../config/db');

async function findUserByUsername(username) {
  const [rows] = await pool.query(
    `SELECT u.id, u.sekolah_id, u.username, u.password, u.role, u.ref_id, u.email, u.phone,
            COALESCE(p.nama, pd.nama, 'Administrator') as nama_asli,
            pd.nisn, r_siswa.nama as rombel_nama,
            CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as is_wali_kelas
     FROM users u
     LEFT JOIN ptk p ON u.ref_id = p.id AND u.role IN ('guru', 'guru_bk')
     LEFT JOIN peserta_didik pd ON u.ref_id = pd.id AND u.role = 'siswa'
     LEFT JOIN anggota_rombel ar ON pd.id = ar.peserta_didik_id AND u.role = 'siswa'
     LEFT JOIN rombel r_siswa ON ar.rombel_id = r_siswa.id AND u.role = 'siswa'
     LEFT JOIN rombel r ON u.ref_id = r.wali_kelas_ptk_id AND u.role IN ('guru', 'guru_bk')
     WHERE u.username = ?
     LIMIT 1`,
    [username]
  );

  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT u.id, u.sekolah_id, u.username, u.password, u.role, u.ref_id, u.email, u.phone,
            COALESCE(p.nama, pd.nama, 'Administrator') as nama_asli,
            pd.nisn, r_siswa.nama as rombel_nama,
            CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as is_wali_kelas
     FROM users u
     LEFT JOIN ptk p ON u.ref_id = p.id AND u.role IN ('guru', 'guru_bk')
     LEFT JOIN peserta_didik pd ON u.ref_id = pd.id AND u.role = 'siswa'
     LEFT JOIN anggota_rombel ar ON pd.id = ar.peserta_didik_id AND u.role = 'siswa'
     LEFT JOIN rombel r_siswa ON ar.rombel_id = r_siswa.id AND u.role = 'siswa'
     LEFT JOIN rombel r ON u.ref_id = r.wali_kelas_ptk_id AND u.role IN ('guru', 'guru_bk')
     WHERE u.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function updateUserProfile(userId, { nama, email, phone }) {
  const user = await findUserById(userId);
  if (!user) return null;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Update users table (email, phone)
    await connection.query(
      'UPDATE users SET email = ?, phone = ? WHERE id = ?',
      [email || null, phone || null, userId]
    );

    // 2. Update linked profile table if exists
    if (user.ref_id) {
      if (['guru', 'guru_bk'].includes(user.role)) {
        await connection.query('UPDATE ptk SET nama = ? WHERE id = ?', [nama, user.ref_id]);
      } else if (user.role === 'siswa') {
        await connection.query('UPDATE peserta_didik SET nama = ? WHERE id = ?', [nama, user.ref_id]);
      }
    }

    await connection.commit();
    return await findUserById(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updatePassword(userId, newPassword) {
  const { hashPassword } = require('../../utils/password');
  const hashedPassword = hashPassword(newPassword);

  const [result] = await pool.query(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedPassword, userId]
  );
  return result.affectedRows > 0;
}

async function createRefreshToken({ userId, token, expiresAt, ipAddress, userAgent }) {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO auth_refresh_tokens (id, user_id, token, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, token, expiresAt, ipAddress, userAgent]
  );

  return { id, user_id: userId, token, expires_at: expiresAt, ip_address: ipAddress, user_agent: userAgent };
}

async function findRefreshToken(token) {
  const [rows] = await pool.query(
    `SELECT id, user_id, token, expires_at, revoked_at, created_at, ip_address, user_agent
     FROM auth_refresh_tokens
     WHERE token = ?
     LIMIT 1`,
    [token]
  );

  return rows[0] || null;
}

async function revokeRefreshToken(token) {
  await pool.query(
    `UPDATE auth_refresh_tokens
     SET revoked_at = NOW()
     WHERE token = ? AND revoked_at IS NULL`,
    [token]
  );
}

async function revokeRefreshTokenById(id, userId) {
  await pool.query(
    `UPDATE auth_refresh_tokens
     SET revoked_at = NOW()
     WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
    [id, userId]
  );
}

async function revokeAllRefreshTokensByUserId(userId) {
  await pool.query(
    `UPDATE auth_refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = ? AND revoked_at IS NULL`,
    [userId]
  );
}

async function rotateRefreshToken(oldToken, { userId, token, expiresAt, ipAddress, userAgent }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = NOW()
       WHERE token = ? AND revoked_at IS NULL`,
      [oldToken]
    );

    const id = crypto.randomUUID();
    await connection.query(
      `INSERT INTO auth_refresh_tokens (id, user_id, token, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, token, expiresAt, ipAddress, userAgent]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listActiveSessionsByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT id, ip_address, user_agent, created_at, expires_at, token
     FROM auth_refresh_tokens
     WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  findUserByUsername,
  findUserById,
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokenById,
  revokeAllRefreshTokensByUserId,
  rotateRefreshToken,
  listActiveSessionsByUserId,
  updateUserProfile,
  updatePassword,
};
