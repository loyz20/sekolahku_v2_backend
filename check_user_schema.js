const { pool } = require('./src/config/db');
async function check() {
    const table = process.argv[2] || 'users';
    try {
        const [columns] = await pool.query(`DESCRIBE ${table}`);
        console.log(`Schema for ${table}:`);
        console.table(columns);
    } catch (e) {
        console.error(`Table ${table} error:`, e.message);
    }
    process.exit();
}
check();
