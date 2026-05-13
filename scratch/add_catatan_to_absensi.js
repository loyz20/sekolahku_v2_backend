const { pool } = require('../src/config/db');

async function migrate() {
    try {
        console.log('Adding "catatan" column to "absensi" table...');
        await pool.query('ALTER TABLE absensi ADD COLUMN catatan TEXT AFTER status_keluar');
        console.log('Column "catatan" added successfully.');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column "catatan" already exists.');
        } else {
            console.error('Migration failed:', error);
        }
    } finally {
        process.exit();
    }
}

migrate();
