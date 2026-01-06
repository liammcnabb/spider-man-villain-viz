# 🚀 Quick Start Guide

## Get Your Spider-Man Villain Timeline Running in 5 Minutes

### Step 1: Open Terminal
```bash
cd c:\Users\Dingle\Documents\spider-man-villain-timeline
```

### Step 2: Install Dependencies (2-3 minutes)
```bash
npm install
```

**What this does:**
- Installs axios (HTTP client)
- Installs cheerio (HTML parser)
- Installs d3 (visualization library)
- Installs TypeScript and development tools

### Step 3: Scrape Marvel Fandom Data (30-40 seconds)
```bash
# Scrape all issues (default: 1-441)
npm run scrape

# Or scrape specific issues:
npm run scrape -- --issues 1-20          # First 20 issues
npm run scrape -- --issues 1,5,10,20     # Specific issues only
npm run scrape -- --issues 1-20,50-60    # Multiple ranges
```

**What this does:**
- Connects to https://marvel.fandom.com
- Fetches Amazing Spider-Man Vol 1 issues (default: 1-441)
- Extracts antagonist information
- Normalizes villain names
- Calculates statistics
- Saves to `data/villains.json`
- Saves visualization config to `data/d3-config.json`

**Expected output:**
```
🕷️  Starting Marvel Fandom scraper for Amazing Spider-Man Vol 1...
   Scraping 20 issue(s): 1-20 (20 total)
Starting scrape: 20 issues (1-20)
Scraping issue 1...
Scraping issue 2...
[... 18 more issues ...]
✓ Scraped 20 issues
Processing data...
✓ Saved to data/villains.json
✓ Saved D3 config to data/d3-config.json

📊 Statistics:
   Total Villains: XX
   Most Frequent: [Villain Name] (XX appearances)
   Average Frequency: X.XX

✅ Scraping complete!
```

### Step 4: Start the Web Server (10 seconds)
```bash
npm run serve
```

**Output:**
```
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

### Step 5: Open in Browser
Visit: **http://localhost:8000**

You should see:
- 📊 Statistics panel (total villains, most frequent, etc.)
- 📈 Interactive timeline chart
- 🦹 Searchable villain index
- 📱 Responsive design

---

## 📚 What Each File Does

### Main Application Files
| File | Purpose |
|------|---------|
| `src/index.ts` | Entry point - runs the scraper |
| `src/scraper/marvelScraper.ts` | Fetches data from Marvel Fandom |
| `src/utils/dataProcessor.ts` | Cleans and organizes the data |
| `src/visualization/d3Graph.ts` | Prepares data for visualization |
| `public/script.js` | Makes the D3 chart interactive |

### Generated Files (after scraping)
| File | Content |
|------|---------|
| `data/villains.json` | All villain data (processed) |
| `data/d3-config.json` | Visualization configuration |

---

## 🔧 Other Useful Commands

### Scrape with Options
```bash
# Scrape specific issues
npm run scrape -- --issues 1-20

# Scrape specific issues only
npm run scrape -- --issues 1,5,10,20

# Scrape multiple ranges
npm run scrape -- --issues 1-20,50-60,100

# Scrape a different volume
npm run scrape -- --volume "Amazing Spider-Man Vol 2" --issues 1-58
```

### Build TypeScript to JavaScript
```bash
npm run build
```
Creates `dist/` folder with compiled JavaScript.

### Run Development Mode
```bash
npm run dev
```
Same as `npm run scrape` but with faster compilation.

### Run Tests
```bash
npm test
```
Runs the test suite to verify functionality.

---

## ⚠️ Troubleshooting

### Command not found: npm
**Solution:** Install Node.js from https://nodejs.org/

### npm install fails
```bash
npm cache clean --force
rm -r node_modules package-lock.json
npm install
```

### Scraper can't connect to Marvel Fandom
- Check your internet connection
- Check if marvel.fandom.com is accessible
- Try again (might be temporary)

### Visualization not loading
- Did `npm run scrape` complete without errors?
- Does `data/villains.json` exist?
- Check browser console for errors (F12)
- Try clearing cache (Ctrl+Shift+Delete)

### Port 8000 already in use
```bash
# Use a different port
python -m http.server 8080 --directory public
# Then visit http://localhost:8080
```

---

## 📖 Documentation

When you need help:

| Question | Read This |
|----------|-----------|
| How do I use this? | README.md |
| How does it work? | docs/ARCHITECTURE.md |
| How do I write code? | docs/GUIDELINES.md |
| How do I set it up? | docs/SETUP.md |
| What was implemented? | INITIALIZATION_CHECKLIST.md |
| What happens next? | HANDOFF.md |

---

## 📊 What You'll See

### Statistics Panel
```
Total Villains: 47
Most Frequent: Green Goblin
Appearances: 8
Avg Frequency: 2.15
```

### Timeline Chart
An interactive line graph showing:
- X-axis: Issue number (1-20)
- Y-axis: Number of distinct villains per issue
- Hover to see which villains appear in each issue

### Villain Index
```
🦹 Green Goblin
   Appearances: 8
   First Issue: 1
   In Issues: #1 #2 #3 #6 ...

🦹 Doctor Octopus
   Appearances: 4
   First Issue: 3
   In Issues: #3 #8 #12 ...

[Search to filter...]
```

---

## ✅ Verification

After running all commands, check:

- [x] `npm install` completed
- [x] `npm run scrape` finished with ✅
- [x] `data/villains.json` exists
- [x] `data/d3-config.json` exists
- [x] `npm run serve` started
- [x] http://localhost:8000 loads in browser
- [x] Statistics show numbers (not "-")
- [x] Chart displays with data points
- [x] Villain list shows villains
- [x] Search box works

---

## 🎓 Learning Path

1. **First Time?**
   - Run the commands above
   - Look at the visualization
   - Read README.md

2. **Want to Understand?**
   - Read docs/ARCHITECTURE.md
   - Look at `src/` folder
   - Try modifying colors in `style.css`

3. **Want to Extend?**
   - Read docs/GUIDELINES.md
   - Review `src/scraper/marvelScraper.ts`
   - Try changing the issue range
   - Create your own modifications

4. **Want to Master?**
   - Read all documentation
   - Review all source code
   - Add features (filters, stats, etc.)
   - Write tests
   - Deploy to a web server

---

## 🚀 Next Steps

After getting the basic version running:

1. **Customize the visualization**
   - Change colors in `src/visualization/d3Graph.ts`
   - Modify styling in `public/style.css`
   - Add new statistics

2. **Expand the data**
   - Try more issues: `npm run scrape -- --issues 1-100`
   - Try specific ranges: `npm run scrape -- --issues 1-20,50-60`
   - Add other Spider-Man series with `--volume`
   - Compare series side-by-side

3. **Enhance the analysis**
   - Add villain relationship graphs
   - Show appearance trends over time
   - Find most powerful teams
   - Track villain retirement

4. **Deploy it**
   - Upload to GitHub
   - Deploy to Netlify or Vercel
   - Share with friends!

---

## 💡 Pro Tips

1. **Use Firefox DevTools** for better D3 inspection
2. **Check the console** (F12 → Console) for helpful logs
3. **View source** to see how D3 works
4. **Inspect the JSON** files to understand the data
5. **Try edge cases** (modify issue range)
6. **Read the code comments** for implementation details

---

## ❓ Have Questions?

Check these files in order:
1. docs/SETUP.md - Installation details
2. docs/ARCHITECTURE.md - How it works
3. HANDOFF.md - Full implementation guide
4. Code comments - Implementation details

---

## 🎉 You're Ready!

Run these commands now:

```bash
cd spider-man-villain-timeline
npm install
npm run scrape
npm run serve
```

Then open **http://localhost:8000** and enjoy your Spider-Man villain timeline! 🕷️
