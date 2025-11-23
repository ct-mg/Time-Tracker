# Time Tracker Extension - Project Overview

**Quick start guide für neue Entwickler und KI-Assistenten**

---

## Übersicht

Die **Time Tracker Extension** ist eine umfassende Zeiterfassungs-Lösung für ChurchTools-Nutzer. Sie ermöglicht:
- Clock-in/Clock-out Zeiterfassung mit Live-Timer
- Manuelle Zeiteinträge
- Bulk-Import via Excel
- Kategorie-Management mit Farben
- Reports und Statistiken

---

## Hauptmodule

### main.ts (3347 Zeilen) ← UPDATED!
**Endnutzer-Modul** - Zeiterfassung und Verwaltung
- Clock-in/Clock-out Funktionalität **mit Break Tracking**
- Timer-Updates (sekündlich)
- Manuelle Zeiteinträge (Create, Edit, Delete)
- **Abwesenheitsverwaltung** (Create, Edit, Delete via ChurchTools)
- Bulk Entry mit Excel Import/Export (Alpha Feature, toggleable)
- Time Entries Liste **mit Calendar Week Grouping**
- **Advanced Statistics** (Day/Week/Month Soll vs Ist)
- Reports nach Kategorie und Zeitraum
- **Individual SOLL Hours per User**
- **Group-based Access Control**
- Toast Notification System

**Wichtig:** Sehr groß, Änderungen vorsichtig machen!

### admin.ts (1640 Zeilen) ← UPDATED!
**Admin-Modul** - Konfiguration und Management
- Category Management (Create, Edit, Delete)
- Auto-ID Generation aus Namen
- Color Picker für Kategorien
- Category Deletion mit Entry Reassignment
- **Group Management** (Employee/Volunteer Groups)
- **Individual SOLL Hours Configuration** per Employee
- **Work Week Days Configuration** (global)
- **Alpha Features Toggle** (Excel Import)
- Settings Management

---

## Development Setup

### Voraussetzungen
- Node.js 18+
- npm 8+
- ChurchTools Instanz mit Admin-Zugang

### Initial Setup

**1. Repository klonen:**
```bash
cd /Users/mgoth/extensions/Zeiterfassung
```

**2. Dependencies installieren:**
```bash
npm install
```

**3. Environment konfigurieren:**

Erstelle `.env` im Root:
```env
VITE_KEY=timetracker
VITE_NAME=Time Tracker
VITE_BASE_URL=https://mgtest.church.tools
VITE_LOGIN_USER=churchtools
VITE_LOGIN_PASSWORD=churchtools
```

**4. ChurchTools CORS konfigurieren:**
- Login zu mgtest.church.tools als Admin
- Gehe zu Settings → Security → CORS
- Füge hinzu: `http://localhost:5173` (oder 5174 falls Port conflict)

**5. Dev Server starten:**
```bash
npm run dev
```

Server läuft auf: http://localhost:5173 (oder 5174)

**6. Extension in ChurchTools hochladen:**
```bash
npm run deploy
```

Generiert `releases/timetracker.zip`
- Upload in ChurchTools → Extensions
- Aktiviere Extension
- Refresh Browser

---

## Development Workflow

### Daily Development

**1. Start Session:**
```bash
git pull
npm run dev
```

**2. Code ändern:**
- Hot Reload funktioniert!
- Änderungen erscheinen sofort in ChurchTools
- Check Browser Console für Errors

**3. Test in ChurchTools:**
- Navigate zu Extension
- Test Features
- Check Toast Notifications

**4. Commit regelmäßig:**
```bash
git add .
git commit -m "feat: description"
```

Siehe [MAINTENANCE.md](MAINTENANCE.md) für Git Workflow Details.

### Build & Deploy

**Development Build:**
```bash
npm run build
```

**Production Deploy:**
```bash
npm run deploy
```

Erstellt optimiertes ZIP in `releases/`

---

## Port Configuration

**Standard Port:** 5173

**Wenn Port conflict:**
1. Ändere in `vite.config.ts`:
   ```typescript
   server: {
     port: 5174,
     strictPort: true
   }
   ```
2. Update CORS in ChurchTools: `http://localhost:5174`

---

## Project Structure

```
/Users/mgoth/extensions/Zeiterfassung/
├── docs/                           # Dokumentation
│   ├── README.md                   # Entry Point
│   ├── PROJECT-OVERVIEW.md         # Diese Datei
│   ├── USER-REQUIREMENTS.md        # Sacred User Requirements
│   ├── ARCHITECTURE.md             # Design Decisions
│   ├── KNOWN-ISSUES.md             # Probleme & Lösungen
│   ├── IMPLEMENTATION.md           # Features & Details
│   ├── MAINTENANCE.md              # Git & Workflows
│   └── TODO.md                     # Roadmap
├── src/
│   ├── entry-points/
│   │   ├── main.ts                 # Hauptmodul (3347 Zeilen)
│   │   └── admin.ts                # Admin-Modul (1640 Zeilen)
│   ├── components/                 # Keine Vue-Components (Vanilla)
│   ├── types/                      # TypeScript Interfaces
│   ├── utils/                      # Helper Functions
│   │   └── kv-store.ts            # ⚠️ Hat Bug, siehe KNOWN-ISSUES
│   └── lib/                        # Framework (nicht ändern)
├── releases/                       # Built ZIPs
├── manifest.json                   # Extension Config
├── vite.config.ts                  # Build Config
├── package.json                    # Dependencies
└── .env                            # Environment (nicht committen!)
```

---

## Common Issues & Quick Fixes

### Extension nicht sichtbar in ChurchTools

**Check:**
1. Extension aktiviert in ChurchTools?
2. Dev Server läuft (`npm run dev`)?
3. CORS korrekt konfiguriert?
4. Browser Console für Errors checken

**Fix:**
- Browser Hard Refresh (Cmd+Shift+R / Ctrl+Shift+F5)
- Extension neu hochladen
- ChurchTools logout/login

---

### Hot Reload funktioniert nicht

**Check:**
1. Dev Server läuft?
2. Vite Config korrekt?
3. Browser Console für WebSocket Errors

**Fix:**
- Dev Server neu starten
- Browser Hard Refresh
- Extension neu hochladen

---

### Kategorien nicht editierbar nach Reload

**Symptom:**
- Edit/Delete Buttons reagieren nicht
- Console zeigt: `categoryId: 65` (Zahl statt String)

**Root Cause:**
KV-Store ID Bug - siehe [KNOWN-ISSUES.md](KNOWN-ISSUES.md#problem-kategorien-nicht-löschbar-nach-reload)

**Quick Fix:**
- Check `loadWorkCategories()` verwendet direkte API-Calls
- NIEMALS `getCustomDataValues()` verwenden!

---

### Excel Import zeigt keine Daten

**Symptom:**
- Import Notification erscheint
- Bulk Dialog bleibt leer

**Root Cause:**
`showBulkEntry = true` fehlt

**Quick Fix:**
Siehe [KNOWN-ISSUES.md](KNOWN-ISSUES.md#problem-excel-import-zeigt-keine-daten-in-ui)

---

## Tech Stack

### Core
- **Framework:** Vanilla TypeScript (kein React/Vue/Angular)
- **Build Tool:** Vite 7.x
- **Language:** TypeScript 5.x
- **Extension API:** ChurchTools Extension Points

### Libraries
- **xlsx** (^0.18.x) - Excel Import/Export
- **@churchtools/churchtools-client** - ChurchTools API
- **@churchtools/extension-points** - Extension Framework

### Development
- **Hot Module Replacement:** Via Vite (funktioniert perfekt!)
- **TypeScript:** Strict Mode disabled (wegen Boilerplate)
- **Linting:** Keine Config (noch)

---

## Environment & Credentials

### Test Instance
- **URL:** https://mgtest.church.tools
- **User:** churchtools
- **Password:** churchtools
- **CORS:** http://localhost:5173 (oder 5174)

### Production
- Noch nicht deployed
- Custom CORS Config pro Instanz nötig

---

## File Naming Conventions

- **Entry Points:** kebab-case.ts (`main.ts`, `admin.ts`)
- **Utils:** kebab-case.ts (`kv-store.ts`, `forms-store.ts`)
- **Types:** kebab-case.ts (`interfaces.ts`)
- **Docs:** SCREAMING-KEBAB.md (`README.md`, `KNOWN-ISSUES.md`)

---

## Key Technologies & Patterns

### ChurchTools Extension Points

**main (Entry Point):**
- Target: Main ChurchTools navigation
- Renders: Time Tracker UI für Endnutzer
- Access: Alle User mit Extension-Permission

**admin (Entry Point):**
- Target: Admin Settings area
- Renders: Category Management UI
- Access: Nur Admins

### KV-Store (Custom Modules)

**Storage:**
- Modul: `timetracker`
- Categories: `timeentries`, `workcategories`, `settings`
- Format: JSON Strings in CustomDataValues

**⚠️ CRITICAL BUG:**
`getCustomDataValues()` hat Bug - siehe [ARCHITECTURE.md](ARCHITECTURE.md#1-️-kv-store-id-problematik-sehr-wichtig)

### Direct API Calls

**Warum notwendig:**
KV-Store Helper hat ID-Bug, daher direkte Calls:
- `churchtoolsClient.get('/custommodules/...')`
- Manuelles JSON Parsing
- Separate kvStoreId Verwaltung

Siehe [ARCHITECTURE.md](ARCHITECTURE.md) für Details.

---

## Testing Checklist

**Vor jedem Commit:**
- [ ] `npm run build` läuft ohne Errors
- [ ] Features getestet in ChurchTools
- [ ] Browser Console keine Errors
- [ ] Notifications funktionieren korrekt
- [ ] Nach Reload: Features funktionieren noch

**Manual Test Scenarios:**
- [ ] Clock-In → Timer läuft → Clock-Out
- [ ] Manual Entry → Create/Edit/Delete
- [ ] Excel Import → Bulk Dialog → Save
- [ ] Category Create/Edit/Delete
- [ ] Category Delete mit Entries → Reassignment

Siehe [MAINTENANCE.md - Testing](MAINTENANCE.md#testing--quality-checks) für Details.

---

## Quick Links

### Dokumentation
- [USER-REQUIREMENTS.md](USER-REQUIREMENTS.md) - Was will der User? (Sacred!)
- [ARCHITECTURE.md](ARCHITECTURE.md) - Warum so gebaut?
- [KNOWN-ISSUES.md](KNOWN-ISSUES.md) - Probleme & Lösungen
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Features & Technical Details
- [MAINTENANCE.md](MAINTENANCE.md) - Git Workflow & Regeln
- [TODO.md](TODO.md) - Was steht an?

### External
- [ChurchTools Extension Boilerplate](https://github.com/churchtools/extension-boilerplate/tree/entry-points)
- [ChurchTools API Docs](https://api.church.tools/)
- [ChurchTools Academy](https://churchtools.academy)

---

## Für neue KI-Assistenten

**Start hier:**
1. Lies [README.md](README.md) - Übersicht & Lesereihenfolge
2. Lies diese Datei - Setup & Quick Start
3. Lies [USER-REQUIREMENTS.md](USER-REQUIREMENTS.md) - User Wünsche (Sacred!)
4. Lies [ARCHITECTURE.md](ARCHITECTURE.md) - Kritische Design Decisions
5. Lies [KNOWN-ISSUES.md](KNOWN-ISSUES.md) - Vermeide bekannte Probleme!
6. Bei Bedarf: [IMPLEMENTATION.md](IMPLEMENTATION.md) - Feature Details

**Dann:**
- [TODO.md](TODO.md) - Was steht an?
- [MAINTENANCE.md](MAINTENANCE.md) - Workflows & Regeln
- Start Coding!

---  

**Letzte Aktualisierung:** 2025-11-23  
**Version:** 1.8.0  
**Status:** ✅ Production Ready (Phase 3 In Progress) (Phase 2 Complete)
