require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");
const axios = require("axios");
const fs = require("fs").promises;
const { Low, JSONFile } = require("lowdb");

// Inisialisasi database
const adapter = new JSONFile("db.json");
const db = new Low(adapter);

async function initializeDB() {
  await db.read();
  db.data ||= { bannedUsers: [], mutedUsers: [] };
  await db.write();
}

initializeDB();

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// Pesan welcome & exit
const welcomeMessages = [
  "Selamat datang, {name}! 🎉 Jangan lupa baca aturan grup ya!",
  "Hai {name}, selamat bergabung! Semoga betah di sini. 😃",
];

const exitMessages = [
  "Selamat tinggal, {name}! Semoga sukses di luar sana! 👋",
  "Yah, {name} keluar 😢 Semoga kita bertemu lagi!",
];

bot.on("new_chat_members", (ctx) => {
  ctx.message.new_chat_members.forEach((user) => {
    const message = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)].replace("{name}", user.first_name);
    ctx.reply(message);
  });
});

bot.on("left_chat_member", (ctx) => {
  const message = exitMessages[Math.floor(Math.random() * exitMessages.length)].replace("{name}", ctx.message.left_chat_member.first_name);
  ctx.reply(message);
});

// Fungsi untuk mute/unmute
const restrictMember = async (ctx, canSend) => {
  const user = ctx.message.reply_to_message?.from;
  if (!user) return ctx.reply("Balas pesan pengguna yang ingin diubah statusnya.");

  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, user.id, { can_send_messages: canSend });

    await db.read();
    if (!canSend) {
      db.data.mutedUsers.push(user.id);
    } else {
      db.data.mutedUsers = db.data.mutedUsers.filter((id) => id !== user.id);
    }
    await db.write();

    ctx.reply(`${canSend ? "🔊 Unmute" : "🔇 Mute"} berhasil untuk ${user.first_name}.`);
  } catch (error) {
    ctx.reply("Gagal memproses permintaan.");
  }
};

bot.command("mute", (ctx) => restrictMember(ctx, false));
bot.command("unmute", (ctx) => restrictMember(ctx, true));

// Ban dan Unban dengan penyimpanan di database
bot.command("ban", async (ctx) => {
  const user = ctx.message.reply_to_message?.from;
  if (!user) return ctx.reply("Balas pesan pengguna yang ingin diban.");

  try {
    await ctx.telegram.banChatMember(ctx.chat.id, user.id);

    await db.read();
    db.data.bannedUsers.push(user.id);
    await db.write();

    ctx.reply(`🚫 ${user.first_name} telah dibanned.`);
  } catch (error) {
    ctx.reply("Gagal memproses ban.");
  }
});

bot.command("unban", async (ctx) => {
  const userId = parseInt(ctx.message.text.split(" ")[1]);
  if (!userId) return ctx.reply("Masukkan ID pengguna yang ingin diunban.");

  try {
    await ctx.telegram.unbanChatMember(ctx.chat.id, userId);

    await db.read();
    db.data.bannedUsers = db.data.bannedUsers.filter((id) => id !== userId);
    await db.write();

    ctx.reply(`✅ Pengguna dengan ID ${userId} telah diunban.`);
  } catch (error) {
    ctx.reply("Gagal memproses unban.");
  }
});

// Kick user
bot.command("kick", async (ctx) => {
  const user = ctx.message.reply_to_message?.from;
  if (!user) return ctx.reply("Balas pesan pengguna yang ingin dikick.");

  try {
    await ctx.telegram.banChatMember(ctx.chat.id, user.id);
    await ctx.telegram.unbanChatMember(ctx.chat.id, user.id);

    ctx.reply(`👢 ${user.first_name} telah dikick.`);
  } catch (error) {
    ctx.reply("Gagal memproses kick.");
  }
});

// Konversi foto menjadi stiker
bot.on("photo", async (ctx) => {
  const fileId = ctx.message.photo.pop().file_id;
  
  try {
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    const filePath = `sticker_${Date.now()}.png`;

    const response = await axios({ url: fileUrl, responseType: "arraybuffer" });
    await fs.writeFile(filePath, response.data);

    await ctx.replyWithSticker({ source: filePath });
    await fs.unlink(filePath);
  } catch (error) {
    ctx.reply("Gagal mengonversi gambar menjadi stiker.");
  }
});

// Mulai bot
bot.launch();
console.log("Bot berjalan...");

// Setup Express untuk Koyeb
app.get("/", (req, res) => {
  res.send("Bot Telegram berjalan...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
