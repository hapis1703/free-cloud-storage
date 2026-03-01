const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const readline = require("readline-sync");
require("dotenv").config();

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
  console.error("❌ TOKEN or CHANNEL_ID is missing in .env file");
  process.exit(1);
}
const CHUNK_SIZE = 18 * 1024 * 1024;

const bot = new TelegramBot(TOKEN);
const db = new sqlite3.Database("./database.db");

// ================= DATABASE PROMISE =================
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

dbRun(`
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT,
    file_ids TEXT
)
`);

// ================= UPLOAD (WITH PROGRESS + ETA) =================
async function uploadFile() {
  let filePath = readline.question("Masukkan path file: ");

  // Trim whitespace
  filePath = filePath.trim();

  // Remove surrounding quotes if exist
  if (
    (filePath.startsWith('"') && filePath.endsWith('"')) ||
    (filePath.startsWith("'") && filePath.endsWith("'"))
  ) {
    filePath = filePath.slice(1, -1);
  }
  if (!fs.existsSync(filePath)) {
    console.log("❌ File tidak ditemukan.");
    return;
  }

  const originalName = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const totalSize = stats.size;

  console.log(`📦 Ukuran file: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

  const startTime = Date.now();
  let uploadedBytes = 0;

  const now = new Date();
  const timestamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "_" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  const readStream = fs.createReadStream(filePath, {
    highWaterMark: CHUNK_SIZE,
  });

  let partIndex = 0;
  let fileIds = [];

  console.log("🚀 Mulai upload...\n");

  for await (const chunk of readStream) {
    const tempFile = `temp_${timestamp}_${partIndex}`;
    fs.writeFileSync(tempFile, chunk);

    const chunkName = `${timestamp}_${partIndex}`;

    const sent = await bot.sendDocument(
      CHANNEL_ID,
      tempFile,
      {},
      { filename: chunkName },
    );

    fileIds.push(sent.document.file_id);
    fs.unlinkSync(tempFile);

    uploadedBytes += chunk.length;

    const percent = ((uploadedBytes / totalSize) * 100).toFixed(2);
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = (uploadedBytes / 1024 / 1024 / elapsed).toFixed(2);
    const remainingBytes = totalSize - uploadedBytes;
    const eta = (remainingBytes / 1024 / 1024 / speed).toFixed(1);

    process.stdout.write(
      `\r📊 ${percent}% | ⚡ ${speed} MB/s | ⏳ ETA ${eta}s`,
    );

    partIndex++;
  }

  console.log("\n\n✅ Upload selesai!");

  await dbRun("INSERT INTO files (original_name, file_ids) VALUES (?, ?)", [
    originalName,
    JSON.stringify(fileIds),
  ]);
}

// ================= LIST =================
async function listFiles() {
  const rows = await dbAll("SELECT * FROM files");

  if (!rows.length) {
    console.log("📂 Tidak ada file.");
    return [];
  }

  console.log("\n📂 File tersimpan:");
  rows.forEach((row, i) => {
    console.log(`${i + 1}. ${row.original_name}`);
  });

  return rows;
}

// ================= DOWNLOAD (WITH PROGRESS + ETA) =================
async function downloadFile() {
  const rows = await listFiles();
  if (!rows.length) return;

  const index = readline.questionInt("\nPilih nomor file: ") - 1;

  if (!rows[index]) {
    console.log("❌ Index salah.");
    return;
  }

  const fileData = rows[index];
  const fileIds = JSON.parse(fileData.file_ids);

  console.log("⬇ Downloading & merging...\n");

  const writeStream = fs.createWriteStream(fileData.original_name);

  const startTime = Date.now();
  let downloadedBytes = 0;

  for (let i = 0; i < fileIds.length; i++) {
    const fileInfo = await bot.getFile(fileIds[i]);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;

    const response = await axios.get(fileUrl, { responseType: "stream" });

    const contentLength = parseInt(response.headers["content-length"] || 0);

    await new Promise((resolve) => {
      response.data.on("data", (chunk) => {
        downloadedBytes += chunk.length;

        const elapsed = (Date.now() - startTime) / 1000;
        const speed = (downloadedBytes / 1024 / 1024 / elapsed).toFixed(2);
        const percent = (((i + 1) / fileIds.length) * 100).toFixed(2);
        const eta = (
          ((fileIds.length - (i + 1)) * contentLength) /
          1024 /
          1024 /
          speed
        ).toFixed(1);

        process.stdout.write(
          `\r📊 ${percent}% | ⚡ ${speed} MB/s | ⏳ ETA ${eta}s`,
        );
      });

      response.data.pipe(writeStream, { end: false });
      response.data.on("end", resolve);
    });
  }

  writeStream.end();
  await new Promise((resolve) => writeStream.on("finish", resolve));

  console.log("\n\n✅ Download selesai!");
}

// ================= DELETE =================
async function deleteFile() {
  const rows = await listFiles();

  if (!rows.length) return;

  const choice = readline.question(
    "\nMasukkan nomor file yang ingin dihapus: ",
  );
  const index = parseInt(choice) - 1;

  if (isNaN(index) || index < 0 || index >= rows.length) {
    console.log("❌ Pilihan tidak valid.");
    return;
  }

  const selected = rows[index];

  await dbRun("DELETE FROM files WHERE id = ?", [selected.id]);

  console.log(
    `🗑 File "${selected.original_name}" berhasil dihapus dari database.`,
  );
}

// ================= MENU =================
async function mainMenu() {
  while (true) {
    console.log("\n===== TELEGRAM CLOUD STORAGE =====");
    console.log("1. Upload File");
    console.log("2. List File");
    console.log("3. Download File");
    console.log("4. Delete File");
    console.log("5. Exit");

    const choice = readline.questionInt("Pilih menu: ");

    if (choice === 1) await uploadFile();
    else if (choice === 2) await listFiles();
    else if (choice === 3) await downloadFile();
    else if (choice === 4) await deleteFile();
    else if (choice === 5) process.exit();
    else console.log("❌ Pilihan tidak valid.");
  }
}

mainMenu();
