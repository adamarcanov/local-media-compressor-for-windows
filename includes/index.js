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
    
    // Load custom directories from JSON config
    if (fs.existsSync('dirs.json')) {
        try {
            const directories = JSON.parse(fs.readFileSync('dirs.json', 'utf8'));
            console.log('Found dirs.json');
            
            // Check if user specified a config name via --config argument
            const configIndex = args.findIndex(arg => arg === '--config');
            if (configIndex !== -1 && args[configIndex + 1]) {
                const configName = args[configIndex + 1];
                const selectedConfig = directories.find(dir => dir.name === configName);
                if (selectedConfig) {
                    inputDir = path.resolve(selectedConfig.src);
                    outputDir = selectedConfig.dist ? path.resolve(selectedConfig.dist) : path.resolve(selectedConfig.src, 'compressed');
                    console.log(`Using config: ${configName}`);
                } else {
                    console.log(`Config "${configName}" not found. Available configs: ${directories.map(d => d.name).join(', ')}`);
                    process.exit(1);
                }
            } else {
                // Use first config as default if no specific config specified
                const defaultConfig = directories[0];
                if (defaultConfig) {
                    inputDir = path.resolve(defaultConfig.src);
                    outputDir = defaultConfig.dist ? path.resolve(defaultConfig.dist) : path.resolve(defaultConfig.src, 'compressed');
                    console.log(`Using default config: ${defaultConfig.name}`);
                }
            }
        } catch (error) {
            console.log('Error reading dirs.json:', error.message);
            console.log('Using default directories');
        }
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
    
    if (filesToProcess.length === 0) {
        console.log('No files to compress. Add some images or videos to the source folder.');
        return;
    }
    
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    const total = filesToProcess.length;
    const startTime = Date.now();

    for (const { file, type } of filesToProcess) {
        try {
            const inputPath = path.join(inputDir, file);
            
            // Show progress
            console.log(`\n[${processed + 1}/${total}] ${file} (${type})`);
            const progressPercent = Math.floor((processed / total) * 100);
            const progressBar = '='.repeat(Math.floor(progressPercent / 5)) + 
                               '-'.repeat(20 - Math.floor(progressPercent / 5));
            console.log(`Progress: [${progressBar}] ${progressPercent}%`);
            
            if (type === 'image') {
                const { originalSize, compressedSize } = await compressImage(inputPath, outputDir, file);
                totalOriginalSize += originalSize;
                totalCompressedSize += compressedSize;
            } else if (type === 'video') {
                const { originalSize, compressedSize } = await compressVideo(inputPath, outputDir, file, videoQuality);
                totalOriginalSize += originalSize;
                totalCompressedSize += compressedSize;
            }
            
            // Show running totals
            const totalSavedMB = (totalOriginalSize - totalCompressedSize) / 1024 / 1024;
            const totalReduction = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100);
            console.log(`Running total: ${(totalOriginalSize/1024/1024).toFixed(1)}MB -> ${(totalCompressedSize/1024/1024).toFixed(1)}MB (saved ${totalSavedMB.toFixed(1)}MB, ${totalReduction.toFixed(1)}%)`);
            
            successful++;
            
        } catch (error) {
            console.error(`ERROR: Failed to compress ${file} - ${error.message}`);
            failed++;
        }
        
        processed++;
    }

    const endTime = Date.now();
    const totalTime = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;

    console.log('\n=== COMPRESSION COMPLETED ===');
    console.log(`Total files: ${total}`);
    console.log(`Successful: ${successful}`);
    if (failed > 0) {
        console.log(`Failed: ${failed}`);
    }
    
    if (successful > 0) {
        const finalSavedMB = (totalOriginalSize - totalCompressedSize) / 1024 / 1024;
        const finalReduction = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100);
        console.log(`Final compression: ${(totalOriginalSize/1024/1024).toFixed(1)}MB -> ${(totalCompressedSize/1024/1024).toFixed(1)}MB`);
        console.log(`Total saved: ${finalSavedMB.toFixed(1)}MB (${finalReduction.toFixed(1)}% reduction)`);
    }
    
    console.log(`Time taken: ${minutes}m ${seconds}s`);
    
    if (successful > 0) {
        console.log(`\nCompressed files saved to: ${outputDir}`);
    }
}

async function compressImage(inputPath, outputDir, fileName) {
    const outputPath = path.join(outputDir, fileName);
    const ext = path.extname(fileName).toLowerCase();

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
        console.log(`Reduced by ${reduction}% (${(originalSize/1024/1024).toFixed(1)}MB -> ${(compressedSize/1024/1024).toFixed(1)}MB)`);
        
        return { originalSize, compressedSize };
        
    } catch (error) {
        throw new Error(`Image compression error: ${error.message}`);
    }
}

async function compressVideo(inputPath, outputDir, fileName, quality) {
    const nameWithoutExt = path.parse(fileName).name;
    const outputPath = path.join(outputDir, `${nameWithoutExt}.mp4`);

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
        console.log(`Reduced by ${reduction}% (${(originalSize/1024/1024).toFixed(1)}MB -> ${(compressedSize/1024/1024).toFixed(1)}MB)`);
        
        return { originalSize, compressedSize };
        
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
                console.log(`Reduced by ${reduction}% (${(originalSize/1024/1024).toFixed(1)}MB -> ${(compressedSize/1024/1024).toFixed(1)}MB)`);
                return { originalSize, compressedSize };
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
        console.log('   WINDOWS - EASIEST METHOD:');
        console.log('   1. Open PowerShell as Administrator');
        console.log('   2. Install Chocolatey: (copy this whole line)');
        console.log('      Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(\'https://community.chocolatey.org/install.ps1\'))');
        console.log('   3. Install FFmpeg: choco install ffmpeg');
        console.log('   4. Test: ffmpeg -version');
        console.log('');
        console.log('   macOS: brew install ffmpeg');
        console.log('   Ubuntu: sudo apt install ffmpeg');
        process.exit(1);
    }
}

// Show help
function showHelp() {
    console.log(`
MEDIA COMPRESSION TOOL - Images and Video

Usage: node index.js [options]

OPTIONS:
  --images-only      Compress images only
  --video-only       Compress videos only
  --high-quality     High quality video (CRF 18)
  --low-quality      Low quality video (CRF 28)
  --clean            Clean output directory before compression
  --config <name>    Use specific config from dirs.json
  --help             Show this help

SUPPORTED FORMATS:
  Images: PNG, JPG, JPEG, WebP, TIFF, BMP
  Video:  MP4, AVI, MOV, MKV, WebM, M4V

EXAMPLES:
  node index.js                    # Compress everything (default quality)
  node index.js --images-only      # Images only
  node index.js --video-only --high-quality  # Videos only in high quality
  node index.js --config camera    # Use "camera" config from JSON
  node index.js --clean            # Clean output folder first
  node index.js --clean --video-only  # Clean and compress videos only

CUSTOM DIRECTORIES:
  Create dirs.json to define custom source/output folders:
  [
    {
      "name": "camera",
      "src": "../../Camera uploads/",
      "dist": "../../Camera uploads/compressed"
    },
    {
      "name": "photos", 
      "src": "C:/Users/Photos",
      "dist": "C:/Users/Photos/compressed"
    },
    {
      "name": "dropbox",
      "src": "D:/Dropbox/images"
    }
  ]

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