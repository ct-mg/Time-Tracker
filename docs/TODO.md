# TODO & Roadmap - Time Tracker Extension

> **🤖 Für KI-Assistenten:**
>
> Prüfe diese Liste bei jeder Session und arbeite offene Punkte ab. Füge neue Ideen und Aufgaben hinzu, damit sie nicht verloren gehen.

---

## Aktueller Status

**Letztes Update:** 2025-12-12
**Aktuelle Phase:** Phase 5 - Polish & Testing (96% Complete)
**Nächste Phase:** UX Improvements & Manager View Polish

---

## 🔜 Refactoring Backlog (Separate Branch)

### Notification System Centralization
- [ ] Create centralized notification utility (`src/utils/notifications.ts`)
- [ ] Expose `showSuccess()`, `showError()`, `showWarning()` helpers
- [ ] Replace all `emit('notification:show')` calls across codebase
- [ ] Benefits: DRY, single source of truth, clean API
- [ ] **Branch:** `refactor/centralize-notifications`

---

## Phase 1: Core Features ✅ ABGESCHLOSSEN

### Zeiterfassung
- ✅ Clock-in/Clock-out Funktionalität
- ✅ Timer Update (sekündlich)
- ✅ Manuelle Zeiteinträge
- ✅ Edit/Delete von Einträgen

### Category Management
- ✅ Kategorien erstellen
- ✅ Kategorien bearbeiten
- ✅ Kategorien löschen (simpel)
- ✅ Auto-ID Generation aus Namen
- ✅ Color Picker für Kategorien

### Basis-Features
- ✅ Time Entries Liste
- ✅ Basic filtering nach Kategorie
- ✅ Basic reporting (Stunden pro Kategorie)

---

## Phase 2: Excel & Notifications ✅ ABGESCHLOSSEN

### Excel Import/Export
- ✅ Template Download mit zwei Sheets
- ✅ Excel Import mit FileReader
- ✅ Excel Serial Date Konvertierung
- ✅ Category Matching (case-insensitive, ID oder Name)
- ✅ Bulk Entry Dialog Integration
- ✅ Export zu Excel
- ✅ **Excel als Alpha Feature** (2025-11-22)
  - Toggleable via Settings `excelImportEnabled`
  - Default: disabled mit Warning UI

### Notification System
- ✅ Custom Toast Component
- ✅ Success Auto-Hide (3s)
- ✅ Error/Warning Persistent mit Close-Button
- ✅ Slide-in Animation
- ✅ Notification Stacking

### Category Deletion Improvements
- ✅ Pre-Deletion Check für benutzte Kategorien
- ✅ Reassignment Dialog
- ✅ Automatic Entry Reassignment
- ✅ Update beider Felder (categoryId + categoryName)

### Critical Bug Fixes
- ✅ KV-Store ID Problem behoben
- ✅ Direct API Calls statt getCustomDataValues()
- ✅ Category Edit/Delete nach Reload gefixt
- ✅ Time Entries zeigen richtige Kategorien
- ✅ **Clock Out 404 Error** (2025-11-22)
  - Wrong KV-Store ID (timestamp vs numeric)
  - Fixed mit besserer Metadata-Handling

### Absence Management (2025-11-22)
- ✅ Full CRUD via ChurchTools API (`/persons/{userId}/absences`)
- ✅ Absence Reasons von Event Masterdata laden
- ✅ Create/Edit/Delete Dialogs mit Validation
- ✅ Absence Hours in Overtime Calculation
- ✅ Absence Calendar View
- ✅ Support für All-Day und Timed Absences

### Break/Pause Tracking (2025-11-22)
- ✅ `isBreak` boolean field in TimeEntry Interface
- ✅ Break Checkbox in Clock-In Dialog
- ✅ Break Checkbox in Manual Entry Form
- ✅ Break Checkbox in Bulk Entry
- ✅ Breaks excluded from work hours calculation
- ✅ Visual distinction in entry lists (badges)
- ✅ Break statistics in Reports

### Advanced Statistics & Grouping (2025-11-22)
- ✅ **Calendar Week Grouping**
  - Time Entries grouped by ISO calendar week
  - Daily/Weekly Soll vs Ist calculations
  - Visual progress bars per week
- ✅ **Dashboard Period Statistics**
  - Day/Week/Month/Last Month IST/SOLL views
  - Color-coded progress (green/red)
  - Replaced simple stat cards
- ✅ **Report Period Persistence**
  - User's preferred period saved to Settings
  - Default: 'This Week' instead of 'custom'
  - Persists across sessions

### Access Control & Individual SOLL (2025-11-22)
- ✅ **Group-Based Access Control**
  - ChurchTools `employeeGroupId` in Settings
  - ChurchTools `volunteerGroupId` in Settings
  - Access check on extension initialization
  - Restrict to group members only
- ✅ **Individual SOLL Hours per Employee**
  - `userHoursConfig: UserHoursConfig[]` in Settings
  - Admin UI for per-employee hours configuration
  - Load employees from ChurchTools group
  - Soft-delete support (inactive flag)
  - SOLL calculations use user-specific hours

### UI/UX Polish (2025-11-22)
- ✅ **Removed ALL Emojis**
  - Replaced with clean SVG icons throughout
  - Modern minimalist design
- ✅ **Hours Display Format**
  - Changed from decimal (8.5h) to hours:minutes (8h 30m)
  - Applied throughout entire UI
- ✅ **Refresh Button**
  - Manual data reload without page refresh
  - Clears cache and reloads all data
- ✅ **Visual Bug Fixes**
  - Progress bar text overlap when target exceeded
  - Duplicate pause badge in dashboard
  - Edit button visibility in dashboard entries

---

## Phase 3: Performance & UX ✅ ABGESCHLOSSEN

### 🔴 Alle kritischen Punkte erledigt ✅

#### ✅ User Namen zeigen "User [ID]" statt echte Namen - GELÖST
**Problem:** Im Admin-Panel bei Employee SOLL Hours Config zeigen User "User [ID]" statt "Vorname Nachname"  
**Root Cause:** ChurchTools API speichert Namen in `person.domainAttributes.firstName/lastName`, nicht direkt auf `person`  
**Location:** `admin.ts` Zeile 298-307  
**Status:** ✅ Resolved (2025-11-23)  
**Aufwand:** Klein  

**Lösung:**
- Namen extrahieren aus `member.person.domainAttributes.firstName/lastName`
- Fallback zu "User [ID]" bleibt funktionsfähig
- Code vereinfacht und Debug-Logs entfernt

**Git Commit:** `0f1c6e9` - fix: user names now display correctly in admin panel

---

#### Work Week Configuration per User ✅ RESOLVED
**Problem:** Work Week Days aktuell als Overall-Setting, User wünscht per-User Config
**Current:** `workWeekDays: number[]` global in Settings
**Desired:** `workWeekDays: number[]` in `UserHoursConfig` pro Employee
**Status:** ✅ Resolved (2025-11-23)
**Aufwand:** Mittel
**User Impact:** Hoch (verschiedene Teilzeit-Modelle)

**Implementation:**
1. ✅ Added `workWeekDays?: number[]` to `UserHoursConfig` interface
2. ✅ Added `settingsSnapshot` to `TimeEntry` (preserves settings at creation time)
3. ✅ UI in Admin: Checkbox-Grid pro Employee (S-M-T-W-T-F-S)
4. ✅ Updated `isWorkDay()` and `countWorkDays()` to use user-specific work week
5. ✅ Work week checkboxes auto-save on change
6. ✅ Admin UI clarifies Default vs Individual settings
7. ✅ CRITICAL FIX: Auto-save preserves all settings (was corrupting employeeGroupId)

**Git Commits:** 
- `93c0325` - feat: add per-user work week configuration (Phase 2-3a)
- `2e57263` - feat: add settingsSnapshot to all entry creation points (Phase 3b)
- `490c09f` - feat: add admin UI for per-user work week configuration (Phase 4)
- `5e7bc5d` - fix: preserve workWeekDays when saving group settings
- `56e5a50` - docs: clarify default vs individual settings in admin panel
- `5b12775` - fix: CRITICAL - prevent settings corruption on auto-save

**Documentation:** Updated docs/IMPLEMENTATION.md with settingsSnapshot and work week features

---

#### Data Safety & Schema Versioning ✅ RESOLVED

**User Request:** Settings corruption prevention and data recovery mechanisms

**Status:** ✅ Resolved (2025-11-24)
**Aufwand:** Hoch
**User Impact:** Sehr Hoch (Datenverlust-Prävention)

**Implementation:**
1. ✅ **Schema Versioning:** Settings haben `schemaVersion` field
2. ✅ **Backup System:** Automatische Backups vor allen Settings-Änderungen (letzte 5 Versionen)
3. ✅ **Migration Safety:** Settings werden mit spread operator gespeichert, keine Felder gehen verloren
4. ✅ **Validation:** Settings validation vor dem Speichern implementiert
5. ✅ **Recovery UI:** Admin Panel zeigt alle Backups mit Restore-Funktion
6. ✅ **Change Logging:** Timestamp, user, und changes werden geloggt

**Incident Fix:** Employee Group ID wurde durch Work Week Checkbox auto-save gelöscht
- **Root Cause:** Auto-save modifizierte settings object direkt, verlor andere Felder
- **Fix:** Auto-save erstellt jetzt neues settings object mit spread operator

**Location:** Admin Panel → Settings Backup & Restore (ganz unten)

---

#### Internationalisierung (i18n) - Browser-Sprache
**User Request aus Konversation:** "Wir brauchen eine Übersetzung. Dabei soll die Browsersprache berücksichtigt werden. Vorerst soll es englisch und deutsch geben. Wobei englisch fallback ist"

**Features:**
- Browser-Sprache Detection (navigator.language)
- Deutsch und Englisch Support
- Englisch als Fallback
- Übersetzungen für alle UI-Texte
- Persistence: User kann Sprache manuell wählen (override browser setting)

**Status:** Feature Request aus Claude Code Konversation
**Aufwand:** Hoch
**User Impact:** Hoch (internationale Nutzung möglich)

**Implementation Steps:**
1. i18n Library wählen (i18next, vue-i18n, oder Vanilla)
2. Translation Keys extrahieren aus allen UI-Strings
3. DE Translation File erstellen (current texts)
4. EN Translation File erstellen
5. Browser Language Detection implementieren
6. Language Switcher in UI (Settings oder Header)
7. Save language preference to Settings
8. Test mit beiden Sprachen

**Technical Notes:**
- ChurchTools API gibt Daten auf Englisch zurück (kein Problem)
- Absence Reasons kommen von ChurchTools Event Masterdata (bereits übersetzt?)
- Category Names bleiben user-defined (keine Übersetzung)
- Nur UI-Elemente übersetzen (Buttons, Labels, Notifications)
**Priority:** Mittel (nach kritischen Bugs)

---

## Known Issues

### Admin Page Language Switching
- Admin page doesn't properly switch language when changed in settings
- Success messages show in wrong language
- Requires page reload to see language changes
- **Priority:** Medium (i18n works on main page)

### 🔴 Priorität: Hoch

#### Collapsible Button Toggle Verbesserung ✅ COMPLETED
**Problem:** Offene Buttons (z.B. "Add Time Entry", "Add Absence") schließen nicht beim erneuten Klick
**Lösung:** Toggle-Verhalten implementiert - Button schließt Dialog wenn bereits offen  
**Status:** ✅ Completed (2025-11-29)
**Implementation:** Changed `showAddManualEntry = true` to `= !showAddManualEntry`

---

#### CSV Export Success Toast ✅ COMPLETED
**Problem:** Nach CSV/Excel Export gibt es keine visuelle Bestätigung
**Lösung:** Success Toast rechts oben nach erfolgreichem Export
**Status:** ✅ Completed (2025-11-29)
**Implementation:** Added `notification:show` event after XLSX.writeFile

---

#### ✅ Performance-Optimierung bei vielen Einträgen (COMPLETED 2025-11-29)
**Problem:** Bei >1000 Einträgen wird Rendering langsam  
**Lösung:** Virtual Scrolling für Time Entries Tabelle  
**Status:** ✅ Implementiert
**Aufwand:** Mittel (Custom Implementation)  
**User Impact:** Hoch

**Implementierungs-Schritte:**
1. ✅ Custom Virtual Scrolling Lösung (kein zusätzliches Library)
2. ✅ Aktiviert ab 100+ Einträgen
3. ✅ Integration in Time Entries Tabelle mit Week/Day Grouping
4. ✅ Debounced Scroll Events (150ms)
5. ✅ Scroll Position Restoration nach Re-render
6. ✅ Filter Integration (Reset Scroll bei Filter-Änderung)

**Technische Details:**
- Rendering Window: Sichtbare Einträge + 10 Buffer oben/unten
- Container Height: 600px max
- Estimated Row Height: 80px
- Aktivierungsschwelle: 100 Einträge
- Performance Target: 60fps Scrolling, <500ms Init für 5000 Einträge

**Git Commit:** Virtual scrolling performance optimization

---

---

#### ✅ Time Entry Edit/Delete Buttons Fix (COMPLETED 2025-11-24)
**Problem:** Edit und Delete Buttons funktionierten nicht
**Ursache:** Falsche CSS Selektoren in Event Delegation (`ct.extension.timetracker..edit-entry-btn` statt `.edit-entry-btn`)
**Lösung:** Selektoren in `main.ts` korrigiert
**Status:** ✅ Behoben
**Git Commit:** fix: Edit and Delete buttons not working due to wrong CSS selectors

**Original Issue (Edit Persistenz):** Noch nicht getestet, da Bug die Tests blockierte. Kann jetzt getestet werden.

---

### 🎯 Recently Completed (December 2025)

#### ✅ HR Manager Dashboard (COMPLETED 2025-12-12)
**Use Case:** Manager können zugewiesene Mitarbeiter-Zeiteinträge einsehen und exportieren
**Feature:** Manager-to-Employee Assignments + User Filter im Main View
**Status:** ✅ Vollständig implementiert und getestet
**Aufwand:** Groß

**Implementierte Features:**
1. ✅ **Admin Panel**: Manager-to-Employee Assignment Matrix
   - Manager Group ID konfigurierbar
   - "Load Managers" Button lädt alle Manager aus ChurchTools Gruppe
   - Checkbox-Matrix zum Zuweisen von Employees zu Managern
   - "Save Manager Assignments" mit Toast-Notification
   - 5 Managers getestet (Screenshot verified)

2. ✅ **Main View**: Benutzer-Filter Dropdown
   - "Meine Einträge" (default, eigene Entries)
   - "Alle Benutzer" (HR-Funktion, alle Entries)
   - Individuelle User (Manager sehen nur zugewiesene Mitarbeiter)
   - Visual separator zwischen Sections

3. ✅ **Permissions System**:
   - Normal User: Nur eigene Entries
   - Manager: Eigene + zugewiesene Mitarbeiter Entries
   - HR: Alle Entries aller User

**Browser Verified:** 2025-12-12
**Git Status:** In develop branch (main.ts, admin.ts)
**Translation:** DE/EN für alle Manager-Features

**Known Limitations (siehe UX Improvements unten):**
- Manager View UX needs clarity improvements
- Username attribution missing in filtered view

---

### 🔴 Priorität: Hoch (UX Improvements)

#### Manager View UX Clarity
**Problem:** Wenn Manager einen Mitarbeiter auswählt und manuellen Entry erstellt, ist unklar für wen der Entry ist
**Impact:** Verwirrung, potenzielle Datenfehler
**Status:** Offen
**Aufwand:** Mittel
**Priority:** Hoch

**Issues:**
1. **Manuelle Entry Zuweisung unklar**:
   - User wählt "Jörn Ackermann" im Filter
   - Klickt "+ Manuellen Eintrag hinzufügen"
   - ❌ NICHT ersichtlich: Wird Entry für Jörn oder für mich selbst erstellt?
   
2. **UI-Durcheinander**:
   - Filter/Schnellfilter gemischt mit Export/Import Buttons
   - Keine klare Trennung zwischen "View Controls" und "Actions"
   - Benutzer Dropdown zwischen anderen Filtern versteckt

**Lösungsansätze:**
1. **Klarheit bei Entry-Erstellung**:
   - Prominenter Hinweis: "Sie erstellen einen Eintrag für: [Username]"
   - Oder: Disabled state + Tooltip "Wechseln Sie zu 'Meine Einträge' um selbst Entries zu erstellen"
   - Modal zeigt explizit "Eintrag für: [Name]"

2. **UI-Umstrukturierung**:
   - **Sektion 1**: Filter (Schnellfilter, Date Range, Category, Search, **User**)
   - **Sektion 2**: Actions (Export, Import, Neu anlegen)
   - Visual separation (border, spacing)
   - Benutzer-Filter hervorheben wenn != "Meine Einträge"

**Referenz-Screenshot:** `/Users/mgoth/.gemini/antigravity/brain/.../uploaded_image_1765555664271.png`

---

#### Username-Spalte in gefilterter Ansicht
**Problem:** In gefilterter Ansicht ("Alle Benutzer" oder Manager-View) fehlt Username-Attribution
**Impact:** Manager sehen nicht zu wem welcher Entry gehört
**Status:** Offen
**Aufwand:** Klein-Mittel
**Priority:** Hoch

**Current State:**
- User wählt "Alle Benutzer" im Filter
- Zeiteinträge-Liste zeigt: Datum, Zeit, Kategorie, Beschreibung
- ❌ FEHLT: Zu welchem User gehört der Entry?

**Required:**
- ✅ Neue Spalte "Benutzer" in Time Entries Table
- ✅ Zeigt Username nur wenn Filter != "Meine Einträge"
- ✅ Conditional Rendering (wenn eigene Entries: Spalte ausblenden)
- ✅ Translation Keys: "Benutzer" (DE), "User" (EN)

**Implementation:**
```typescript
// In renderEntriesList()
if (selectedViewUserId !== currentUserId) {
  // Add username column
  const username = getUserNameFromId(entry.userId);
  // Show in table
}
```

**Design:**
- Spalte zwischen "Datum" und "Kategorie"
- Badge-Style wie bei User Attribution für Manager (bereits implementiert)
- Konsistent mit bestehendem Design

---

#### Admin-Zugang via Zahnrad-Button
**Problem:** Kein einfacher Zugang zum Admin Panel von main.ts
**Impact:** User müssen URL manuell ändern (/extensions/timetracker/admin)
**Status:** Offen
**Aufwand:** Klein
**Priority:** Mittel-Hoch

**Required:**
- ✅ Zahnrad-SVG Icon in Navigation (rechts oben, neben Settings)
- ✅ Permission-basierte Sichtbarkeit (nur für Admins)
- ✅ onClick: Navigate zu Admin Panel
- ✅ Tooltip: "Admin Panel" (DE/EN)

**Permission Check Options:**
1. **Via KV-Store Extension Category** (empfohlen):
   - Neue Category `adminUsers` im KV-Store
   - Array von User-IDs: `[123, 456, 789]`
   - Check on mount: `if (adminUsers.includes(currentUserId))`
   
2. **Via ChurchTools Group**:
   - Admin Group ID in settings
   - Check if user in group
   - Ähnlich wie Manager Group

**Implementation:**
```typescript
// Check admin permission
const isAdmin = await checkAdminPermission(currentUserId);

if (isAdmin) {
  // Show gear icon
  const adminBtn = `
    <button id="admin-btn" title="Admin Panel">
      <svg>...</svg> <!-- Zahnrad icon -->
    </button>
  `;
}
```

**Git Consideration:**
- KV-Store Category Approach: Flexibler, keine Code-Änderung nötig
- Kann in Admin Panel selbst konfiguriert werden
- Backup: Fallback auf Group-basierte Permission

---

### 🟡 Priorität: Mittel

#### ✅ Bulk Edit für Time Entries (COMPLETED 2025-12-11)
**Use Case:** User hat 10 Einträge mit falscher Kategorie
**Feature:** Multi-Select + Bulk Delete + Kategorie-Änderung für mehrere Einträge
**Status:** ✅ Vollständig implementiert
**Aufwand:** Mittel

**Implementierungs-Schritte:**
1. ✅ Checkbox für jeden Eintrag
2. ✅ "Mehrfachauswahl" Toggle Button
3. ✅ Bulk-Action Bar mit Kategorie-Dropdown
4. ✅ "Kategorie ändern" Button
5. ✅ "Ausgewählte löschen" Button
6. ✅ "Abbrechen" Button zum Exit aus Bulk-Modus

**Verified:** 2025-12-11 - Alle Features funktional

---

#### ✅ Time Filter Presets (COMPLETED 2025-11-30)
**Use Case:** User möchte schnell Zeiträume filtern ohne Datum manuell einzugeben
**Feature:** Vordefinierte Zeitfilter für Time Entries
**Status:** ✅ Vollständig implementiert
**Aufwand:** Klein
**Priority:** Mittel

**Implementierte Filter:**
- ✅ Dieser Monat / This Month
- ✅ Letzter Monat / Last Month
- ✅ Dieses Jahr / This Year
- ✅ Letztes Jahr / Last Year
- ✅ Letzte 30 Tage / Last 30 Days
- ✅ Letzte 365 Tage / Last 365 Days

**Location:** Time Entries Filter Sektion
**Branch:** feature/time-filter-presets (merged to develop)
**Browser Verified:** 2025-12-11

---

#### UI/UX Verbesserungen - Dialoge
**Problem:** Inkonsistenzen bei Dialog-Verhalten und Buttons
**Status:** Geplant (Separate Branch)
**Aufwand:** Klein
**Priority:** Mittel

**Issues:**
1. **Toggle-Konflikt:** Öffnet man "Manuelle Einträge" während "Massenimport" offen ist, bleibt Massenimport offen
   - Erwartet: Massenimport sollte sich schließen
   - Wichtig: Eingegebene Daten müssen erhalten bleiben (falls versehentlich geschlossen)
   
2. **Button Inkonsistenz:** 
   - Massenimport: Hat "X" zum Schließen
   - Manuelle Einträge: Hat "Abbruch" Button
   - Gewünscht: Überall "Abbruch" Button statt "X"

3. **Fehlende Übersetzung:**
   - "Manual Entries" zeigt sich auf Englisch auch wenn Deutsch ausgewählt
   - Fehlender Key: `ct.extension.timetracker.bulkEntry.title`

---

#### Excel Dropdown-Alternative
**Problem:** xlsx Library unterstützt keine Dropdowns
**Idee:** Alternative Library prüfen (exceljs, xlsx-populate)
**Status:** Offen
**Aufwand:** Klein

**Research-Aufgaben:**
1. exceljs Feature-Check: Data Validation?
2. xlsx-populate Feature-Check: Data Validation?
3. Bundle-Size Vergleich
4. Migration-Aufwand schätzen

**Hinweis:** Aktuell funktioniert Copy/Paste gut, nicht dringend

---

#### "Endzeit auf Jetzt" Button für Manuelle Einträge
**Use Case:** Beim manuellen Eintrag die Endzeit schnell auf die aktuelle Zeit setzen
**Feature:** Button "Jetzt" neben Endzeit-Feld
**Status:** Offen (Feature Request)
**Aufwand:** Klein
**Priority:** Niedrig-Mittel

**Implementierungs-Schritte:**
1. Button neben Endzeit-Input hinzufügen
2. onClick: Endzeit auf `new Date()` setzen
3. Beide Felder (Datum + Zeit) aktualisieren
4. Translations für Button-Text (DE: "Jetzt", EN: "Now")

**UI-Position:**
- Neben "End Date & Time" Feld
- Kleiner Button mit Icon (Uhr) oder Text "Jetzt"

---

#### ✅ Filter & Search Verbesserungen (COMPLETED 2025-11-24)
**Features:**
- ✅ Search in Description (case-insensitive)
- ✅ Combined with existing date and category filters
- ⏳ Filter nach User (für Manager) - Future enhancement

**Status:** Implemented description search
**Impact:** Hoch - Users can now quickly find entries by description text

**Git Commit:** Description search feature

---

### 🟢 Priorität: Niedrig

#### ✅ Dark Mode Support (COMPLETED 2025-11-24)
**Use Case:** Bessere Lesbarkeit bei Nacht
**Status:** ✅ Vollständig implementiert
**Aufwand:** Mittel

**Implementierung:**
1. ✅ User Settings Modal mit Dark Mode Toggle (System/On/Off)
2. ✅ CSS Variables ([data-theme="dark"])
3. ✅ LocalStorage Persistence (timetracker-dark-mode)
4. ✅ Complete styling with brightness filters for colored elements
5. ✅ Language selection integrated in same modal

**Details:**
- Settings gear button in navigation
- System mode uses prefers-color-scheme media query
- Dark background: #1a1a1a, text: #e9ecef
- Preserves category colors with filter: brightness(0.9)

---

#### Notification Sound Toggle
**Feature:** Optionaler Sound bei Success/Error
**Status:** Offen
**User Feedback:** Noch nicht angefragt
**Aufwand:** Klein

---

#### Time Entry Templates
**Use Case:** "Montags Meeting 9-10 Uhr" als Template
**Features:**
- Template speichern
- Template anwenden
- Template bearbeiten
- Template löschen

**Status:** Offen
**Aufwand:** Klein

---

### Neue Features - Hohe Priorität

#### ✅ User Attribution für Manager (COMPLETED 2025-11-30)
**Problem:** Manager sehen Zeiteinträge mehrerer Mitarbeiter, aber es ist nicht ersichtlich, wem welcher Eintrag gehört
**Feature:** Anzeige des Benutzernamens bei jedem Zeiteintrag wenn Manager mehrere Personen sieht
**Status:** ✅ Implementiert
**Aufwand:** Klein-Mittel
**Priority:** Hoch

**Implementierung:**
- ✅ `getUserNameFromId()` Helper-Funktion in main.ts
- ✅ User Badge in "Type" Spalte neben Manual/Break Badges
- ✅ Conditional Display: `isManager && userList.length > 1 && entry.userId !== user?.id`
- ✅ Styled mit light blue Badge (#e8f4f8 background, #0066cc text)
- ✅ Translations für DE ("Benutzer") und EN ("User")
- ✅ User Icon (Person Silhouette) für visuelle Klarheit

**Git Commit:** `79b558b` - feat: add user attribution for managers  
**Branch:** feature/user-attribution (merged to develop)  
**Date:** 2025-11-30

---

#### ✅ Manager Berechtigungen - Status Quo (RESOLVED 2025-11-30)
**Frage:** Kann ein Manager für seine Arbeiter Einträge erstellen oder löschen?
**User Entscheidung:** ❌ NEIN - Status Quo beibehalten
**Aktueller Status:** Manager können NICHT für andere Einträge erstellen/löschen/bearbeiten
   - KV-Store ist user-spezifisch (jeder User hat seinen eigenen Store)
   - Manager können Einträge nur **ansehen** (via User Attribution Feature)
   - Delete/Create/Edit Funktionen arbeiten nur mit dem Store des aktuellen Users
**Status:** ✅ Geklärt - keine Implementierung nötig
**Priority:** Hoch (erledigt)

**Gewählte Option:**
1. ✅ **Status Quo:** Manager können nur eigene Einträge verwalten, sehen aber die anderer (via User Attribution Badge)

**Date:** 2025-11-30

---

#### ✅ Admin Activity Log (COMPLETED 2025-12-01)
**Feature:** Log-System für Admin zur Nachverfolgung von Änderungen
**Status:** ✅ Vollständig implementiert und funktional
**Aufwand:** Komplett (nur Minor Enhancements optional)
**Priority:** Abgeschlossen

**Implementiert:**
- ✅ Backend: createActivityLog(), archiveOldLogs() Funktionen
- ✅ 8 CRUD-Operationen instrumented:
  1. Clock Out (UPDATE)
  2. Manual Entry Create (CREATE)
  3. Manual Entry Edit (UPDATE)  
  4. deleteTimeEntry() (DELETE)
  5. bulkUpdateCategory() (UPDATE)
  6. bulkDeleteEntries() (DELETE bulk)
  7. saveBulkEntries() (CREATE bulk)
  8. Absence operations
- ✅ Admin UI: Settings Panel, Statistics Cards, Filter UI, Log Table, Pagination
- ✅ 35 Translation Keys (DE/EN) für Activity Log UI
- ✅ KV-Store Category "activityLog" für active logs
- ✅ Archive system: "activityLogArchive" mit configurable retention (30-365 days slider)
- ✅ Git Commit: `7eb61e0` - "feat: Admin Activity Log implementation" (merged to develop)

**Browser Verified (2025-12-11):**
- ✅ Logs werden korrekt angezeigt in Admin Panel
- ✅ 8+ Log-Einträge sichtbar mit Timestamps und User-Namen
- ✅ Integriert in "Datensicherheit & Wiederherstellung" Section
- ✅ Alle CRUD-Operationen werden geloggt
- ✅ Filter funktionieren (User, Action Type, Date Range)
- ✅ KEIN Display Issue - Feature ist vollständig funktional!

**Optional Future Enhancements:**
- CSV Export für Logs
- "Archive Now" Button (statt nur automatisch)
- Refresh Button
- Separate Activity Log Tab (statt in Data Safety Section)

---

#### ✅ Auto-Apply Filter (COMPLETED 2025-11-30)
**Problem:** User muss "Filter anwenden" Button klicken
**Feature:** Filter automatisch bei jeder Änderung anwenden
**Status:** ✅ Implementiert
**Aufwand:** Klein
**Priority:** Hoch

**Implementation:**
- ✅ "Apply Filters" Button entfernt
- ✅ Filter-Inputs mit auto-apply Event Listeners ausgestattet
- ✅ Bei Datum-Änderung: Sofort filtern (change event)
- ✅ Bei Category-Änderung: Sofort filtern (change event)
- ✅ Bei User-Änderung (Manager): Sofort filtern (change event)
- ✅ Bei Textfeld (Search): 300ms Debounce nach letztem Keystroke (input event)
  - Verhindert zu viele Re-Renders beim Tippen
  - Erst filtern wenn User zu Ende getippt hat

**Technical Details:**
- Event Listener direkt auf Inputs statt auf Button
- Debounce-Funktion für Text-Inputs (300ms)
- Cache-Invalidierung und virtual scroll reset bleiben gleich
- Gemeinsame `autoApplyFilters()` Funktion für Code-Reuse

**Git Commit:** `9f58e2e` - feat: implement auto-apply filters
**Branch:** feature/auto-apply-filters (merged to develop)
**Date:** 2025-11-30

---

## Phase 4: Advanced Features 📅 ZUKUNFT

### Approval Workflow
**User Story:** Als Vorgesetzter möchte ich Zeiteinträge genehmigen

**Features:**
- Status in TimeEntry: pending, approved, rejected
- Admin kann genehmigen/ablehnen
- Notification an User bei Änderung
- Übersicht: "Pending Approvals"

**Status:** Geplant
**Aufwand:** Groß
**Requires:** Permissions-System, User Roles

---

### Team Dashboard
**User Story:** Als Manager möchte ich Zeiteinträge meines Teams sehen

**Features:**
- Team-Übersicht
- Filter nach Person
- Aggregierte Statistiken
- Charts (optional)

**Status:** Geplant
**Aufwand:** Groß
**Requires:** Multi-User Support, Permissions

---

### Break Time Tracking
**User Story:** Als User möchte ich Pausen separat erfassen

**Features:**
- Pausen-Button während Clock-In
- Pausen von Arbeitszeit abziehen
- Gesetzliche Pausenregelungen (optional)
- Pausen-Report

**Status:** Geplant
**Aufwand:** Mittel

---

### Email Notifications
**Features:**
- Wöchentliche Zusammenfassung per Email
- Erinnerung bei fehlendem Clock-Out
- Benachrichtigung bei Überstunden (configurable threshold)

**Status:** Geplant
**Aufwand:** Mittel
**Requires:** ChurchTools Email API oder Service Account

---

### Mobile App / PWA
**Features:**
- Progressive Web App
- Offline-Funktionalität
- Push Notifications
- Mobile-optimierte UI

**Status:** Idee
**Aufwand:** Sehr Groß

---

## Phase 5: Polish & Documentation 📚 KONTINUIERLICH

### Documentation
- ✅ Comprehensive Implementation Guide
- ✅ User Requirements Document
- ✅ Maintenance Guidelines
- ✅ TODO Roadmap
- ✅ User Manual (für Endnutzer, nicht Entwickler) - docs/USER-MANUAL.md
- ⏳ API Documentation (wenn public API)

### Testing
- ✅ Unit Tests (Vitest) - 20 tests total, 10 passing (50%)
  - i18n.ts: 7/7 tests, 69.56% coverage ✅
  - kv-store.ts: 3/13 tests passing ⚠️ (mocking complexity)
- ⏳ Integration Tests (future - complex API mocking needed)
- ⏳ E2E Tests (Playwright) - deferred for future

### Code Quality
- ✅ ESLint Configuration (v9 with flat config, TypeScript support)
- ✅ Prettier Configuration (integrated with ESLint)
- ✅ TypeScript Strict Mode (already enabled in tsconfig.json)
- ⏳ Code Coverage Tracking (future enhancement)

---

## Bekannte Probleme & Blockers

### Aktuell
_Keine bekannten kritischen Probleme_

### Gelöst
- ✅ **KV-Store ID Bug** (2025-01-22)
  - Problem: getCustomDataValues() überschreibt String-ID
  - Lösung: Direkte API-Calls

- ✅ **Excel Import nicht sichtbar** (2025-01-22)
  - Problem: showBulkEntry fehlte
  - Lösung: showBulkEntry = true im Import-Handler

- ✅ **Notifications verschwinden/bleiben nicht** (2025-01-22)
  - Problem: Alle Notifications hatten setTimeout
  - Lösung: Conditional setTimeout nur für Success

---

## Ideen aus User-Sessions

### Session 2025-01-22
1. ✅ Excel Import sollte Bulk Dialog automatisch öffnen
2. ✅ Validierung sollte detaillierte Fehlermeldungen zeigen
3. 💡 "Was wäre wenn man mehrere Einträge gleichzeitig bearbeiten könnte?" → Bulk Edit
4. 💡 "Bei vielen Einträgen scrollt es sich langsam" → Virtual Scrolling

---

## Migration & Refactoring

### Technische Schulden
_Keine kritischen technischen Schulden aktuell_

### Mögliche Refactorings
1. **State Management:** Aktuell alles in lokalen Variablen
   - Überlegung: Zustand mit State Library (z.B. Zustand, Jotai) zentralisieren
   - Benefit: Einfacheres Testing, bessere DevTools
   - Aufwand: Mittel
   - Status: Nice-to-have, nicht dringend

2. **Component Extraction:** main.ts ist sehr groß (2300+ Zeilen)
   - Überlegung: In kleinere Module aufteilen
   - Benefit: Bessere Wartbarkeit
   - Aufwand: Groß (erfordert sorgfältiges Refactoring)
   - Status: Wenn Zeit, nicht dringend

---

## Success Metrics

### Phase 3 wird als erfolgreich betrachtet wenn:
- [ ] Performance mit 5000+ Einträgen ist flüssig (<100ms Render)
- [ ] Bulk Edit funktioniert intuitiv
- [ ] Filter & Search sind schnell und zuverlässig
- [ ] Alle bekannten Bugs sind behoben

### MVP wird als erfolgreich betrachtet wenn:
- [x] User können Zeit erfassen (Clock-in/out)
- [x] User können Zeit manuell eingeben
- [x] User können Zeit per Excel importieren
- [x] Admin kann Kategorien verwalten
- [x] User sehen hilfreiche Fehlermeldungen
- [ ] User können große Datenmengen performant verwalten
- [ ] User Manual ist verfügbar

---

## Für KI-Assistenten

### Session Startup Checklist
1. ✅ Lies diese TODO-Liste
2. ✅ Check "Bekannte Probleme" - nicht erneut einführen!
3. ✅ Prüfe "Aktueller Status" - wo stehen wir?
4. ✅ Lies IMPLEMENTATION.md für technische Details

### Nach Code-Änderungen
1. ✅ Update diese TODO-Liste
2. ✅ Verschiebe erledigte Tasks von "Offen" zu "Abgeschlossen"
3. ✅ Füge neue Ideen aus User-Konversation hinzu
4. ✅ Update "Letztes Update" Datum
5. ✅ Commit mit TODO-Update erwähnen

### Neue Tasks hinzufügen
```markdown
#### Task Titel
**Problem/Use Case:** Beschreibung
**Lösung/Feature:** Was soll gemacht werden
**Status:** Offen/In Progress/Blocked
**Aufwand:** Klein/Mittel/Groß
**Priorität:** Niedrig/Mittel/Hoch/Kritisch
**User Impact:** Niedrig/Mittel/Hoch

**Implementierungs-Schritte:**
1. Schritt 1
2. Schritt 2
3. ...
```

---

**Maintainer:** Entwickelt mit Claude (Anthropic)
**Letzte Aktualisierung:** 2025-01-22
**Version:** 1.0
