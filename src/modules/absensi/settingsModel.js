const { pool } = require('../../config/db');

async function getSettings(sekolahId) {
  const [rows] = await pool.query(
    'SELECT * FROM pengaturan_absensi WHERE sekolah_id = ? LIMIT 1',
    [sekolahId]
  );
  return rows[0] || null;
}

async function isHoliday(sekolahId, date) {
  // 1. Check database for specific holidays
  const [rows] = await pool.query(
    'SELECT id FROM hari_libur WHERE sekolah_id = ? AND tanggal = ? LIMIT 1',
    [sekolahId, date]
  );
  if (rows.length > 0) return true;

  // 2. Check if it's a weekend (Sabtu/Minggu) based on settings
  const settings = await getSettings(sekolahId);
  if (settings && settings.hari_kerja) {
    const hariKerja = typeof settings.hari_kerja === 'string' 
      ? JSON.parse(settings.hari_kerja) 
      : settings.hari_kerja;
    
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const todayName = dayNames[new Date(date).getDay()];
    
    if (!hariKerja.includes(todayName)) return true;
  }

  return false;
}

module.exports = {
  getSettings,
  isHoliday
};
