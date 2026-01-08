# Time Tracker Extension - Architecture & Design Decisions

> **⚠️ Kritische Designentscheidungen die NIEMALS geändert werden dürfen!**

---

---

## Architecture & Design Decisions

### Core Architecture
- **Framework:** Vue 3 (Composition API)
- **State Management:** Pinia Stores (`src/stores/*.ts`)
- **Styling:** Tailwind CSS
- **Build Tool:** Vite

### Store Structure
Anstatt globaler Variablen nutzen wir dedizierte Stores:
1.  `time-entries.store.ts`: Verwaltet Einträge, CRUD, Timer-Logik.
2.  `settings.store.ts`: Verwaltet Settings, Theme, User Configuration.
3.  `auth.store.ts`: Verwaltet User-Session und Permissions.
4.  `absences.store.ts`: Verwaltet Abwesenheiten.

---

## Übersicht

---

## Übersicht

Dieses Dokument beschreibt die 5 kritischen Architektur-Entscheidungen der Time Tracker Extension. Diese Entscheidungen wurden aus gutem Grund getroffen und dürfen nicht rückgängig gemacht werden, da bereits Workarounds und Fixes implementiert wurden.

---

## 1. ⚠️ **KV-Store ID-Problematik** (SEHR WICHTIG!)

### Problem

Die KV-Store Helper-Funktion `getCustomDataValues<T>()` in `src/utils/kv-store.ts` hat einen schwerwiegenden Bug:

**Technische Details:**
- Zeile 232-235: Spread-Operator überschreibt String-ID mit numerischer ID
- `{ ...parsedData, ...metadata }` → metadata.id (Zahl) überschreibt parsedData.id (String)
- JavaScript Spread-Operator arbeitet von links nach rechts

### Symptome

- Kategorien können nicht bearbeitet/gelöscht werden nach Reload
- HTML-Buttons haben `data-category-id="65"` statt `"office"`
- Event-Handler finden Kategorien nicht mehr (65 !== "office")
- Zeiteinträge zeigen "Unknown" als Kategorie

### Design Decision: NIEMALS getCustomDataValues() verwenden

**Stattdessen:**
1. Direkter API-Call: `churchtoolsClient.get('/custommodules/{moduleId}/customdatacategories/{categoryId}/customdatavalues')`
2. Manuelles JSON Parsing: `JSON.parse(rawVal.value)`
3. String-ID aus JSON extrahieren: `parsed.id`
4. Numerische KV-Store ID separat speichern: `kvStoreId: rawVal.id`

### Wo implementiert

### Wo implementiert

- `src/stores/time-entries.store.ts`: `loadTimeEntries()`
- `src/stores/settings.store.ts`: `loadSettings()`
- `src/utils/kv-store.ts`: (Helper, aber Vorsicht!)

### Warum diese Lösung

**Alternative erwogen:** Bug in kv-store.ts fixen
- ❌ Würde Framework-Code ändern (nicht empfohlen)
- ❌ Könnte andere Extensions brechen
- ❌ Update würde Fix überschreiben

**Gewählte Lösung:** Direkter API-Call
- ✅ Kein Framework-Code ändern
- ✅ Volle Kontrolle über ID-Handling
- ✅ Update-safe

### CRITICAL: Niemals zurück zu getCustomDataValues()!

---

## 2. **Zweifache ID-Verwaltung für Kategorien**

### Problem

WorkCategory benötigt zwei verschiedene IDs für unterschiedliche Zwecke.

### Design Decision: Duale ID-Struktur

**Interface:**
- `id` (string): User-facing ID, unveränderlich, wird in TimeEntries referenziert
- `kvStoreId` (number): DB-ID für Updates/Deletes, von ChurchTools vergeben

### Rationale

**Warum String-ID?**
- Menschenlesbar (z.B. "office", "pastoral")
- Stabil (ändert sich nie)
- Referenz-Integrität in TimeEntries
- User kann ID verstehen

**Warum numerische kvStoreId?**
- Von ChurchTools API vergeben
- Benötigt für Update/Delete Operations
- Kann sich ändern (bei Re-Create)

### Workflow

**Create:**
- Speichere nur `id`, `name`, `color` als JSON
- kvStoreId wird von DB vergeben (nicht im JSON!)
- Nach Create: Reload um kvStoreId zu bekommen

**Read:**
- Extrahiere String-ID aus `JSON.parse(rawVal.value).id`
- Extrahiere numerische ID aus `rawVal.id`
- Speichere beide in WorkCategory Object

**Update:**
- Finde Category über String-ID
- Verwende kvStoreId für API-Call
- String-ID bleibt unverändert im JSON

**Delete:**
- Finde Category über String-ID
- Verwende kvStoreId für Delete API-Call

### Wo implementiert

- `src/stores/time-entries.store.ts`: `saveWorkCategory()`, `deleteWorkCategory()`
- `src/types/time-tracker.ts`: Interfaces `TimeEntry` und `WorkCategory`

### Warum diese Lösung

**Alternative erwogen:** Nur numerische ID
- ❌ Nicht menschenlesbar
- ❌ TimeEntry-Referenzen brechen bei Category-Delete/Re-Create
- ❌ Schwer zu debuggen

**Gewählte Lösung:** Duale IDs
- ✅ String-ID stabil für Referenzen
- ✅ kvStoreId für API-Operations
- ✅ Best of both worlds

---

## 3. **Notification System**

### User Requirement (CRITICAL!)

**Explizite User-Anforderung:**
- Success Messages: MÜSSEN automatisch nach 3s verschwinden
- Error Messages: MÜSSEN dauerhaft bleiben bis manuell geschlossen
- Warning Messages: MÜSSEN dauerhaft bleiben bis manuell geschlossen

### Design Decision: Custom Toast System

**Architektur:**
- Notification Container (fixed, top-right, z-index 10000)
- Einzelne Notification Elements (slide-in animation)
- Type-basiertes Auto-Hide Logic
- Close-Button nur für Error/Warning

**Implementation Details:**

**Container Management:**
- Lazy Creation: Container wird bei Bedarf erstellt
- Singleton Pattern: Nur ein Container pro Page
- Stacking: Neue Notifications stapeln sich vertikal

**Notification Lifecycle:**

**Success (type: 'success'):**
- setTimeout mit duration (default 3000ms)
- Slide-out Animation
- Remove von DOM nach Animation

**Error/Warning (type: 'error' | 'warning'):**
- KEIN setTimeout (bleibt für immer!)
- Close-Button mit Manual Remove
- Slide-out nur bei User-Click

### Wo implementiert

- `src/components/base/ToastContainer.vue`: Container für Notifications
- `src/composables/useNotifications.ts`: Logik für das Anzeigen von Toasts
- `src/utils/animations.ts`: Animation definitions

### Warum diese Lösung

**Alternative erwogen:** alert(), confirm(), prompt()
- ❌ User-Requirement: NIEMALS alert() verwenden
- ❌ Unterbricht Workflow
- ❌ Nicht anpassbar
- ❌ Keine Stacking-Möglichkeit

**Alternative erwogen:** External Toast Library
- ❌ Extra Dependency
- ❌ Bundle Size
- ❌ Muss ChurchTools Design System folgen

**Gewählte Lösung:** Custom Implementation
- ✅ Volle Kontrolle über Behavior
- ✅ Erfüllt User-Requirement exakt
- ✅ Keine Dependencies
- ✅ Perfekte Integration

---

## 4. **Excel Import/Export ohne Dropdown**

### Problem

User wünscht Dropdown in Excel für Category-Auswahl, aber xlsx Library unterstützt keine Excel Data Validation.

### Technical Limitation

**Versuchte Implementation:**
- Sheet['!dataValidation'] Property setzen
- List-Validierung mit allowedCategories
- **Resultat:** xlsx schreibt Metadaten nicht ins Excel-File

**Library-Limitation:**
- xlsx v0.18.x unterstützt keine Validation beim Export
- Andere Libraries (exceljs, xlsx-populate): Nicht getestet, Bundle Size Concern

### Design Decision: Zwei-Sheet Ansatz

**Lösung:**
- Sheet 1: "Time Entries" - Eingabebereich mit Beispiel-Row
- Sheet 2: "Available Categories" - Alle gültigen IDs und Namen
- User muss IDs manuell aus Sheet 2 kopieren

**Warum akzeptabel:**
- Copy/Paste ist schnell
- User sieht alle verfügbaren Kategorien
- Validierung beim Speichern fängt alle Fehler ab
- Detaillierte Fehlermeldungen helfen bei Korrektur

### Validierung beim Import

**Category Matching:**
- Case-insensitive Vergleich
- Suche nach Name ODER ID
- User kann sowohl "Office Work" als auch "office" eingeben

**Validierung beim Speichern:**
- Prüfe alle Category IDs
- Sammle ungültige Row-Nummern und IDs
- Zeige detaillierte Error Toast:
  - "Invalid category IDs in row(s) 1, 2, 3"
  - "Found: abc, def"
  - "Available: "office", "pastoral", ..."

### Wo implementiert

- `src/components/BulkEntry.vue` (oder äquivalent in Vue 3)
- Validierungs-Logik in den entsprechenden Actions/Composables.

### Warum diese Lösung

**Alternative erwogen:** Andere Library
- ⚠️ Mehr Research nötig
- ⚠️ Mögliche Bundle Size Increase
- ⚠️ Migration-Aufwand

**Gewählte Lösung:** Zwei-Sheet mit Validation
- ✅ Funktioniert jetzt
- ✅ User findet es OK (User Feedback)
- ✅ Validation fängt alle Fehler
- ✅ Kann später noch gewechselt werden

---

## 5. **Category Deletion mit Reassignment**

### User Requirement

Bevor eine Kategorie gelöscht wird, müssen alle Zeiteinträge einer anderen Kategorie zugewiesen werden.

### Design Decision: Pre-Deletion Check mit Dialog

**Workflow:**

**Step 1: Pre-Check**
- Count Entries using Category
- Falls 0: Direkt löschen (keine Confirmation)
- Falls >0: Dialog zeigen

**Step 2: Reassignment Dialog**
- Zeige Anzahl betroffener Einträge
- Dropdown mit allen anderen Kategorien
- "Delete and Reassign" Button
- "Cancel" Button

**Step 3: Automatic Reassignment**
- Lade alle Time Entries (direkte API-Calls wegen KV-Store Bug!)
- Für jeden Entry mit old categoryId:
  - Update categoryId = newCategoryId
  - Update categoryName = newCategory.name (BEIDE Felder!)
  - Save via updateCustomDataValue()

**Step 4: Delete Category**
- Nach erfolgreichem Reassignment: Delete Category
- Verwende kvStoreId für Delete API-Call

### Warum beide Felder (categoryId + categoryName)?

**Rationale:**
- TimeEntry speichert beide aus Performance-Gründen
- Verhindert Lookup bei jedem Render
- Bei Category-Rename würden alte Entries alten Namen zeigen
- Daher bei Reassignment IMMER beide updaten

### Wo implementiert

- `src/stores/time-entries.store.ts`: `deleteWorkCategory()` mit der Logik zum Reassignment der Einträge.

### Warum diese Lösung

**Alternative erwogen:** Soft Delete (Archive)
- ❌ User will harte Löschung
- ❌ Kategorien würden sich akkumulieren
- ❌ UI wird unübersichtlich

**Alternative erwogen:** Cascade Delete
- ❌ User verliert Daten
- ❌ Sehr gefährlich
- ❌ Nicht rückgängig machbar

**Gewählte Lösung:** Pre-Check + Reassignment
- ✅ Keine Datenverlust
- ✅ User hat Kontrolle
- ✅ Transparenter Prozess
- ✅ Erfüllt User-Requirement

---

## 6. **Group-Based Access Control & Individual SOLL Hours**

### User Requirement (2025-11-22)

Unterschiedliche Benutzergruppen haben unterschiedliche Anforderungen:
- **Employees**: Feste Arbeitsstunden, SOLL-Vorgaben, Überstundenberechnung
- **Volunteers**: Keine SOLL-Vorgaben, freiwillige Zeiterfassung
- **Per-User SOLL**: Jeder Employee kann unterschiedliche Stunden haben (Vollzeit, Teilzeit)

### Design Decision: ChurchTools Group Integration + User Config

**Lösung:**
- `employeeGroupId` in Settings → ChurchTools Group ID für Employees
- `volunteerGroupId` in Settings → ChurchTools Group ID für Volunteers
- `userHoursConfig: UserHoursConfig[]` → Individuelle SOLL-Stunden pro Employee

**UserHoursConfig Interface:**
```typescript
interface UserHoursConfig {
    userId: number;
    userName: string;
    hoursPerDay: number;
    hoursPerWeek: number;
    isActive?: boolean; // False if removed from group (soft delete)
}
```

**Access Check:**
- Bei Initialization: `checkUserAccess()`
- Lädt User Groups via `/persons/{userId}/groups`
- Prüft ob User in Employee ODER Volunteer Group
- Falls nein: Error Message, Extension nicht verfügbar

**SOLL Calculation Priority:**
1. **Prio 1:** `userHoursConfig` (individual employee hours)
2. **Prio 2:** `defaultHoursPerDay/Week` (fallback)
3. **Volunteers:** Optional 0 hours SOLL (kein Überstunden-Tracking)

**Admin UI:**
- "Group Management" Section
- Load Employees Button → Lädt Members von Group
- Table mit Employees und Input-Feldern für hours/day und hours/week
- Soft-Delete: Inactive employees bleiben in Config (historische Daten)

### Wo implementiert

- `src/stores/settings.store.ts`: `checkUserAccess()`, `loadSettings()`
- `src/components/AdminSettings.vue`: UI für die Konfiguration
- `src/types/time-tracker.ts`: `UserHoursConfig` Interface

### Warum diese Lösung

**Alternative erwogen:** Separate User Table in KV-Store
- ❌ Redundant zu ChurchTools Groups
- ❌ Synchronisation-Problem
- ❌ Admin muss doppelt pflegen

**Alternative erwogen:** Alle haben gleiche SOLL
- ❌ Teilzeit-Mitarbeiter falsch berechnet
- ❌ 20h/Woche Mitarbeiter hätte ständig "Überstunden"

**Gewählte Lösung:** ChurchTools Groups + Individual Config
- ✅ Single Source of Truth (ChurchTools)
- ✅ Flexibel für verschiedene Modelle
- ✅ Soft-Delete Support
- ✅ Auto-Sync mit Group Membership

---

## 7. **Break Tracking ohne Komplexität**

### User Requirement (2025-11-22)

Benutzer wollen Pausen erfassen, aber NICHT mit gesetzlichen Regelungen kämpfen.

### Design Decision: Simple Boolean Flag

**Lösung:**
- `isBreak: boolean` in TimeEntry Interface
- UI: Checkbox bei Clock-In und Manual Entry
- Calculation: `if (entry.isBreak) skip from work hours`

### Why NOT Complex?

**Bewusst NICHT implementiert:**
- ❌ Automatische Pausenregelung (30min ab 6h, etc.)
- ❌ Pausenzwang nach X Stunden
- ❌ Separate Pause-Entities mit Validation
- ❌ Branchen-spezifische Gesetze (Arbeitszeitgesetz)

### Why Simple Works

**Vorteile der einfachen Lösung:**
- ✅ User entscheidet selbst wann Pause
- ✅ Ein zusätzliches Boolean-Feld
- ✅ Kein Branchen-spezifisches Wissen nötig
- ✅ Flexibel für verschiedene Organisationen
- ✅ Kirchen-Organisation hat eigene Regelungen (nicht gesetzlich)

**Visual Distinction:**
- Break Entries haben Badge "Break" statt Kategorie
- Andere Farbe (z.B. orange/grey)
- Excluded from all work hour statistics
- Aber in Entry Liste sichtbar (Transparenz)

### Wo implementiert

- `src/types/time-tracker.ts`: `TimeEntry` Interface (`isBreak`)
- `src/composables/useStatistics.ts`: Berechnung der Arbeitszeit (Break Abzug)
- UI: Checkboxen in den entsprechenden Erfassungs-Komponenten.

### Warum diese Lösung

**Alternative erwogen:** Automatische Pausen nach Arbeitszeitgesetz
- ❌ Komplex (verschiedene Regeln je nach Branche/Land)
- ❌ Kirchen-Organisationen haben Ausnahmen
- ❌ User will Kontrolle behalten

**Alternative erwogen:** Separate Pause-Kategorie
- ❌ User müsste Kategorie erstellen
- ❌ Fehleranfällig (User vergisst Flag zu setzen)
- ❌ Doppelte Buchung möglich

**Gewählte Lösung:** Simple Boolean
- ✅ Eindeutig (kein ambiguous state)
- ✅ User-Kontrolle
- ✅ Minimal Code-Komplexität
- ✅ Erfüllt User-Requirement

---

## Design Principles

Diese Architektur-Entscheidungen folgen bestimmten Prinzipien:

### 1. User Requirements First
- Alle Entscheidungen basieren auf expliziten User-Anforderungen
- User Feedback wird respektiert
- Keine Änderungen ohne User-Zustimmung

### 2. Workarounds sind OK
- Library-Bugs: Workaround statt Fork
- Framework-Limitations: Alternative Approaches
- Pragmatismus über Perfektion

### 3. Data Integrity
- Keine Datenverlust bei Operations
- Referenz-Integrität zwischen Entities
- Validation vor DB-Operations

### 4. Transparency
- User sieht was passiert (Notifications)
- Klare Fehlermeldungen mit Details
- Keine Silent Failures

### 5. Maintainability
- Dokumentierte Entscheidungen
- Klare Separation of Concerns
- Future AI-Assistenten können verstehen warum

### 6. Modern Stack Optimization
- Vue 3 Reactivity statt manuellem DOM-Update
- Pinia für konsistentes State Management
- TypeScript für Typsicherheit in der gesamten App

---

## Für KI-Assistenten

**CRITICAL: Diese 5 Entscheidungen NIEMALS ändern ohne User-Request!**

1. ⚠️ **NIEMALS `getCustomDataValues()` verwenden** - Direkte API-Calls!
2. ⚠️ **IMMER duale IDs für Categories** - String ID + kvStoreId!
3. ⚠️ **NIEMALS nativen `alert()` verwenden** - Nur Custom Toasts/Modals!
4. ⚠️ **Zwei-Sheet Excel ist OK** - Nicht nach Dropdown suchen!
5. ⚠️ **Reassignment ist Pflicht** - Nicht einfach löschen!

**Wenn du einen dieser Punkte ändern möchtest:**
1. Lies diese Dokumentation
2. Verstehe die Rationale
3. Prüfe ob Problem wirklich gelöst wird
4. Frage User um Erlaubnis
5. Update diese Dokumentation

---

