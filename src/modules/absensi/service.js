const ErrorCode = require('../../constants/errorCodes');
const absensiModel = require('./model');
const sekolahModel = require('../sekolah/model');
const { calculateDistance } = require('../../utils/geo');
const { createError } = require('../shared/service');
const settingsModel = require('./settingsModel');
const fs = require('fs').promises;
const path = require('path');

async function saveBase64Image(base64Data, subDir) {
  if (!base64Data) return null;
  
  try {
    const trimmedData = base64Data.trim();
    // Check if it's already a path
    if (trimmedData.startsWith('/uploads/')) return trimmedData;

    const matches = trimmedData.match(/^data:([A-Za-z-+\/]+);base64,([\s\S]+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const type = matches[1];
    const buffer = Buffer.from(matches[2].replace(/\s/g, ''), 'base64');
    const extension = type.split('/')[1] === 'jpeg' ? 'jpg' : (type.split('/')[1] || 'jpg');
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
    const relativePath = `uploads/${subDir}/${fileName}`;
    const absolutePath = path.join(__dirname, '../../../public', relativePath);

    await fs.writeFile(absolutePath, buffer);
    return `/${relativePath}`;
  } catch (e) {
    console.error('Error saving image:', e);
    return null;
  }
}

async function masuk(data) {
  try {
    // 1. Get school location
    const school = await sekolahModel.findSekolahById(data.sekolah_id);
    if (!school) {
      throw createError('Data sekolah tidak ditemukan', 404, ErrorCode.NOT_FOUND);
    }

    // 2. Validate holiday / working day
    const tanggalStr = new Date().toISOString().slice(0, 10);
    const isLibur = await settingsModel.isHoliday(data.sekolah_id, tanggalStr);
    if (isLibur) {
      throw createError('Hari ini adalah hari libur atau bukan hari kerja', 400);
    }

    // 3. Get settings for time validation
    const settings = await settingsModel.getSettings(data.sekolah_id);
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':00';
    
    let status = 'Valid';
    if (settings && currentTime > settings.jam_masuk_akhir) {
      status = 'Terlambat';
    }

    // 4. Calculate distance
    const distance = calculateDistance(
      Number(data.latitude),
      Number(data.longitude),
      Number(school.lintang),
      Number(school.bujur)
    );

    // 5. Validate radius
    const radius = settings?.radius_meter || Number(school.radius_presensi) || 100;
    const finalStatus = distance <= radius ? status : 'Luar Radius';

    // 4. Save photo if exists
    const fotoPath = await saveBase64Image(data.foto, 'absensi');

    // 5. Update data object
    const attendanceData = {
      ...data,
      distance: Math.round(distance),
      status: finalStatus,
      foto_masuk: fotoPath
    };

    return await absensiModel.upsertAbsensiMasuk(attendanceData);
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw createError('Data peserta didik tidak ditemukan', 404, ErrorCode.NOT_FOUND);
    }

    throw error;
  }
}

async function keluar(data) {
  // 1. Get school location
  const school = await sekolahModel.findSekolahById(data.sekolah_id);
  if (!school) {
    throw createError('Data sekolah tidak ditemukan', 404, ErrorCode.NOT_FOUND);
  }

  // 2. Validate holiday / working day
  const tanggalStr = new Date().toISOString().slice(0, 10);
  const isLibur = await settingsModel.isHoliday(data.sekolah_id, tanggalStr);
  if (isLibur) {
    throw createError('Hari ini adalah hari libur atau bukan hari kerja', 400);
  }

  // 3. Get settings for time validation
  const settings = await settingsModel.getSettings(data.sekolah_id);
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':00';

  if (settings && currentTime < settings.jam_pulang_mulai) {
    throw createError(`Belum waktunya pulang. Jam pulang mulai pukul ${settings.jam_pulang_mulai.substring(0, 5)}`, 400);
  }

  // 4. Calculate distance
  const distance = calculateDistance(
    Number(data.latitude),
    Number(data.longitude),
    Number(school.lintang),
    Number(school.bujur)
  );

  // 5. Validate radius
  const radius = settings?.radius_meter || Number(school.radius_presensi) || 100;
  const status = distance <= radius ? 'Valid' : 'Luar Radius';

  // 4. Save photo if exists
  const fotoPath = await saveBase64Image(data.foto, 'absensi');

  // 5. Update data object
  const attendanceData = {
    ...data,
    distance: Math.round(distance),
    status: status,
    foto_keluar: fotoPath
  };

  const absensi = await absensiModel.updateAbsensiKeluar(attendanceData);
  if (!absensi) {
    throw createError('Data absensi masuk hari ini belum tersedia', 404, ErrorCode.NOT_FOUND);
  }

  return absensi;
}

async function rekap(query) {
  const page = Math.max(Number.parseInt(query.page || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit || '10', 10) || 10, 1), 100);
  const pesertaDidikId = query.peserta_didik_id ? String(query.peserta_didik_id).trim() : '';
  const bulan = query.bulan ? String(query.bulan) : '';
  const tahun = query.tahun ? String(query.tahun) : '';

  return absensiModel.rekapAbsensi({
    pesertaDidikId,
    bulan,
    tahun,
    page,
    limit,
  });
}

async function getSettings(sekolahId) {
  return await settingsModel.getSettings(sekolahId);
}

async function updateSettings(sekolahId, data) {
  const { pool } = require('../../config/db');
  const hariKerja = Array.isArray(data.hari_kerja) ? JSON.stringify(data.hari_kerja) : data.hari_kerja;
  
  await pool.query(
    `INSERT INTO pengaturan_absensi (sekolah_id, jam_masuk_mulai, jam_masuk_akhir, jam_pulang_mulai, jam_pulang_akhir, hari_kerja, radius_meter)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
      jam_masuk_mulai = VALUES(jam_masuk_mulai),
      jam_masuk_akhir = VALUES(jam_masuk_akhir),
      jam_pulang_mulai = VALUES(jam_pulang_mulai),
      jam_pulang_akhir = VALUES(jam_pulang_akhir),
      hari_kerja = VALUES(hari_kerja),
      radius_meter = VALUES(radius_meter)`,
    [
      sekolahId,
      data.jam_masuk_mulai,
      data.jam_masuk_akhir,
      data.jam_pulang_mulai,
      data.jam_pulang_akhir,
      hariKerja,
      data.radius_meter || 100
    ]
  );
  return await getSettings(sekolahId);
}

async function getHolidays(sekolahId) {
  const { pool } = require('../../config/db');
  const [rows] = await pool.query(
    'SELECT * FROM hari_libur WHERE sekolah_id = ? ORDER BY tanggal ASC',
    [sekolahId]
  );
  return rows;
}

async function addHoliday(sekolahId, data) {
  const { pool } = require('../../config/db');
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  
  await pool.query(
    'INSERT INTO hari_libur (id, sekolah_id, tanggal, keterangan) VALUES (?, ?, ?, ?)',
    [id, sekolahId, data.tanggal, data.keterangan]
  );
  return { id, ...data };
}

async function deleteHoliday(id) {
  const { pool } = require('../../config/db');
  await pool.query('DELETE FROM hari_libur WHERE id = ?', [id]);
  return { success: true };
}

module.exports = {
  masuk,
  keluar,
  rekap,
  getSettings,
  updateSettings,
  getHolidays,
  addHoliday,
  deleteHoliday
};

