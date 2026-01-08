# Time Tracker Extension - Feature Implementation

> **📖 Für KI-Assistenten:** Diese Datei beschreibt die implementierten Features im Detail.
>
> **Zuerst lesen:**
> - [ARCHITECTURE.md](ARCHITECTURE.md) - Kritische Design Decisions
> - [KNOWN-ISSUES.md](KNOWN-ISSUES.md) - Vermeide bekannte Probleme
>
> Diese Datei: Technical Details der Features

---

## Inhaltsverzeichnis

1. [Datenstrukturen](#datenstrukturen)
2. [Clock-In/Clock-Out](#clock-inclock-out)
3. [Manual Time Entries](#manual-time-entries)
4. [Bulk Entry mit Excel](#bulk-entry-mit-excel)
5. [Category Management](#category-management)
6. [Notification System](#notification-system)
7. [Absence Management](#absence-management) ← NEW
8. [Break Tracking](#break-tracking) ← NEW
9. [Group Access Control & Individual SOLL](#group-access-control--individual-soll) ← NEW
10. [Best Practices](#best-practices)
11. [Änderungshistorie](#änderungshistorie)

---

## Datenstrukturen

### TimeEntry Interface

**Fields:**
- `userId` (number): ChurchTools User ID
- `startTime` (string): ISO datetime, **dient auch als unique identifier**
- `endTime` (string | null): null = Eintrag läuft noch (Clock-In aktiv)
- `categoryId` (string): String-ID wie "office", "pastoral"
- `categoryName` (string): Anzeigename für UI (denormalisiert für Performance)
- `description` (string): Beschreibung der Tätigkeit
- `isManual` (boolean): true = manuell, false = Clock-in/out
- `isBreak` (boolean): true = Pause (wird nicht zu Arbeitsstunden gezählt) ← NEW (v1.6.0)
- `createdAt` (string): ISO datetime

**Why startTime as unique identifier?**
- Benutzer kann nicht zweimal zur exakt gleichen Millisekunde einstempeln
- Keine separate UUID nötig
- Bereits vorhanden in jedem Entry
- Funktioniert perfekt für Find/Update Operations

**Why categoryName denormalized?**
- Performance: Kein Lookup bei jedem Render
- UI-Freundlich: Sofort verfügbar
- Trade-off: Muss bei Category-Rename aktualisiert werden (automatisch in loadTimeEntries)

### WorkCategory Interface

**Fields:**
- `id` (string): String-ID wie "office", wird aus Name auto-generiert
- `name` (string): Anzeigename wie "Office Work"
- `color` (string): Hex-Color wie "#007bff"
- `kvStoreId` (number, optional): KV-Store ID für Updates/Deletes

**Why two IDs?**
Siehe [ARCHITECTURE.md - Design Decision #2](ARCHITECTURE.md#2-zweifache-id-verwaltung-für-kategorien)

### KV-Store Struktur

**ChurchTools Custom Module:** `timetracker`

**Categories:**
1. `timeentries` (shorty: `te`)
   - Alle TimeEntry Objekte als JSON Strings
   - Ein CustomDataValue pro Entry
   - Sortierung: Nach createdAt DESC (neueste zuerst)

2. `workcategories` (shorty: `wc`)
   - Alle WorkCategory Objekte als JSON Strings
   - Ein CustomDataValue pro Category
   - Sortierung: Nach name ASC (alphabetisch)

3. `settings` (shorty: `st`)
   - Settings Objekt als JSON String
   - Nur ein CustomDataValue
   - Zukünftige Features: Preferences, Defaults, etc.

---

## Clock-In/Clock-Out

### Feature Overview

**User Story:**
Als User möchte ich meine Arbeitszeit mit einem Klick erfassen können, ohne manuelle Zeiterfassung.

**Funktionen:**
- Clock-In Button mit Category-Auswahl
- Live-Timer zeigt laufende Zeit
- Clock-Out Button stoppt Erfassung
- Automatische Berechnung der Dauer

### State Management

**Current Entry Tracking:**
- State Variable: `currentEntry: TimeEntry | null`
- Beim Laden: Suche nach Entry mit `endTime === null`
- Wenn gefunden: Ist User bereits eingestempelt
- Timer Update wird nur gestartet wenn `currentEntry !== null`

### Clock-In Prozess

**1. Validation:**
- Prüfe: `currentEntry === null`
- Falls bereits eingestempelt: Error Toast "Already clocked in!"
- Verhindert mehrfaches Clock-In

**2. Entry Creation:**
- userId: Aktueller User (`user.id`)
- startTime: `new Date().toISOString()`
  - **WICHTIG:** Dient als unique identifier!
  - Wird später für Find/Update verwendet
- endTime: `null` (läuft noch)
- categoryId: Ausgewählte Kategorie
- categoryName: Name der Kategorie (für UI)
- description: Optional vom User (oder leer)
- isManual: `false` (Clock-in/out ist nicht manuell)
- createdAt: Current timestamp

**3. Speichern:**
- `createCustomDataValue()` mit stringified Entry
- Nach Success: `currentEntry = newEntry`
- Start Timer Update Interval
- Success Toast: "Clocked in!"

**4. UI Update:**
- Clock-In Button → disabled
- Clock-Out Button → enabled
- Timer Display → visible
- Category Badge → zeigt gewählte Category

**Location:** `main.ts` Zeilen 350-400

### Clock-Out Prozess

**1. Finding Entry:**
- **WICHTIG:** Finde Entry über `startTime` (unique identifier)
- Nicht über User ID suchen (User könnte theoretisch mehrere Entries haben)
- `timeEntries.find(e => e.startTime === currentEntry.startTime)`

**2. Update Entry:**
- Setze `endTime = new Date().toISOString()`
- **CRITICAL:** KV-Store ID muss aus rohen Daten geholt werden
- Verwende direkte API-Calls (KV-Store Bug!)
- Finde `rawEntry` mit matching `startTime`
- Verwende `rawEntry.id` als kvStoreId für Update

**3. Save:**
- `updateCustomDataValue(categoryId, kvStoreId, { value: JSON.stringify(entry) })`
- Nach Success: `currentEntry = null`
- Stop Timer Update Interval
- Reload Time Entries (um Liste zu aktualisieren)
- Success Toast: "Clocked out! Duration: X hours Y minutes"

**4. UI Update:**
- Clock-In Button → enabled
- Clock-Out Button → disabled
- Timer Display → hidden
- Entry erscheint in Time Entries Liste

**Location:** `main.ts` Zeilen 410-460

### Timer Update

**Interval Management:**
- State Variable: `timerInterval: number | null`
- Singleton Pattern: Nur ein Interval aktiv

**Start Timer:**
- Prüfe: `timerInterval === null`
- Falls bereits läuft: Return (verhindert Multiple Intervals)
- `setInterval(() => { updateTimerDisplay() }, 1000)`
- Store Interval ID für späteren Cleanup

**Update Display:**
- Finde Timer Element: `querySelector('#current-timer')`
- Falls nicht gefunden: Skip (Element nicht im DOM)
- Berechne Dauer: `now - startTime` in Millisekunden
- Formatiere mit `formatDuration()` Helper
- Update `textContent` des Elements

**Stop Timer:**
- `clearInterval(timerInterval)`
- Setze `timerInterval = null`
- Cleanup verhindert Memory Leaks

**Format Duration:**
- Input: Millisekunden
- Output: "Xh Ym" oder "Xm Ys"
- Beispiele:
  - 3661000ms → "1h 1m"
  - 90000ms → "1m 30s"
  - 5000ms → "5s"

**Location:** `main.ts` Zeilen 320-350

---

## Manual Time Entries

### Feature Overview

**User Story:**
Als User möchte ich vergangene Arbeitszeiten nachträglich erfassen können.

**Funktionen:**
- Manueller Entry Dialog
- Start/End DateTime Picker
- Category Selection
- Description Input
- Edit bestehender Entries
- Delete Entries

### Create Manual Entry

**1. Dialog öffnen:**
- Button "Add Manual Entry"
- State: `showAddManualEntry = true`
- Render Dialog mit leeren Feldern

**2. Eingabefelder:**
- Start Date: `<input type="date">`
- Start Time: `<input type="time">`
- End Date: `<input type="date">`
- End Time: `<input type="time">`
- Category: `<select>` mit allen workCategories
- Description: `<textarea>`

**3. Validation:**
- Required Fields: Start Date/Time, End Date/Time, Category
- Time Logic: End muss nach Start liegen
- Falls Fehler: Error Toast mit Details

**4. Save:**
- Combine Date + Time zu ISO String
- Create TimeEntry mit `isManual: true`
- `createCustomDataValue()`
- Success Toast: "Entry created!"
- Close Dialog
- Reload Time Entries

**Location:** `main.ts` Zeilen 500-550

### Edit Entry

**1. Select Entry:**
- Click Edit Button in Time Entries Liste
- State: `editingEntry = entry`
- State: `showAddManualEntry = true`
- Render Dialog mit pre-filled Feldern

**2. Pre-fill Fields:**
- Parse ISO Strings zurück zu Date/Time
- startTime: `2025-01-20T09:00:00.000Z`
  - → Start Date: `2025-01-20`
  - → Start Time: `09:00`
- Gleich für End Date/Time
- Category: Select matching option
- Description: Existing text

**3. Update:**
- User ändert Felder
- Validation wie bei Create
- **IMPORTANT:** Finde Original Entry via `startTime`
- KV-Store ID aus rohen Daten holen
- `updateCustomDataValue()` mit updated Entry
- Success Toast: "Entry updated!"

**Location:** `main.ts` Zeilen 550-600

### Delete Entry

**1. Confirmation:**
- Click Delete Button
- `confirm()` Dialog: "Delete this entry?"
- Falls Cancel: Return ohne zu löschen

**2. Find Entry:**
- Identifiziere Entry via `startTime` (unique)
- Lade Raw Values (direkte API-Calls!)
- Finde rawValue mit matching startTime
- Extrahiere kvStoreId

**3. Delete:**
- `deleteCustomDataValue(categoryId, kvStoreId)`
- Success Toast: "Entry deleted!"
- Reload Time Entries
- UI Update

**Location:** `main.ts` Zeilen 600-650

---

## Bulk Entry mit Excel

### Feature Overview

**User Story:**
Als User möchte ich viele Zeiteinträge auf einmal importieren können, z.B. am Ende des Monats.

**Funktionen:**
- Template Download mit Beispiel-Daten
- Excel Import mit Category Matching
- Bulk Entry Dialog zur Bearbeitung
- Validation mit detaillierten Fehlermeldungen
- Mass Save

### Template Download

**1. Pre-Check:**
- Prüfe: `workCategories.length > 0`
- Falls 0: Error Toast "No categories available. Please create categories in Admin panel first."
- Verhindert leeres Template

**2. Sheet 1: Time Entries**
- Header Row: `['Start Date', 'Start Time', 'End Date', 'End Time', 'Category ID', 'Description']`
- Beispiel Row: `['2025-01-20', '09:00', '2025-01-20', '17:00', firstCategory.id, 'Example entry']`
- Verwendet erste verfügbare Category als Beispiel

**3. Sheet 2: Available Categories**
- Header Row: `['Category Name', 'Category ID (copy this to Time Entries sheet)', 'Color']`
- Data Rows: Alle workCategories
  - Row: `[category.name, category.id, category.color]`
- **Purpose:** User kann IDs kopieren (kein Dropdown möglich - siehe ARCHITECTURE.md)

**4. Workbook Creation:**
- `XLSX.utils.book_new()` - Neues Workbook
- `XLSX.utils.book_append_sheet()` für beide Sheets
- Column Widths: 15 für bessere Lesbarkeit

**5. Download:**
- `XLSX.writeFile(workbook, filename)`
- Filename Format: `TimeTracker_Template_YYYY-MM-DD.xlsx`
- Nutzt Current Date im Filename

**Location:** `main.ts` Zeilen 700-750

### Excel Import

**1. File Selection:**
- `<input type="file" accept=".xlsx,.xls">`
- FileReader mit `readAsBinaryString()`
- onload Event: Parse Workbook

**2. Workbook Parsing:**
- `XLSX.read(data, { type: 'binary' })`
- Erstes Sheet: Time Entries
- `XLSX.utils.sheet_to_json(sheet, { header: 1 })`
  - header: 1 → Array of Arrays (nicht Objects)

**3. Pre-Import State:**
- **CRITICAL:** `bulkEntryRows = []` (clear old)
- **CRITICAL:** `showBulkEntry = true` (Dialog anzeigen!)
- Reset: `showAddManualEntry = false`
- Reset: `editingEntry = null`

**4. Row Processing:**

**Date Handling:**
- Excel speichert Datum als Serial Number
- Prüfe: `!isNaN(Number(row[0]))`
- Falls Number: `XLSX.SSF.parse_date_code(Number(row[0]))`
- Formatiere: `YYYY-MM-DD` String
- Falls bereits String: Verwende direkt

**Category Matching:**
- Input: `String(row[4]).trim()`
- **Case-insensitive:** `.toLowerCase()` für Vergleich
- Match über Name ODER ID
- Falls Match: Verwende `category.id`
- Falls kein Match: Behalte Original (Validation beim Save)

**Row Creation:**
- id: `nextBulkRowId++` (für Tracking)
- startDate, startTime, endDate, endTime: Aus Excel
- categoryId: Matched oder Original
- description: `row[5] || ''`

**5. Post-Import:**
- Render Dialog (wegen `showBulkEntry = true`)
- Success Toast: "Successfully imported X entries from Excel!"

**Location:** `main.ts` Zeilen 800-900

### Bulk Save mit Validation

**Validation Step 1: Required Fields**
- Für jede Row: Prüfe alle Date/Time Felder vorhanden
- Falls fehlt: Error Toast "All date and time fields are required"
- Return ohne zu speichern

**Validation Step 2: Time Validity**
- Konstruiere Date Objects
- `start = new Date(`${startDate}T${startTime}`)`
- `end = new Date(`${endDate}T${endTime}`)`
- Prüfe: `end > start`
- Falls nicht: Error Toast "End time must be after start time"
- Return ohne zu speichern

**Validation Step 3: Category Validity**
- Für jede Row: Suche Category in workCategories
- `workCategories.find(c => c.id === row.categoryId)`
- Falls nicht gefunden:
  - Add Row-Number zu `invalidRows` (1-indexed für User)
  - Add Category ID zu `invalidCategories` (unique)

**Detaillierte Fehlermeldung:**
```
Invalid category IDs in row(s) 1, 2, 3: abc, def, ghi.
Available: "office", "pastoral", "meeting"
```
- Row Numbers: Comma-separated
- Invalid IDs: Comma-separated, unique
- Available IDs: Quoted, comma-separated
- Error Toast mit 7000ms Duration (länger für lange Message)
- Return ohne zu speichern

**Saving Process:**
- Für jede Row:
  - Finde Category (sicher wegen Validation)
  - Create TimeEntry Object
  - startTime: Combine Date + Time zu ISO
  - endTime: Combine Date + Time zu ISO
  - isManual: `true` (Bulk ist manuell)
  - `createCustomDataValue()`
  - Increment `savedCount`

**Post-Save:**
- Clear: `bulkEntryRows = []`
- Close: `showBulkEntry = false`
- **CRITICAL:** `await loadTimeEntries()` (Reload von DB!)
- `render()`
- Success Toast: "Successfully saved X entries!"
- Falls savedCount === 0: Warning Toast "No entries were saved"

**Location:** `main.ts` Zeilen 950-1100

---

## Category Management

### Feature Overview

**User Story:**
Als Admin möchte ich Kategorien für die Zeiterfassung definieren und verwalten können.

**Funktionen:**
- Create Category mit Auto-ID
- Edit Category (Name, Color)
- Delete Category mit Entry Reassignment
- Color Picker
- Category List mit Badges

### Auto-ID Generation

**Algorithm:**
1. Lowercase gesamter String
2. Umlaute ersetzen:
   - ä → ae
   - ö → oe
   - ü → ue
3. Alle nicht-alphanumerischen Zeichen entfernen
4. Auf 20 Zeichen begrenzen

**Beispiele:**
- "Büro Arbeit" → "bueroarbeit"
- "Pastoral Care & Support" → "pastoralcaresupport"
- "Meeting-Room-123" → "meetingroom123"
- "ÄÖÜ Test!" → "aoeutest"

**Purpose:**
- URL-safe IDs
- Menschenlesbar
- Keine Sonderzeichen
- Konsistent

**Location:** `admin.ts` Zeilen 200-220

### Create Category

**1. Dialog öffnen:**
- Button "Add Category"
- State: `showAddCategory = true`
- Render Dialog mit leeren Feldern

**2. Eingabefelder:**
- Name: `<input type="text">` (required)
- Color: `<input type="color">` (HTML5 Color Picker)
- ID: Auto-generiert, read-only, Updates bei Name-Änderung

**3. ID Preview:**
- Live Update bei Name-Eingabe
- User sieht ID vor dem Speichern
- Kann Name anpassen falls ID nicht passt

**4. Save:**
- Validation: Name required
- Generate ID von Name
- Create Category Object (id, name, color)
- **OHNE kvStoreId** (wird von DB vergeben)
- `createCustomDataValue()`
- Nach Success: Reload Categories (um kvStoreId zu bekommen)
- Success Toast: "Category created!"

**Location:** `admin.ts` Zeilen 250-300

### Edit Category

**1. Select Category:**
- Click Edit Button in Category Liste
- State: `editingCategory = { ...category }` (COPY!)
- State: `showAddCategory = false`
- Render Edit Form mit pre-filled Feldern

**2. Editable Fields:**
- Name: Änderbar
- Color: Änderbar
- ID: **NICHT änderbar** (verhindert broken References)

**3. Update:**
- User ändert Name und/oder Color
- **ID bleibt gleich** (wichtig für Referenz-Integrität)
- Finde Category via `editingCategory.id`
- **CRITICAL:** Verwende `kvStoreId` für Update API-Call
- Destructure: `{ kvStoreId, ...categoryData }` (kvStoreId nicht im JSON!)
- `updateCustomDataValue()`
- Success Toast: "Category updated!"
- Reload Categories

**Location:** `admin.ts` Zeilen 300-350

### Delete Category

**Siehe ARCHITECTURE.md für vollständige Details**

**Simplified Flow:**
1. Pre-Check: Count Entries using Category
2. Falls 0: Direkt löschen
3. Falls >0: Reassignment Dialog
4. User wählt Ersatzkategorie
5. Auto-Reassignment aller Entries
6. Delete Category
7. Success Toast mit Count

**Location:** `admin.ts` Zeilen 400-650

### Event Handler Pattern

**Problem:**
HTML wird bei jedem `render()` komplett neu generiert. Event Listeners gehen verloren.

**Solution:**
`attachEventHandlers()` Function die nach jedem `render()` aufgerufen wird.

**Edit Button Handlers:**
- `querySelectorAll('.edit-category-btn')`
- Für jeden Button: `addEventListener('click')`
- Extrahiere `categoryId` aus `data-category-id` Attribut
- Finde Category in `workCategories` Array
- Setze `editingCategory = { ...category }` (COPY!)
- `render()`

**Delete Button Handlers:**
- `querySelectorAll('.delete-category-btn')`
- Für jeden Button: `addEventListener('click')`
- Extrahiere `categoryId` aus `data-category-id` Attribut
- Rufe `initiateDeleteCategory(categoryId)` auf

**CRITICAL:**
- attachEventHandlers() MUSS nach jedem `render()` aufgerufen werden
- Am Ende von `render()` Function
- Oder: Direkt nach `element.innerHTML = ...`

**Location:** `admin.ts` Zeilen 700-800

---

## Notification System

Die Architektur und das Verhalten des Notification Systems (Toasts) sind detailliert in der **[ARCHITECTURE.md #3](ARCHITECTURE.md#3-notification-system)** dokumentiert. Design-Aspekte finden sich in den **[DESIGN_GUIDELINES.md](DESIGN_GUIDELINES.md)**.

---

## Best Practices

Die wichtigsten technischen Best Practices und kritischen Patterns sind in der **[ARCHITECTURE.md](ARCHITECTURE.md)** (Kapitel "Design Principles" und "Critical Patterns") zusammengefasst.

---

## Änderungshistorie

### v1.0.0 - Initial Implementation (2025-01-15)
- Clock-in/Clock-out
- Manual entries (Create, Edit, Delete)
- Category management (Create, Edit, Delete simpel)
- Basic reporting

### v1.1.0 - Excel Import/Export (2025-01-18)
- Template download mit zwei Sheets
- Excel import mit Category matching
- Bulk entry interface
- Validation mit detaillierten Fehlermeldungen

### v1.2.0 - Critical Bug Fixes (2025-01-22)
- KV-Store ID Problem behoben (direkte API-Calls)
- Category edit/delete funktioniert nach Reload
- Time entries zeigen korrekte Kategorien

### v1.3.0 - Category Deletion Improvements (2025-01-22)
- Pre-deletion check für benutzte Kategorien
- Reassignment dialog mit Dropdown
- Automatic entry reassignment
- Update von beiden Feldern (categoryId + categoryName)

### v1.4.0 - Notification System (2025-01-22)
- Custom Toast notifications statt Alerts
- Persistent error notifications mit Close-Button
- Auto-hide für success notifications (3s)
- Stacking für multiple notifications
- Slide-in/Slide-out Animationen

### v1.5.0 - Absence Management (2025-11-22)
- **Full CRUD via ChurchTools API** (`/persons/{userId}/absences`)
- Absence Reasons von Event Masterdata laden
- Create/Edit/Delete Dialogs mit Validation
- Support für All-Day und Timed Absences
- **Absence Hours in Overtime Calculation**
  - Expected Hours = (Work Days / 7) * Hours per Week - Absence Hours
- Absence Calendar View in Reports
- Absences in Period table mit Details

### v1.6.0 - Break Tracking & Advanced Stats (2025-11-22)
- **Break/Pause Tracking**
  - `isBreak` boolean field in TimeEntry
  - Break Checkbox in Clock-In, Manual Entry, Bulk Entry
  - Breaks excluded from work hours calculation
  - Visual distinction mit Break Badge
- **Calendar Week Grouping**
  - Time Entries grouped by ISO calendar week
  - Daily/Weekly Soll vs Ist calculations per week
  - Visual progress bars
- **Dashboard Period Statistics**
  - Day/Week/Month/Last Month IST/SOLL views
  - Color-coded progress indicators
  - Replaced simple stat cards
- **Report Period Persistence**
  - User's preferred period saved to Settings
  - Default: 'This Week'

### v1.7.0 - Access Control & Individual SOLL (2025-11-22)
- **ChurchTools Group-Based Access**
  - `employeeGroupId` and `volunteerGroupId` in Settings
  - Access check on initialization
  - Restrict extension to group members
- **Individual SOLL Hours per Employee**
  - `userHoursConfig: UserHoursConfig[]` in Settings
  - Admin UI for per-employee hours configuration
  - Load employees from ChurchTools group
  - Soft-delete support (inactive flag)
  - SOLL calculations use user-specific hours
  - Priority: user config > default settings

### v1.8.0 - UI/UX Polish (2025-11-22)
- **Removed ALL Emojis**
  - Replaced with clean SVG icons throughout
  - Modern minimalist design
- **Hours Display Format**
  - Changed from decimal (8.5h) to hours:minutes (8h 30m)
  - Applied throughout entire UI
- **Refresh Button**
  - Manual data reload without page refresh
  - Clears cache and reloads all data
- **Excel Import as Alpha Feature**
  - Toggleable via Settings `excelImportEnabled`
  - Default: disabled with warning UI
- **Visual Bug Fixes**
  - Progress bar text overlap when target exceeded
  - Duplicate pause badge in dashboard
  - Edit button visibility fixes

---

## Für KI-Assistenten

**Nach Feature-Implementation:**
1. Update diese Datei mit Feature Details
2. Update [ARCHITECTURE.md](ARCHITECTURE.md) falls Design Decision
3. Update [KNOWN-ISSUES.md](KNOWN-ISSUES.md) falls neue Probleme
4. Update [TODO.md](TODO.md) - Task completed
5. Git Commit mit Feature-Beschreibung

**Kritische Files:**
- `src/entry-points/main.ts` (3347 Zeilen) - Vorsichtig ändern! ← UPDATED
- `src/entry-points/admin.ts` (1640 Zeilen) ← UPDATED
- Niemals `src/utils/kv-store.ts` ändern (Framework)

---

**Letzte Aktualisierung:** 2025-11-23
**Version:** 1.8.0
**Status:** ✅ Production Ready (Phase 3 In Progress)
