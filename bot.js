require("dotenv").config();
const { Telegraf } = require("telegraf");
const express = require("express");

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

const welcomeMessages = [
  "Selamat datang, {name}! 🎉 Jangan lupa baca aturan grup ya!",
  "Hai {name}, selamat bergabung! Semoga betah di sini. 😃",
  "Hajimemashite {name}-san! よろしくね! 🌸",
  "Welcome {name}! Hope you enjoy your stay! 😊",
  "Halo {name}, siap untuk petualangan baru? 🚀",
  "Sugoi! {name} baru saja join. Let’s have fun! ✨",
  "We’ve got a new nakama! Welcome aboard, {name}! ⚓",
  "Wah, ada member baru! {name}, jangan malu-malu ya! 🤗",
  "Yo {name}, let’s rock this group! 🤘",
  "A wild {name} has appeared! Let's catch up! 🎮",
  "Bienvenido, {name}! Hope you have a great time! 🇪🇸",
  "Konnichiwa {name}! いっしょに楽しもうね! 🏯",
  "Yokoso, {name}! May your journey here be legendary! 🌟",
  "Assalamu’alaikum, {name}! Semoga nyaman di sini. 🤲",
  "Welcome to the jungle, {name}! 🌿🐍",
  "Ciee, {name} gabung! Jangan lupa traktir bakso! 🍜",
  "Hi {name}! Let's create some amazing memories together! 🎭",
  "Finally! {name} has joined the squad! 🛡️⚔️",
  "Hello {name}, are you ready to embark on a new adventure? 🌎",
  "Selamat datang di dunia baru, {name}! 🚀✨",
  "Panggil aku senpai, {name}-chan! 😆",
  "Welcome {name}, enjoy your stay and don’t be a stranger! 🏡",
  "Wow, {name} is here! Time to celebrate! 🎉🥳",
  "One of us! One of us! Welcome, {name}! 🤖",
  "Ding-dong! {name} has entered the chat! 🛎️",
  "Lah, kok baru join sekarang, {name}? Telat 100 tahun! 😆",
  "Moshi moshi, {name}-san! Let’s have fun! ☎️",
  "Super saiyan {name} has arrived! 💥🔥",
  "Finally, a worthy opponent! Welcome, {name}! ⚔️",
  "Behold! {name} has arrived to claim their destiny! 👑",
  "Banzai! {name}-san telah tiba! 🎌",
  "He who knocks has entered! Welcome, {name}! 🚪",
  "Ah, {name}! I’ve been expecting you! 🧐",
  "Hey {name}, watch out for the trolls! 👹",
  "Let’s roll the dice! {name} has joined! 🎲",
];

const exitMessages = [
  "Selamat tinggal, {name}! Semoga sukses di luar sana! 👋",
  "Yah, {name} keluar 😢 Semoga kita bertemu lagi!",
  "Bye, {name}! Jangan lupa mampir lagi nanti! 😊",
  "Sayonara {name}-san! さようなら! 🌸",
  "Goodbye {name}, may the force be with you! 🌌",
  "Nani?! {name} sudah pergi? 😭",
  "Parting is such sweet sorrow... Goodbye {name}! 🎭",
  "We lost a good one today... Farewell {name}. 🕊️",
  "May your journey be safe, {name}! 🚢",
  "Oh no, {name} left! Who will tell the tales now? 📖",
  "Adiós {name}! Hope to see you again! 🇪🇸",
  "Auf Wiedersehen, {name}! 🏰",
  "Another chapter ends... Farewell {name}! 📚",
  "Keep moving forward, {name}! 🚀",
  "Gone, but not forgotten... Goodbye {name}! 😔",
  "Puff! {name} disappeared like a ninja! 🥷",
  "Like a fleeting dream, {name} is gone... 💭",
  "Don't cry because it's over, smile because it happened, {name}! 😊",
  "The adventure continues elsewhere, goodbye {name}! ⚔️",
  "Good luck in the real world, {name}! 🍀",
  "Boom! {name} has left the server! 💥",
  "Hasta la vista, {name}! 🤖",
  "May the odds be ever in your favor, {name}! 🏹",
  "Off you go, {name}! Spread your wings! 🕊️",
  "Arigatou {name}-san! Sampai jumpa lagi! 🏯",
];

// Welcome & Exit Messages
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

// Moderation Commands
const restrictMember = async (ctx, canSend) => {
  const user = ctx.message.reply_to_message?.from;
  if (!user) return ctx.reply("Balas pesan pengguna yang ingin diubah statusnya.");

  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, user.id, { can_send_messages: canSend });
    ctx.reply(`${canSend ? "🔊 Unmute" : "🔇 Mute"} berhasil untuk ${user.first_name}.`);
  } catch {
    ctx.reply("Gagal memproses permintaan.");
  }
};

bot.command("mute", (ctx) => restrictMember(ctx, false));
bot.command("unmute", (ctx) => restrictMember(ctx, true));

bot.command("ban", async (ctx) => {
  const user = ctx.message.reply_to_message?.from;
  if (!user) return ctx.reply("Balas pesan pengguna yang ingin diban.");

  try {
    await ctx.telegram.kickChatMember(ctx.chat.id, user.id);
    ctx.reply(`🚫 ${user.first_name} telah dibanned.`);
  } catch {
    ctx.reply("Gagal memproses ban.");
  }
});

bot.command("unban", async (ctx) => {
  const user = ctx.message.reply_to_message?.from;
  if (!user) return ctx.reply("Balas pesan pengguna yang ingin diunban.");

  try {
    await ctx.telegram.unbanChatMember(ctx.chat.id, user.id);
    ctx.reply(`✅ ${user.first_name} telah diunban.`);
  } catch {
    ctx.reply("Gagal memproses unban.");
  }
});

bot.command("kick", async (ctx) => {
  const user = ctx.message.reply_to_message?.from;
  if (!user) return ctx.reply("Balas pesan pengguna yang ingin dikick.");

  try {
    await ctx.telegram.kickChatMember(ctx.chat.id, user.id);
    await ctx.telegram.unbanChatMember(ctx.chat.id, user.id);
    ctx.reply(`👢 ${user.first_name} telah dikick.`);
  } catch {
    ctx.reply("Gagal memproses kick.");
  }
});

// Pesan Otomatis dengan Interval Acak (30 menit - 8 jam)
const periodicMessages = [
  "Selamat pagi, teman-teman! ☀️ Jangan lupa minum kopi! ☕",
  "Yo! Sudah waktunya stretching biar nggak pegel! 💪",
  "Oyasumi minna! Jangan begadang terus ya! 🌙",
  "Siang-siang begini enaknya makan apa ya? 🍜",
  "Sudah kerja keras hari ini? Jangan lupa istirahat! 😴",
  "Ding-dong! Saatnya ngopi-ngopi cantik! ☕",
  "Otw level up! Apa pencapaianmu hari ini? 🎮",
  "Jangan lupa hydrate! Minum air putih yang banyak! 💧",
  "Waktunya recharge energy! Take a deep breath... 😌",
  "Gass ngonten! Ada ide apa hari ini? 🎥",
];

const sendRandomMessage = () => {
  const randomMessage = periodicMessages[Math.floor(Math.random() * periodicMessages.length)];
  bot.telegram.sendMessage(process.env.GROUP_ID, randomMessage);

  // Menentukan interval acak antara 30 menit hingga 8 jam
  const randomInterval = Math.floor(Math.random() * (8 * 60 * 60 * 1000 - 30 * 60 * 1000 + 1)) + 30 * 60 * 1000;
  
  setTimeout(sendRandomMessage, randomInterval);
};

// Memulai pengiriman pesan pertama kali setelah 30 menit
setTimeout(sendRandomMessage, 30 * 60 * 1000);

// Start Bot
bot.launch();
console.log("Bot berjalan...");

// Server untuk Koyeb
app.get("/", (req, res) => {
  res.send("Bot Telegram berjalan...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
