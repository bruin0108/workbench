const fs = require('fs')
const path = require('path')

const distDir = path.join(__dirname, '..', 'dist')
const htmlPath = path.join(distDir, 'index.html')
let html = fs.readFileSync(htmlPath, 'utf-8')

const assetsDir = path.join(distDir, 'assets')
const files = fs.readdirSync(assetsDir)
const cssFiles = files.filter(f => f.endsWith('.css'))
const jsFiles = files.filter(f => f.endsWith('.js'))

// Inline CSS
cssFiles.forEach(f => {
  const content = fs.readFileSync(path.join(assetsDir, f), 'utf-8')
  html = html.replace(
    new RegExp(`<link[^>]*href="[^"]*${escapeRegex(f)}[^"]*"[^>]*>`, 'g'),
    `<style>${content}</style>`
  )
})

// Use esbuild to bundle JS into IIFE (no ES modules, works from file://)
const esbuild = require('esbuild')
const jsEntry = path.join(assetsDir, jsFiles.find(f => f.includes('index') && !f.includes('preload')) || jsFiles[0])
const bundlePath = path.join(assetsDir, '_bundle.js')

esbuild.buildSync({
  entryPoints: [jsEntry],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  outfile: bundlePath,
  minify: false,
})

const bundledJs = fs.readFileSync(bundlePath, 'utf-8')
fs.unlinkSync(bundlePath)

// Replace all script tags with the bundled IIFE
html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '')
html = html.replace('</head>', `<script>${bundledJs}</script></head>`)

// Clean up any remaining module preload links
html = html.replace(/<link[^>]*modulepreload[^>]*>/g, '')

const outPath = path.join(distDir, '工作台.html')
fs.writeFileSync(outPath, html, 'utf-8')
console.log(`Done: ${outPath} (${(html.length / 1024).toFixed(0)} KB)`)

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}