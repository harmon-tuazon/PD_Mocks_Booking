#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying build integrity...');

const distPath = path.join(__dirname, '..', 'frontend', 'dist');
const indexPath = path.join(distPath, 'index.html');
const assetsPath = path.join(distPath, 'assets');

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.error('❌ Build failed: dist directory does not exist');
  process.exit(1);
}

// Check if index.html exists
if (!fs.existsSync(indexPath)) {
  console.error('❌ Build failed: index.html does not exist');
  process.exit(1);
}

// Check if assets directory exists
if (!fs.existsSync(assetsPath)) {
  console.error('❌ Build failed: assets directory does not exist');
  process.exit(1);
}

// Verify index.html content
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Check for production build indicators
const hasProductionScript = indexContent.includes('type="module"') &&
                           indexContent.includes('/assets/') &&
                           indexContent.includes('.js');

const hasProductionCSS = indexContent.includes('/assets/') &&
                        indexContent.includes('.css');

if (!hasProductionScript) {
  console.error('❌ Build failed: index.html missing production JavaScript references');
  console.log('Index.html content preview:', indexContent.substring(0, 500));
  process.exit(1);
}

if (!hasProductionCSS) {
  console.error('❌ Build failed: index.html missing production CSS references');
  console.log('Index.html content preview:', indexContent.substring(0, 500));
  process.exit(1);
}

// Count assets
const assetFiles = fs.readdirSync(assetsPath);
const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
const cssFiles = assetFiles.filter(f => f.endsWith('.css'));

if (jsFiles.length === 0) {
  console.error('❌ Build failed: No JavaScript files found in assets');
  process.exit(1);
}

if (cssFiles.length === 0) {
  console.error('❌ Build failed: No CSS files found in assets');
  process.exit(1);
}

console.log('✅ Build verification passed!');
console.log(`📁 Assets found: ${jsFiles.length} JS files, ${cssFiles.length} CSS files`);
console.log('📄 index.html contains proper production references');

// Output build summary
console.log('\n📊 Build Summary:');
console.log(`   Dist size: ${fs.readdirSync(distPath).length} files`);
console.log(`   Assets: ${assetFiles.length} files`);
console.log(`   Index.html size: ${(indexContent.length / 1024).toFixed(2)}KB`);

process.exit(0);