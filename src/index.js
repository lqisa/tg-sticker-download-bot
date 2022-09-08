const path = require('path');
const fs = require('fs');
const { Telegraf, Markup } = require('telegraf');
const Koa = require('koa')
const koaBody = require('koa-body')
const { downloadFile, convert2Gif, packFile } = require('./util');

require('dotenv').config();

const {
  BOT_TOKEN,
  PORT = 3000,
  WEBHOOK_DOMAIN,
  WEBHOOK_PATH
} = process.env

const webhookUrl = `${WEBHOOK_DOMAIN}/${WEBHOOK_PATH}`;
const webhookPath = `/${WEBHOOK_PATH}`;


const bot = new Telegraf(BOT_TOKEN, { handlerTimeout: 900_000 });
bot.telegram.setWebhook(webhookUrl)

const assertPath = path.resolve(__dirname, '../assets');

const globalInfo = {
  stickerInfo: null,
  stickerSetInfo: null,
}

// function clearGlobalInfo() {
//   globalInfo.stickerInfo = null;
//   globalInfo.stickerSetInfo = null;
// }


bot.command('start', ctx => {
  console.log(ctx.from)
  bot.telegram.sendMessage(ctx.chat.id, 'Hello 色色人!');
});

bot.help((ctx) => ctx.reply('Send me a sticker'));

bot.on('sticker', async (ctx) => {
  const stickerInfo = ctx.update.message.sticker;
  console.log(JSON.stringify(stickerInfo));

  // collect info
  const { set_name } = stickerInfo;
  globalInfo.stickerSetInfo = await ctx.telegram.getStickerSet(set_name);
  globalInfo.stickerInfo = stickerInfo;

  ctx.reply(
    'Download current single sticker or all of sticker set?',
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
  if (!globalInfo || !(globalInfo && globalInfo.stickerInfo)) return;
  const { stickerInfo: { file_id: fileId, is_video: isVideo } } = globalInfo;
  if (fileId) {
    const link = await ctx.telegram.getFileLink(fileId);
    const assertFullPath = path.resolve(assertPath, `${fileId}.webm`);
    const downloadFileWriteStream = fs.createWriteStream(assertFullPath);
    console.log('link: ', link.href)

    console.log('isVideo: ', isVideo)
    if (!isVideo) {
      ctx.reply('😂 no video sticker are not supported yet');
      return;
    }

    ctx.reply('Downloading...')
    await downloadFile(link, downloadFileWriteStream)

    ctx.reply('Converting...')
    await convert2Gif(assertPath, fileId);

    ctx.reply('packing...')
    await packFile(fileId, [path.resolve(assertPath, `${fileId}.gif`)])

    ctx.replyWithDocument({
      source: fs.createReadStream(path.resolve(assertPath, `${fileId}.zip`)),
      filename: `${fileId}.zip`,
    }).then(() => {
      fs.readdir(assertPath, (e, files) => {
        if (e) {
          console.error('failed to clear temp folder: ', e);
          return;
        }
        files.forEach(v => {
          const filePath = path.resolve(assertPath, v);
          fs.unlink(filePath, (e) => console.log(e))
        })
      })
    })
  }
});

bot.hears("😎 Download All", async (ctx) => {
  if (!globalInfo || !(globalInfo && globalInfo.stickerInfo) || !(globalInfo && globalInfo.stickerSetInfo)) return;
  const { stickerInfo: { set_name }, stickerSetInfo: { stickers } } = globalInfo;

  let _stickers = stickers;
  if (stickers.some(i => !i.is_video)) {
    ctx.reply('😂 Only video sticker are supported');
    ctx.reply('😁 try filtering video sticker...')
    _stickers = stickers.filter(i => i.is_video);
  }

  if (_stickers.length === 0) {
    ctx.reply('😂 no video sticker found')
    return;
  }

  ctx.reply('Getting stickerset urls...');
  const urls = (await Promise.all(_stickers.map(i => ctx.telegram.getFileLink(i.file_id)))).map(i => i.href);
  console.log('urls: ', urls);

  try {
    ctx.reply('Getting stickerset info...');
    await Promise.all(urls.map((url, index) => {
      const { file_id } = _stickers[index];
      const assertFullPath = path.resolve(assertPath, `${file_id}.webm`);
      const downloadFileWriteStream = fs.createWriteStream(assertFullPath);
      return downloadFile(url, downloadFileWriteStream);
    }))

    ctx.reply('Converting...')
    await Promise.all(_stickers.map(({ file_id }) => convert2Gif(assertPath, file_id)))

    ctx.reply('packing...')
    await packFile(set_name, _stickers.reduce((prev, { file_id }) => {
      prev.push(path.resolve(assertPath, `${file_id}.gif`))
      return prev;
    }, []))

    ctx.replyWithDocument({
      source: fs.createReadStream(path.resolve(assertPath, `${set_name}.zip`)),
      filename: `${set_name}.zip`,
    }).then(() => {
      fs.readdir(assertPath, (e, files) => {
        if (e) {
          console.error('failed to clear temp folder: ', e);
          return;
        }
        files.forEach(v => {
          const filePath = path.resolve(assertPath, v);
          fs.unlink(filePath, (e) => console.log(e))
        })
      })
    })

  } catch (e) {
    console.error(e);
  }
});


const app = new Koa()
app.use(koaBody())
app.use(async (ctx, next) => {
  if (ctx.method !== 'POST' || ctx.url !== webhookPath) {
    return next()
  }
  await bot.handleUpdate(ctx.request.body, ctx.response)
  ctx.status = 200
})
app.use(async (ctx) => {
  ctx.body = {
    webhookUrl: webhookUrl,
    webhookPath: webhookPath
  }
})

app.listen(3000)

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));




/**
 * for test
 */

// convert2Gif(path.resolve(__dirname, '../assets'), 'CAACAgIAAxkBAAO2YxhGI9gmdo4ptE_IMsWkplvWLvsAAkYjAAJ_XyBIOsC5u14Z').catch(e => {
//   console.log('error: ', e)
// })


// packFile(
//   'test',
//   [
//     path.resolve(__dirname, '../assets/CAACAgIAAxkBAAO2YxhGI9gmdo4ptE_IMsWkplvWLvsAAkYjAAJ_XyBIOsC5u14Z.gif'),
//     path.resolve(__dirname, '../assets/CAACAgIAAxkBAAO2YxhGI9gmdo4ptE_IMsWkplvWLvsAAkYjAAJ_XyBIOsC5u14Z.webm'),
//   ]
// );
