const { pool } = require('../config/db');
const crypto = require('crypto');
const { errorResponse } = require('../utils/response');

// Batas maksimal penggunaan AI per fitur per hari
const DAILY_LIMIT = 10; 

const checkAIQuota = (feature) => async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        // 1. Cek penggunaan saat ini
        const [rows] = await pool.query(
            'SELECT usage_count FROM ai_usage WHERE user_id = ? AND feature = ? AND tanggal = ?',
            [user_id, feature, today]
        );

        const currentUsage = rows.length > 0 ? rows[0].usage_count : 0;

        if (currentUsage >= DAILY_LIMIT) {
            return errorResponse(res, `Kuota AI harian Anda untuk fitur ini (${DAILY_LIMIT}x) telah habis. Silakan coba lagi besok.`, 429);
        }

        // 2. Jika masih ada kuota, lanjutkan dan catat penggunaan (setelah request selesai atau di sini)
        // Kita catat penggunaan SEBELUM proses AI agar tidak bisa dicurang dengan request bersamaan
        if (rows.length > 0) {
            await pool.query(
                'UPDATE ai_usage SET usage_count = usage_count + 1 WHERE user_id = ? AND feature = ? AND tanggal = ?',
                [user_id, feature, today]
            );
        } else {
            await pool.query(
                'INSERT INTO ai_usage (id, user_id, feature, tanggal, usage_count) VALUES (?, ?, ?, ?, ?)',
                [crypto.randomUUID(), user_id, feature, today, 1]
            );
        }

        next();
    } catch (error) {
        console.error('Quota Middleware Error:', error);
        next(); // Tetap lanjutkan jika ada error teknis di tracking agar tidak mengganggu operasional
    }
};

module.exports = { checkAIQuota };
