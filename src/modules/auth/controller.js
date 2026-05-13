const { successResponse } = require('../../utils/response');
const authService = require('./service');
const { logActivity } = require('../../shared/activityLog');
const { createSignedCsrfToken } = require('../../utils/csrf');

// Helper to set secure httpOnly cookies
function setAuthCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

// Helper to clear auth cookies
function clearAuthCookies(res) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}

/**
 * Get CSRF token endpoint
 * This should be called before any state-changing operations
 */
function getCsrfToken(req, res, next) {
  try {
    const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_ACCESS_SECRET;
    const { token } = createSignedCsrfToken(csrfSecret);
    
    return successResponse(res, { csrf_token: token }, 'Success', 200);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const sessionInfo = {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    };
    const result = await authService.login(req.body.username, req.body.password, sessionInfo);
    setAuthCookies(res, result.access_token, result.refresh_token);
    
    await logActivity({
      userId: result.user.id,
      action: 'LOGIN',
      entityType: 'user',
      entityId: result.user.id,
      description: `${result.user.username} berhasil login ke dalam sistem`
    });
    
    // Return user data and tokens (tokens also in httpOnly cookies for web)
    return successResponse(res, { 
      user: result.user,
      access_token: result.access_token,
      refresh_token: result.refresh_token
    }, 'Success', 200);
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies.refresh_token || req.body.refresh_token;
    const sessionInfo = {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    };
    const result = await authService.refresh(refreshToken, sessionInfo);
    setAuthCookies(res, result.access_token, result.refresh_token);
    
    return successResponse(res, { 
      user: result.user,
      access_token: result.access_token,
      refresh_token: result.refresh_token
    }, 'Success', 200);
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies.refresh_token || req.body.refresh_token;
    await authService.logout(refreshToken);
    clearAuthCookies(res);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function getSessions(req, res, next) {
  try {
    const currentToken = req.cookies.refresh_token || req.body.refresh_token;
    const result = await authService.getSessions(req.user.id);
    
    const sessions = result.map(s => {
      const isCurrent = s.token === currentToken;
      const { token, ...sessionData } = s; // Remove token
      return {
        ...sessionData,
        current: isCurrent
      };
    });
    
    return successResponse(res, sessions);
  } catch (error) {
    return next(error);
  }
}

async function revokeSession(req, res, next) {
  try {
    await authService.revokeSession(req.params.id, req.user.id);
    return successResponse(res, null, 'Sesi berhasil dicabut');
  } catch (error) {
    return next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const profile = await authService.getUserProfile(req.user.id);
    return successResponse(res, profile);
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const result = await authService.updateUserProfile(req.user.id, req.body);
    
    // If the profile change affects the JWT (like name/nama_asli), we might want to refresh tokens
    // For now, just return the updated user
    return successResponse(res, result, 'Profil berhasil diperbarui');
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    
    await logActivity({
      userId: req.user.id,
      action: 'CHANGE_PASSWORD',
      entityType: 'user',
      entityId: req.user.id,
      description: `User ${req.user.username} berhasil mengubah password`
    });

    return successResponse(res, null, 'Password berhasil diperbarui');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCsrfToken,
  login,
  refresh,
  logout,
  getSessions,
  revokeSession,
  getProfile,
  updateProfile,
  changePassword,
};
