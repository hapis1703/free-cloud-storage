# 🚀 Telegram Cloud Storage CLI

CLI tool untuk menyimpan file ke Telegram sebagai cloud storage pribadi.

File otomatis dipecah menjadi beberapa bagian (18MB per part) lalu digabung kembali saat download.

---

## ✨ Features

- ✅ Upload file besar (auto split 18MB)
- ✅ Progress bar real-time
- ✅ Speed (MB/s)
- ✅ ETA (Estimasi waktu selesai)
- ✅ Simpan metadata (nama & ukuran file)
- ✅ Download & merge otomatis
- ✅ Hapus file dari database
- ✅ Database cepat menggunakan better-sqlite3

---

## 🛠 Tech Stack

- Node.js
- Telegraf
- better-sqlite3
- Axios
- dotenv

---

## 📋 Requirements

- Node.js v18+
- Telegram Bot
- Private Channel Telegram (bot harus admin)

---

## 📦 Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/telegram-cloud-storage.git
cd telegram-cloud-storage
```

### 2️⃣ Install Dependencies

```bash
npm install
```

Jika belum ada dependency:

```bash
npm install telegraf better-sqlite3 axios readline-sync uuid dotenv
```

---

## ⚙️ Setup

Buat file `.env` di root project:

```env
TOKEN=YOUR_BOT_TOKEN
CHANNEL_ID=-1001234567890
```

⚠️ Jangan gunakan tanda kutip.

---

# 🤖 Cara Mendapatkan TOKEN

1. Buka Telegram
2. Chat `@BotFather`
3. Ketik `/newbot`
4. Ikuti instruksi
5. Copy token yang diberikan

---

# 📢 Cara Mendapatkan CHANNEL_ID (PRIVATE CHANNEL)

Karena channel private tidak memiliki username publik, gunakan cara berikut:

### Langkah-langkah:

1. Kirim pesan apa saja ke channel private
2. Forward pesan tersebut ke bot `@RawDataBot`
3. Cari bagian berikut pada JSON:

```
forward_origin.chat.id
```

Contoh hasil (dummy):

```json
{
  "forward_origin": {
    "type": "channel",
    "chat": {
      "id": -1001234567890,
      "title": "My Private Channel",
      "type": "channel"
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

Jika tidak, akan muncul error:

```
403: Forbidden: bot is not a member of the channel chat
```

---

## ▶️ Menjalankan Program

```
node index.js
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

Saat upload atau download:

```
[██████████████░░░░░░░░░░░░] 48.32% | ⚡ 3.41 MB/s | ⏳ ETA 12.3s
```

---

## 🗄 Database

File database:

```
database.db
```

Struktur tabel:

| Column        | Type    | Description             |
| ------------- | ------- | ----------------------- |
| id            | INTEGER | Primary key             |
| original_name | TEXT    | Nama file asli          |
| file_size     | INTEGER | Ukuran file dalam bytes |
| file_ids      | TEXT    | Array file_id Telegram  |

---

## 📦 Cara Kerja

### Upload

1. File dibaca sebagai stream
2. Dipecah menjadi 18MB per bagian
3. Dikirim ke channel Telegram
4. file_id tiap part disimpan di database

### Download

1. Ambil file_id dari database
2. Download tiap part dari Telegram API
3. Gabungkan menjadi file asli

---

## ⚠️ Notes

- File di-split 18MB untuk stabilitas
- Pastikan koneksi internet stabil
- Channel sebaiknya private untuk keamanan
- Jangan share TOKEN ke publik

---

## 💡 Future Improvements

- Resume upload jika terputus
- Parallel upload
- AES encryption sebelum upload
- Web dashboard version
- Multi-user support
- Docker support
- Deploy ke VPS

---

## 📁 Project Structure

```
.
├── index.js
├── database.db
├── .env
├── package.json
└── README.md
```

---
