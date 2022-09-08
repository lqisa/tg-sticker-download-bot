const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const JSZip = require('jszip');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const path = require('path');
const https = require('https');
const assertPath = path.resolve(__dirname, 'assets');

function getFileNameFromPath(p) {
  const winIndex = p.lastIndexOf('\\');
  const splitCharIndex = winIndex === -1 ? p.lastIndexOf('/') : winIndex;
  return splitCharIndex === -1 ? '' : p.slice(splitCharIndex + 1);
}


function downloadFile(url, targetFileStream) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      res.pipe(targetFileStream);
      targetFileStream.on('finish', () => {
        targetFileStream.close();
        console.log('Download Completed: ', url);
        resolve()
      })
    }).on('error', (e) => {
      console.error('error: ', e)
      reject('Download Error')
    })
  })
}

function convert2Gif(filePath = assertPath, fileId, suffix = 'webm') {
  return new Promise((resolve, reject) => {
    const fullFilePath = path.resolve(filePath, `${fileId}.${suffix}`);
    console.log('path: ', fullFilePath)
    ffmpeg(fullFilePath)
      // .noAudio()
      .setDuration('15')
      // .size("1280x720")
      .size('70%')
      .fps(30)
      .output(path.resolve(filePath, `${fileId}.gif`))
      // .output(ws)
      .on('error', function (err) {
        console.log('An error occurred: ' + err.message);
        reject(err)
      })
      .on('end', function () {
        console.log('Finished encoding: ', fileId);
        resolve()
      })
      .run()
  })
}

function packFile(packName, fileFullPathArr = []) {
  return new Promise(async (resolve, reject) => {
    const zip = new JSZip();

    const data = await Promise.all(fileFullPathArr.map(p =>
      stream2buffer(fs.createReadStream(p))
    )).catch(e => {
      console.log('packFile stage: convert stream to buffer error');
      reject(e)
    });

    // console.log(data);

    fileFullPathArr.forEach((p, i) => {
      const fileName = getFileNameFromPath(p);
      console.log(`pack ${fileName}...`)
      zip.file(fileName, data[i]);
    });

    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(fs.createWriteStream(path.resolve(assertPath, `${packName}.zip`))
        .on('finish', function () {
          // JSZip generates a readable stream with a "end" event,
          // but is piped here in a writable stream which emits a "finish" event.
          console.log(`package ${packName} written`);
          resolve();
        }));

  })
}


function stream2buffer(stream) {
  return new Promise((resolve, reject) => {
    const buf = [];
    stream.on("data", (chunk) => buf.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(buf)));
    stream.on("error", (err) => reject(err));
  });
}

module.exports = {
  downloadFile,
  convert2Gif,
  packFile,
  getFileNameFromPath,
}
