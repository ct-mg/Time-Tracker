# TODO & Roadmap - Time Tracker Extension

> **🤖 Für KI-Assistenten:**
>
> Prüfe diese Liste bei jeder Session und arbeite offene Punkte ab. Füge neue Ideen und Aufgaben hinzu, damit sie nicht verloren gehen.

---

## Aktueller Status

**Letztes Update:** 2025-11-29
**Aktuelle Phase:** Phase 5 - Polish & Testing
**Nächste Phase:** Kontinuierliche Verbesserungen

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

### 🟡 Priorität: Mittel

#### Bulk Edit für Time Entries
**Use Case:** User hat 10 Einträge mit falscher Kategorie
**Feature:** Multi-Select + Kategorie-Änderung für mehrere Einträge
**Status:** Offen
**Aufwand:** Mittel

**Implementierungs-Schritte:**
1. Checkbox für jeden Eintrag
2. "Select All" Toggle
3. Bulk-Action Bar mit Kategorie-Dropdown
4. "Update Selected" Button
5. Confirmation Dialog mit Anzahl

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

#### Dark Mode Support
**Use Case:** Bessere Lesbarkeit bei Nacht
**Status:** Offen
**Aufwand:** Mittel

**Implementierungs-Schritte:**
1. Dark Mode Toggle in Settings
2. CSS Variablen für Colors
3. LocalStorage für Preference
4. Alle Inline-Styles anpassen

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
**Aufwand:** Mittel

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
