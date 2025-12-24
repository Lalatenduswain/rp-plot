# Quick Start Guide

## Get Started in 3 Steps

### 1. Open the Application

**Option A: Direct File**
```bash
# Simply open in your browser
open index.html
# or double-click index.html in file manager
```

**Option B: Local Server (Recommended)**
```bash
cd /home/ehs/ranjan/rp-plot
python3 -m http.server 8000

# Then open in browser:
# http://localhost:8000
```

### 2. Enter Your First Measurement

1. **Left Side Points** (Tab 1):
   ```
   Point 1: 0, 0
   Point 2: 25, 0
   Point 3: 50, 0
   Point 4: 75, 0
   Point 5: 100, 0
   ```

2. **Right Side Points** (Tab 2):
   ```
   Point 1: 0, 50
   Point 2: 25, 50
   Point 3: 50, 50
   Point 4: 75, 50
   Point 5: 100, 50
   ```

3. **Click "Calculate"**
   - View results in right panel
   - See plot on canvas

### 3. Save and Export

- **Save to History**: Click bookmark icon (or press `Ctrl+S`)
- **Export as PDF**: Click "PDF" button in results panel
- **Export as Excel**: Click "Excel" button
- **View History**: Click "History" button (or press `Ctrl+H`)

---

## Example Measurements

### Rectangular Plot (100m × 50m)
```
Left Side:          Right Side:
0, 0                0, 50
25, 0               25, 50
50, 0               50, 50
75, 0               75, 50
100, 0              100, 50

Expected Result:
- Left Distance: ~100.00 m
- Right Distance: ~100.00 m
- Area: ~53,820 sq ft (~123.6 decimal)
```

### Trapezoidal Plot (Wider at one end)
```
Left Side:          Right Side:
0, 0                0, 30
25, 0               25, 40
50, 0               50, 50
75, 0               75, 60
100, 0              100, 70

Expected Result:
- Left Distance: ~100.00 m
- Right Distance: ~107.48 m
- Area varies based on width
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+S` | Save to history |
| `Ctrl+H` | Toggle history panel |

---

## Common Tasks

### Create a New Project
1. Click project dropdown in header
2. Click "+ Create New Project"
3. Enter name (e.g., "Village Survey 2025")
4. Click "Create"

### Load Previous Measurement
1. Press `Ctrl+H` to open history
2. Click on any measurement
3. Coordinates will load into inputs
4. Modify or recalculate as needed

### Change Theme
1. Click gear icon (⚙) in header
2. Select theme: Light / Dark / Auto
3. Click "Save Settings"

### Backup Your Data
1. Open Settings (⚙ icon)
2. Click "Export All Data"
3. Save JSON file to safe location

### Restore from Backup
1. Open Settings (⚙ icon)
2. Click "Import Data"
3. Select your backup JSON file
4. Page will reload with restored data

---

## Troubleshooting

### Calculation Not Working?
- Ensure all 5 points on both sides are filled
- Format: "X, Y" (comma-separated)
- No extra spaces or characters

### History Not Saving?
- Check if auto-save is enabled in Settings
- Try pressing `Ctrl+S` manually
- Check browser localStorage isn't disabled

### Export Not Working?
- Ensure you have a calculation result first
- Check browser allows downloads
- Try different export format

### Can't See Plot?
- Try clicking "Calculate" again
- Check grid toggle in Settings
- Try zooming out on canvas

---

## File Locations

- **Application**: `/home/ehs/ranjan/rp-plot/index.html`
- **Documentation**: `/home/ehs/ranjan/rp-plot/README.md`
- **Test Report**: `/home/ehs/ranjan/rp-plot/TEST_REPORT.md`
- **Original Version**: `/home/ehs/ranjan/rp-plot/Land Distance & Area Calculator.html`

---

## Need Help?

1. Click the **?** icon in header for in-app help
2. See **README.md** for complete documentation
3. See **TEST_REPORT.md** for technical details

---

**Happy Measuring!** 📐
