# PWA Icons

## Current Status
Using placeholder SVG icon (`pwa-icon.svg`) as a temporary solution.

## To Add Production Icons

Replace these files with proper PNG icons:
- `pwa-192x192.png` - 192x192px icon for Android/Chrome
- `pwa-512x512.png` - 512x512px icon for high-res displays

### Recommended Tools
1. **Figma/Canva**: Design your icon
2. **Export as PNG** at 512x512px (will auto-generate 192x192)
3. **Or use online tool**: https://realfavicongenerator.net/

### Icon Requirements
- Simple, clear design
- Works well at small sizes
- Square format (1:1 aspect ratio)
- No text smaller than 20% of icon height
- High contrast for visibility

### Quick Option
Use the PeakOps logo from your brand guidelines and export at:
- 192x192px → save as `pwa-192x192.png`
- 512x512px → save as `pwa-512x512.png`

Then replace the placeholder files in `/public/` directory.
