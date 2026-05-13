const { pool } = require('../src/config/db');

async function migrate() {
  try {
    await pool.query('ALTER TABLE absensi ADD COLUMN foto_masuk VARCHAR(255)');
    console.log('Added foto_masuk');
  } catch (e) {
    if (e.code === 'ER_DUP_COLUMN_NAME') console.log('foto_masuk already exists');
    else console.error(e);
  }

  try {
    await pool.query('ALTER TABLE absensi ADD COLUMN foto_keluar VARCHAR(255)');
    console.log('Added foto_keluar');
  } catch (e) {
    if (e.code === 'ER_DUP_COLUMN_NAME') console.log('foto_keluar already exists');
    else console.error(e);
  }

  process.exit();
}

migrate();
