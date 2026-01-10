# 🚀 Quick Start Guide

## Get Your Spider-Man Villain Timeline Running in 10 Minutes

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

### Step 3: Build the Project
```bash
npm run build
```

**What this does:**
- Compiles TypeScript to JavaScript
- Validates all code types
- Creates `dist/` directory with compiled files

### Step 4: Run the Complete Pipeline (5-10 minutes)

The **easiest way** to run everything is with one command:

```bash
# Quick test: scrape, process, merge, and publish 5 issues
npm run pipeline -- --series "Untold Tales of Spider-Man Vol 1" --issues 1-5

# Or use any series with full workflow
npm run pipeline -- --series "Amazing Spider-Man Vol 1" --issues 1-20
```

**What this does:**
1. **Scrapes** raw data from Marvel Fandom
2. **Processes** raw data into villain datasets  
3. **Merges** all series into combined outputs
4. **Publishes** files to `public/data/` for web serving

**Expected output:**
```
======================================================================
SPIDER-MAN VILLAIN TIMELINE - COMPLETE PIPELINE
======================================================================

📍 STEP 1: SCRAPE
   Series: Untold Tales of Spider-Man Vol 1
   Issues: 1-5 (5 total)

🕷️  Starting Marvel Fandom scraper...
[... scraping issues ...]
✓ Scraped 5 issues

📍 STEP 2: PROCESS
📖 Reading raw data...
✓ Validation passed: 11 villains, 5 timeline entries
✓ Saved processed data

📍 STEP 3: MERGE
🔀 Merging series datasets...
✓ Merged 4 dataset(s)

📍 STEP 4: PUBLISH
📤 Publishing data files...
✓ Published 10 file(s)

======================================================================
✅ PIPELINE COMPLETE!
======================================================================
```

### Step 5: Start the Web Server (10 seconds)
```bash
npm run serve
```
Then visit: **http://localhost:8000**

You should see:
- 📊 Statistics panel (total villains, most frequent, etc.)
- 📈 Interactive timeline chart
- 🦹 Searchable villain index
- 📱 Responsive design

---

## 🎯 Common Workflows

### Run Full Pipeline with Custom Issues
```bash
# Scrape, process, merge, and publish in one command
npm run pipeline -- --series "Amazing Spider-Man Vol 1" --issues 1-50
```

### Run Individual Steps
```bash
# Step 1: Scrape raw data
npm run scrape -- --series "Amazing Spider-Man Vol 1" --issues 1-20

# Step 2: Process the raw data
npm run process -- --series "Amazing Spider-Man Vol 1" --validate

# Step 3: Merge all series
npm run merge

# Step 4: Publish to public/data
npm run publish
```

### Skip Scraping (Process Existing Data)
```bash
# If you already have raw.{Series}.json files, just process them
npm run process -- --series "Amazing Spider-Man Vol 1"
npm run merge
npm run publish
npm run serve
```

### Scrape All Supported Series
```bash
npm run pipeline -- --series "Amazing Spider-Man Vol 1" --all-series
```

---

## 📚 Available Commands

| Command | Purpose |
|---------|---------|
| `npm run pipeline` | Run entire workflow (scrape→process→merge→publish) |
| `npm run scrape` | Scrape raw data from Marvel Fandom |
| `npm run process` | Process raw data into villain datasets |
| `npm run merge` | Merge series files into combined output |
| `npm run publish` | Copy data files to public/data/ |
| `npm run serve` | Start HTTP server on port 8000 |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run test` | Run test suite |
| `npm run help` | Show CLI help for all commands |

---

## 🔧 Advanced Usage

### Custom Issue Ranges
```bash
# Single issues
npm run pipeline -- --series "Untold Tales..." --issues 1,5,10,20

# Multiple ranges
npm run pipeline -- --series "Untold Tales..." --issues 1-10,15-20

# Full series (no --issues flag)
npm run pipeline -- --series "Amazing Spider-Man Annual Vol 1"
```

### Process with Validation
```bash
npm run process -- --series "Amazing Spider-Man Vol 1" --validate
```

### Merge Specific Pattern
```bash
npm run merge -- --inputs "villains.Amazing*.json"
```

### Show CLI Help
```bash
npm run help
```
Displays detailed help for all commands and arguments.

---

## ⚠️ Troubleshooting

### Command not found: npm
**Solution:** Install Node.js from https://nodejs.org/

### Pipeline freezes at a specific issue
- This is typically a network timeout
- Stop the process (Ctrl+C)
- Check your internet connection
- Try running individual commands instead

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
- Did the pipeline complete without errors?
- Does `data/villains.json` exist?
- Run `npm run serve` and check browser console (F12)
- Try clearing cache (Ctrl+Shift+Delete)

### Port 8000 already in use
```bash
# Use a different port
npm run serve -- --port 8080
# Then visit http://localhost:8080
```

---

## 📖 Documentation

When you need help:

| Question | Read This |
|----------|-----------|
| How do I use this? | README.md |
| How does it work? | docs/ARCHITECTURE.md |
| What's new? | docs/CHECKPOINT_2_COMPLETION.md |
| How do I write code? | docs/CODE_GUIDELINES.md |
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
