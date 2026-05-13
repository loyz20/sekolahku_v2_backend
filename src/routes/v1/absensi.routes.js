const express = require('express');
const { controller: absensiController } = require('../../modules/absensi');
const { validateRequest } = require('../../middlewares/validation.middleware');
const { authorize } = require('../../middlewares/authorize.middleware');
const { absensiSchema, rekapAbsensiQuerySchema } = require('../../validations/absensi.schema');

const router = express.Router();

router.get('/settings', authorize('admin'), absensiController.getSettings);
router.put('/settings', authorize('admin'), absensiController.updateSettings);
router.get('/holidays', authorize('admin'), absensiController.getHolidays);
router.post('/holidays', authorize('admin'), absensiController.addHoliday);
router.delete('/holidays/:id', authorize('admin'), absensiController.deleteHoliday);

router.post('/masuk', authorize('admin', 'guru', 'siswa'), validateRequest(absensiSchema), absensiController.masuk);
router.post('/keluar', authorize('admin', 'guru', 'siswa'), validateRequest(absensiSchema), absensiController.keluar);
router.get('/', authorize('admin', 'guru', 'guru_bk'), validateRequest(rekapAbsensiQuerySchema, 'query'), absensiController.rekap);

module.exports = router;