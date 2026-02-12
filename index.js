const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { spawn } = require('child_process');
const { promisify } = require('util');

// Promisified version of spawn for better async handling
const execFFmpeg = (args) => {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args);
        let stderr = '';
        
        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
            }
        });
        
        ffmpeg.on('error', (err) => {
            reject(new Error(`Failed to start FFmpeg: ${err.message}`));
        });
    });
};

async function compressMedia() {
    const args = process.argv.slice(2);
    let inputDir = './src';
    let outputDir = './dist';
    
    // Parse arguments
    if (args.includes('--camera')) {
        inputDir = path.resolve(__dirname, '../../Camera uploads/');
        outputDir = path.resolve(__dirname, '../../Camera uploads/compressed');
    }
    
    const imageOnly = args.includes('--images-only');
    const videoOnly = args.includes('--video-only');
    const cleanOutput = args.includes('--clean');
    const videoQuality = args.includes('--high-quality') ? 'high' : 
                        args.includes('--low-quality') ? 'low' : 'medium';

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    } else if (cleanOutput) {
        // Clean output directory if --clean flag is used
        console.log(`Cleaning output directory: ${outputDir}`);
        const files = fs.readdirSync(outputDir);
        for (const file of files) {
            const filePath = path.join(outputDir, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                fs.unlinkSync(filePath);
                console.log(`Deleted: ${file}`);
            }
        }
        console.log('Output directory cleaned.\n');
    }

    // Filter files by type
    const allFiles = fs.readdirSync(inputDir);
    const imageFiles = allFiles.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp'].includes(ext);
    });
    
    const videoFiles = allFiles.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v'].includes(ext);
    });

    let filesToProcess = [];
    if (!videoOnly) filesToProcess.push(...imageFiles.map(f => ({ file: f, type: 'image' })));
    if (!imageOnly) filesToProcess.push(...videoFiles.map(f => ({ file: f, type: 'video' })));

    console.log(`\n=== MEDIA COMPRESSION ===`);
    console.log(`Found ${imageFiles.length} images and ${videoFiles.length} videos`);
    console.log(`Processing: ${filesToProcess.length} files`);
    console.log(`Video quality: ${videoQuality.toUpperCase()}`);
    console.log(`Source directory: ${inputDir}`);
    console.log(`Output directory: ${outputDir}\n`);
    
    let processed = 0;
    const total = filesToProcess.length;

    for (const { file, type } of filesToProcess) {
        try {
            const inputPath = path.join(inputDir, file);
            
            if (type === 'image') {
                await compressImage(inputPath, outputDir, file);
            } else if (type === 'video') {
                await compressVideo(inputPath, outputDir, file, videoQuality);
            }
            
            processed++;
            
        } catch (error) {
            console.error(`Error compressing ${file}:`, error.message);
        }
    }

    console.log('\nCompression completed!');
    console.log(`Processed files: ${processed}/${total}`);
}

async function compressImage(inputPath, outputDir, fileName) {
    const outputPath = path.join(outputDir, fileName);
    const ext = path.extname(fileName).toLowerCase();

    console.log(`Compressing image: ${fileName}`);

    try {
        if (ext === '.png') {
            await sharp(inputPath)
                .resize(null, 2000, { 
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .png({ 
                    quality: 80,
                    compressionLevel: 9,
                    adaptiveFiltering: true,
                    palette: true,
                    effort: 10
                })
                .ensureAlpha()
                .toFile(outputPath);
        } else if (['.jpg', '.jpeg'].includes(ext)) {
            await sharp(inputPath)
                .resize(null, 2000, { 
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .jpeg({ 
                    quality: 80,
                    progressive: true,
                    mozjpeg: true
                })
                .toFile(outputPath);
        } else if (ext === '.webp') {
            await sharp(inputPath)
                .resize(null, 2000, { 
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .webp({ 
                    quality: 80,
                    effort: 6
                })
                .toFile(outputPath);
        } else {
            // For other formats (TIFF, BMP) convert to JPEG
            const jpegOutput = outputPath.replace(ext, '.jpg');
            await sharp(inputPath)
                .resize(null, 2000, { 
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .jpeg({ 
                    quality: 80,
                    progressive: true,
                    mozjpeg: true
                })
                .toFile(jpegOutput);
        }

        // Compare file sizes
        const originalSize = fs.statSync(inputPath).size;
        const compressedSize = fs.statSync(outputPath).size;
        const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        console.log(`   ${fileName} - reduced by ${reduction}% (${(originalSize/1024/1024).toFixed(1)}MB -> ${(compressedSize/1024/1024).toFixed(1)}MB)`);
        
    } catch (error) {
        throw new Error(`Image compression error: ${error.message}`);
    }
}

async function compressVideo(inputPath, outputDir, fileName, quality) {
    const nameWithoutExt = path.parse(fileName).name;
    const outputPath = path.join(outputDir, `${nameWithoutExt}_compressed.mp4`);

    console.log(`Compressing video: ${fileName} (quality: ${quality})`);

    // Quality settings
    const qualitySettings = {
        low: { crf: '28', preset: 'fast' },
        medium: { crf: '23', preset: 'medium' },
        high: { crf: '18', preset: 'slow' }
    };

    const { crf, preset } = qualitySettings[quality];

    try {
        const ffmpegArgs = [
            '-i', inputPath,
            '-c:v', 'libx264',           // Video codec H.264
            '-crf', crf,                 // Quality (lower value = better quality)
            '-preset', preset,           // Speed/quality compression
            '-c:a', 'aac',              // Audio codec
            '-b:a', '128k',             // Audio bitrate
            '-movflags', '+faststart',   // Streaming optimization
            '-y',                        // Overwrite output file
            outputPath
        ];

        await execFFmpeg(ffmpegArgs);

        // Compare file sizes
        const originalSize = fs.statSync(inputPath).size;
        const compressedSize = fs.statSync(outputPath).size;
        const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        console.log(`   ${fileName} - reduced by ${reduction}% (${(originalSize/1024/1024).toFixed(1)}MB -> ${(compressedSize/1024/1024).toFixed(1)}MB)`);
        
    } catch (error) {
        // Try alternative method for format problems
        if (error.message.includes('Invalid data found') || error.message.includes('moov atom not found')) {
            console.log(`   Trying alternative method for ${fileName}...`);
            
            const alternativeArgs = [
                '-i', inputPath,
                '-c:v', 'libx264',
                '-crf', crf,
                '-preset', preset,
                '-c:a', 'aac',
                '-b:a', '128k',
                '-movflags', '+faststart',
                '-avoid_negative_ts', 'make_zero',
                '-fflags', '+genpts',
                '-y',
                outputPath
            ];
            
            try {
                await execFFmpeg(alternativeArgs);
                
                const originalSize = fs.statSync(inputPath).size;
                const compressedSize = fs.statSync(outputPath).size;
                const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
                console.log(`   ${fileName} - reduced by ${reduction}% (${(originalSize/1024/1024).toFixed(1)}MB -> ${(compressedSize/1024/1024).toFixed(1)}MB)`);
            } catch (altError) {
                throw new Error(`Video compression error (both methods): ${altError.message}`);
            }
        } else {
            throw new Error(`Video compression error: ${error.message}`);
        }
    }
}

// Check dependencies
function checkDependencies() {
    const dependencies = [];
    
    // Check Sharp
    try {
        require('sharp');
    } catch (error) {
        dependencies.push('sharp (npm install sharp)');
    }
    
    // Check FFmpeg
    try {
        const { execSync } = require('child_process');
        execSync('ffmpeg -version', { stdio: 'ignore' });
    } catch (error) {
        dependencies.push('FFmpeg (https://ffmpeg.org/download.html)');
    }
    
    if (dependencies.length > 0) {
        console.error('Missing dependencies:');
        dependencies.forEach(dep => console.error(`   - ${dep}`));
        console.log('\nInstallation instructions:');
        console.log('1. Sharp: npm install sharp');
        console.log('2. FFmpeg:');
        console.log('   - Windows: Download from https://ffmpeg.org/download.html');
        console.log('   - macOS: brew install ffmpeg');
        console.log('   - Ubuntu: sudo apt install ffmpeg');
        process.exit(1);
    }
}

// Show help
function showHelp() {
    console.log(`
MEDIA COMPRESSION TOOL - Images and Video

Usage: node index.js [options]

OPTIONS:
  --camera           Use camera folder as source
  --images-only      Compress images only
  --video-only       Compress videos only
  --high-quality     High quality video (CRF 18)
  --low-quality      Low quality video (CRF 28)
  --clean            Clean output directory before compression
  --help             Show this help

SUPPORTED FORMATS:
  Images: PNG, JPG, JPEG, WebP, TIFF, BMP
  Video:  MP4, AVI, MOV, MKV, WebM, M4V

EXAMPLES:
  node index.js                    # Compress everything (default quality)
  node index.js --images-only      # Images only
  node index.js --video-only --high-quality  # Videos only in high quality
  node index.js --camera           # Use camera folder
  node index.js --clean            # Clean output folder first
  node index.js --clean --video-only  # Clean and compress videos only

VIDEO QUALITY:
  --high-quality:    Best quality, largest files (CRF 18)
  default:          Medium quality (CRF 23)  
  --low-quality:    Lowest quality, smallest files (CRF 28)
`);
}

// Main function
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    
    checkDependencies();
    compressMedia().catch(console.error);
}

module.exports = { compressMedia, compressImage, compressVideo };