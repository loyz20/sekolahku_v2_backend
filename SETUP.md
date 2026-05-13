# 📚 Setup Guide - Sekolahku Backend

Panduan lengkap untuk setup dan menjalankan backend Sekolahku secara lokal atau production.

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 16+ dan npm/yarn
- MySQL 8.0+
- Git

### 1. Instalasi Dependencies
```bash
cd backend
npm install
```

### 2. Setup Database
```bash
# Pastikan MySQL running
mysql -u root -p

# Create database
CREATE DATABASE db_sekolah;
CREATE USER 'db_sekolah'@'localhost' IDENTIFIED BY '123';
GRANT ALL PRIVILEGES ON db_sekolah.* TO 'db_sekolah'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Konfigurasi Environment
```bash
# Copy template
cp .env.example .env

# Edit .env dan sesuaikan nilai-nilainya
# Minimal perlu diubah:
# - DB_PASSWORD (password database)
# - JWT_ACCESS_SECRET (minimal 32 karakter)
# - JWT_REFRESH_SECRET (minimal 32 karakter)
# - GEMINI_API_KEY (jika ingin fitur AI)
```

### 4. Jalankan Migrations
```bash
npm run migrate
# Output: Migrations completed successfully ✓
```

### 5. Jalankan Server
```bash
npm run dev
# Server running on port 3000
# API ready at http://localhost:3000/api/v1
# Docs at http://localhost:3000/docs
```

---

## ⚙️ Environment Variables Explained

### Database Configuration
```env
DB_HOST=localhost              # MySQL host
DB_PORT=3306                   # MySQL port
DB_USER=db_sekolah            # MySQL username
DB_PASSWORD=123               # MySQL password (UBAH INI!)
DB_NAME=db_sekolah            # Database name
DB_CONNECTION_LIMIT=10        # Max concurrent connections
```

### JWT Configuration
```env
JWT_ACCESS_SECRET=your-secret-key-min-32-chars     # UBAH INI! (min 32 chars)
JWT_REFRESH_SECRET=your-secret-key-min-32-chars    # UBAH INI! (min 32 chars)
JWT_ACCESS_EXPIRES_IN=15m                          # Access token lifetime
JWT_REFRESH_EXPIRES_IN=7d                          # Refresh token lifetime
```

> ⚠️ **Penting**: Untuk production, gunakan random string 32+ karakter:
> ```bash
> # Generate di terminal:
> openssl rand -base64 32
> ```

### CORS & Server
```env
CORS_ORIGIN=http://localhost:5173    # Frontend URL yang diizinkan
NODE_ENV=development                 # development|staging|production
PORT=3000                            # Server port
```

### Optional
```env
GEMINI_API_KEY=xxx                   # Google Gemini API untuk fitur AI
```

---

## 🔐 Security Setup

### Development
- Gunakan secrets sederhana (akan validate saat startup)
- Database lokal dengan password lemah OK

### Staging
- Generate secrets 32+ karakter
- Database di server terpisah
- Enable HTTPS
- Set NODE_ENV=staging

### Production ⚠️
```env
NODE_ENV=production
JWT_ACCESS_SECRET=<random 32+ char>
JWT_REFRESH_SECRET=<random 32+ char>
CORS_ORIGIN=https://yourapp.com
DB_PASSWORD=<strong password>
```

---

## 📋 Common Tasks

### Menjalankan Tests
```bash
npm run test
```

### Generate API Documentation
```bash
npm run docs:generate
# Hasil: src/swagger.json
```

### Database Migrations

#### Lihat status
```bash
npm run migrate:status
```

#### Rollback ke migration terakhir
```bash
npm run migrate:down
```

#### Reset database (⚠️ Hati-hati!)
```bash
# DROP dan recreate semua tables
mysql -u db_sekolah -p db_sekolah < scripts/reset-db.sql
npm run migrate
```

### Debug API
```bash
# Dengan verbose logging
DEBUG=* npm run dev

# Atau test endpoint
curl http://localhost:3000/api/v1/health
```

---

## 🐛 Troubleshooting

### "Error: connect ECONNREFUSED 127.0.0.1:3306"
→ MySQL tidak running
```bash
# Start MySQL (macOS/Linux)
brew services start mysql

# Atau Windows
net start MySQL80
```

### "Error: Access denied for user 'db_sekolah'@'localhost'"
→ Password database salah di .env
```bash
# Reset password
mysql -u root -p
ALTER USER 'db_sekolah'@'localhost' IDENTIFIED BY '123';
```

### "Error: Unknown database 'db_sekolah'"
→ Database belum dibuat
```bash
mysql -u root -p
CREATE DATABASE db_sekolah;
```

### "Error: ER_NOT_SUPPORTED_AUTH_PLUGIN"
→ MySQL 8.0 auth issue
```bash
mysql -u root -p
ALTER USER 'db_sekolah'@'localhost' IDENTIFIED WITH mysql_native_password BY '123';
FLUSH PRIVILEGES;
```

### Server crash dengan "JWT_ACCESS_SECRET: Too short"
→ Production mode dengan secret terlalu pendek
```bash
# Generate secret baru di development dulu:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy hasil ke .env
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Database & environment config
│   ├── modules/         # Feature modules (auth, siswa, etc)
│   ├── routes/          # API routes
│   ├── middlewares/      # Express middleware
│   ├── validations/     # Zod schemas untuk input validation
│   ├── utils/           # Helper functions
│   ├── constants/       # Constants & enums
│   └── app.js          # Express app setup
├── migrations/         # SQL migration files
├── scripts/           # Helper scripts
├── .env.example       # Template environment variables
└── package.json       # Dependencies & scripts
```

---

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Run specific test
```bash
npm test -- src/modules/auth/__tests__
```

### Coverage report
```bash
npm run test:coverage
```

---

## 📚 API Documentation

Setelah server running, buka:
- **Interactive Docs**: http://localhost:3000/docs
- **API Base URL**: http://localhost:3000/api/v1

### Contoh request dengan CSRF token:
```bash
# 1. Get CSRF token
curl http://localhost:3000/api/v1/auth/csrf

# 2. Use token di POST request
curl -X POST http://localhost:3000/api/v1/sekolah \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token dari step 1>" \
  -d '{"nama": "SMA Negeri 1"}'
```

---

## 🚢 Deployment

### Heroku
```bash
# Install heroku CLI
npm install -g heroku

# Login & setup
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set JWT_ACCESS_SECRET=xxxxx
heroku config:set JWT_REFRESH_SECRET=xxxxx
heroku config:set DB_HOST=your-database-host
# ... etc

# Deploy
git push heroku main
```

### Docker
```bash
docker build -t sekolahku-backend .
docker run -p 3000:3000 --env-file .env sekolahku-backend
```

### Traditional Server (VPS/Dedicated)
```bash
# SSH ke server
ssh user@server.com

# Clone repo
git clone https://github.com/yourrepo/sekolahku.git
cd sekolahku/backend

# Setup
npm install
cp .env.example .env
# Edit .env dengan konfigurasi production
npm run migrate

# Start dengan PM2
npm install -g pm2
pm2 start src/server.js --name "sekolahku-api"
pm2 save
```

---

## ✅ Checklist Sebelum Production

- [ ] Ubah semua JWT secrets (min 32 char)
- [ ] Ubah database password
- [ ] Set NODE_ENV=production
- [ ] Setup proper CORS_ORIGIN
- [ ] Enable HTTPS
- [ ] Setup database backups
- [ ] Setup monitoring & logging
- [ ] Setup error tracking (Sentry)
- [ ] Run security audit: `npm audit`
- [ ] Load test API
- [ ] Prepare rollback plan
- [ ] Document emergency contacts

---

## 🆘 Getting Help

- **Issues**: Create issue di GitHub repository
- **Email**: dev@sekolahku.local
- **Docs**: https://sekolahku.docs.local

---

## 📝 Notes

- Semua passwords di development direkomendasikan menggunakan simple values untuk mudah remember
- Jangan commit `.env` file ke git (already in .gitignore)
- Backup database secara regular
- Monitor disk space untuk uploads folder

Happy coding! 🎉
