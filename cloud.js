const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const readline = require("readline-sync");

const TOKEN = "8408247572:AAE58HE4GltRc3IyNfXybkUwpR4bF_nFxGM";
const CHANNEL_ID = "-1003708889544";
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

// ================= SPLIT =================
function splitFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const chunks = [];

  for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
    chunks.push(buffer.slice(i, i + CHUNK_SIZE));
  }

  return chunks;
}

// ================= UPLOAD (STREAMING SAFE >2GB) =================
async function uploadFile() {
  const filePath = readline.question("Masukkan path file: ");

  if (!fs.existsSync(filePath)) {
    console.log("❌ File tidak ditemukan.");
    return;
  }

  const originalName = path.basename(filePath);
  const stats = fs.statSync(filePath);

  console.log(`📦 Ukuran file: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

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

  console.log("🚀 Mulai upload...");

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

    console.log(`✔ Part ${partIndex + 1} uploaded`);

    partIndex++;
  }

  await dbRun("INSERT INTO files (original_name, file_ids) VALUES (?, ?)", [
    originalName,
    JSON.stringify(fileIds),
  ]);

  console.log("✅ Upload selesai!");
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

// ================= DOWNLOAD =================
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

  console.log("⬇ Downloading & merging...");

  const writeStream = fs.createWriteStream(fileData.original_name);

  for (const fileId of fileIds) {
    const fileInfo = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;

    const response = await axios.get(fileUrl, { responseType: "stream" });

    await new Promise((resolve) => {
      response.data.pipe(writeStream, { end: false });
      response.data.on("end", resolve);
    });
  }

  writeStream.end();

  await new Promise((resolve) => writeStream.on("finish", resolve));

  console.log("✅ Download selesai:", fileData.original_name);
}

// ================= MENU =================
async function mainMenu() {
  while (true) {
    console.log("\n===== TELEGRAM CLOUD STORAGE =====");
    console.log("1. Upload File");
    console.log("2. List File");
    console.log("3. Download File");
    console.log("4. Exit");

    const choice = readline.questionInt("Pilih menu: ");

    if (choice === 1) await uploadFile();
    else if (choice === 2) await listFiles();
    else if (choice === 3) await downloadFile();
    else if (choice === 4) process.exit();
    else console.log("❌ Pilihan tidak valid.");
  }
}

mainMenu();
