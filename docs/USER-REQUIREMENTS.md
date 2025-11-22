# User Requirements - Time Tracker Extension

> **⚠️ SACRED DOCUMENT - DO NOT CHANGE USER DECISIONS!**
>
> This document contains all user requirements, decisions, and feedback. These are FIXED and must not be altered by AI assistants.

## Übersicht

Die Time Tracker Extension ist eine Zeiterfassungs-Lösung für ChurchTools mit folgenden Kernfunktionen:

- Clock-in/Clock-out Zeiterfassung
- Manuelle Zeiteinträge
- Bulk-Import via Excel
- Kategorie-Management
- Abwesenheitsverwaltung
- Reports und Statistiken

---

## User Decisions & Requirements

### 1. Notification System (KRITISCH!)

**User Requirement:**
- **Erfolgs-Meldungen**: MÜSSEN automatisch nach 3 Sekunden verschwinden
- **Fehler-Meldungen**: MÜSSEN dauerhaft sichtbar bleiben bis User sie manuell schließt
- **Warnungen**: MÜSSEN dauerhaft sichtbar bleiben bis User sie manuell schließt

**Begründung:**
- Success: User will weiterarbeiten, Meldung soll nicht stören
- Error/Warning: User muss Fehler lesen und verstehen, darf nicht automatisch verschwinden

**Implementation:**
- Keine `alert()` oder `confirm()` für Meldungen
- Custom Toast-System mit Slide-in Animation
- Stacking für mehrere gleichzeitige Notifications
- Close-Button nur für Error/Warning

**Status:** ✅ Implementiert

---

### 2. Excel Import/Export

**User Requirement:**
- Excel-Template zum Download
- Import von Zeiteinträgen via Excel
- Export von Zeiteinträgen nach Excel
- Validierung beim Import mit klaren Fehlermeldungen

**Spezifische Anforderungen:**
1. **Template mit zwei Sheets:**
   - Sheet 1: "Time Entries" - Eingabebereich
   - Sheet 2: "Available Categories" - Nachschlagebereich

2. **Validierung:**
   - Alle Pflichtfelder müssen gefüllt sein
   - End Time muss nach Start Time liegen
   - Category IDs müssen existieren
   - Bei Fehlern: Detaillierte Meldung mit Row-Nummern und verfügbaren IDs

3. **User Feedback:**
   - Nach Import: Erfolgs-Notification mit Anzahl importierter Einträge
   - Bulk Entry Dialog muss automatisch öffnen
   - Imported Data muss sofort sichtbar sein

**Nice-to-Have (aber nicht möglich):**
- Dropdown in Excel für Category-Auswahl
- **Grund:** xlsx Library unterstützt keine Excel Data Validation
- **Akzeptiert:** Copy/Paste aus "Available Categories" Sheet

**Status:** ✅ Implementiert

---

### 3. Category Deletion mit Reassignment

**User Requirement:**
- Kategorien können gelöscht werden
- Wenn Zeiteinträge diese Kategorie verwenden: User muss Ersatzkategorie wählen
- Automatische Neu-Zuweisung aller betroffenen Einträge
- Klare Kommunikation: Wie viele Einträge sind betroffen?

**Workflow:**
1. User klickt Delete auf Kategorie
2. System prüft: Gibt es Zeiteinträge mit dieser Kategorie?
3. Falls ja: Dialog mit:
   - Anzahl betroffener Einträge
   - Dropdown zur Auswahl der Ersatzkategorie
   - Buttons: "Kategorie löschen und Einträge neu zuweisen" / "Abbrechen"
4. Nach Bestätigung: Alle Einträge werden neu zugewiesen, dann Kategorie gelöscht

**User Feedback:**
- User will nicht versehentlich Einträge verlieren
- User will wissen, was passiert
- User will selbst entscheiden, welche Ersatzkategorie verwendet wird

**Status:** ✅ Implementiert

---

### 4. Category Management

**User Requirements:**
1. **Kategorie erstellen:**
   - Name (required)
   - Color (required, Color Picker)
   - ID wird automatisch aus Name generiert

2. **Kategorie bearbeiten:**
   - Name ändern
   - Color ändern
   - ID bleibt unveränderlich (damit Referenzen nicht brechen)

3. **Kategorie löschen:**
   - Siehe "Category Deletion mit Reassignment"

**ID-Generierung:**
- Lowercase
- Umlaute ersetzen (ä→ae, ö→oe, ü→ue)
- Nur alphanumerische Zeichen
- Max 20 Zeichen

**Beispiel:**
- Name: "Büro Arbeit" → ID: "bueroarbeit"
- Name: "Pastoral Care" → ID: "pastoralcare"

**Status:** ✅ Implementiert

---

## Rejected Features / Decisions

### 1. Alert() für Notifications

**User Decision:** NEIN zu `alert()`, `confirm()`, `prompt()`

**Grund:** Schlechte UX, unterbricht Workflow, nicht anpassbar

**Alternative:** Custom Toast Notification System

---

### 2. Excel Dropdown für Kategorien

**User Decision:** Nice-to-have, aber nicht kritisch

**Technical Limitation:** xlsx Library unterstützt keine Excel Data Validation

**Accepted Workaround:** Copy/Paste aus "Available Categories" Sheet

**Status:** Akzeptiert, nicht implementiert

---

## Future Enhancements (User Wishlist)

Diese Features wurden diskutiert und sind für zukünftige Versionen interessant:

### Performance-Optimierung
- **Wenn:** >1000 Einträge werden langsam
- **Lösung:** Virtual Scrolling für Time Entries Tabelle
- **Priorität:** Mittel

### Bulk Edit
- **Use Case:** 10 Einträge mit falscher Kategorie korrigieren
- **Feature:** Multi-Select + Kategorie-Änderung für mehrere Einträge
- **Priorität:** Niedrig

### Dark Mode
- **Use Case:** Bessere Lesbarkeit bei Nacht
- **Feature:** Dark Mode Toggle in Settings
- **Priorität:** Niedrig

### Time Entry Templates
- **Use Case:** "Montags Meeting 9-10 Uhr" als wiederverwendbares Template
- **Feature:** Templates speichern und anwenden
- **Priorität:** Niedrig

### Approval Workflow
- **Use Case:** Vorgesetzte müssen Zeiteinträge genehmigen
- **Feature:** Status (pending, approved, rejected) + Admin-Genehmigung
- **Priorität:** Mittel (für größere Organisationen)

### Team Dashboard
- **Use Case:** Manager sieht Zeiteinträge des Teams
- **Feature:** Team-Übersicht, Aggregierte Statistiken, Filter
- **Priorität:** Hoch (für Manager-Rolle)

---

## Technical Constraints & Limitations

### ChurchTools KV-Store

**Constraint:** Custom Module Data Values speichern nur JSON Strings

**Impact:**
- Komplexe Datenstrukturen müssen serialisiert werden
- Parse/Stringify bei jedem Zugriff
- Keine direkten Queries möglich

**Accepted:** Teil der ChurchTools Extension API

---

### ChurchTools API

**Constraint:** ChurchTools API hat keine bulk operations

**Impact:**
- Bulk-Import muss jeden Eintrag einzeln speichern
- Bei 100 Einträgen = 100 API-Calls
- Performance-Problem bei sehr großen Imports

**Accepted:** Technische Limitation der Plattform

---

## User Feedback History

### Session 2025-01-22

**Feedback:**
1. "Excel Import öffnet nicht automatisch den Bulk Entry Dialog"
   - **Fixed:** `showBulkEntry = true` hinzugefügt

2. "Kategorien können nach Reload nicht mehr bearbeitet werden"
   - **Fixed:** KV-Store ID Problem behoben mit direkten API-Calls

3. "Error Notifications verschwinden zu schnell"
   - **Fixed:** Persistent errors mit Close-Button

4. "Validation-Fehler sind nicht klar genug"
   - **Fixed:** Detaillierte Fehlermeldungen mit Row-Nummern und verfügbaren IDs

---

## For AI Assistants

**CRITICAL RULES:**

1. **NEVER change user requirements** in this document
2. **NEVER remove features** that user explicitly requested
3. **NEVER change notification behavior** (success auto-hide, error persistent)
4. **NEVER use alert()** instead of toast notifications
5. **ALWAYS ask user** before implementing features not listed here

**Adding new requirements:**
- Only add to this document when user explicitly requests something
- Document the requirement clearly
- Note the date and session

**Clarifying requirements:**
- If unclear: Ask user for clarification
- Document the clarification here
- Never assume or guess

---

**Letzte Aktualisierung:** 2025-01-22
**Maintainer:** Entwickelt mit Claude (Anthropic)
**Version:** 1.0
