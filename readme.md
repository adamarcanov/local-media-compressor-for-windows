# Media Compressor - Images and Video Compression

Advanced tool for compressing images and MP4 videos using Sharp and FFmpeg. Supports multiple formats and offers different quality levels.

## Features

- **Image compression**: PNG, JPG, JPEG, WebP, TIFF, BMP
- **Video compression**: MP4, AVI, MOV, MKV, WebM, M4V
- **Multiple quality levels** for videos
- **Automatic scaling** of images to max 2000px height
- **Clean output directory** option to remove old files
- **Detailed compression statistics**
- **Flexible run options**

## Installation

**Windows:**
1. Download and extract project files to a folder (e.g., `C:\media-compressor\`)
2. Open PowerShell as Administrator
3. Install Chocolatey:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```
4. Install dependencies:
```powershell
choco install ffmpeg
cd C:\media-compressor
npm install
```

**macOS:**
```bash
# Extract project files to ~/media-compressor/
cd ~/media-compressor/
brew install ffmpeg
npm install
```

**Linux:**
```bash
# Extract project files to ~/media-compressor/
cd ~/media-compressor/
sudo apt update && sudo apt install ffmpeg
npm install
```

Done! Test with: `node index.js --help`

## Usage

### Basic usage
```bash
# Compress all files with default settings
node index.js

# Or use npm script
npm run compress
```

### Advanced options

```bash
# Compress images only
node index.js --images-only
npm run compress:images

# Compress videos only
node index.js --video-only
npm run compress:video

# Use camera folder
node index.js --camera
npm run compress:camera

# High quality video
node index.js --high-quality
npm run compress:hq

# Low quality video (smaller files)
node index.js --low-quality

# Clean output directory before compression
node index.js --clean
npm run compress:clean

# Clean output directory before compression
node index.js --clean

# Combine options
node index.js --video-only --high-quality --camera
node index.js --clean --images-only
```

### Show help
```bash
node index.js --help
npm run help
```

### Windows Batch File (Optional)

For easier usage on Windows, you can create a `.bat` file to run the compressor with a double-click:

1. Create a new file called `compress-media.bat` in your project folder
2. Add the following content (adjust paths as needed):

```batch
@echo off
echo Starting Media Compressor...
cd /d "C:\Users\YourUsername\Documents\media-compressor"
node index.js
pause
```

**Alternative with Git Bash:**
```batch
@echo off
"C:\Program Files\Git\git-bash.exe" -c "cd /c/Users/YourUsername/Documents/media-compressor && node index.js"
pause
```

**With specific options:**
```batch
@echo off
echo Compressing videos only with high quality...
cd /d "C:\Users\YourUsername\Documents\media-compressor"
node index.js --video-only --high-quality
pause
```

**Clean output directory first:**
```batch
@echo off
echo Cleaning and compressing all media...
cd /d "C:\Users\YourUsername\Documents\media-compressor"
node index.js --clean
pause
```

Replace `C:\Users\YourUsername\Documents\media-compressor` with your actual project path. The `pause` command keeps the window open so you can see the results.

## Quality Settings

### Images
- **PNG**: Lossless compression with color palette
- **JPEG**: 80% quality, progressive, MozJPEG
- **WebP**: 80% quality, effort 6
- **Other formats**: Convert to JPEG

### Video
- **Low quality** (`--low-quality`): CRF 28, preset fast
- **Medium quality** (default): CRF 23, preset medium  
- **High quality** (`--high-quality`): CRF 18, preset slow

## Folder Structure

```
project/
├── src/          # Source folder (default)
├── dist/         # Output folder (default)
├── index.js      # Main script
└── package.json  # npm dependencies
```

### Camera folder (--camera option)
```
../../Camera uploads/            # Source
../../Camera uploads/compressed/ # Output
```

## Configuration

You can modify compression settings in the `index.js` file:

### Image settings
```javascript
// PNG
.png({ 
    quality: 80,
    compressionLevel: 9,
    adaptiveFiltering: true,
    palette: true,
    effort: 10
})

// JPEG
.jpeg({ 
    quality: 80,
    progressive: true,
    mozjpeg: true
})
```

### Video settings
```javascript
const qualitySettings = {
    low: { crf: '28', preset: 'fast' },
    medium: { crf: '23', preset: 'medium' },
    high: { crf: '18', preset: 'slow' }
};
```

## Example Results

```
Compressing image: IMG_001.jpg
   IMG_001.jpg - reduced by 67.3% (8.5MB -> 2.8MB)

Compressing video: VID_002.mp4 (quality: medium)
   VID_002.mp4 - reduced by 43.2% (125.4MB -> 71.2MB)
```

## Changelog

### v2.0.0
- Added video compression (MP4, AVI, MOV, MKV, WebM, M4V)
- Multiple quality levels for video
- Improved CLI interface
- Automatic format detection
- Better error reporting

### v1.0.0
- Image compression (PNG, JPG, JPEG)
- Basic CLI options
- Image scaling

## License

MIT License - you can freely use, modify and distribute.

---

**Author:** Media Compressor Tool  
**Version:** 2.0.0  
**Node.js:** >=14.0.0 required