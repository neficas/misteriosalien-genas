import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

function drawBackground(ctx, size, radius) {
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#22D3EE')
  grad.addColorStop(1, '#8B5CF6')
  ctx.fillStyle = grad
  ctx.beginPath()
  if (radius > 0) ctx.roundRect(0, 0, size, size, radius)
  else ctx.rect(0, 0, size, size)
  ctx.fill()
}

function drawWaveform(ctx, size, scale) {
  const bars = [0.28, 0.52, 0.78, 1, 0.62, 0.4, 0.2]
  const barWidth = size * 0.06 * scale
  const gap = size * 0.045 * scale
  const totalWidth = bars.length * barWidth + (bars.length - 1) * gap
  let x = (size - totalWidth) / 2
  const centerY = size / 2
  ctx.fillStyle = '#0B0B0F'
  for (const h of bars) {
    const barHeight = size * 0.34 * scale * h
    const y = centerY - barHeight / 2
    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2)
    ctx.fill()
    x += barWidth + gap
  }
}

function icon(size, { maskable = false } = {}) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  drawBackground(ctx, size, maskable ? 0 : size * 0.22)
  drawWaveform(ctx, size, maskable ? 0.6 : 1)
  return canvas.toBuffer('image/png')
}

writeFileSync('public/icons/icon-192.png', icon(192))
writeFileSync('public/icons/icon-512.png', icon(512))
writeFileSync('public/icons/icon-maskable-512.png', icon(512, { maskable: true }))
console.log('Icons generated.')
