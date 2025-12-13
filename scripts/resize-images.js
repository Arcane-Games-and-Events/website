/**
 * Image Resize Script
 * Resizes circuit and hero images for better performance
 *
 * Usage: node scripts/resize-images.js
 */

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Configuration
const configs = [
	{
		name: 'Circuit Images',
		inputDir: path.join(projectRoot, 'static/images/circuits'),
		outputDir: path.join(projectRoot, 'static/images/circuits'),
		width: 800,
		quality: 80
	},
	{
		name: 'Hero Images',
		inputDir: path.join(projectRoot, 'static/hero_images'),
		outputDir: path.join(projectRoot, 'static/hero_images'),
		width: 500,
		quality: 80
	}
];

async function getFileSizeKB(filePath) {
	const stats = await stat(filePath);
	return (stats.size / 1024).toFixed(1);
}

async function resizeImages(config) {
	console.log(`\n📁 Processing: ${config.name}`);
	console.log(`   Input:  ${config.inputDir}`);
	console.log(`   Width:  ${config.width}px, Quality: ${config.quality}%`);
	console.log('   ---');

	const files = await readdir(config.inputDir);
	const webpFiles = files.filter((f) => f.endsWith('.webp'));

	let totalSavedKB = 0;

	for (const file of webpFiles) {
		const inputPath = path.join(config.inputDir, file);
		const outputPath = path.join(config.outputDir, file);

		const beforeSize = await getFileSizeKB(inputPath);

		// Read and resize to temp file
		const tempPath = outputPath + '.tmp';
		await sharp(inputPath)
			.resize(config.width, null, {
				fit: 'inside',
				withoutEnlargement: true
			})
			.webp({ quality: config.quality })
			.toFile(tempPath);

		// Get new size
		const afterSize = await getFileSizeKB(tempPath);
		const savedKB = parseFloat(beforeSize) - parseFloat(afterSize);
		totalSavedKB += savedKB;

		// Replace original with resized version
		const fs = await import('fs/promises');
		await fs.rename(tempPath, outputPath);

		const savedPercent = ((savedKB / parseFloat(beforeSize)) * 100).toFixed(0);
		console.log(
			`   ✅ ${file}: ${beforeSize} KB → ${afterSize} KB (saved ${savedKB.toFixed(1)} KB, ${savedPercent}%)`
		);
	}

	console.log(`   ---`);
	console.log(`   Total saved: ${totalSavedKB.toFixed(1)} KB`);

	return totalSavedKB;
}

async function main() {
	console.log('🖼️  Image Resize Script');
	console.log('========================');

	let grandTotal = 0;

	for (const config of configs) {
		try {
			const saved = await resizeImages(config);
			grandTotal += saved;
		} catch (error) {
			console.error(`❌ Error processing ${config.name}:`, error.message);
		}
	}

	console.log('\n========================');
	console.log(`🎉 Total saved: ${grandTotal.toFixed(1)} KB (${(grandTotal / 1024).toFixed(2)} MB)`);
}

main().catch(console.error);
