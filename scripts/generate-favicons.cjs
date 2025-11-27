const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

(async () => {
  const src = path.resolve(__dirname, '../public/favicon-96x96.png');
  const out = path.resolve(__dirname, '../public');
  if (!fs.existsSync(src)) {
    console.error('Source image not found:', src);
    process.exit(1);
  }
  const sizes = [16, 32, 48, 96, 192, 512];
  // read source into buffer to avoid writing over the input file
  const srcBuf = fs.readFileSync(src);
  for (const s of sizes) {
    const dest = path.join(out, `favicon-${s}x${s}.png`);
    await sharp(srcBuf).resize(s, s).png().toFile(dest);
    console.log('written', dest);
  }

  // generate apple-touch-icon (180)
  await sharp(srcBuf).resize(180, 180).png().toFile(path.join(out, 'apple-touch-icon.png'));
  console.log('written apple-touch-icon.png');

  // generate android chrome icons
  await sharp(srcBuf).resize(192,192).png().toFile(path.join(out, 'android-chrome-192x192.png'));
  await sharp(srcBuf).resize(512,512).png().toFile(path.join(out, 'android-chrome-512x512.png'));
  console.log('written android icons');

  // create multi-size ICO from 16,32,48
  const png16 = await sharp(srcBuf).resize(16,16).png().toBuffer();
  const png32 = await sharp(srcBuf).resize(32,32).png().toBuffer();
  const png48 = await sharp(srcBuf).resize(48,48).png().toBuffer();

  try {
    const pngToIco = require('png-to-ico');
    const icoBuf = await pngToIco([png16, png32, png48]);
    fs.writeFileSync(path.join(out, 'favicon.ico'), icoBuf);
    console.log('written favicon.ico');
  } catch (e) {
    console.warn('png-to-ico not installed; skipping favicon.ico generation.');
  }

  console.log('favicons generated');
})();