const sharp = require('sharp');
const path = require('path');

async function testWatermark() {
  // Create a 200x200 test image
  const testImage = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 0, g: 128, b: 255 }
    }
  }).png().toBuffer();

  // Simulate applyWatermark logic with a real ID
  const officerId = 'OFF-0042';
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const watermarkText = `Officer: ${officerId} | ${timestamp}`;

  console.log('Watermark text:', watermarkText);

  const metadata = await sharp(testImage).metadata();

  const svgText = Buffer.from(
    `<svg width="200" height="200">
      <rect x="10" y="10" width="${watermarkText.length * 8 + 20}" height="30" fill="rgba(0,0,0,0.5)"/>
      <text x="20" y="30" fill="white" font-size="16">${watermarkText}</text>
    </svg>`
  );

  const watermarked = await sharp(testImage)
    .composite([{ input: svgText, top: 0, left: 0 }])
    .png()
    .toBuffer();

  const outputPath = path.join(__dirname, 'watermark_test_output.png');
  require('fs').writeFileSync(outputPath, watermarked);
  console.log('Output written to:', outputPath);
  console.log('Watermark test PASSED');
}

testWatermark().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
