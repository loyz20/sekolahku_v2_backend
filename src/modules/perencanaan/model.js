const { pool } = require('../../config/db');
const crypto = require('crypto');

/**
 * CAPAIAN PEMBELAJARAN (CP)
 */
async function listCP(filters = {}) {
    let query = 'SELECT * FROM cp WHERE 1=1';
    const params = [];

    if (filters.mapel_id) {
        query += ' AND mapel_id = ?';
        params.push(filters.mapel_id);
    }

    if (filters.fase) {
        query += ' AND fase = ?';
        params.push(filters.fase);
    }

    const [rows] = await pool.query(query, params);
    return rows;
}

async function createCP(data) {
    const id = crypto.randomUUID();
    const { mapel_id, fase, deskripsi } = data;

    await pool.query(`
        INSERT INTO cp (id, mapel_id, fase, deskripsi)
        VALUES (?, ?, ?, ?)
    `, [id, mapel_id, fase, deskripsi]);
    
    return id;
}

async function updateCP(id, data) {
    const { mapel_id, fase, deskripsi } = data;
    await pool.query(`
        UPDATE cp SET mapel_id = ?, fase = ?, deskripsi = ?
        WHERE id = ?
    `, [mapel_id, fase, deskripsi, id]);
}

async function deleteCP(id) {
    await pool.query('DELETE FROM cp WHERE id = ?', [id]);
}

/**
 * TUJUAN PEMBELAJARAN (TP)
 */
async function listTP(filters = {}) {
    let query = `
        SELECT tp.*, cp.deskripsi as cp_deskripsi
        FROM tp
        LEFT JOIN cp ON tp.cp_id = cp.id
        WHERE 1=1
    `;
    const params = [];

    if (filters.pembelajaran_id) {
        query += ' AND tp.pembelajaran_id = ?';
        params.push(filters.pembelajaran_id);
    }

    if (filters.mapel_id) {
        query += ' AND tp.mapel_id = ?';
        params.push(filters.mapel_id);
    }

    if (filters.fase) {
        query += ' AND tp.fase = ?';
        params.push(filters.fase);
    }

    query += ' ORDER BY tp.urutan ASC';

    const [rows] = await pool.query(query, params);
    return rows;
}

async function createTP(data) {
    const id = crypto.randomUUID();
    const { pembelajaran_id, cp_id, mapel_id, fase, kode, deskripsi, urutan } = data;

    await pool.query(`
        INSERT INTO tp (id, pembelajaran_id, cp_id, mapel_id, fase, kode, deskripsi, urutan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, pembelajaran_id || null, cp_id, mapel_id, fase, kode, deskripsi, urutan || 0]);
    
    return id;
}

async function updateTP(id, data) {
    const { kode, deskripsi, urutan, mapel_id, fase } = data;
    await pool.query(`
        UPDATE tp SET kode = ?, deskripsi = ?, urutan = ?, mapel_id = ?, fase = ?
        WHERE id = ?
    `, [kode, deskripsi, urutan, mapel_id, fase, id]);
}

async function deleteTP(id) {
    await pool.query('DELETE FROM tp WHERE id = ?', [id]);
}

/**
 * ALUR TUJUAN PEMBELAJARAN (ATP)
 */
async function getATP(filters = {}) {
    const { mapel_id, fase, tahun_ajaran, pembelajaran_id } = filters;
    let query = 'SELECT * FROM atp WHERE 1=1';
    const params = [];

    if (mapel_id && fase) {
        query += ' AND mapel_id = ? AND fase = ?';
        params.push(mapel_id, fase);
        if (tahun_ajaran) {
            query += ' AND tahun_ajaran = ?';
            params.push(tahun_ajaran);
        }
    } else if (pembelajaran_id) {
        query += ' AND pembelajaran_id = ?';
        params.push(pembelajaran_id);
    } else {
        return null;
    }

    const [rows] = await pool.query(query, params);
    if (rows.length === 0) return null;

        const atp = rows[0];
    const [details] = await pool.query(`
        SELECT ad.*, tp.kode as tp_kode, tp.deskripsi as tp_deskripsi
        FROM atp_detail ad
        LEFT JOIN tp ON ad.tp_id = tp.id
        WHERE ad.atp_id = ?
        ORDER BY ad.minggu_ke ASC, ad.urutan ASC
    `, [atp.id]);

    return { ...atp, details };
}

async function saveATP(data) {
    const { mapel_id, fase, tahun_ajaran, nama, details, pembelajaran_id } = data;
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Get or Create ATP header based on Mapel & Fase
        let existing;
        if (mapel_id && fase) {
            [existing] = await connection.query(
                'SELECT id FROM atp WHERE mapel_id = ? AND fase = ? AND (tahun_ajaran = ? OR tahun_ajaran IS NULL)', 
                [mapel_id, fase, tahun_ajaran]
            );
        } else if (pembelajaran_id) {
            [existing] = await connection.query('SELECT id FROM atp WHERE pembelajaran_id = ?', [pembelajaran_id]);
        }

        let atp_id;
        if (existing && existing.length > 0) {
            atp_id = existing[0].id;
            await connection.query(
                'UPDATE atp SET nama = ?, mapel_id = ?, fase = ?, tahun_ajaran = ? WHERE id = ?', 
                [nama, mapel_id, fase, tahun_ajaran, atp_id]
            );
        } else {
            atp_id = crypto.randomUUID();
            await connection.query(
                'INSERT INTO atp (id, mapel_id, fase, tahun_ajaran, nama, pembelajaran_id) VALUES (?, ?, ?, ?, ?, ?)', 
                [atp_id, mapel_id, fase, tahun_ajaran, nama, pembelajaran_id || null]
            );
        }

        // 2. Clear existing details
        await connection.query('DELETE FROM atp_detail WHERE atp_id = ?', [atp_id]);

        // 3. Insert new details
        if (details && details.length > 0) {
            const values = details.map(d => [
                crypto.randomUUID(),
                atp_id,
                d.tp_id || null,
                d.catatan || null,
                d.minggu_ke,
                d.urutan || 0
            ]);
            await connection.query('INSERT INTO atp_detail (id, atp_id, tp_id, catatan, minggu_ke, urutan) VALUES ?', [values]);
        }

        await connection.commit();
        return atp_id;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * MODUL AJAR
 */
async function listModulAjar(mapel, fase) {
    let query = `
        SELECT m.*, t.kode as tp_kode, t.deskripsi as tp_deskripsi 
        FROM modul_ajar m
        JOIN tp t ON m.tp_id = t.id
        WHERE 1=1
    `;
    const params = [];

    if (mapel) {
        query += ' AND t.mapel_id = ?';
        params.push(mapel);
    }
    if (fase) {
        query += ' AND t.fase = ?';
        params.push(fase);
    }

    query += ' ORDER BY m.created_at DESC';

    const [rows] = await pool.query(query, params);
    return rows.map(row => ({
        ...row,
        konten_json: typeof row.konten_json === 'string' ? JSON.parse(row.konten_json) : row.konten_json
    }));
}

async function getModulAjar(id) {
    const [rows] = await pool.query('SELECT * FROM modul_ajar WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const row = rows[0];
    return {
        ...row,
        konten_json: typeof row.konten_json === 'string' ? JSON.parse(row.konten_json) : row.konten_json
    };
}

async function saveModulAjar(data, user_id) {
    const { id, tp_id, judul, konten_json, is_generated_ai } = data;
    
    if (id) {
        await pool.query(`
            UPDATE modul_ajar SET judul = ?, konten_json = ?, is_generated_ai = ?
            WHERE id = ?
        `, [judul, JSON.stringify(konten_json), is_generated_ai || false, id]);
        return id;
    } else {
        const newId = crypto.randomUUID();
        await pool.query(`
            INSERT INTO modul_ajar (id, tp_id, judul, konten_json, is_generated_ai, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [newId, tp_id, judul, JSON.stringify(konten_json), is_generated_ai || false, user_id]);
        return newId;
    }
}

async function deleteModulAjar(id) {
    await pool.query('DELETE FROM modul_ajar WHERE id = ?', [id]);
}

module.exports = {
    listCP, createCP, updateCP, deleteCP,
    listTP, createTP, updateTP, deleteTP,
    getATP, saveATP,
    listModulAjar, getModulAjar, saveModulAjar, deleteModulAjar
};
