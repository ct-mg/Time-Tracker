# Time Tracker Extension - Dokumentation

Willkommen zur technischen Dokumentation der Time Tracker Extension für ChurchTools!

## 🤖 Für KI-Assistenten

### Beim Start einer neuen Session:

**Lesereihenfolge (WICHTIG!):**

1. **[README.md](README.md)** - Diese Datei (Übersicht)
2. **[PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md)** - Setup & Quick Start
3. **[USER-REQUIREMENTS.md](USER-REQUIREMENTS.md)** - Was will der User? (Sacred!)
4. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Kritische Design Decisions
5. **[KNOWN-ISSUES.md](KNOWN-ISSUES.md)** - **PFLICHT!** Vermeide gelöste Probleme!
6. **[TODO.md](TODO.md)** - Was steht an? Wo sind wir?
7. **[MAINTENANCE.md](MAINTENANCE.md)** - Git Workflow & Regeln

### Nach Code-Änderungen:

1. **Update:** Relevante Dokumentation
2. **Commit:** Mit aussagekräftiger Message inkl. Doku-Update
3. **Qualitätscheck:** Kann ein neuer KI-Assistent damit arbeiten?

### Kritische Regel:

> ⚠️ **NIEMALS** Code ändern ohne die Dokumentation gelesen zu haben!
> Bereits gelöste Probleme werden sonst erneut eingeführt.

---

## 🔍 Schnellzugriff

### Häufige Probleme

| Problem | Lösung in |
|---------|-----------|
| Kategorien nicht löschbar nach Reload | [KNOWN-ISSUES.md #1](KNOWN-ISSUES.md#problem-1-kategorien-nicht-löschbar-nach-reload) |
| "Unknown" als Kategorie | [KNOWN-ISSUES.md #2](KNOWN-ISSUES.md#problem-2-time-entries-zeigen-unknown-als-kategorie) |
| Excel Import zeigt keine Daten | [KNOWN-ISSUES.md #3](KNOWN-ISSUES.md#problem-3-excel-import-zeigt-keine-daten-in-ui) |
| Bulk Save speichert nichts | [KNOWN-ISSUES.md #4](KNOWN-ISSUES.md#problem-4-bulk-save-zeigt-erfolg-aber-speichert-nichts) |
| "Category not found for ID: 65" | [KNOWN-ISSUES.md - Troubleshooting](KNOWN-ISSUES.md#category-not-found-for-id-65) |

### Wichtige Code-Patterns

| Pattern | Dokumentiert in |
|---------|-----------------|
| Kategorien laden (direkte API-Calls) | [ARCHITECTURE.md #1](ARCHITECTURE.md#1-️-kv-store-id-problematik-sehr-wichtig) |
| Duale ID-Verwaltung | [ARCHITECTURE.md #2](ARCHITECTURE.md#2-zweifache-id-verwaltung-für-kategorien) |
| Toast Notifications | [ARCHITECTURE.md #3](ARCHITECTURE.md#3-notification-system) |
| Excel ohne Dropdown | [ARCHITECTURE.md #4](ARCHITECTURE.md#4-excel-importexport-ohne-dropdown) |
| Category Deletion | [ARCHITECTURE.md #5](ARCHITECTURE.md#5-category-deletion-mit-reassignment) |

### Development

| Thema | Dokumentiert in |
|-------|-----------------|
| Setup & Quick Start | [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) |
| Git Workflow | [MAINTENANCE.md - Git](MAINTENANCE.md#git-commit-workflow) |
| Testing Checklists | [MAINTENANCE.md - Testing](MAINTENANCE.md#testing--quality-checks) |
| Pre-Commit Checklist | [MAINTENANCE.md - Pre-Commit](MAINTENANCE.md#pre-commit-checklist) |

---

## 📚 Dokumentations-Übersicht

### Für Entwickler (Human oder AI)

- **[PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md)** ← Start here!
  - Setup und Konfiguration
  - Development Workflow
  - Hauptmodule (main.ts, admin.ts)
  - Common Issues (Quick Reference)

- **[USER-REQUIREMENTS.md](USER-REQUIREMENTS.md)** ← 🔒 **SACRED DOCUMENT**
  - **UNVERÄNDERLICH!** Nur mit User-Anfrage ändern
  - Notification System Requirements (Success auto-hide, Error persistent)
  - Excel Import/Export Requirements
  - Category Deletion Requirements
  - User Feedback Historie

- **[ARCHITECTURE.md](ARCHITECTURE.md)** ← Design Decisions
  - **5 Kritische Designentscheidungen** die NIEMALS geändert werden dürfen
  - KV-Store ID-Problematik (SEHR WICHTIG!)
  - Zweifache ID-Verwaltung für Kategorien
  - Notification System Architecture
  - Excel Import ohne Dropdown (Library Limitation)
  - Category Deletion mit Reassignment

- **[KNOWN-ISSUES.md](KNOWN-ISSUES.md)** ← **PFLICHTLEKTÜRE!** Problems & Solutions
  - 4 gelöste kritische Probleme
  - Ausführliche Root Cause Analysen
  - Lösungen mit Implementierungs-Details
  - Troubleshooting Guide mit Debug-Steps
  - Prevention Checklist

- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** ← Feature Details
  - Datenstrukturen (TimeEntry, WorkCategory)
  - Clock-In/Clock-Out Implementation
  - Manual Time Entries
  - Bulk Entry mit Excel
  - Category Management
  - Notification System Details
  - Best Practices

- **[MAINTENANCE.md](MAINTENANCE.md)** ← **CRITICAL** Guidelines
  - 5 Kritische Regeln die IMMER befolgt werden müssen
  - Git Commit Workflow mit Beispielen
  - Pre-Commit Checklist
  - Testing & Quality Checks
  - Troubleshooting Steps
  - Common Pitfalls

- **[TODO.md](TODO.md)** ← Current Status
  - Phase-basierter Roadmap (Phase 2: ✅ Complete)
  - Next Steps (Phase 3: Performance & UX)
  - Offene Tasks mit Prioritäten
  - Ideen aus User-Sessions
  - Bekannte Blockers

### ChurchTools Framework Dokumentation

Diese Dateien dokumentieren das ChurchTools Extension Framework (Boilerplate):

- **[getting-started.md](getting-started.md)** - Erste Schritte mit ChurchTools Extensions
- **[core-concepts.md](core-concepts.md)** - Kernkonzepte des Extension Frameworks
- **[entry-points.md](entry-points.md)** - Entry Points und deren Konfiguration
- **[key-value-store.md](key-value-store.md)** - KV-Store für Datenpersistenz
- **[communication.md](communication.md)** - Kommunikation zwischen Extension und ChurchTools
- **[api-reference.md](api-reference.md)** - API-Referenz
- **[manifest.md](manifest.md)** - Manifest-Datei Konfiguration
- **[build-and-deploy.md](build-and-deploy.md)** - Build und Deployment

---

## 📊 Dokumentations-Status

**Letzte Aktualisierung:** 2025-12-11
**Version:** 2.1 (Modular Structure mit 7 Project Docs + Activity Log)
**Status:** ✅ Vollständig und aktualisiert

### Abgedeckte Bereiche

- ✅ **Project Setup** - Quick Start Guide (PROJECT-OVERVIEW.md)
- ✅ **User Requirements** - Vollständig (USER-REQUIREMENTS.md, sacred)
- ✅ **Architecture** - 5 kritische Design Decisions (ARCHITECTURE.md)
- ✅ **Known Issues** - 4 gelöste Probleme mit Lösungen (KNOWN-ISSUES.md)
- ✅ **Implementation** - Alle Features dokumentiert (IMPLEMENTATION.md)
- ✅ **Maintenance** - Git Workflow, Regeln (MAINTENANCE.md)
- ✅ **TODO** - Phase-basierter Roadmap (TODO.md)

### Vorteile der modularen Struktur

**Wie ctforms (Best Practice):**
- ✅ 7 fokussierte Dateien statt einer großen
- ✅ PROJECT-OVERVIEW.md für schnellen Einstieg
- ✅ USER-REQUIREMENTS.md isoliert und sacred
- ✅ ARCHITECTURE.md nur Design Decisions
- ✅ **KNOWN-ISSUES.md sehr prominent** (wichtigste Verbesserung!)
- ✅ IMPLEMENTATION.md schlank, nur Features
- ✅ MAINTENANCE.md mit Git Workflow
- ✅ TODO.md mit Phase-Tracking
- ✅ Keine Code-Beispiele (Token-effizient)

---

## 💡 Qualitätskriterien

Gute Dokumentation ermöglicht:

- ✅ Schneller Einstieg für neue KI-Assistenten (< 5 Minuten Lesezeit)
- ✅ Vermeidung bereits gelöster Probleme (KNOWN-ISSUES.md!)
- ✅ Nachvollziehbare Designentscheidungen (WHY, nicht nur WHAT)
- ✅ Kontinuierliche Weiterentwicklung ohne Wissensverlust
- ✅ Respektierung von User Requirements (Sacred Document)

---

## 📝 Dokumentations-Pflege

### Verantwortung

- **Alle KI-Assistenten** sind verantwortlich für die Aktualität
- **Nach jeder Code-Änderung** muss die Dokumentation aktualisiert werden
- **Neue Probleme und Lösungen** sofort in KNOWN-ISSUES.md dokumentieren
- **TODO.md** kontinuierlich pflegen (Status, Progress)

### Wann welche Datei updaten?

| Änderung | Update Datei |
|----------|--------------|
| Setup/Config geändert | PROJECT-OVERVIEW.md |
| User Feedback/Requirement | USER-REQUIREMENTS.md |
| Design Decision getroffen | ARCHITECTURE.md |
| Problem gelöst | KNOWN-ISSUES.md |
| Feature implementiert | IMPLEMENTATION.md |
| Workflow/Best Practice | MAINTENANCE.md |
| Feature completed/started | TODO.md |
| Jede Änderung | docs/README.md (Datum) |

---

## ⚠️ Wichtige Hinweise

### User-Entscheidungen (NIEMALS ändern!)

- ✅ **Success Toasts auto-hide** (3s)
- ✅ **Error Toasts persistent** (manuell close)
- ✅ **Excel Zwei-Sheet Ansatz** (kein Dropdown möglich)
- ✅ **Category Deletion mit Reassignment** (kein Cascade Delete)
- ✅ **Port 5173** (oder 5174 bei Conflict)

### Critical Patterns (IMMER befolgen!)

- ✅ **NIEMALS `getCustomDataValues()`** für Categories/Entries - direkte API-Calls!
- ✅ **Duale IDs:** String-ID + kvStoreId für WorkCategory
- ✅ **Event Handler:** Bei jedem `render()` neu attachen
- ✅ **State Flags:** Vor `render()` setzen (z.B. `showBulkEntry = true`)
- ✅ **Reload:** Nach DB-Operations immer `load...()` aufrufen
- ✅ **Toasts:** NIEMALS `alert()`, nur Custom Toast System
- ✅ **Commits:** Regelmäßig mit meaningful messages (siehe MAINTENANCE.md)

---

## 🆘 Support & Hilfe

### Bei Problemen:

1. **Check KNOWN-ISSUES.md** - Problem schon gelöst?
2. **Check Browser Console** (F12) - Echter Fehler?
3. **Check Dev Server Output** - Build-Fehler?
4. **Check Git History** - Was hat sich geändert?

### Bei Unklarheiten:

1. **Check USER-REQUIREMENTS.md** - Was will der User?
2. **Check ARCHITECTURE.md** - Warum wurde das so gemacht?
3. **Ask User** - Lieber fragen als falsch implementieren!

---

## 🚀 Quick Start für neue KI-Assistenten

### Dokumentation lesen (10 Minuten):

1. [README.md](README.md) - Diese Datei (Übersicht)
2. [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) - Setup & Quick Start
3. [USER-REQUIREMENTS.md](USER-REQUIREMENTS.md) - User Wünsche
4. [ARCHITECTURE.md](ARCHITECTURE.md) - Design Decisions
5. [KNOWN-ISSUES.md](KNOWN-ISSUES.md) - **PFLICHT!** Gelöste Probleme
6. [TODO.md](TODO.md) - Aktueller Stand

### Projekt Status verstehen:

- Was ist fertig? **Phase 5: 95% Complete**
- Was ist next? Wartung & Feature-Requests
- Gibt es Blocker? Siehe [TODO.md](TODO.md) - Activity Log Display aktuell live!

### Development starten:

```bash
# 1. Dependencies installieren (falls noch nicht)
npm install

# 2. Dev Server starten
npm run dev
# → http://localhost:5173 (oder 5174)

# 3. In ChurchTools testen
# → mgtest.church.tools
# → Credentials: churchtools / churchtools

# 4. Code ändern
# → Hot Reload funktioniert!
# → Changes erscheinen sofort

# 5. Regelmäßig committen
git add .
git commit -m "feat/fix: description"
```

---

## 📦 Projekt-Struktur

```
docs/
├── README.md                    # Diese Datei - Einstiegspunkt ⭐
├── PROJECT-OVERVIEW.md          # Setup, Quick Start, Common Issues
├── USER-REQUIREMENTS.md         # Sacred - User Anforderungen 🔒
├── ARCHITECTURE.md              # 5 kritische Design Decisions ⚠️
├── KNOWN-ISSUES.md              # Gelöste Probleme & Lösungen 🔧
├── IMPLEMENTATION.md            # Feature Details & Best Practices
├── MAINTENANCE.md               # Git Workflow, Regeln, Checklists
├── TODO.md                      # Roadmap, Tasks, Priorities
│
├── getting-started.md           # ChurchTools Framework
├── core-concepts.md             # ChurchTools Framework
├── entry-points.md              # ChurchTools Framework
├── key-value-store.md           # ChurchTools Framework
├── communication.md             # ChurchTools Framework
├── api-reference.md             # ChurchTools Framework
├── manifest.md                  # ChurchTools Framework
└── build-and-deploy.md          # ChurchTools Framework
```

---

## 💡 Lessons Learned

### Dokumentations-Evolution:

**v1.0:** Eine große Datei (1354 Zeilen)
- ❌ Schwer zu navigieren
- ❌ Alles vermischt
- ❌ Viele Code-Beispiele (Token-ineffizient)

**v2.0:** Modular wie ctforms (7 Dateien)
- ✅ PROJECT-OVERVIEW für Quick Start
- ✅ USER-REQUIREMENTS isoliert (sacred)
- ✅ ARCHITECTURE nur Design Decisions
- ✅ **KNOWN-ISSUES sehr prominent** (Killer-Feature!)
- ✅ IMPLEMENTATION schlank, nur Features
- ✅ MAINTENANCE mit Git Workflow
- ✅ TODO mit Phase-Tracking
- ✅ Keine Code-Beispiele mehr

### Best Practices aus beiden Projekten:

**Von ctforms gelernt:**
- Modulare Struktur (Separation of Concerns)
- KNOWN-ISSUES als separate Datei (sehr wichtig!)
- PROJECT-OVERVIEW für Einstieg

**Von Zeiterfassung beibehalten:**
- Schnellzugriff-Tables für häufige Probleme
- Prominent "Für KI-Assistenten" Sections
- Detaillierte Root Cause Analysen
- Konkrete Location-Angaben (file:lines)

---

**Maintainer:** Entwickelt mit Google Deepmind Antigravity
**Letzte Aktualisierung:** 2025-12-11
**Version:** 2.1 - Vollständig dokumentiert (95% Feature Complete)
