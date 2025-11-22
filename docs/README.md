# Time Tracker Extension - Dokumentation

Willkommen zur technischen Dokumentation der Time Tracker Extension für ChurchTools!

## 📚 Dokumentations-Übersicht

### Für Entwickler & KI-Assistenten

Diese Dokumentation ist modular aufgebaut und folgt Best Practices für langfristige Wartbarkeit:

- **[USER-REQUIREMENTS.md](USER-REQUIREMENTS.md)** 🔒 **SACRED DOCUMENT**
  - Alle User-Anforderungen und Entscheidungen
  - **NIEMALS ohne User-Anfrage ändern!**
  - Feedback-Historie
  - Rejected Features mit Begründung

- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** ⭐ **TECHNISCHES HERZSTÜCK**
  - Vollständige technische Implementierungsdokumentation
  - Kritische Designentscheidungen und ihre Begründungen
  - Bekannte Probleme und deren Lösungen
  - Best Practices und Troubleshooting
  - **PFLICHTLEKTÜRE vor Code-Änderungen!**

- **[MAINTENANCE.md](MAINTENANCE.md)** 🔧 **WORKFLOW & REGELN**
  - Kritische Regeln die IMMER befolgt werden müssen
  - Git Commit Workflow mit Beispielen
  - Dokumentations-Pflege Guidelines
  - Pre-Commit Checklists
  - Testing Guidelines

- **[TODO.md](TODO.md)** 📋 **ROADMAP & TASKS**
  - Phase-basierte Task-Übersicht
  - Offene Aufgaben mit Prioritäten
  - Ideen aus User-Sessions
  - Abgeschlossene Tasks (Historie)
  - Bekannte Probleme & Blockers

### ChurchTools Framework Dokumentation

Die folgenden Dateien dokumentieren das ChurchTools Extension Framework:

- **[getting-started.md](getting-started.md)** - Erste Schritte mit ChurchTools Extensions
- **[core-concepts.md](core-concepts.md)** - Kernkonzepte des Extension Frameworks
- **[entry-points.md](entry-points.md)** - Entry Points und deren Konfiguration
- **[key-value-store.md](key-value-store.md)** - KV-Store für Datenpersistenz
- **[communication.md](communication.md)** - Kommunikation zwischen Extension und ChurchTools
- **[api-reference.md](api-reference.md)** - API-Referenz
- **[manifest.md](manifest.md)** - Manifest-Datei Konfiguration
- **[build-and-deploy.md](build-and-deploy.md)** - Build und Deployment

---

## 🤖 Für KI-Assistenten

### Beim Start einer neuen Session:

**Lesereihenfolge (WICHTIG!):**

1. **[docs/README.md](README.md)** - Diese Datei (Übersicht)
2. **[USER-REQUIREMENTS.md](USER-REQUIREMENTS.md)** - Was will der User? (Nicht ändern!)
3. **[TODO.md](TODO.md)** - Was steht an? Wo sind wir?
4. **[MAINTENANCE.md](MAINTENANCE.md)** - Welche Regeln muss ich befolgen?
5. **[IMPLEMENTATION.md](IMPLEMENTATION.md)** - Wie ist es technisch umgesetzt?

**Warum diese Reihenfolge?**
- Verstehe zuerst die User-Anforderungen (Sacred!)
- Dann den aktuellen Status und offene Tasks
- Dann die Regeln und Workflows
- Dann die technischen Details

### Nach Code-Änderungen:

**Welche Datei updaten?**

| Änderung | Datei | Pflicht? |
|----------|-------|----------|
| Neues Feature implementiert | IMPLEMENTATION.md | ✅ Ja |
| Bug gefixed | IMPLEMENTATION.md | ✅ Ja |
| Task abgeschlossen | TODO.md | ✅ Ja |
| Neue Idee aus User-Session | TODO.md | ✅ Ja |
| Neue Best Practice entdeckt | MAINTENANCE.md | ⚠️ Bei Bedarf |
| Neue User-Anforderung | USER-REQUIREMENTS.md | ⚠️ Nur mit User! |
| Git Commit | - | ✅ Immer! |

**Update-Reihenfolge:**
1. Code ändern und testen
2. IMPLEMENTATION.md updaten (Problem/Lösung dokumentieren)
3. TODO.md updaten (Task verschieben oder neue hinzufügen)
4. MAINTENANCE.md nur wenn neue kritische Regel
5. Pre-Commit Check (siehe MAINTENANCE.md)
6. **GIT COMMIT** mit aussagekräftiger Message
7. Nie alle Updates auf einmal - nach jedem logischen Unit committen!

### Kritische Regeln:

> ⚠️ **Diese Regeln NIEMALS brechen!**

1. **NIEMALS `getCustomDataValues()` für Kategorien oder Time Entries verwenden**
   - Hat Bug: Überschreibt String-IDs mit numerischen IDs
   - Immer direkte API-Calls nutzen
   - Details: [IMPLEMENTATION.md - Kritische Designentscheidungen #1](IMPLEMENTATION.md#1-️-kv-store-id-problematik-sehr-wichtig)

2. **NIEMALS `alert()` verwenden - nur Toast Notifications**
   - User-Anforderung: Success auto-hide, Errors persistent
   - Details: [USER-REQUIREMENTS.md - Notification System](USER-REQUIREMENTS.md#1-notification-system-kritisch)

3. **Event Handlers bei JEDEM Render neu attachen**
   - HTML wird komplett neu generiert
   - Alte Listener gehen verloren
   - Details: [MAINTENANCE.md - Kritische Regeln #2](MAINTENANCE.md#2-️-event-handler-bei-jedem-render-neu-attachen)

4. **Zwei IDs für WorkCategory verwalten**
   - `id` (string): User-facing, unveränderlich
   - `kvStoreId` (number): Nur für DB-Operations
   - Details: [IMPLEMENTATION.md - Kritische Designentscheidungen #2](IMPLEMENTATION.md#2-zweifache-id-verwaltung-für-kategorien)

5. **Nach Code-Änderungen IMMER committen**
   - Nach jedem Feature/Fix committen
   - Niemals alles am Ende
   - Details: [MAINTENANCE.md - Git Commit Workflow](MAINTENANCE.md#git-commit-workflow)

---

## 🔍 Schnellzugriff

### Häufige Probleme

| Problem | Lösung in |
|---------|-----------|
| Kategorien nicht löschbar nach Reload | [IMPLEMENTATION.md - Bekannte Probleme](IMPLEMENTATION.md#problem-kategorien-nicht-löschbar-nach-reload) |
| "Unknown" als Kategorie | [IMPLEMENTATION.md - Bekannte Probleme](IMPLEMENTATION.md#problem-time-entries-zeigen-unknown-als-kategorie) |
| Excel Import zeigt keine Daten | [IMPLEMENTATION.md - Bekannte Probleme](IMPLEMENTATION.md#problem-excel-import-zeigt-keine-daten-in-ui) |
| Notifications verschwinden/bleiben | [IMPLEMENTATION.md - Troubleshooting](IMPLEMENTATION.md#notifications-verschwinden-zu-schnell--nicht) |
| "Category not found for ID: 65" | [IMPLEMENTATION.md - Troubleshooting](IMPLEMENTATION.md#category-not-found-for-id-65) |

### Wichtige Code-Patterns

| Pattern | Dokumentiert in |
|---------|-----------------|
| Kategorien laden (direkte API-Calls) | [IMPLEMENTATION.md - Design Decision #1](IMPLEMENTATION.md#1-️-kv-store-id-problematik-sehr-wichtig) |
| Event Handler attachen | [MAINTENANCE.md - Kritische Regel #2](MAINTENANCE.md#2-️-event-handler-bei-jedem-render-neu-attachen) |
| Notifications anzeigen | [IMPLEMENTATION.md - Design Decision #3](IMPLEMENTATION.md#3-notification-system) |
| Excel Import/Export | [IMPLEMENTATION.md - Design Decision #4](IMPLEMENTATION.md#4-excel-importexport) |
| Category Deletion mit Reassignment | [IMPLEMENTATION.md - Design Decision #5](IMPLEMENTATION.md#5-category-deletion-mit-reassignment) |

### Entwicklung

| Thema | Dokumentiert in |
|-------|-----------------|
| Setup & Development Start | [MAINTENANCE.md - Development Workflow](MAINTENANCE.md#development-workflow) |
| Build & Deployment | [build-and-deploy.md](build-and-deploy.md) |
| Testing Checklists | [MAINTENANCE.md - Testing](MAINTENANCE.md#testing--quality-checks) |
| ChurchTools API | [api-reference.md](api-reference.md) |

---

## 📊 Dokumentations-Status

**Letzte Aktualisierung:** 2025-01-22
**Version:** 2.0 (Modular Structure)
**Status:** ✅ Vollständig und aktuell

### Was ist dokumentiert?

- ✅ **User Requirements** - Vollständig (sacred document)
- ✅ **Technical Implementation** - Vollständig mit allen Features
- ✅ **Maintenance Guidelines** - Git Workflow, Regeln, Checklists
- ✅ **TODO & Roadmap** - Phase-basiert mit Prioritäten
- ✅ **Kritische Designentscheidungen** - Alle erklärt mit Begründung
- ✅ **Bekannte Probleme** - Alle mit Lösungen dokumentiert
- ✅ **Best Practices** - Patterns und Anti-Patterns
- ✅ **Troubleshooting** - Häufige Probleme mit Debug-Steps

### Vorteile der modularen Struktur

**Vorher (eine große Datei):**
- ❌ 1354 Zeilen in timetracker-implementation.md
- ❌ Schwer zu navigieren
- ❌ User Requirements vermischt mit technischen Details
- ❌ Code-Beispiele verbrauchen viele Tokens

**Nachher (vier fokussierte Dateien):**
- ✅ USER-REQUIREMENTS.md (~300 Zeilen) - Sacred, isoliert
- ✅ IMPLEMENTATION.md (~900 Zeilen) - Technische Details **OHNE Code**
- ✅ MAINTENANCE.md (~400 Zeilen) - Workflows und Regeln
- ✅ TODO.md (~350 Zeilen) - Roadmap und Tasks
- ✅ **Keine Code-Beispiele** - Spart Tokens, Code ist im Code
- ✅ Klare Verantwortlichkeiten
- ✅ Schnellerer Zugriff auf relevante Infos

---

## 💡 Lessons Learned

### Von ctforms Projekt gelernt:
- ✅ Modular structure (separate files by purpose)
- ✅ USER-REQUIREMENTS.md als sacred document
- ✅ Phase-based TODO tracking
- ✅ Central README.md als Einstiegspunkt

### Von Zeiterfassung (diesem Projekt) gelernt:
- ✅ Prominent "For AI Assistants" sections
- ✅ Detailed known problems with solutions
- ✅ Schnellzugriff tables for common issues
- ✅ Documentation status tracking

### Beste Kombination beider Ansätze:
- ✅ Modular wie ctforms
- ✅ Detailed wie Zeiterfassung
- ✅ Kein Code in Docs (Token-Saving)
- ✅ Quick Reference Tables
- ✅ Klare Lesereihenfolge für KI-Assistenten

---

## 📝 Dokumentations-Pflege Prozess

### Wann welche Datei updaten?

**Nach Feature-Implementation:**
```
1. Code schreiben und testen
2. IMPLEMENTATION.md: Feature dokumentieren
3. TODO.md: Task von "In Progress" → "Completed"
4. Git Commit mit Feature-Beschreibung
```

**Nach Bug-Fix:**
```
1. Bug fixen und testen
2. IMPLEMENTATION.md: Problem + Lösung in "Bekannte Probleme"
3. TODO.md: Falls Bug in Liste war → "Completed"
4. Git Commit mit Fix-Beschreibung
```

**Nach User-Session mit neuen Anforderungen:**
```
1. USER-REQUIREMENTS.md: Neue Anforderung dokumentieren
2. TODO.md: Neue Tasks hinzufügen
3. Git Commit: "docs: Add new user requirements from session"
```

**Neue Best Practice entdeckt:**
```
1. MAINTENANCE.md: Rule hinzufügen
2. IMPLEMENTATION.md: Ggf. Design Decision dokumentieren
3. Git Commit: "docs: Add new best practice for X"
```

### Qualitätskriterien

**Gute Dokumentation ermöglicht:**
- ✅ Neuer KI-Assistent kann sofort produktiv arbeiten
- ✅ Bekannte Probleme werden nicht erneut eingeführt
- ✅ Designentscheidungen sind nachvollziehbar
- ✅ User-Anforderungen bleiben respektiert
- ✅ TODO-Liste zeigt aktuellen Stand
- ✅ Git-Historie ist aussagekräftig

---

## 🎯 Next Steps

Siehe [TODO.md - Aktuelle Phase](TODO.md#aktueller-status) für Details.

**Current Focus:** Phase 3 - Performance & UX Improvements

**Top Priorities:**
1. Performance-Optimierung für >1000 Einträge (Virtual Scrolling)
2. Bulk Edit für Time Entries
3. Enhanced Filter & Search

---

## 🆘 Hilfe & Support

### Bei Problemen

1. **Check Dokumentation**
   - [IMPLEMENTATION.md - Bekannte Probleme](IMPLEMENTATION.md#bekannte-probleme-und-lösungen)
   - [IMPLEMENTATION.md - Troubleshooting](IMPLEMENTATION.md#troubleshooting)

2. **Check Browser Console**
   - F12 → Console Tab
   - Suche nach Errors
   - Check Network Tab für API Calls

3. **Check Git History**
   ```bash
   git log --oneline -10
   git log --grep="category"
   ```

4. **Dokumentiere neue Findings**
   - Füge zu IMPLEMENTATION.md hinzu
   - Hilft zukünftigen Entwicklern

### Bei unklaren Requirements

1. **Check USER-REQUIREMENTS.md**
   - Original Spezifikation
   - User Decisions

2. **Ask User**
   - Nicht raten oder annehmen
   - Besser fragen als falsch implementieren

---

## 📦 Projekt-Struktur

```
docs/
├── README.md                    # Diese Datei - Einstiegspunkt
├── USER-REQUIREMENTS.md         # Sacred - User Anforderungen
├── IMPLEMENTATION.md            # Technical Details (ohne Code!)
├── MAINTENANCE.md               # Workflows, Regeln, Git
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

**Maintainer:** Entwickelt mit Claude (Anthropic)
**Letzte Aktualisierung:** 2025-01-22
**Version:** 2.0 - Modular Structure
