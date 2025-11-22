# Time Tracker Extension for ChurchTools

A comprehensive time tracking tool for church employees built as a ChurchTools extension.

## Features

### 📊 Dashboard View
- **Clock In/Out**: Start and stop timer for tracking current work sessions
- **Real-time Timer**: Live updating display showing current work duration
- **Quick Statistics**: Overview of total hours, expected hours, and overtime
- **Recent Entries**: View your most recent time entries at a glance

### 📝 Time Entries View
- **Manual Entries**: Add time entries for past dates with custom start/end times
- **Date Range Filters**: Filter entries by specific date ranges
- **Category Filters**: View entries by work category
- **Export to CSV**: Download your time entries for external reporting
- **Detailed Table**: View all entries with date, time, duration, category, and type

### 📈 Reports View
- **Custom Period Selection**: Choose any date range for reporting
- **Overtime Calculation**: Automatic calculation based on configured work hours
- **Category Breakdown**: Visual representation of time distribution across categories
- **Progress Bars**: Color-coded bars showing time spent per category
- **Summary Statistics**: Total worked hours, expected hours, and overtime/undertime

### ⚙️ Admin Settings
- **Work Categories Management**: Create, edit, and delete work categories
- **Custom Colors**: Assign unique colors to each category for visual distinction
- **Default Hours Configuration**: Set standard hours per day and per week
- **Category Validation**: Ensures proper formatting and uniqueness of category identifiers

## Architecture

### Data Storage
The extension uses ChurchTools' key-value store (Custom Module Data) to persist:
- **Time Entries**: All clock-in/out and manual time entries with user association
- **Work Categories**: Configurable categories for different types of work
- **Settings**: Default work hours for overtime calculation

### Entry Points
1. **Main Module** (`main.ts`): Primary time tracking interface with dashboard, entries, and reports
2. **Admin Panel** (`admin.ts`): Configuration interface for managing settings and categories

## Development Setup

### Prerequisites
- Node.js (v14 or higher)
- A ChurchTools instance for testing
- ChurchTools user account with appropriate permissions

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Edit `.env` file and add your ChurchTools credentials:
```env
VITE_KEY=timetracker
VITE_BASE_URL=https://yourchurch.church.tools
VITE_USERNAME=your-username
VITE_PASSWORD=your-password
VITE_BUILD_MODE=simple
```

3. Start development server:
```bash
npm run dev
```

The extension will be available at `http://localhost:5173` with hot-reload enabled.

### Building for Production

```bash
npm run build
```

### Creating Deployment Package

```bash
npm run deploy
```

This creates a ZIP file that can be uploaded to ChurchTools.

## Usage

### For Users

**Clocking In:**
1. Navigate to the Time Tracker module
2. Select a work category
3. Optionally add a description
4. Click "Clock In"

**Clocking Out:**
1. Click "Clock Out" when finished working
2. Your time entry is automatically saved

**Adding Manual Entries:**
1. Go to "Time Entries" tab
2. Click "Add Manual Entry"
3. Fill in start/end times, category, and description
4. Click "Save Entry"

**Viewing Reports:**
1. Go to "Reports" tab
2. Select date range
3. View statistics and category breakdown
4. Export to CSV if needed

### For Administrators

**Configuring Default Hours:**
1. Go to Admin settings
2. Set "Default Hours per Day"
3. Set "Default Hours per Week"
4. Click "Save General Settings"

**Managing Work Categories:**
1. Click "Add Category" to create new categories
2. Edit existing categories by clicking "Edit"
3. Delete unused categories as needed
4. Each category requires a unique ID, display name, and color

## Technical Details

> **📖 Für Entwickler und KI-Assistenten:**
> Eine ausführliche technische Dokumentation mit Implementierungsdetails, bekannten Problemen und Lösungen findest du in [docs/timetracker-implementation.md](docs/timetracker-implementation.md).
> **Diese Dokumentation MUSS gelesen werden**, bevor Änderungen am Code vorgenommen werden, um bereits gelöste Probleme nicht erneut zu verursachen.

### Key Components

- **Entry Point Registry** (`src/entry-points/index.ts`): Registers all entry points
- **Main Module** (`src/entry-points/main.ts`): Core time tracking functionality (~2300 lines)
- **Admin Module** (`src/entry-points/admin.ts`): Configuration interface (~900 lines)
- **KV Store Utilities** (`src/utils/kv-store.ts`): Helper functions for data persistence

### Data Models

```typescript
interface TimeEntry {
    userId: number;
    startTime: string;  // ISO datetime - serves as unique identifier
    endTime: string | null;  // null if currently active
    categoryId: string;
    categoryName: string;
    description: string;
    isManual: boolean;
    createdAt: string;
}

interface WorkCategory {
    id: string;
    name: string;
    color: string;  // Hex color code
}

interface Settings {
    defaultHoursPerDay: number;
    defaultHoursPerWeek: number;
}
```

### Technology Stack

- **TypeScript**: Type-safe development
- **ChurchTools Extension Framework**: Built on official boilerplate
- **ChurchTools API**: Integration via churchtoolsClient
- **Key-Value Store**: Persistent data storage in ChurchTools
- **Vite**: Build tooling and development server

## Features Status

### ✅ Implemented Features
- Clock In/Out functionality
- Manual time entry creation
- Time entry editing and deletion
- Excel import/export for bulk entries
- Category management with reassignment on deletion
- Absence tracking integration
- CSV export
- Real-time validation
- Toast notifications

### 🚧 Future Enhancement Ideas
- Approval workflow for time entries
- Team overview and reports for managers
- Break time tracking
- Project/task tagging
- Notifications for forgotten clock-outs
- Weekly/monthly summary email reports
- PDF export
- Mobile-optimized interface
- Multi-language support

## License

MIT License - See LICENSE file for details

## Author

ChurchTools Innovations GmbH

## Support

For issues and feature requests, please contact your ChurchTools administrator or visit the ChurchTools support channels.
