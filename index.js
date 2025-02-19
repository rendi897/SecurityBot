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

// Fungsi untuk mengecek apakah bot memiliki izin admin
const isBotAdmin = async (ctx) => {
  try {
    const botInfo = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
    return botInfo.status === "administrator";
  } catch (error) {
    console.error("Gagal mengecek status bot:", error);
    return false;
  }
};

// Fungsi untuk mengecek apakah user adalah admin
const isUserAdmin = async (ctx, userId) => {
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    return ["administrator", "creator"].includes(member.status);
  } catch (error) {
    console.error("Gagal mengecek status user:", error);
    return false;
  }
};

// Fungsi untuk membatasi pengguna (mute/unmute)
const restrictMember = async (ctx, canSend) => {
  const user = ctx.message.reply_to_message?.from;
  if (!user) return ctx.reply("Balas pesan pengguna yang ingin di-mute/unmute.");
  
  // Cek apakah bot adalah admin
  if (!(await isBotAdmin(ctx))) return ctx.reply("Saya bukan admin, tidak bisa mengatur pengguna.");

  // Cek apakah user adalah admin
  if (await isUserAdmin(ctx, user.id)) return ctx.reply("Tidak bisa mengubah status admin.");

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

// Fungsi untuk ban user
bot.command("ban", async (ctx) => {
  const user = ctx.message.reply_to_message?.from;
  if (!user) return ctx.reply("Balas pesan pengguna yang ingin diban.");

  if (!(await isBotAdmin(ctx))) return ctx.reply("Saya bukan admin, tidak bisa ban user.");
  if (await isUserAdmin(ctx, user.id)) return ctx.reply("Tidak bisa ban admin.");

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

// Fungsi untuk unban user
bot.command("unban", async (ctx) => {
  const userId = parseInt(ctx.message.text.split(" ")[1]);
  if (!userId) return ctx.reply("Masukkan ID pengguna yang ingin diunban.");

  if (!(await isBotAdmin(ctx))) return ctx.reply("Saya bukan admin, tidak bisa unban user.");

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

// Fungsi untuk kick user
bot.command("kick", async (ctx) => {
  const user = ctx.message.reply_to_message?.from;
  if (!user) return ctx.reply("Balas pesan pengguna yang ingin dikick.");

  if (!(await isBotAdmin(ctx))) return ctx.reply("Saya bukan admin, tidak bisa kick user.");
  if (await isUserAdmin(ctx, user.id)) return ctx.reply("Tidak bisa kick admin.");

  try {
    await ctx.telegram.banChatMember(ctx.chat.id, user.id);
    await ctx.telegram.unbanChatMember(ctx.chat.id, user.id);
    ctx.reply(`👢 ${user.first_name} telah dikick.`);
  } catch (error) {
    ctx.reply("Gagal memproses kick.");
  }
});

// Fungsi mengirim pesan random
const randomMessages = [
  "Tetap semangat, kawan! 💪",
  "Never give up! You're doing great! 🌟",
  "Yare yare, jangan lupa istirahat ya~ 😏",
  "Ayo produktif hari ini! 🚀",
  "Apakah kamu sudah minum air hari ini? 💧",
  "Shinjiru koto ga taisetsu da yo! (Percayalah, itu penting!) 🏆",
  "Santuy aja bro, jangan panik! 😎",
  "Hustle hard, stay humble! 🔥",
  "Sugoi! Kamu keren banget! ✨",
  "Gaskeun bro, jangan ragu! 🚀",
  "Bucin mode ON! ❤️",
  "Keep grinding, level up! 🎮",
  "Flex but lowkey! 💯",
  "Ganbatte! Jangan menyerah! 💪",
  "Mode wibu: ON! 🏯",
  "Panik gak tuh? 😂",
  "Ez win bro, GGWP! 🎖️",
  "Vibing like a boss! 🎶",
  "No pain, no gain! 💪",
  "Dame da ne, jangan gitu dong! 🙃",
  "Chillax, semua bakal baik-baik aja! ☕",
  "Rasengan atau Chidori? Pilih mana? ⚡",
  "Sabi banget ini mah! 😍",
  "Gokil lu bro, epic moment! 🎬",
  "Ayo glow up, masa gini terus? ✨",
  "Stay hydrated! 💧",
  "Ultra Instinct mode activated! ⚡",
  "Jutsu time! 🌀",
  "Shindeiru... Oops! 😵",
  "Henshin! Transformasi! 🔄",
  "Jangan toxic, tetap santai! ☮️",
  "Mode Nolep ON! 🖥️",
  "Luffy mode aktif! ☠️",
  "Jangan lupa makan, serius! 🍛",
  "Sultan vibes detected! 💰",
  "Apaan sih, nandayo! 🤨",
  "Bocil kematian detected! ☠️",
  "Kece badai! 🔥",
  "Tsundere spotted! 😏",
  "Minum kopi dulu, biar fokus! ☕",
  "Epic comeback is real! 🎭",
  "Final form unlocked! 🦾",
  "Mode AFK jangan aktif terus! ⏳",
  "Naruto run ke sekolah! 🏃‍♂️",
  "Don't give up, hero! 🦸‍♂️",
  "Just do it! 🏆",
  "RNG susah banget hari ini! 🎲",
  "Jangan lupa tidur yang cukup! 😴",
  "Chotto matte kudasai! 🛑",
  "Weeb alert! 🚨",
  "Auto sultan detected! 💳",
  "Big brain mode ON! 🧠",
  "Mode rebahan maximal! 🛌",
  "Epic fail bro, coba lagi! 💥",
  "Jangan malas-malasan, skuy gas! 🏃",
  "Buff dong, susah nih! 🏋️‍♂️",
  "Stay strong, warrior! ⚔️",
  "GG bro, insane play! 🔥",
  "Power up dulu! ⚡",
  "Daisuki desu! 💖",
  "Mental baja atau auto quit? 🤔",
  "Jangan AFK, bro! ⏳",
  "Anjay mabar! 🎮",
  "It's time to duel! 🃏",
  "Misi rahasia dimulai! 🤫",
  "Hype banget hari ini! 🚀",
  "Otaku power activated! 🎌",
  "Jangan salty, enjoy aja! 😊",
  "Hustle mode ON! 🏋️‍♂️",
  "Pasti menang! 🏆",
  "Wibu detected! 🔍",
  "Zetsubou shita! (Aku putus asa!) 😭",
  "AFK = auto kalah! 😵",
  "Jangan lupa recharge energi! 🔋",
  "Dame yo dame dame! 🚫",
  "Onegai shimasu! Tolong ya! 🙏",
  "Epic fight incoming! 🔥",
  "Auto mental breakdance! 🤯",
  "Kena mental nih! 😵‍💫",
  "Power level over 9000! 💥",
  "Berserk mode activated! 🛡️",
  "Let's get this bread! 🍞",
  "Jangan toxic, tetap respect! 🤝",
  "Ini sih auto GG! 🏅",
  "Time skip dulu yuk! ⏩",
  "Mending rebahan aja dah... 🛌",
  "Mode tryhard aktif! 🎯",
  "100% work, no scam! ✅",
  "Shinzo wo sasageyo! 🎵",
  "Jangan cuma wacana, action dong! 🎬",
  "Mood banget hari ini! 🎭",
  "Epic teamwork, solid! 🤜🤛",
  "Main aman atau all in? 🎲",
  "Yakin gak mau nyoba? 🤨",
  "Bucin detected! 💘",
  "Chill aja bro, easy game! 🎮",
  "Nostalgia moment detected! 🕹️",
  "Jangan lelah mengejar mimpi! 🌟"
];

const sendRandomMessage = async () => {
  const chatId = process.env.GROUP_ID;
  if (!chatId) return;

  const message = randomMessages[Math.floor(Math.random() * randomMessages.length)];
  await bot.telegram.sendMessage(chatId, message);

  const nextInterval = Math.floor(Math.random() * (10 * 60 * 60 * 1000 - 30 * 60 * 1000) + 30 * 60 * 1000);
  setTimeout(sendRandomMessage, nextInterval);
};

sendRandomMessage();

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
