# TODO & Roadmap - Time Tracker Extension

> **🤖 Für KI-Assistenten:**
>
> Prüfe diese Liste bei jeder Session und arbeite offene Punkte ab. Füge neue Ideen und Aufgaben hinzu, damit sie nicht verloren gehen.

---

## Aktueller Status

**Letztes Update:** 2025-01-22
**Aktuelle Phase:** Phase 2 - Stabilisierung & Bug Fixes ✅
**Nächste Phase:** Phase 3 - Performance & UX Improvements

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

---

## Phase 3: Performance & UX ⏳ IN PLANUNG

### 🔴 Priorität: Hoch

#### Performance-Optimierung bei vielen Einträgen
**Problem:** Bei >1000 Einträgen wird Rendering langsam
**Lösung:** Virtual Scrolling für Time Entries Tabelle
**Status:** Offen
**Aufwand:** Mittel (Library: react-virtual oder custom)
**User Impact:** Hoch

**Implementierungs-Schritte:**
1. Benchmark: Messen ab wie vielen Einträgen es langsam wird
2. Library Evaluation (react-virtual, react-window)
3. Integration in Time Entries Tabelle
4. Testing mit 1000+, 5000+, 10000+ Einträgen

---

#### Time Entry Edit nicht persistent nach Reload
**Problem:** Bearbeitete Einträge werden nicht korrekt gespeichert
**Ursache:** Noch nicht diagnostiziert
**Status:** Offen
**Priorität:** Kritisch (wenn Bug bestätigt)

**Diagnose-Schritte:**
1. Edit Entry testen und Reload
2. Check ob Update API Call erfolgt
3. Check ob kvStoreId korrekt verwendet wird

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

#### Filter & Search Verbesserungen
**Features:**
- Filter nach Datumsbereich
- Filter nach User (für Manager)
- Search in Description
- Kombinierte Filter

**Status:** Offen
**Aufwand:** Mittel

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
- ⏳ User Manual (für Endnutzer, nicht Entwickler)
- ⏳ API Documentation (wenn public API)

### Testing
- ⏳ Unit Tests (Vitest)
- ⏳ Integration Tests
- ⏳ E2E Tests (Playwright)

### Code Quality
- ⏳ ESLint Configuration
- ⏳ Prettier Configuration
- ⏳ TypeScript Strict Mode (aktuell nicht)
- ⏳ Code Coverage Tracking

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
