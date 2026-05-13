const { z } = require('zod');

const absensiSchema = z.object({
  peserta_didik_id: z.string().uuid('Peserta didik tidak valid'),
  latitude: z.number(),
  longitude: z.number(),
  is_mock_location: z.boolean().optional(),
  foto: z.string().optional(),
});

const rekapAbsensiQuerySchema = z.object({
  peserta_didik_id: z.string().uuid('Peserta didik tidak valid').optional(),
  bulan: z.string().regex(/^\d{2}$/, 'Bulan tidak valid').optional(),
  tahun: z.string().regex(/^\d{4}$/, 'Tahun tidak valid').optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  absensiSchema,
  rekapAbsensiQuerySchema,
};
