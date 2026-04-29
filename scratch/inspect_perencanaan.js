const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const tables = ['tp', 'atp', 'atp_detail'];
        for (const table of tables) {
            console.log(`\n--- Table: ${table} ---`);
            const [rows] = await connection.execute(`DESCRIBE ${table}`);
            console.table(rows);
        }
    } catch (error) {
        console.error(error);
    } finally {
        await connection.end();
    }
}

check();
