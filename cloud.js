const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const readline = require("readline-sync");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");
const { sendDatabaseBackup } = require("./backup");
require("dotenv").config();

// ================= ENV =================
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SECRET_KEY = crypto
  .createHash("sha256")
  .update(process.env.SECRET_KEY || "default-secret")
  .digest();

if (!TOKEN || !CHANNEL_ID) {
  console.error("❌ TOKEN or CHANNEL_ID missing in .env");
  process.exit(1);
}

const CHUNK_SIZE = 18 * 1024 * 1024;

// ================= DATABASE =================
const adapter = new JSONFile("database.json");
const db = new Low(adapter, { files: [] });

async function initDB() {
  await db.read();
  await db.write();
}

// ================= ENCRYPTION =================
function encryptChunk(buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", SECRET_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

function decryptChunk(buffer) {
  try {
    const iv = buffer.slice(0, 12);
    const authTag = buffer.slice(12, 28);
    const encryptedData = buffer.slice(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", SECRET_KEY, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  } catch (err) {
    console.error("\n❌ Decrypt gagal! Kemungkinan SECRET_KEY berbeda.");
    throw err;
  }
}

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

// ================= UPLOAD =================
async function uploadFile() {
  let filePath = readline.question("Masukkan path file: ").trim();
  filePath = filePath.replace(/^["']|["']$/g, "");

  if (!fs.existsSync(filePath)) {
    console.log("❌ File tidak ditemukan.");
    return;
  }

  const originalName = path.basename(filePath);
  const totalSize = fs.statSync(filePath).size;

  console.log(`📦 Ukuran file: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log("🚀 Mulai upload...\n");

  const readStream = fs.createReadStream(filePath, {
    highWaterMark: CHUNK_SIZE,
  });

  let fileIds = [];
  let uploadedBytes = 0;
  let partIndex = 0;
  const startTime = Date.now();

  for await (const chunk of readStream) {
    const encryptedBuffer = encryptChunk(chunk);

    const tempFile = `temp_${Date.now()}_${partIndex}`;
    fs.writeFileSync(tempFile, encryptedBuffer);

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

  db.data.files.push({
    id: uuidv4(),
    original_name: originalName,
    file_size: totalSize,
    file_ids: fileIds,
  });

  await db.write();
  await sendDatabaseBackup();

  console.log("\n\n✅ Upload selesai!");
}

// ================= LIST =================
function listFiles() {
  const rows = db.data.files;

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
  const writeStream = fs.createWriteStream(fileData.original_name);

  console.log("\n⬇ Downloading...\n");

  const startTime = Date.now();
  let downloadedBytes = 0;

  for (let fileId of fileData.file_ids) {
    const fileInfo = await bot.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });

    const encryptedBuffer = Buffer.from(response.data);

    if (encryptedBuffer.length < 28) {
      console.log("❌ Chunk corrupt atau kosong!");
      return;
    }

    const decrypted = decryptChunk(encryptedBuffer);

    writeStream.write(decrypted);

    downloadedBytes += decrypted.length;
    renderProgress(downloadedBytes, fileData.file_size, startTime);
  }

  await new Promise((resolve) => writeStream.end(resolve));
  console.log("\n\n✅ Download selesai!");
}

// ================= DELETE =================
async function deleteFile() {
  const rows = listFiles();
  if (!rows.length) return;

  const index = readline.questionInt("\nPilih nomor file: ") - 1;
  if (!rows[index]) {
    console.log("❌ Index salah.");
    return;
  }

  db.data.files = db.data.files.filter((f) => f.id !== rows[index].id);

  await db.write();
  console.log(`🗑 File "${rows[index].original_name}" dihapus.`);
}

// ================= MENU =================
async function mainMenu() {
  while (true) {
    console.log("\n===== TELEGRAM CLOUD STORAGE =====");
    console.log("1. Upload File");
    console.log("2. List File");
    console.log("3. Download File");
    console.log("4. Backup Database");
    console.log("5. Delete File");
    console.log("6. Exit");

    const choice = readline.questionInt("Pilih menu: ");

    if (choice === 1) await uploadFile();
    else if (choice === 2) listFiles();
    else if (choice === 3) await downloadFile();
    else if (choice === 4) await sendDatabaseBackup();
    else if (choice === 5) await deleteFile();
    else if (choice === 6) process.exit();
    else console.log("❌ Pilihan tidak valid.");
  }
}

// ================= START =================
(async () => {
  await initDB();
  mainMenu();
})();
