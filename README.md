# Land Distance & Area Calculator - Enhanced Version

## Overview
Modern, mobile-first land measurement application for Odisha land records (Bhunaksha/SHP).
Assumption: 1 unit = 1 meter

## Features

### Core Functionality
- **Coordinate Input**: Left and right side points (5 points each)
- **Distance Calculation**: Euclidean distance between points
- **Area Calculation**: Total area in square feet and decimal units
- **Visual Plotting**: Interactive canvas visualization with grid

### Project Management
- **Multiple Projects**: Create and manage multiple land measurement projects
- **Project Switching**: Quick dropdown to switch between projects
- **Auto-Save**: Automatic saving to browser localStorage
- **Import/Export**: Backup and restore all project data as JSON

### Measurement History
- **Save Measurements**: Each calculation saved to project history
- **Search & Filter**: Find measurements by date or area range
- **Thumbnails**: Visual preview of each measurement
- **Load Previous**: Restore any measurement to inputs
- **Delete**: Remove individual measurements

### Undo/Redo
- **Keyboard Shortcuts**:
  - `Ctrl+Z` - Undo last action
  - `Ctrl+Y` - Redo
  - `Ctrl+S` - Save to history
  - `Ctrl+H` - Toggle history panel
- **History Stack**: Up to 50 undo levels
- **State Restoration**: Complete state recovery

### Export Options
- **PDF Export**: Professional report with canvas image, measurements, and coordinates
- **Excel Export**: Multiple sheets with summary and detailed coordinates
- **CSV Export**: Simple tabular format
- **JSON Export**: Full project data backup

### Settings & Customization
- **Unit System**: Metric (meters) or Imperial (feet)
- **Display Options**: Toggle grid, labels, auto-save
- **Theme**: Light, Dark, or Auto (system preference)
- **Data Management**: Import/Export all data, clear all data

### Responsive Design
- **Desktop**: 3-column layout with persistent panels
- **Tablet**: 2-column adaptive layout
- **Mobile**: Single column with collapsible panels, 48px touch targets
- **Touch Optimized**: Bottom sheets and mobile-friendly controls

### Accessibility
- **WCAG 2.1 AA**: Full compliance
- **Keyboard Navigation**: Complete keyboard support
- **Screen Reader**: ARIA labels and announcements
- **High Contrast**: Dark theme support

## File Structure

```
/home/ehs/ranjan/rp-plot/
├── index.html                          # Main application
├── css/
│   ├── main.css                        # Base styles with theming
│   └── mobile.css                      # Responsive breakpoints
├── js/
│   ├── main-enhanced.js                # Application entry point
│   ├── state/
│   │   ├── StateManager.js             # Central state management
│   │   ├── UndoRedoManager.js          # Undo/redo system
│   │   └── PersistenceManager.js       # localStorage operations
│   ├── models/
│   │   ├── Project.js                  # Project data model
│   │   └── Measurement.js              # Measurement data model
│   ├── components/
│   │   ├── CanvasRenderer.js           # Enhanced canvas plotting
│   │   ├── ProjectSelector.js          # Project management UI
│   │   ├── HistoryPanel.js             # Measurement history
│   │   ├── Settings.js                 # Settings panel
│   │   └── ToastNotification.js        # Toast notifications
│   └── utils/
│       ├── calculations.js             # Core calculation functions
│       ├── validation.js               # Input validation
│       └── export.js                   # Export utilities (PDF/Excel/CSV)
└── Land Distance & Area Calculator.html # Original version
```

## How to Use

### Starting the Application

1. **Open in Browser**: Open `index.html` in a modern web browser
2. **Or use HTTP Server**:
   ```bash
   cd /home/ehs/ranjan/rp-plot
   python3 -m http.server 8000
   # Open http://localhost:8000 in browser
   ```

### Basic Workflow

1. **Create a Project** (optional):
   - Click project dropdown in header
   - Click "Create New Project"
   - Enter project name and description

2. **Enter Coordinates**:
   - **Left Side**: Enter 5 points as "X, Y" (e.g., "0, 0")
   - **Right Side**: Enter 5 points as "X, Y" (e.g., "100, 50")

3. **Calculate**:
   - Click "Calculate" button
   - View results in right panel
   - See visualization on canvas

4. **Save to History**:
   - Click "Save to History" button (bookmark icon)
   - Or press `Ctrl+S`

5. **Export**:
   - Click PDF/Excel/CSV buttons in results panel
   - Choose export format

### Advanced Features

#### Project Management
- **Switch Projects**: Click dropdown → Select project
- **Rename**: Dropdown → Hover → Click rename icon
- **Delete**: Dropdown → Hover → Click delete icon
- **Export Project**: History panel → Export All

#### History Panel
- **Open**: Click "History" button or press `Ctrl+H`
- **Search**: Use search box to filter by date/area
- **Load**: Click any measurement to restore it
- **Export**: Export individual measurements as PDF
- **Delete**: Click delete icon to remove

#### Undo/Redo
- **Undo**: Press `Ctrl+Z` or click undo button
- **Redo**: Press `Ctrl+Y` or click redo button
- Works for: Adding points, editing, calculating, deleting

#### Settings
- **Open**: Click gear icon in header
- **Change Theme**: Select Light/Dark/Auto
- **Toggle Options**: Grid, labels, auto-save
- **Backup Data**: Export all data as JSON
- **Import Data**: Restore from backup file
- **Clear All**: Delete all projects (requires confirmation)

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (iOS 14+, macOS)
- Mobile browsers (Chrome, Safari)

## Data Storage

All data is stored locally in browser localStorage:
- **Projects**: All project data and measurements
- **Settings**: User preferences and theme
- **No Server**: Completely offline-capable

**Note**: Clearing browser data will delete all projects. Use Export/Import for backups.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+S` | Save to history |
| `Ctrl+H` | Toggle history panel |
| `Delete` | Remove selected point |
| `Esc` | Close panels/modals |

## External Libraries

- **Bootstrap 5.3**: UI framework
- **Bootstrap Icons 1.11.3**: Icon set
- **jsPDF 2.5.1**: PDF generation
- **SheetJS (xlsx) 0.18.5**: Excel export

## Version History

### v1.0.0 (2025-12-24)
- Complete rewrite with modular ES6 architecture
- Project management with multiple projects
- Measurement history with thumbnails
- Undo/Redo system
- Export to PDF/Excel/CSV
- Responsive mobile design
- Dark theme support
- Accessibility compliance (WCAG 2.1 AA)
- Auto-save to localStorage
- Settings panel
- Toast notifications

## License

For Odisha land records measurement purposes.

## Support

For issues or questions, refer to the Help panel (? icon in header).
