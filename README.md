# 🎅 Santa Run

Endless runner game featuring Santa Claus. Jump over snowmen, collect gifts, and chase high scores!

**Mobile-first** • **PWA installable** • **No build step**

## How to Play
- **Tap / Click / Space / ↑** to jump
- Collect floating **gifts** (+15 points)
- Avoid the **snowmen**
- Survive as long as you can — speed increases over time

## Deploy (ready in 30 seconds)

### Option 1 – Netlify Drop (easiest)
1. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag & drop this entire `santa-run` folder
3. Done — instant live URL

### Option 2 – Vercel
```bash
npx vercel --prod
```

### Option 3 – GitHub Pages
1. Create a new repo
2. Upload all files
3. Settings → Pages → Deploy from main branch

### Option 4 – Any static host
Just upload the folder contents. Works on:
- Cloudflare Pages
- Firebase Hosting
- Surge.sh (`npx surge`)
- Your own server / S3 / etc.

## Local test
```bash
# Any static server
npx serve .
# or
python3 -m http.server 3000
```
Then open http://localhost:3000

## Features
- Smooth canvas renderer
- Touch + keyboard controls
- Local high score
- Falling snow + particle effects
- Progressive difficulty
- Installable as PWA (Add to Home Screen on mobile)
- Works offline after first load

Made with ❤️ for the holidays.
