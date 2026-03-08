const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const WEBHOOK_URL = process.env.WEBHOOK;

async function sendDatabaseBackup() {
  try {
    const filePath = "./database.json";

    if (!fs.existsSync(filePath)) {
      console.log("❌ database.json tidak ditemukan.");
      return;
    }

    const form = new FormData();

    form.append("file", fs.createReadStream(filePath));
    form.append(
      "payload_json",
      JSON.stringify({
        content: "📦 Backup database.json",
      }),
    );

    await axios.post(WEBHOOK_URL, form, {
      headers: form.getHeaders(),
    });

    console.log("✅ database.json berhasil dikirim ke Discord webhook.");
  } catch (err) {
    console.error("❌ Gagal mengirim database:", err.message);
  }
}

module.exports = { sendDatabaseBackup };
