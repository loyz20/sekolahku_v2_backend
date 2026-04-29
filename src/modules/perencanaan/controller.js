const model = require('./model');
const { successResponse } = require('../../utils/response');

/**
 * CAPAIAN PEMBELAJARAN (CP)
 */
async function getCP(req, res, next) {
    try {
        const { mapel_id, fase } = req.query;
        const result = await model.listCP({ mapel_id, fase });
        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
}

async function createCP(req, res, next) {
    try {
        const id = await model.createCP(req.body);
        return successResponse(res, { id }, 'CP berhasil dibuat', 201);
    } catch (error) {
        next(error);
    }
}

async function updateCP(req, res, next) {
    try {
        await model.updateCP(req.params.id, req.body);
        return successResponse(res, null, 'CP berhasil diperbarui');
    } catch (error) {
        next(error);
    }
}

async function deleteCP(req, res, next) {
    try {
        await model.deleteCP(req.params.id);
        return successResponse(res, null, 'CP berhasil dihapus');
    } catch (error) {
        next(error);
    }
}

/**
 * TUJUAN PEMBELAJARAN (TP)
 */
async function getTP(req, res, next) {
    try {
        const { pembelajaran_id, mapel_id, fase } = req.query;
        // Require at least one filter
        if (!pembelajaran_id && !mapel_id && !fase) {
            throw new Error('pembelajaran_id, mapel_id, or fase is required');
        }
        const result = await model.listTP({ pembelajaran_id, mapel_id, fase });
        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
}

async function createTP(req, res, next) {
    try {
        const id = await model.createTP(req.body);
        return successResponse(res, { id }, 'Tujuan Pembelajaran berhasil dibuat', 201);
    } catch (error) {
        next(error);
    }
}

async function updateTP(req, res, next) {
    try {
        await model.updateTP(req.params.id, req.body);
        return successResponse(res, null, 'Tujuan Pembelajaran berhasil diperbarui');
    } catch (error) {
        next(error);
    }
}

async function deleteTP(req, res, next) {
    try {
        await model.deleteTP(req.params.id);
        return successResponse(res, null, 'Tujuan Pembelajaran berhasil dihapus');
    } catch (error) {
        next(error);
    }
}

/**
 * ALUR TUJUAN PEMBELAJARAN (ATP)
 */
async function getATP(req, res, next) {
    try {
        const { pembelajaran_id, mapel_id, fase, tahun_ajaran } = req.query;
        const result = await model.getATP({ pembelajaran_id, mapel_id, fase, tahun_ajaran });
        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
}

async function saveATP(req, res, next) {
    try {
        // pembelajaran_id might be in params for backward compatibility, but we prefer body
        const { pembelajaran_id } = req.params;
        const id = await model.saveATP({ ...req.body, pembelajaran_id: pembelajaran_id || req.body.pembelajaran_id });
        return successResponse(res, { id }, 'Alur Tujuan Pembelajaran berhasil disimpan');
    } catch (error) {
        next(error);
    }
}

/**
 * MODUL AJAR
 */
async function getModulAjarList(req, res, next) {
    try {
        const { mapel, fase } = req.query;
        const rows = await model.listModulAjar(mapel, fase);
        return successResponse(res, rows);
    } catch (error) {
        next(error);
    }
}

async function getModulAjarDetail(req, res, next) {
    try {
        const result = await model.getModulAjar(req.params.id);
        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
}

async function saveModulAjar(req, res, next) {
    try {
        const id = await model.saveModulAjar(req.body, req.user.id);
        return successResponse(res, { id }, 'Modul Ajar berhasil disimpan');
    } catch (error) {
        next(error);
    }
}

async function generateTP(req, res, next) {
    try {
        const { mapel, fase, cp } = req.body;
        if (!mapel || !fase || !cp) {
            throw new Error('Data mapel, fase, dan cp diperlukan untuk generate');
        }

        const ai = require('../../utils/ai');
        const result = await ai.generateTP({ mapel, fase, cp });
        
        return successResponse(res, result.tp, 'AI berhasil merumuskan TP');
    } catch (error) {
        next(error);
    }
}

async function generateATP(req, res, next) {
    try {
        const { mapel, fase, tpList, total_minggu } = req.body;
        if (!tpList || tpList.length === 0) {
            throw new Error('Daftar TP diperlukan untuk generate alur');
        }

        const ai = require('../../utils/ai');
        const result = await ai.generateATP({ mapel, fase, tpList, total_minggu: total_minggu || 18 });
        
        return successResponse(res, result.atp, 'AI berhasil menyusun alur pembelajaran');
    } catch (error) {
        next(error);
    }
}

async function deleteModulAjar(req, res, next) {
    try {
        await model.deleteModulAjar(req.params.id);
        return successResponse(res, null, 'Modul Ajar berhasil dihapus');
    } catch (error) {
        next(error);
    }
}

async function generateModulAjar(req, res, next) {
    try {
        const { mapel, fase, tp_deskripsi } = req.body;
        if (!tp_deskripsi) {
            throw new Error('Deskripsi TP diperlukan untuk generate modul');
        }

        const ai = require('../../utils/ai');
        const result = await ai.generateModulAjar({ mapel, fase, tp_deskripsi });
        
        return successResponse(res, result, 'AI berhasil merumuskan modul ajar');
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getCP, createCP, updateCP, deleteCP,
    getTP, createTP, updateTP, deleteTP,
    getATP, saveATP,
    getModulAjarList, getModulAjarDetail, saveModulAjar, deleteModulAjar,
    generateTP, generateATP, generateModulAjar
};
