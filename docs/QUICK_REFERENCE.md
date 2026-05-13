# 📖 Quick Reference Guide

Panduan cepat untuk API endpoint dan common tasks.

## 🚀 Quick Start

```bash
# Setup
npm install
npm run setup
npm run migrate

# Development
npm run dev

# Test
npm test

# Documentation
open http://localhost:3000/docs
```

---

## 🔑 Authentication

### Get CSRF Token (required untuk POST/PUT/DELETE)
```bash
curl http://localhost:3000/api/v1/auth/csrf

# Response
{
  "success": true,
  "data": {
    "csrf_token": "abc123xyz..."
  }
}
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password"
  }'

# Response
{
  "success": true,
  "data": {
    "user": {
      "id": "xxx",
      "username": "admin",
      "role": "super_admin"
    }
  }
}
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh
```

### Logout
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout
```

---

## 🏫 Sekolah (School)

### List Sekolah
```bash
curl http://localhost:3000/api/v1/sekolah?page=1&limit=10
```

### Get Detail
```bash
curl http://localhost:3000/api/v1/sekolah/{id}
```

### Create Sekolah
```bash
TOKEN=$(curl -s http://localhost:3000/api/v1/auth/csrf | jq -r '.data.csrf_token')

curl -X POST http://localhost:3000/api/v1/sekolah \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "nama": "SMA Negeri 1",
    "jenjang": "SMA",
    "alamat": "Jl. Merdeka No. 1",
    "kota": "Jakarta"
  }'
```

### Update Sekolah
```bash
curl -X PUT http://localhost:3000/api/v1/sekolah/{id} \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "nama": "SMA Negeri 1 Baru"
  }'
```

### Delete Sekolah
```bash
curl -X DELETE http://localhost:3000/api/v1/sekolah/{id} \
  -H "X-CSRF-Token: $TOKEN"
```

---

## 👨‍🏫 PTK (Guru/Staff)

### List PTK
```bash
curl "http://localhost:3000/api/v1/ptk?sekolah_id={sekolah_id}&page=1&limit=10"
```

### Create PTK
```bash
curl -X POST http://localhost:3000/api/v1/ptk \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "nama": "Ibu Siti",
    "nip": "1234567890123456",
    "sekolah_id": "xxx"
  }'
```

### Get PTK Riwayat Pendidikan
```bash
curl http://localhost:3000/api/v1/ptk/{ptk_id}/riwayat-pendidikan
```

---

## 👨‍🎓 Siswa (Student)

### List Siswa
```bash
curl "http://localhost:3000/api/v1/siswa?sekolah_id={id}&search=nama"
```

### Create Siswa
```bash
curl -X POST http://localhost:3000/api/v1/siswa \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "nama": "Budi",
    "nisn": "0123456789",
    "sekolah_id": "xxx"
  }'
```

---

## 🏛️ Rombel (Class)

### List Rombel
```bash
curl "http://localhost:3000/api/v1/rombel?tahun_ajaran_id={id}&page=1"
```

### Create Rombel
```bash
curl -X POST http://localhost:3000/api/v1/rombel \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "nama": "XI-IPA-1",
    "tingkat": 11,
    "tahun_ajaran_id": "xxx"
  }'
```

### Add Anggota Rombel
```bash
curl -X POST http://localhost:3000/api/v1/rombel/{rombel_id}/anggota \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "peserta_didik_id": "xxx"
  }'
```

---

## 📚 Pembelajaran (Teaching)

### Create Pembelajaran
```bash
curl -X POST http://localhost:3000/api/v1/pembelajaran \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "rombel_id": "xxx",
    "mata_pelajaran_id": "xxx",
    "ptk_id": "xxx",
    "jam_per_minggu": 2
  }'
```

---

## 📋 Mata Pelajaran (Subject)

### List Mata Pelajaran
```bash
curl http://localhost:3000/api/v1/mata-pelajaran?sekolah_id={id}
```

### Create Mata Pelajaran
```bash
curl -X POST http://localhost:3000/api/v1/mata-pelajaran \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "nama": "Matematika",
    "sekolah_id": "xxx"
  }'
```

---

## 📅 Tahun Ajaran (Academic Year)

### List Tahun Ajaran
```bash
curl http://localhost:3000/api/v1/tahun-ajaran
```

### Create Tahun Ajaran
```bash
curl -X POST http://localhost:3000/api/v1/tahun-ajaran \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "tahun": "2024/2025",
    "mulai": "2024-07-01",
    "selesai": "2025-06-30"
  }'
```

---

## 📊 Penilaian (Assessment)

### Get Nilai
```bash
curl "http://localhost:3000/api/v1/nilai?pembelajaran_id={id}&semester={semester}"
```

### Save Nilai
```bash
curl -X POST http://localhost:3000/api/v1/nilai \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "peserta_didik_id": "xxx",
    "pembelajaran_id": "xxx",
    "jenis_penilaian": "UH",
    "nilai": 85,
    "semester": "1"
  }'
```

---

## 📝 Absensi (Attendance)

### Create Absensi
```bash
curl -X POST http://localhost:3000/api/v1/absensi \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "peserta_didik_id": "xxx",
    "latitude": -6.175,
    "longitude": 106.827
  }'
```

### Get Rekap Absensi
```bash
curl "http://localhost:3000/api/v1/absensi/rekap?peserta_didik_id={id}&bulan=01&tahun=2024"
```

---

## 🔔 Notification

### Get Notifications
```bash
curl http://localhost:3000/api/v1/notifications
```

### Mark as Read
```bash
curl -X POST http://localhost:3000/api/v1/notifications/{id}/read \
  -H "X-CSRF-Token: $TOKEN"
```

### Mark All as Read
```bash
curl -X POST http://localhost:3000/api/v1/notifications/mark-all-read \
  -H "X-CSRF-Token: $TOKEN"
```

---

## 💾 Database

### Migrations
```bash
# Run pending migrations
npm run migrate

# Check migration status
mysql -e "SELECT * FROM schema_migrations"

# Rollback last migration
npm run migrate:down
```

### Reset Database (⚠️ Data Loss)
```bash
mysql -u root -p
DROP DATABASE db_sekolah;
CREATE DATABASE db_sekolah;
GRANT ALL ON db_sekolah.* TO 'db_sekolah'@'localhost';
FLUSH PRIVILEGES;
EXIT;

npm run migrate
```

---

## 🧪 Testing

### Run Tests
```bash
npm test
npm test -- --watch
npm run test:coverage
```

### Test Specific Module
```bash
npm test -- src/modules/auth
```

---

## 📊 API Documentation

Interactive Swagger/OpenAPI documentation tersedia di:
```
http://localhost:3000/docs
```

---

## 🛠️ Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm start` | Start production server |
| `npm run setup` | Interactive setup wizard |
| `npm run migrate` | Run database migrations |
| `npm run migrate:down` | Rollback last migration |
| `npm run docs:generate` | Generate Swagger docs |
| `npm test` | Run tests |

---

## 🔐 Security Tips

### Never commit .env
```bash
# Check .gitignore
cat .gitignore | grep ".env"

# Should output:
# .env
```

### Rotate secrets regularly
```bash
# Generate new secrets
openssl rand -base64 32

# Update .env
JWT_ACCESS_SECRET=<new_value>
JWT_REFRESH_SECRET=<new_value>

# Restart server
npm run dev
```

### Use strong passwords
- Min 8 characters
- Mix of uppercase, lowercase, numbers, special chars
- Don't use common words

---

## 🌐 CORS Configuration

### Development (localhost)
```env
CORS_ORIGIN=http://localhost:5173
```

### Production
```env
CORS_ORIGIN=https://yourdomain.com
```

### Multiple origins
```env
CORS_ORIGIN=https://app.yourdomain.com,https://staging.yourdomain.com
```

---

## 📱 Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Success ✓ |
| 201 | Created | Resource created ✓ |
| 400 | Bad Request | Check input data |
| 401 | Unauthorized | Login required |
| 403 | Forbidden | Permission denied |
| 404 | Not Found | Endpoint not found |
| 422 | Unprocessable | Business logic error |
| 500 | Server Error | Contact support |

---

## 💡 Common Patterns

### Error Handling (Frontend)
```javascript
async function apiCall(path, options = {}) {
  const response = await fetch(`/api/v1${path}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    if (data.errors) {
      // Validation errors
      showFieldErrors(data.errors);
    } else {
      // General error
      showError(data.message);
    }
    throw new Error(data.message);
  }
  
  return data.data;
}
```

### Pagination
```bash
# Default: page=1, limit=10
curl "http://localhost:3000/api/v1/sekolah?page=2&limit=20"

# Response includes
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

See [docs/](./docs) folder for detailed documentation.
