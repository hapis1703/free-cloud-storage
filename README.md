# 🚀 Telegram Encrypted Cloud Storage CLI

CLI tool untuk menyimpan file ke Telegram sebagai cloud storage pribadi dengan enkripsi end-to-end.

File otomatis:

- Dipecah menjadi 18MB per part
- Diencrypt (AES-256-GCM) per chunk
- Digabung & didecrypt kembali saat download

---

## ✨ Features

- ✅ Upload file besar (auto split 18MB)
- ✅ AES-256-GCM encryption per chunk
- ✅ End-to-End encrypted (Telegram tidak bisa baca isi file)
- ✅ Progress bar real-time
- ✅ Speed (MB/s)
- ✅ ETA (Estimasi waktu selesai)
- ✅ Download & auto decrypt
- ✅ Hapus file dari database
- ✅ Database ringan berbasis JSON (LowDB)
- ✅ Compatible Windows & Termux

---

## 🛠 Tech Stack

- Node.js
- Telegraf
- LowDB
- Axios
- dotenv
- Crypto (built-in Node)

---

## 📋 Requirements

- Node.js v18+
- Telegram Bot
- Private Channel Telegram (bot harus admin)

---

## 📦 Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/hapis1703/free-cloud-storage.git
cd free-cloud-storage
```

### 2️⃣ Install Dependencies

```bash
npm install
```

Jika manual:

```bash
npm install telegraf axios readline-sync uuid lowdb dotenv
```

---

## ⚙️ Setup

Buat file `.env` di root project:

```env
TOKEN=YOUR_BOT_TOKEN
CHANNEL_ID=-1001234567890
SECRET_KEY=super_rahasia_kamu
```

⚠️ Jangan gunakan tanda kutip
⚠️ SECRET_KEY WAJIB sama saat upload & download

Jika SECRET_KEY berbeda → file tidak bisa didecrypt.

---

# 🤖 Cara Mendapatkan TOKEN

1. Buka Telegram
2. Chat `@BotFather`
3. Ketik `/newbot`
4. Ikuti instruksi
5. Copy token yang diberikan

---

# 📢 Cara Mendapatkan CHANNEL_ID (PRIVATE CHANNEL)

1. Kirim pesan apa saja ke channel private
2. Forward pesan tersebut ke bot `@RawDataBot`
3. Cari bagian:

```
forward_origin.chat.id
```

Contoh:

```json
{
  "forward_origin": {
    "chat": {
      "id": -1001234567890
    }
  }
}
```

Gunakan angka tersebut sebagai:

```
CHANNEL_ID=-1001234567890
```

---

# 🔐 Penting

Pastikan bot:

- Sudah ditambahkan ke channel
- Sudah dijadikan Admin
- Memiliki izin:
  - Send Messages
  - Send Media
  - Send Files

Jika tidak, akan muncul:

```
403: Forbidden: bot is not a member of the channel chat
```

---

## ▶️ Menjalankan Program

```bash
npm run start
```

---

## 🖥 Menu

```
===== TELEGRAM CLOUD STORAGE =====
1. Upload File
2. List File
3. Download File
4. Delete File
5. Exit
```

---

## 📊 Progress Bar Example

```
[██████████████░░░░░░░░░░░░] 48.32% | ⚡ 3.41 MB/s | ⏳ ETA 12.3s
```

---

# 🔐 Sistem Enkripsi

Algoritma:

```
AES-256-GCM
```

Setiap chunk disimpan dalam format:

```
[IV (12 byte)] + [AuthTag (16 byte)] + [Encrypted Data]
```

Keamanan:

- Tanpa SECRET_KEY → file tidak bisa dibuka
- Telegram hanya menyimpan data terenkripsi
- Bahkan jika file_id bocor → tetap aman

⚠ Jika SECRET_KEY hilang, file tidak bisa dipulihkan.

---

## 🗄 Database

File database:

```
database.json
```

Struktur:

```json
{
  "files": [
    {
      "id": "uuid",
      "original_name": "video.mp4",
      "file_size": 123456789,
      "file_ids": ["fileid1", "fileid2"]
    }
  ]
}
```

---

## 📦 Cara Kerja

### Upload

1. File dibaca sebagai stream
2. Dipecah 18MB per chunk
3. Tiap chunk diencrypt (AES-256-GCM)
4. Dikirim ke Telegram
5. file_id tiap part disimpan ke database

---

### Download

1. Ambil file_id dari database
2. Download tiap part dari Telegram API
3. Decrypt tiap chunk
4. Gabungkan menjadi file asli

---

## ⚠️ Notes

- Jangan ubah SECRET_KEY setelah upload
- Pastikan koneksi internet stabil
- Channel sebaiknya private
- Jangan share TOKEN & SECRET_KEY ke publik
- Backup file `.env` dan `database.json`

---

## 📁 Project Structure

```
.
├── cloud.js
├── database.json
├── .env
├── package.json
└── README.md
```

---

## 💡 Future Improvements

- Resume upload jika terputus
- Parallel upload
- Compression sebelum encrypt
- Password per file
- Multi-user support
- Web dashboard version
- Docker support
- Deploy ke VPS

---
