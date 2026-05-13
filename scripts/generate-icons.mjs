/**
 * NutriCoach — PWA Icon Generator
 * Run: node scripts/generate-icons.mjs
 *
 * Generates all required PWA icons from SVG source using sharp.
 * Design: Premium dark background + teal "N" lettermark.
 * Inspired by: WHOOP, Oura, Levels — minimalist performance aesthetic.
 */

import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = join(__dirname, '../apps/web/public/icons')

mkdirSync(ICONS_DIR, { recursive: true })

// ─── SVG Icon Design ──────────────────────────────────────────────────────────
// The "N" is constructed from pure paths (no text), so it renders
// correctly in headless sharp/libvips without system fonts.
//
// Letter N breakdown (100x100 viewBox):
//   Left vertical bar:  rect(10, 10, 17, 80)
//   Right vertical bar: rect(73, 10, 17, 80)
//   Diagonal:           polygon(27,10  44,10  73,90  56,90)

function iconSVG(size, { maskable = false, mono = false, badge = false } = {}) {
  const r = maskable ? 0 : Math.round(size * 0.22)

  if (badge) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="24" fill="#0b9aa0"/>
  <rect x="10" y="10" width="17" height="80" rx="2" fill="#fff"/>
  <rect x="73" y="10" width="17" height="80" rx="2" fill="#fff"/>
  <polygon points="27,10 44,10 73,90 56,90" fill="#fff"/>
</svg>`
  }

  if (mono) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${r}" fill="#000"/>
  <rect x="10" y="10" width="17" height="80" rx="2" fill="#fff"/>
  <rect x="73" y="10" width="17" height="80" rx="2" fill="#fff"/>
  <polygon points="27,10 44,10 73,90 56,90" fill="#fff"/>
</svg>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#131920"/>
      <stop offset="100%" stop-color="#0d1117"/>
    </linearGradient>
    <linearGradient id="n" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#1be8f5"/>
      <stop offset="100%" stop-color="#0b9aa0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="100" height="100" rx="${r}" fill="url(#bg)"/>

  <!-- Ambient glow ring -->
  <circle cx="50" cy="50" r="36" fill="#0b9aa0" opacity="0.07"/>

  <!-- N lettermark — geometric paths, no text rendering required -->
  <rect x="10" y="10" width="17" height="80" rx="2" fill="url(#n)"/>
  <rect x="73" y="10" width="17" height="80" rx="2" fill="url(#n)"/>
  <polygon points="27,10 44,10 73,90 56,90" fill="url(#n)"/>

  <!-- Subtle border ring (non-maskable only) -->
  ${!maskable ? `<rect x="1" y="1" width="98" height="98" rx="${r - 1}" fill="none" stroke="#0b9aa0" stroke-width="1" opacity="0.18"/>` : ''}
</svg>`
}

// ─── Favicon SVG (for <link rel="icon" type="image/svg+xml">) ─────────────────

const faviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#0d1117"/>
  <circle cx="50" cy="50" r="36" fill="#0b9aa0" opacity="0.07"/>
  <rect x="10" y="10" width="17" height="80" rx="2" fill="#1be8f5"/>
  <rect x="73" y="10" width="17" height="80" rx="2" fill="#1be8f5"/>
  <polygon points="27,10 44,10 73,90 56,90" fill="#1be8f5"/>
</svg>`

// ─── Generate PNG from SVG ────────────────────────────────────────────────────

async function makePNG(svgString, outputPath, size) {
  await sharp(Buffer.from(svgString))
    .resize(size, size)
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toFile(outputPath)
  console.log(`  ✓ ${outputPath.split('/').slice(-3).join('/')}`)
}

// ─── Icon manifest ────────────────────────────────────────────────────────────

async function main() {
  console.log('\nNutriCoach — Generating PWA Icons\n')

  // Standard icons
  const standardSizes = [16, 32, 48, 72, 96, 128, 192, 256, 384, 512]
  for (const size of standardSizes) {
    await makePNG(iconSVG(size), join(ICONS_DIR, `icon-${size}.png`), size)
  }

  // Apple Touch Icon (180x180 — must be plain square, no transparency)
  await makePNG(iconSVG(180), join(ICONS_DIR, 'apple-touch-icon.png'), 180)

  // Maskable icons (full-bleed, background covers safe zone)
  await makePNG(iconSVG(192, { maskable: true }), join(ICONS_DIR, 'icon-maskable-192.png'), 192)
  await makePNG(iconSVG(512, { maskable: true }), join(ICONS_DIR, 'icon-maskable-512.png'), 512)

  // Monochrome icons (for notification badges, PWA splash)
  await makePNG(iconSVG(192, { mono: true }), join(ICONS_DIR, 'icon-mono-192.png'), 192)

  // Badge icon for Android notifications (72x72)
  await makePNG(iconSVG(72, { badge: true }), join(ICONS_DIR, 'badge-72.png'), 72)

  // Write favicon.svg
  writeFileSync(join(ICONS_DIR, 'favicon.svg'), faviconSVG)
  console.log(`  ✓ icons/favicon.svg`)

  console.log('\n✅ All icons generated successfully!\n')
  console.log('Icons directory:', ICONS_DIR)
  console.log('Next steps: Update manifest.json icon references if needed.\n')
}

main().catch((err) => {
  console.error('❌ Icon generation failed:', err)
  process.exit(1)
})
