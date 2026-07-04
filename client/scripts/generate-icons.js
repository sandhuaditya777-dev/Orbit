const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient (indigo → violet, matching Orbit branding)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#4f46e5');   // indigo-600
  grad.addColorStop(1, '#7c3aed');   // violet-700
  ctx.fillStyle = grad;

  // Rounded rect (maskable safe zone = center 80%)
  const radius = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.arcTo(size, 0, size, radius, radius);
  ctx.lineTo(size, size - radius);
  ctx.arcTo(size, size, size - radius, size, radius);
  ctx.lineTo(radius, size);
  ctx.arcTo(0, size, 0, size - radius, radius);
  ctx.lineTo(0, radius);
  ctx.arcTo(0, 0, radius, 0, radius);
  ctx.closePath();
  ctx.fill();

  // Draw "O" orbit ring
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.27;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth   = size * 0.07;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Draw satellite dot
  const dotR   = size * 0.075;
  const dotAngle = -Math.PI / 4;
  const dotX   = cx + r * Math.cos(dotAngle);
  const dotY   = cy + r * Math.sin(dotAngle);
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();

  // Draw center dot
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.045, 0, Math.PI * 2);
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Generated ${path.basename(outputPath)} (${size}x${size})`);
}

const publicDir = path.join(__dirname, '..', 'public');
generateIcon(192, path.join(publicDir, 'icon-192.png'));
generateIcon(512, path.join(publicDir, 'icon-512.png'));
