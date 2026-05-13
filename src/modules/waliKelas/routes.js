const express = require('express');
const router = express.Router();
const waliKelasController = require('./controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/dashboard', waliKelasController.getDashboardStats);
router.get('/students', waliKelasController.getStudents);
router.get('/attendance-recap', waliKelasController.getAttendanceRecap);
router.post('/attendance', waliKelasController.updateAttendance);
router.post('/broadcast', waliKelasController.broadcastMessage);

module.exports = router;
