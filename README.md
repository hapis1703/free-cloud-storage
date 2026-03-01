# 📦 Telegram Cloud Storage (Node.js CLI)

A simple CLI-based cloud storage system built with **Node.js** that uses a **Telegram Channel** as file storage.

Files are automatically:

- Split into 18MB chunks
- Uploaded to a Telegram channel
- Stored in a local SQLite database
- Downloaded & merged back when needed
- Tracked with real-time progress + ETA

---

# 🚀 Features

- ✅ Upload large files (auto split into 18MB chunks)
- ✅ Real-time upload progress (percentage, speed, ETA)
- ✅ Real-time download progress (percentage, speed, ETA)
- ✅ Automatic chunk merging
- ✅ File listing
- ✅ Delete file record from database
- ✅ SQLite metadata storage
- ✅ `.env` secure configuration
- ✅ Supports file paths with spaces

---

# 🛠 How It Works

## Upload

1. File is streamed and split into 18MB chunks.
2. Each chunk is uploaded to your Telegram channel.
3. Telegram returns a `file_id` for each chunk.
4. All chunk `file_id`s are stored in `database.db`.

## Download

1. The app reads chunk `file_id`s from `database.db`.
2. Downloads each chunk from Telegram.
3. Merges chunks into the original file.
4. Shows real-time progress + ETA.

---

# 🗄 About `database.db`

`database.db` is the metadata storage of this project.

It does NOT store the actual file content.

Instead, it stores:

- Original file name
- List of Telegram `file_id`s (chunks)
- Chunk order

Think of it like:

> 📍 A GPS or Map
> It tells the program where each chunk is located inside Telegram.

If you delete `database.db`:

- The files will still exist in Telegram
- But you will lose the ability to reconstruct them

---

# 📂 Project Structure

```
FREE-DRIVE/
│
├── cloud.js        # Main CLI application
├── database.db     # SQLite metadata database
├── .env            # Environment variables (not committed)
├── .gitignore
├── package.json
└── node_modules/
```

---

# ⚙ Installation

## 1️⃣ Clone the repository

```bash
git clone <your-repo-url>
cd FREE-DRIVE
```

## 2️⃣ Install dependencies

```bash
npm install
```

Dependencies used:

- node-telegram-bot-api
- axios
- sqlite3
- readline-sync
- dotenv

---

# 🔐 Environment Setup (dotenv)

Create a `.env` file in the project root:

```
TOKEN=your_telegram_bot_token
CHANNEL_ID=your_channel_id
```

Example:

```
TOKEN=123456789:ABCxyzExampleToken
CHANNEL_ID=-1001234567890
```

⚠ Important:

- Do NOT commit `.env`
- Add `.env` to `.gitignore`

You may create `.env.example` like this:

```
TOKEN=
CHANNEL_ID=
```

---

# ▶ Usage

Run:

```bash
node cloud.js
```

You will see:

```
===== TELEGRAM CLOUD STORAGE =====
1. Upload File
2. List File
3. Download File
4. Delete File
5. Exit
```

---

# 📤 Upload Example Output

```
📊 45.32% | ⚡ 3.21 MB/s | ⏳ ETA 12.4s
```

Displays:

- Upload percentage
- Current speed (MB/s)
- Estimated time remaining

---

# 📥 Download Example Output

```
📊 62.50% | ⚡ 4.12 MB/s | ⏳ ETA 8.7s
```

Displays:

- Download percentage
- Speed
- Estimated remaining time

---

# 📝 Path With Spaces Support

You can input:

```
C:\My Folder\video.mp4
"C:\My Folder\video.mp4"
'/home/user/My File/movie.mkv'
```

The app automatically:

- Trims whitespace
- Removes surrounding quotes
- Supports paths with spaces

---

# ⚠ Important Notes

- Telegram channel storage is practically unlimited.
- Chunk size is set to 18MB for safety.
- Deleting a file from the app only removes its record from `database.db`.
- It does NOT delete chunks from Telegram.
- Losing `database.db` means losing file reconstruction ability.

---

# 🔒 Security Notes

- Never hardcode your bot token.
- Always use `.env`.
- Keep your bot admin-only.
- Make your channel private for better security.

---

# 🧠 Why Use Telegram as Storage?

- Free
- Reliable
- No external server required
- High storage capacity
- Simple API
- Works globally

---

# 🔥 Possible Future Improvements

- Delete chunks directly from Telegram
- Add encryption before upload
- Add file hash verification
- Add web interface (Express + frontend)
- Add multi-user authentication
- Convert to full cloud SaaS system
