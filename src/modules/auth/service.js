const ErrorCode = require('../../constants/errorCodes');
const authModel = require('./model');
const { createError } = require('../shared/service');
const { verifyPassword } = require('../../utils/password');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  decodeToken,
} = require('../../utils/token');

function getRefreshExpiresAt(refreshToken) {
  const decoded = decodeToken(refreshToken);
  if (!decoded || typeof decoded !== 'object' || !decoded.exp) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  return new Date(decoded.exp * 1000);
}

async function login(username, password, { ipAddress, userAgent } = {}) {
  const user = await authModel.findUserByUsername(username);

  if (!user) {
    throw createError('Username atau password salah', 401, ErrorCode.INVALID_CREDENTIALS);
  }

  const isValidPassword = verifyPassword(password, user.password);
  if (!isValidPassword) {
    throw createError('Username atau password salah', 401, ErrorCode.INVALID_CREDENTIALS);
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshExpiresAt = getRefreshExpiresAt(refreshToken);

  await authModel.createRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt: refreshExpiresAt,
    ipAddress,
    userAgent
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      nama: user.nama_asli,
      email: user.email,
      phone: user.phone,
      sekolah_id: user.sekolah_id,
      ref_id: user.ref_id,
      nisn: user.nisn,
      rombel_nama: user.rombel_nama,
      is_wali_kelas: !!user.is_wali_kelas,
    },
  };
}

async function refresh(refreshToken, { ipAddress, userAgent } = {}) {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw createError('Token tidak valid atau expired', 401, ErrorCode.TOKEN_INVALID);
  }

  const storedToken = await authModel.findRefreshToken(refreshToken);
  if (!storedToken || storedToken.revoked_at) {
    throw createError('Token tidak valid atau expired', 401, ErrorCode.TOKEN_INVALID);
  }

  const user = await authModel.findUserById(payload.sub);
  if (!user) {
    throw createError('Token tidak valid atau expired', 401, ErrorCode.TOKEN_INVALID);
  }

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  const refreshExpiresAt = getRefreshExpiresAt(newRefreshToken);

  // Use a transaction to ensure atomic token rotation
  await authModel.rotateRefreshToken(refreshToken, {
    userId: user.id,
    token: newRefreshToken,
    expiresAt: refreshExpiresAt,
    ipAddress,
    userAgent
  });

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      nama: user.nama_asli,
      sekolah_id: user.sekolah_id,
      ref_id: user.ref_id,
      nisn: user.nisn,
      rombel_nama: user.rombel_nama,
      is_wali_kelas: !!user.is_wali_kelas,
    },
  };
}

async function logout(refreshToken) {
  if (!refreshToken) {
    throw createError('Token tidak valid atau expired', 401, ErrorCode.TOKEN_INVALID);
  }

  const storedToken = await authModel.findRefreshToken(refreshToken);
  if (!storedToken || storedToken.revoked_at) {
    throw createError('Token tidak valid atau expired', 401, ErrorCode.TOKEN_INVALID);
  }

  await authModel.revokeRefreshToken(refreshToken);
  return true;
}

async function getUserProfile(userId) {
  const user = await authModel.findUserById(userId);
  if (!user) throw createError('User tidak ditemukan', 404, ErrorCode.USER_NOT_FOUND);
  
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    nama: user.nama_asli,
    email: user.email,
    phone: user.phone,
    sekolah_id: user.sekolah_id,
    ref_id: user.ref_id,
    nisn: user.nisn,
    rombel_nama: user.rombel_nama,
    is_wali_kelas: !!user.is_wali_kelas
  };
}

async function updateUserProfile(userId, data) {
  const user = await authModel.updateUserProfile(userId, data);
  if (!user) throw createError('Gagal memperbarui profil', 500);

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    nama: user.nama_asli,
    email: user.email,
    phone: user.phone,
    sekolah_id: user.sekolah_id,
    ref_id: user.ref_id,
    is_wali_kelas: !!user.is_wali_kelas
  };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await authModel.findUserById(userId);
  if (!user) throw createError('User tidak ditemukan', 404, ErrorCode.USER_NOT_FOUND);

  // Verify current password
  const isValid = verifyPassword(currentPassword, user.password);
  if (!isValid) {
    throw createError('Password saat ini salah', 400, ErrorCode.INVALID_CREDENTIALS);
  }

  // Update password (hashing is handled by model or utility, usually model here)
  await authModel.updatePassword(userId, newPassword);
  return true;
}

async function getSessions(userId) {
  return authModel.listActiveSessionsByUserId(userId);
}

async function revokeSession(sessionId, userId) {
  return authModel.revokeRefreshTokenById(sessionId, userId);
}

module.exports = {
  login,
  refresh,
  logout,
  getSessions,
  revokeSession,
  getUserProfile,
  updateUserProfile,
  changePassword,
};
