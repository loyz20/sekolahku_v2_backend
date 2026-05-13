# 🚨 API Error Codes Reference

Panduan lengkap untuk memahami dan mengatasi error responses dari API Sekolahku.

## 📋 HTTP Status Codes

| Code | Name | Arti | Aksi |
|------|------|------|------|
| 200 | OK | Request berhasil | - |
| 201 | Created | Resource berhasil dibuat | - |
| 400 | Bad Request | Input tidak valid | Periksa kembali data yang dikirim |
| 401 | Unauthorized | Belum login atau token expired | Login kembali |
| 403 | Forbidden | Tidak memiliki akses | Periksa permission/role |
| 404 | Not Found | Endpoint/resource tidak ada | Periksa URL yang diakses |
| 422 | Unprocessable Entity | Business logic error | Periksa kondisi data |
| 500 | Internal Server Error | Error di server | Hubungi developer |

---

## 🔐 Authentication Errors

### 401 UNAUTHORIZED
Terjadi ketika tidak ada/invalid authentication token.

```json
{
  "success": false,
  "message": "Anda harus login terlebih dahulu. Silakan gunakan endpoint /api/v1/auth/login",
  "code": "UNAUTHORIZED",
  "status": 401
}
```

**Solusi:**
1. Login menggunakan `/api/v1/auth/login`
2. Pastikan token tersimpan di httpOnly cookie
3. Atau kirim token di header: `Authorization: Bearer <token>`

**Contoh:**
```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Gunakan token yang diterima
curl http://localhost:3000/api/v1/sekolah \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 401 TOKEN_EXPIRED
Token sudah kadaluarsa.

```json
{
  "success": false,
  "message": "Sesi Anda telah berakhir. Silakan login kembali untuk melanjutkan",
  "code": "TOKEN_EXPIRED",
  "status": 401
}
```

**Solusi:**
1. Gunakan refresh token untuk mendapat access token baru
2. Atau login kembali

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json"
```

---

### 403 FORBIDDEN
Token valid tapi tidak memiliki akses untuk action ini.

```json
{
  "success": false,
  "message": "Anda tidak memiliki akses untuk melakukan aksi ini",
  "code": "FORBIDDEN",
  "status": 403
}
```

**Solusi:**
- Periksa role/permission user
- Hanya admin yang bisa delete data
- Guru hanya bisa edit data miliknya sendiri

---

## ✅ Validation Errors

### 400 VALIDATION_ERROR
Input data tidak sesuai dengan schema yang diharapkan.

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "nama": ["Nama wajib diisi"],
    "email": ["Format email tidak valid"]
  },
  "code": "VALIDATION_ERROR",
  "status": 400
}
```

**Umum ditemukan di fields:**
- `String field`, e.g., "Nama wajib diisi"
- `Email format`, e.g., "Format email tidak valid"
- `UUID format`, e.g., "ID tidak valid"
- `Number range`, e.g., "Nilai harus antara 0-100"

**Solusi:**
```javascript
// Periksa error response untuk field yang error
const errors = response.errors;
for (const field in errors) {
  console.log(`${field}: ${errors[field].join(', ')}`);
}

// Contoh: nama: Nama wajib diisi
// Contoh: email: Format email tidak valid
```

---

## 🔄 Business Logic Errors

### 422 BUSINESS_RULE
Data tidak memenuhi business logic aplikasi.

```json
{
  "success": false,
  "message": "Siswa dengan NIK ini sudah terdaftar di sekolah lain",
  "code": "BUSINESS_RULE",
  "status": 422
}
```

**Contoh kasus:**
- Duplicate NIK/NIPSN
- Siswa sudah terdaftar di rombel
- Guru tidak memiliki sertifikat mata pelajaran
- Cuti tidak bisa lebih dari 30 hari

**Solusi:**
- Periksa data existing terlebih dahulu
- Validasi kondisi sebelum update
- Hubungi admin jika ada konflik data

---

## 🔗 CSRF Errors

### 403 CSRF_TOKEN_INVALID
Token CSRF hilang atau tidak valid.

```json
{
  "success": false,
  "message": "CSRF token tidak ditemukan",
  "code": "FORBIDDEN",
  "status": 403
}
```

**Untuk POST/PUT/DELETE requests:**

```bash
# 1. Get CSRF token
TOKEN=$(curl http://localhost:3000/api/v1/auth/csrf \
  | jq -r '.data.csrf_token')

# 2. Use token di request
curl -X POST http://localhost:3000/api/v1/sekolah \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"nama":"SMA Negeri 1"}'
```

---

## 🔍 Not Found Errors

### 404 NOT_FOUND

```json
{
  "success": false,
  "message": "Endpoint tidak ditemukan: GET /api/v1/typo. Silakan periksa dokumentasi API di /docs",
  "code": "NOT_FOUND",
  "status": 404
}
```

**Penyebab:**
- URL endpoint salah
- Typo di path
- Versi API tidak sesuai

**Solusi:**
1. Periksa dokumentasi API: `/docs`
2. Verifikasi endpoint yang diakses
3. Periksa method HTTP (GET vs POST)

**Contoh yang benar:**
```bash
# ❌ SALAH
curl http://localhost:3000/api/v1/sekolah/create

# ✅ BENAR
curl -X POST http://localhost:3000/api/v1/sekolah
```

---

## ⚠️ Server Errors

### 500 INTERNAL_ERROR
Terjadi error di server.

```json
{
  "success": false,
  "message": "Terjadi kesalahan pada server",
  "code": "INTERNAL_ERROR",
  "status": 500
}
```

**Penyebab umum:**
- Database connection error
- Query error
- Unexpected exception

**Solusi:**
1. Cek error log di server
2. Verifikasi database connection
3. Hubungi developer dengan timestamp error

```bash
# Check server logs
tail -f logs/server.log

# Cek database connection
npm run dev
# Lihat console output untuk error details
```

---

## 🐛 Debugging Tips

### 1. Cek Response Body
```javascript
const response = await fetch('/api/v1/sekolah');
const data = await response.json();

console.log('Status:', response.status);
console.log('Message:', data.message);
console.log('Errors:', data.errors);
```

### 2. Cek Network Tab
Di browser DevTools (F12):
1. Buka tab Network
2. Buat request
3. Lihat response details

### 3. Enable Debug Logging
```bash
DEBUG=* npm run dev
```

### 4. Test dengan cURL
```bash
curl -X GET http://localhost:3000/api/v1/sekolah \
  -H "Content-Type: application/json" \
  -v  # Verbose mode
```

### 5. Periksa .env Configuration
```bash
# Pastikan semua variable diset
cat .env

# Restart server setelah change .env
npm run dev
```

---

## 📊 Common Error Scenarios

### Scenario 1: Login Failed
```json
// Response
{
  "success": false,
  "message": "Username atau password salah",
  "code": "UNAUTHORIZED",
  "status": 401
}
```

✅ **Solusi:**
- Periksa username/password
- Pastikan akun sudah aktif
- Reset password jika lupa

### Scenario 2: Data Tidak Bisa Diedit
```json
{
  "success": false,
  "message": "Anda tidak memiliki akses untuk melakukan aksi ini",
  "code": "FORBIDDEN",
  "status": 403
}
```

✅ **Solusi:**
- Login dengan user yang tepat (admin/guru)
- Pastikan data milik sekolah Anda
- Cek role/permission di database

### Scenario 3: Duplicate Data
```json
{
  "success": false,
  "message": "Siswa dengan NIK 12345678 sudah terdaftar",
  "code": "BUSINESS_RULE",
  "status": 422
}
```

✅ **Solusi:**
- Gunakan NIK yang unik
- Atau update data existing
- Query database untuk cek duplikat

### Scenario 4: Database Down
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

✅ **Solusi:**
```bash
# Start MySQL
brew services start mysql  # macOS
sudo service mysql start    # Linux
net start MySQL80           # Windows

# Verify connection
mysql -u db_sekolah -p db_sekolah -e "SELECT 1"
```

---

## 🚀 Best Practices

### Frontend Integration
```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`/api/v1${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': options.csrfToken,
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle error
      if (data.errors) {
        // Validation errors - show per field
        showFieldErrors(data.errors);
      } else {
        // General error - show message
        showError(data.message);
      }
      throw new Error(data.message);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Usage
try {
  const result = await apiCall('/sekolah', {
    method: 'POST',
    csrfToken: window.csrfToken,
    body: { nama: 'SMA Negeri 1' },
  });
  console.log('Success:', result);
} catch (error) {
  console.error('Failed:', error);
}
```

---

## 📞 Getting Help

- **API Docs**: http://localhost:3000/docs
- **Issues**: https://github.com/sekolahku/backend/issues
- **Email**: dev@sekolahku.local

---

## 📝 Related Resources

- [SETUP.md](./SETUP.md) - Environment setup
- [README.md](./README.md) - Project overview
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guide
