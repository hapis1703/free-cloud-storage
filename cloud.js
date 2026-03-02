const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Database = require("better-sqlite3");
const readline = require("readline-sync");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
  console.error("❌ TOKEN or CHANNEL_ID is missing in .env file");
  process.exit(1);
}

const CHUNK_SIZE = 18 * 1024 * 1024;

// ================= PROGRESS BAR =================
function renderProgress(current, total, startTime) {
  const percent = total > 0 ? current / total : 0;
  const percentText = (percent * 100).toFixed(2);

  const barLength = 30;
  const filledLength = Math.floor(barLength * percent);
  const emptyLength = barLength - filledLength;

  const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);

  const elapsed = (Date.now() - startTime) / 1000;
  const speed = elapsed > 0 ? current / 1024 / 1024 / elapsed : 0;

  const remainingBytes = total - current;
  const eta = speed > 0 ? remainingBytes / 1024 / 1024 / speed : 0;

  process.stdout.write(
    `\r[${bar}] ${percentText}% | ⚡ ${speed.toFixed(2)} MB/s | ⏳ ETA ${eta.toFixed(1)}s`,
  );
}

const bot = new Telegraf(TOKEN);
const db = new Database("./database.db");

// ================= DATABASE =================
db.prepare(
  `
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT,
    file_size INTEGER,
    file_ids TEXT
)
`,
).run();

// ================= UPLOAD =================
async function uploadFile() {
  let filePath = readline.question("Masukkan path file: ").trim();

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
  const totalSize = fs.statSync(filePath).size;

  console.log(`📦 Ukuran file: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  const readStream = fs.createReadStream(filePath, {
    highWaterMark: CHUNK_SIZE,
  });

  let fileIds = [];
  let uploadedBytes = 0;
  const startTime = Date.now();

  console.log("🚀 Mulai upload...\n");

  let partIndex = 0;

  for await (const chunk of readStream) {
    const tempFile = `temp_${Date.now()}_${partIndex}`;
    fs.writeFileSync(tempFile, chunk);

    const sent = await bot.telegram.sendDocument(CHANNEL_ID, {
      source: tempFile,
      filename: uuidv4(),
    });

    fileIds.push(sent.document.file_id);
    fs.unlinkSync(tempFile);

    uploadedBytes += chunk.length;
    renderProgress(uploadedBytes, totalSize, startTime);
    partIndex++;
  }

  console.log("\n\n✅ Upload selesai!");

  db.prepare(
    `
    INSERT INTO files (original_name, file_size, file_ids)
    VALUES (?, ?, ?)
  `,
  ).run(originalName, totalSize, JSON.stringify(fileIds));
}

// ================= LIST =================
function listFiles() {
  const rows = db.prepare("SELECT * FROM files").all();

  if (!rows.length) {
    console.log("📂 Tidak ada file.");
    return [];
  }

  console.log("\n📂 File tersimpan:");
  rows.forEach((row, i) => {
    const sizeMB = (row.file_size / 1024 / 1024).toFixed(2);
    console.log(`${i + 1}. ${row.original_name} (${sizeMB} MB)`);
  });

  return rows;
}

// ================= DOWNLOAD =================
async function downloadFile() {
  const rows = listFiles();
  if (!rows.length) return;

  const index = readline.questionInt("\nPilih nomor file: ") - 1;

  if (!rows[index]) {
    console.log("❌ Index salah.");
    return;
  }

  const fileData = rows[index];
  const totalSize = fileData.file_size;
  const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

  console.log(`📦 Nama: ${fileData.original_name}`);
  console.log(`📦 Ukuran: ${sizeMB} MB\n`);

  const fileIds = JSON.parse(fileData.file_ids);
  const writeStream = fs.createWriteStream(fileData.original_name);

  console.log("⬇ Downloading...\n");

  const startTime = Date.now();
  let downloadedBytes = 0;

  for (let fileId of fileIds) {
    const fileInfo = await bot.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;

    const response = await axios.get(fileUrl, { responseType: "stream" });

    await new Promise((resolve) => {
      response.data.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        renderProgress(downloadedBytes, totalSize, startTime);
      });

      response.data.pipe(writeStream, { end: false });
      response.data.on("end", resolve);
    });
  }

  writeStream.end();
  await new Promise((resolve) => writeStream.on("finish", resolve));

  console.log("\n✅ Download selesai!");
}

// ================= DELETE =================
function deleteFile() {
  const rows = listFiles();
  if (!rows.length) return;

  const index = readline.questionInt("\nPilih nomor file: ") - 1;

  if (!rows[index]) {
    console.log("❌ Index salah.");
    return;
  }

  db.prepare("DELETE FROM files WHERE id = ?").run(rows[index].id);

  console.log(`🗑 File "${rows[index].original_name}" berhasil dihapus.`);
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
    else if (choice === 2) listFiles();
    else if (choice === 3) await downloadFile();
    else if (choice === 4) deleteFile();
    else if (choice === 5) process.exit();
    else console.log("❌ Pilihan tidak valid.");
  }
}

mainMenu();
