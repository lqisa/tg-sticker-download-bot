// const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { Telegraf, Markup } = require('telegraf');

require('dotenv').config();

const { BOT_TOKEN, PORT = 3000 } = process.env

const bot = new Telegraf(BOT_TOKEN);

const globalInfo = {
  setName: '',
  stickerSetInfo: null,
  file_id: null,
}

function clearGlobalInfo () {
  globalInfo.setName = '';
  globalInfo.stickerSetInfo = null;
  globalInfo.file_id = null
}

bot.command('start', ctx => {
  console.log(ctx.from)
  bot.telegram.sendMessage(ctx.chat.id, 'Hello 色色人!');
});

bot.help((ctx) => ctx.reply('Send me a sticker'));

bot.on('sticker', async (ctx) => {
  const stickerInfo = ctx.update.message.sticker;
  // console.log(JSON.stringify(stickerInfo));

  // collect info  
  const { set_name, file_id, file_unique_id } = stickerInfo;
  globalInfo.stickerSetInfo = await ctx.telegram.getStickerSet(set_name);
  globalInfo.setName = set_name;
  globalInfo.file_id = file_id;
  
  ctx.reply(
    'download current single sticker or all?',
    Markup.keyboard([
			["😎 Download Single"], // Row1 with 2 buttons
			["😎 Download All"], // Row2 with 2 buttons
			// ["📢 Ads", "⭐️ Rate us", "👥 Share"], // Row3 with 3 buttons
		])
			.oneTime()
			.resize(),
  );
});


bot.hears("😎 Download Single", async (ctx) => {
  // ctx.reply("Single");
  const { file_id } = globalInfo;
  if (file_id) {
    const link = await ctx.telegram.getFileLink(file_id);
    const assertPath = path.resolve(__dirname, `assets/${file_id}`);
    // fetch(link)
    //   .then(
    //     res => {
    //       new Promise((resolve, reject) => {
    //         const dest = fs.createWriteStream(assertPath);
    //         res.body.pipe(dest);
    //         res.body.on("end", () => resolve());
    //         dest.on("error", reject);
    //       })
    //     }
    //   )
    //   .then(() => {
    //     ctx.replyWithDocument({
    //       source: fs.createReadStream(assertPath),
    //       filename: `${file_id}.webm`,
    //     })
    //   })
    //   .catch(() => {
    //     ctx.reply('An error occured')
    //   })
  }
 
});
// bot.hears("😎 Download All", async (ctx) => {
//   const { setName, stickerSetInfo } = globalInfo;
//   if (setName && stickerSetInfo) {
//     const { stickers, name } = stickerSetInfo;
//     const stickerSetName = name || setName;
//     const urls = (await Promise.all(stickers.map(i => ctx.telegram.getFileLink(i.file_id)))).map(i => i.href);
//     console.log('urls: ', urls);
//   }
//   ctx.reply("All")
// });


bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// fetch('http://www.baidu.com')
//   .then(res => res.text())
//   .then(res => {
//     console.log('res: ', res)
//   })
//   .catch(e => {
//     console.log('failed to fetch', e.message)
//   })