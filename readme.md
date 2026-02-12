# Media Compressor - Windows Guide

Compress images and videos quickly with one click.

## Installation

1. **Double-click `install.bat`**
2. Allow Administrator access when Windows asks
3. Wait 5-10 minutes for automatic installation
4. Done!

The installer automatically installs:
- FFmpeg (video compression)
- Chocolatey (package manager) 
- Node.js (if needed)
- All required dependencies

## Test Run

After installation, the tool automatically runs a test compression on any images in the main folder.

You can also test manually:
- Put some images or videos in the `src` folder
- Double-click `compress.bat`
- Check the `dist` folder for compressed files

## How to Use

### Quick Compression
- **`compress.bat`** - Compress all media (images + videos)
- **`compress-video-hq.bat`** - Compress only videos in high quality
- **`clean-and-compress.bat`** - Delete old compressed files, then compress everything

### Custom Folders (Optional)

You can create `dirs.json` to use different source folders:

```json
[
  {
    "name": "photos",
    "src": "C:/Users/YourName/Pictures",
    "dist": "C:/Users/YourName/Pictures/compressed"
  },
  {
    "name": "downloads", 
    "src": "C:/Users/YourName/Downloads"
  }
]
```

Then use: `node includes/index.js --config photos`

If no `dist` is specified, files go to `src/compressed/`

### What Gets Compressed

**Images:** PNG, JPG, JPEG, WebP, TIFF, BMP
- Resized to max 2000px height
- Quality optimized for smaller file size
- Original files stay untouched

**Videos:** MP4, AVI, MOV, MKV, WebM, M4V  
- Converted to efficient MP4 format
- 3 quality levels available
- Audio preserved

## Manual Commands

Open Command Prompt in the project folder and run:

```bash
# Compress everything
node includes/index.js

# Compress only images
node includes/index.js --images-only

# Compress only videos  
node includes/index.js --video-only

# High quality videos
node includes/index.js --video-only --high-quality

# Use custom folder
node includes/index.js --config photos

# Clean output folder first
node includes/index.js --clean
```

## Uninstall

**Double-click `uninstall.bat`** to completely remove everything.

**This will delete:**
- FFmpeg and Chocolatey from your system
- All npm dependencies
- All compressed files in dist/ folders
- Environment variables

**Type "DELETE EVERYTHING" to confirm removal.**

**Your original files in src/ folders are never deleted.**

## Troubleshooting

**Error messages?** 
- Make sure you ran `install.bat` as Administrator
- Try running `uninstall.bat` then `install.bat` again

**Compressed files too large?**
- Try: `node includes/index.js --video-only --low-quality`

**Need to compress specific folders?**
- Edit `custom-directories.json` with your folder paths
- Use `--config foldername` option

---

**Simple usage:** Put files in `src/` → Double-click `compress.bat` → Get compressed files in `dist/`