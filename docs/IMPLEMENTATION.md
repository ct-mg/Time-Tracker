# Time Tracker Extension - Technical Implementation

> **🤖 PFLICHTLEKTÜRE für KI-Assistenten:**
>
> 1. **LIES DIESE DOKUMENTATION VOLLSTÄNDIG**, bevor du Änderungen vornimmst
> 2. **PRÜFE MAINTENANCE.md** für kritische Regeln und Git Workflow
> 3. **PRÜFE USER-REQUIREMENTS.md** für User-Anforderungen (NICHT ändern!)
> 4. **PRÜFE TODO.md** für offene Aufgaben und aktuelle Prioritäten
>
> Diese Dokumentation ist **lebendiges Wissen**. Deine Aufgabe ist es, sie aktuell zu halten!

---

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Architektur](#architektur)
3. [Kritische Designentscheidungen](#kritische-designentscheidungen)
4. [Features und Implementierung](#features-und-implementierung)
5. [Bekannte Probleme und Lösungen](#bekannte-probleme-und-lösungen)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Änderungshistorie](#änderungshistorie)

---

## Übersicht

Die **Time Tracker Extension** ist eine umfassende Zeiterfassungs-Lösung für ChurchTools-Nutzer. Sie ermöglicht:
- Clock-in/Clock-out Zeiterfassung
- Manuelle Zeiteinträge
- Bulk-Import via Excel
- Kategorie-Management
- Abwesenheitsverwaltung
- Reports und Statistiken

### Hauptmodule

- **main.ts** - Hauptmodul für Endnutzer (Zeiterfassung, Einträge, Reports)
- **admin.ts** - Admin-Modul für Konfiguration (Kategorien, Einstellungen)

---

## Architektur

### Datenstruktur

**TimeEntry Interface:**
- `userId`: number - ChurchTools User ID
- `startTime`: string - ISO datetime, dient auch als unique identifier
- `endTime`: string | null - null bedeutet Eintrag läuft noch
- `categoryId`: string - String-ID wie "office", "pastoral"
- `categoryName`: string - Anzeigename für UI
- `description`: string - Beschreibung der Tätigkeit
- `isManual`: boolean - true wenn manuell erstellt, false bei Clock-in/out
- `createdAt`: string - ISO datetime

**WorkCategory Interface:**
- `id`: string - String-ID wie "office", wird aus Name generiert
- `name`: string - Anzeigename wie "Office Work"
- `color`: string - Hex-Color wie "#007bff"
- `kvStoreId`: number (optional) - KV-Store ID für Updates/Deletes

### KV-Store Struktur

Der ChurchTools Custom Module Store ist hierarchisch aufgebaut:

```
Custom Module: timetracker
├── Category: timeentries (shorty)
│   └── Values: Alle TimeEntry Objekte als JSON
├── Category: workcategories (shorty)
│   └── Values: Alle WorkCategory Objekte als JSON
└── Category: settings (shorty)
    └── Value: Settings Objekt als JSON
```

---

## Kritische Designentscheidungen

### 1. ⚠️ **KV-Store ID-Problematik** (SEHR WICHTIG!)

**Problem:**
Die KV-Store Helper-Funktion `getCustomDataValues<T>()` in `src/utils/kv-store.ts` hat einen schwerwiegenden Bug: Der Spread-Operator überschreibt die String-ID aus den gespeicherten Daten mit der numerischen KV-Store ID.

**Technische Details:**
In Zeile 232-235 wird zuerst `parsedData` (mit String-ID wie "office") und dann `metadata` (mit numerischer ID wie 65) gespreadet. Da JavaScript Spread-Operator von links nach rechts arbeitet, überschreibt die numerische ID die String-ID.

**Symptome:**
- Kategorien können nicht bearbeitet/gelöscht werden nach Reload
- HTML-Buttons haben `data-category-id="65"` statt `"office"`
- Event-Handler finden Kategorien nicht mehr
- Zeiteinträge zeigen "Unknown" als Kategorie

**Lösung:**
**NIEMALS** `getCustomDataValues()` für Kategorien oder Time Entries verwenden!

Stattdessen direkter API-Call:
1. Rufe ChurchTools API direkt auf: `/custommodules/{moduleId}/customdatacategories/{categoryId}/customdatavalues`
2. Erhalte Array von Raw Values: `{ id: number, dataCategoryId: number, value: string }`
3. Parse JSON manuell mit `JSON.parse(rawVal.value)`
4. Extrahiere String-ID aus JSON: `parsed.id`
5. Speichere numerische KV-Store ID separat: `kvStoreId: rawVal.id`

**Wo implementiert:**
- `main.ts` - Zeilen 150-164: `loadWorkCategories()`
- `main.ts` - Zeilen 200-220: `loadTimeEntries()`
- `admin.ts` - Zeilen 157-184: `loadWorkCategories()`

**Wichtig:** Diese Lösung wurde in ALLEN Modulen implementiert. Niemals zurück zu `getCustomDataValues()` wechseln!

---

### 2. **Zweifache ID-Verwaltung für Kategorien**

**Warum zwei IDs?**

Wir benötigen zwei verschiedene IDs für WorkCategory:
- `id` (string): User-facing ID für Referenzen, wird vom User erstellt, unveränderlich
- `kvStoreId` (number): DB-ID für Updates/Deletes, von der Datenbank vergeben

**Rationale:**
- String-ID ist stabil und menschenlesbar (z.B. "office", "pastoral")
- Wird in allen TimeEntries als `categoryId` referenziert
- Darf sich niemals ändern, da sonst alle Referenzen brechen würden
- kvStoreId wird nur für CRUD-Operationen benötigt

**Workflow:**

**Create:**
- Nur `id`, `name`, `color` werden als JSON gespeichert
- kvStoreId wird von der DB vergeben, nicht im JSON

**Read:**
- Beide IDs aus API-Response extrahieren
- String-ID aus `JSON.parse(rawVal.value).id`
- Numerische ID aus `rawVal.id`

**Update:**
- kvStoreId für API-Call verwenden
- id bleibt unverändert im gespeicherten Wert

**Delete:**
- kvStoreId für API-Call verwenden
- Kategorie über String-ID im Array finden
- kvStoreId aus gefundener Kategorie extrahieren

**Implementierung:**

**Save Category:**
- Destructure: Trenne kvStoreId von restlichen Daten
- Speichere nur Category-Daten (id, name, color) als JSON
- Bei Update: Verwende kvStoreId für API-Call
- Bei Create: Nach Speichern Reload um kvStoreId zu bekommen

**Delete Category:**
- Finde Kategorie über String-ID im workCategories Array
- Extrahiere kvStoreId aus gefundener Kategorie
- Verwende kvStoreId für Delete API-Call

**Location:**
- `main.ts`: Zeilen 260-290 (saveWorkCategory)
- `admin.ts`: Zeilen 250-300 (saveCategory, deleteCategory)

---

### 3. **Notification System**

**Design-Anforderungen:**
- Erfolgs-Meldungen: Auto-ausblenden nach 3 Sekunden
- Fehler/Warnungen: Dauerhaft, manuell schließbar
- Mehrere Notifications gleichzeitig möglich (Stacking)
- Slide-in Animation von rechts

**Architektur:**
- Notification Container wird bei Bedarf erstellt
- Container positioned fixed, top-right
- Jede Notification ist ein eigenes div-Element
- TransitionGroup für Slide-in/Slide-out Animationen

**Implementierung:**

**Container Management:**
- Prüfe ob Container existiert via `getElementById('notification-container')`
- Falls nicht: Erstelle und füge zu body hinzu
- Container hat z-index 10000 für Overlay über allem

**Notification Element:**
- Erstelle div mit Klasse `notification` + `notification-{type}`
- Füge Icon hinzu (✓ für success, ⚠ für warning, ✕ für error)
- Füge Message Text hinzu
- Bei Error/Warning: Füge Close-Button hinzu

**Auto-Remove Logic:**
- Nur für Success-Type: setTimeout nach duration (default 3000ms)
- In setTimeout: Slide-out Animation (translateX(120%))
- Nach Animation: Remove Element von DOM
- Error/Warning: Kein setTimeout, nur Close-Button

**Close-Button Logic:**
- Event Listener für Click
- Trigger Slide-out Animation
- Remove von DOM nach Animation

**Location:**
- `main.ts`: Zeilen 100-150 (showNotification function)
- `admin.ts`: Zeilen 80-130 (showNotification function)

**Verwendung:**
- Success: `showNotification('Successfully saved 5 entries!', 'success')`
- Error: `showNotification('Invalid category IDs...', 'error')`
- Warning: `showNotification('No entries to save.', 'warning')`

---

### 4. **Excel Import/Export**

**Warum kein Dropdown in Excel?**

Die `xlsx` Library (Version 0.18.x) unterstützt leider keine Excel Data Validation beim Export. Ein Versuch wurde implementiert (Zeilen 617-638 in alter Version) mit:
- Sheet['!dataValidation'] Property
- List-Validierung mit allowedCategories
- Aber: xlsx schreibt diese Metadaten nicht ins Excel-File

**Alternative Lösung:**

**Zwei-Sheet Ansatz:**
1. Sheet 1: "Time Entries" - Eingabebereich mit Beispiel-Row
2. Sheet 2: "Available Categories" - Alle gültigen Category IDs und Namen

User muss IDs manuell aus Sheet 2 kopieren und in Sheet 1 einfügen.

**Warum akzeptabel:**
- Copy/Paste ist schnell
- User sieht alle verfügbaren Kategorien
- Validierung beim Speichern fängt alle Fehler ab
- Detaillierte Fehlermeldungen helfen bei Korrektur

**Validierung beim Import:**

**Category-Matching:**
- Case-insensitive Vergleich
- Suche nach Name ODER ID
- Nutze `.toLowerCase()` für beide Seiten
- Verwende gefundene Category.id im Entry

**Rationale:**
- User könnte Name oder ID eingeben
- User könnte unterschiedliche Groß-/Kleinschreibung verwenden
- Macht Import benutzerfreundlicher

**Validierung beim Speichern:**

**Multi-Step Validation:**
1. Prüfe required fields (alle Datum/Zeit Felder)
2. Prüfe time validity (End nach Start)
3. Prüfe category validity (alle Category IDs existieren)

**Bei ungültigen Kategorien:**
- Sammle alle ungültigen Row-Nummern
- Sammle alle ungültigen Category IDs (unique)
- Erstelle detaillierte Fehlermeldung mit:
  - "Invalid category IDs in row(s) X, Y, Z"
  - "Found IDs: abc, def"
  - "Available: "office", "pastoral", ..."
- Zeige Error Toast mit längerer Duration (7000ms)
- Breche Speichern ab (return früh)

**Location:**
- `main.ts`: Zeilen 400-500 (importFromExcel)
- `main.ts`: Zeilen 550-650 (saveBulkEntries mit Validierung)

---

### 5. **Category Deletion mit Reassignment**

**Anforderung:**
Bevor eine Kategorie gelöscht wird, müssen alle Zeiteinträge, die diese Kategorie verwenden, einer anderen Kategorie zugewiesen werden.

**Workflow:**

**Step 1: User klickt Delete**
- `initiateDeleteCategory(categoryId)` wird aufgerufen

**Step 2: Prüfe ob Einträge existieren**
- `countEntriesUsingCategory(categoryId)` zählt betroffene Einträge
- Verwende direkte API-Calls (KV-Store Bug!)
- Parse alle Entries und zähle matches

**Step 3a: Keine Einträge**
- Wenn count === 0: Direkt löschen mit `deleteCategory(categoryId)`
- Keine weitere Confirmation nötig

**Step 3b: Einträge vorhanden**
- Wenn count > 0: Dialog zeigen
- Setze State Variables:
  - `showDeleteDialog = true`
  - `categoryToDelete = category`
  - `entriesToReassignCount = count`
- Rufe `render()` auf um Dialog anzuzeigen

**Step 4: User wählt Ersatzkategorie**
- Dialog zeigt:
  - Warning-Icon und gelber Hintergrund
  - "X entries are using this category"
  - Dropdown mit allen anderen Kategorien
  - "Delete category and reassign entries" Button
  - "Cancel" Button

**Step 5: User bestätigt**
- `confirmDeleteCategory()` wird aufgerufen
- Validierung: Ersatzkategorie ausgewählt?
- Rufe `reassignTimeEntries(fromCategoryId, toCategoryId)` auf

**Step 6: Reassignment**
- Lade alle Time Entries (direkte API-Calls!)
- Finde Ersatzkategorie im workCategories Array
- Iteriere über alle Entries
- Wenn `entry.categoryId === fromCategoryId`:
  - Update `entry.categoryId = toCategoryId`
  - Update `entry.categoryName = toCategory.name` (BEIDE Felder!)
  - Speichere mit `updateCustomDataValue()` und kvStoreId

**Step 7: Kategorie löschen**
- Nach erfolgreichem Reassignment: `deleteCategory(categoryId)`
- Verwende kvStoreId für API-Call
- Reload Kategorien und Entries
- Zeige Success Notification

**Wichtige Details:**

**Warum beide Felder (categoryId + categoryName)?**
- TimeEntry speichert beide aus Performance-Gründen
- Verhindert Lookup bei jedem Render
- Bei Category-Rename würden alte Entries alten Namen zeigen
- Daher bei Reassignment IMMER beide updaten

**Error Handling:**
- Try-catch um jeden Update-Call
- Bei Fehler: Console Error aber weiter mit nächstem Entry
- Zähle erfolgreich reassigned Entries
- Zeige finale Notification mit Count

**Location:**
- `admin.ts`: Zeilen 400-450 (initiateDeleteCategory)
- `admin.ts`: Zeilen 450-500 (countEntriesUsingCategory)
- `admin.ts`: Zeilen 500-600 (reassignTimeEntries)
- `admin.ts`: Zeilen 600-650 (confirmDeleteCategory)

---

## Features und Implementierung

### Clock-In/Clock-Out

**Status-Management:**
- State Variable: `currentEntry: TimeEntry | null`
- Beim Laden: Suche nach Entry mit `endTime === null`
- Wenn gefunden: Setze als currentEntry
- Timer Update: Wird nur gestartet wenn currentEntry existiert

**Clock-In:**

**Validierung:**
- Prüfe ob bereits eingestempelt (currentEntry !== null)
- Falls ja: Error Toast "Already clocked in!"
- Falls nein: Erstelle neuen Entry

**Entry Creation:**
- userId: Aktueller User
- startTime: `new Date().toISOString()` - WICHTIG: Dient auch als unique identifier!
- endTime: null (läuft noch)
- categoryId: Ausgewählte Kategorie
- categoryName: Name der Kategorie (für UI)
- description: Optional vom User
- isManual: false (Clock-in/out ist nicht manuell)
- createdAt: Current timestamp

**Speichern:**
- Verwende `createCustomDataValue()`
- Stringify Entry zu JSON
- Nach erfolgreichem Create: Setze currentEntry
- Starte Timer Update
- Zeige Success Toast

**Location:**
- `main.ts`: Zeilen 350-400 (clockIn function)

**Clock-Out:**

**Finding Entry:**
- WICHTIG: Finde Entry über startTime (unique identifier)
- Nutze `timeEntries.find(e => e.startTime === currentEntry.startTime)`
- Nicht über User ID suchen (User könnte mehrere Entries haben)

**Update:**
- Setze endTime auf `new Date().toISOString()`
- KV-Store ID muss aus rohen Daten geholt werden (direkter API-Call)
- Finde rawEntry mit matching startTime
- Verwende rawEntry.id als kvStoreId für Update

**Update API-Call:**
- `updateCustomDataValue(categoryId, kvStoreId, { value: JSON.stringify(entry) })`
- Nach erfolgreichem Update: Setze currentEntry = null
- Stoppe Timer Update
- Reload Time Entries
- Zeige Success Toast

**Location:**
- `main.ts`: Zeilen 410-460 (clockOut function)

**Timer Update:**

**Interval Management:**
- State Variable: `timerInterval: number | null`
- `startTimerUpdate()`: Erstelle setInterval nur wenn nicht bereits läuft
- Update every 1000ms (1 Sekunde)

**Display Logic:**
- Finde Timer Element via `querySelector('#current-timer')`
- Berechne Dauer: `new Date().getTime() - new Date(currentEntry.startTime).getTime()`
- Formatiere mit `formatDuration()` helper
- Update textContent des Elements

**Location:**
- `main.ts`: Zeilen 320-350 (startTimerUpdate, stopTimerUpdate)

---

### Bulk Entry mit Excel Import

**Template Download:**

**Pre-Check:**
- Prüfe ob Kategorien existieren (workCategories.length > 0)
- Falls nicht: Error Toast mit Hinweis "Create categories in Admin panel first"
- Verhindert leeres Template

**Sheet 1: Time Entries**
- Header Row: Start Date, Start Time, End Date, End Time, Category ID, Description
- Beispiel Row: 2025-01-20, 09:00, 2025-01-20, 17:00, [erste Kategorie ID], Example

**Sheet 2: Available Categories**
- Header Row: Category Name, Category ID (copy this...), Color
- Data Rows: Alle workCategories mit name, id, color

**Workbook Creation:**
- Verwende XLSX.utils.book_new()
- XLSX.utils.book_append_sheet() für beide Sheets
- Column Width anpassen für bessere Lesbarkeit

**Download:**
- XLSX.writeFile() mit filename
- Filename Format: `TimeTracker_Template_YYYY-MM-DD.xlsx`
- Nutze `new Date().toISOString().split('T')[0]` für Datum

**Location:**
- `main.ts`: Zeilen 700-750 (downloadExcelTemplate)

**Excel Import:**

**File Reading:**
- FileReader mit readAsBinaryString()
- onload Event: Workbook parsen

**Workbook Parsing:**
- XLSX.read() mit type: 'binary'
- Erstes Sheet: Time Entries (User-Eingaben)
- XLSX.utils.sheet_to_json() mit header: 1 (Array of Arrays)

**Data Processing:**

**Pre-Import State:**
- Leere bulkEntryRows Array
- Setze showBulkEntry = true (WICHTIG für UI!)
- Reset andere Dialoge (showAddManualEntry, editingEntry)

**Row Iteration:**
- Starte bei Index 1 (Skip Header Row)
- Für jede Row:

**Date Handling:**
- Excel speichert Datum als Serial Number
- Prüfe ob Number: `!isNaN(Number(row[0]))`
- Falls ja: Konvertiere mit XLSX.SSF.parse_date_code()
- Formatiere zu YYYY-MM-DD String
- Falls String: Nutze direkt

**Category Matching:**
- Trim Input: `String(row[4]).trim()`
- Case-insensitive Match über Name ODER ID
- Nutze `.toLowerCase()` für Vergleich
- Falls Match: Verwende category.id
- Falls kein Match: Behalte Input (Validierung beim Save)

**BulkEntryRow Creation:**
- id: nextBulkRowId++ (für React-key ähnlichen Zweck)
- startDate, startTime, endDate, endTime: Aus Excel
- categoryId: Matched oder Original
- description: Row[5] oder leerer String

**Post-Import:**
- Rufe render() auf um Bulk Dialog zu zeigen
- Zeige Success Toast: "Successfully imported X entries from Excel!"

**Location:**
- `main.ts`: Zeilen 800-900 (importFromExcel)

**Bulk Save mit Validierung:**

**Validation Step 1: Required Fields**
- Iteriere über alle bulkEntryRows
- Prüfe: startDate, startTime, endDate, endTime alle vorhanden
- Falls ein Feld fehlt: Error Toast "All date and time fields are required", return

**Validation Step 2: Time Validity**
- Konstruiere Date Objects: `new Date(`${startDate}T${startTime}`)`
- Prüfe: end > start
- Falls nicht: Error Toast "End time must be after start time", return

**Validation Step 3: Category Validity**
- Iteriere über alle Rows
- Für jede Row: Suche Category in workCategories
- Falls nicht gefunden:
  - Füge Row-Nummer zu invalidRows hinzu (1-indexed für User)
  - Füge Category ID zu invalidCategories hinzu (unique)

**Detaillierte Fehlermeldung:**
- Falls invalidRows.length > 0:
- Erstelle Message: "Invalid category IDs in row(s) X, Y, Z: abc, def. Available: ..."
- Sammle alle verfügbaren IDs: `workCategories.map(c => `"${c.id}"`).join(', ')`
- Error Toast mit 7000ms Duration (länger wegen langer Message)
- return ohne zu speichern

**Saving:**
- Iteriere über alle validierte Rows
- Für jede Row:
  - Finde Category (sicher wegen Validierung)
  - Erstelle TimeEntry mit allen Feldern
  - startTime: Kombiniere Date und Time zu ISO String
  - endTime: Kombiniere Date und Time zu ISO String
  - isManual: true (Bulk Entry ist manuell)
  - Speichere mit createCustomDataValue()
  - Increment savedCount

**Post-Save:**
- Leere bulkEntryRows
- Setze showBulkEntry = false
- Reload Time Entries von DB (wichtig!)
- render()
- Success Toast mit savedCount
- Falls savedCount === 0: Warning Toast "No entries were saved"

**Location:**
- `main.ts`: Zeilen 950-1100 (saveBulkEntries)

---

### Category Management (Admin)

**Auto-ID Generation:**

**Algorithm:**
- Lowercase gesamter String
- Umlaute ersetzen: ä→ae, ö→oe, ü→ue
- Alle nicht-alphanumerischen Zeichen entfernen
- Auf 20 Zeichen begrenzen

**Beispiele:**
- "Büro Arbeit" → "bueroarbeit"
- "Pastoral Care & Support" → "pastoralcaresupport"
- "Meeting-Room-123" → "meetingroom123"

**Location:**
- `admin.ts`: Zeilen 200-220 (generateCategoryId function)

**Event Handler für Edit/Delete Buttons:**

**Warum bei jedem Render neu attachen?**
- HTML wird komplett neu generiert bei jedem render()
- Alte Event Listener gehen verloren
- Neue Buttons haben keine Listener

**Attach Logic:**

**Edit Buttons:**
- querySelectorAll('.edit-category-btn')
- Für jeden Button: addEventListener('click')
- Extrahiere categoryId aus data-attribute
- Finde Category in workCategories Array
- Setze editingCategory (COPY mit Spread Operator!)
- Close Add Dialog (showAddCategory = false)
- render()

**Delete Buttons:**
- querySelectorAll('.delete-category-btn')
- Für jeden Button: addEventListener('click')
- Extrahiere categoryId aus data-attribute
- Rufe initiateDeleteCategory(categoryId) auf
- Startet Deletion Workflow (siehe "Category Deletion mit Reassignment")

**WICHTIG:**
- attachEventHandlers() MUSS nach jedem render() aufgerufen werden
- Am Ende von render() oder direkt nach element.innerHTML =

**Location:**
- `admin.ts`: Zeilen 700-800 (attachEventHandlers function)
- `admin.ts`: render() ruft attachEventHandlers() am Ende auf

---

## Bekannte Probleme und Lösungen

### Problem: Kategorien nicht löschbar nach Reload

**Symptom:**
- Nach Seiten-Reload zeigen Edit/Delete Buttons keine Wirkung
- Console Log zeigt: `categoryId: 65` statt `"office"`
- Event Handler findet Kategorie nicht im Array
- `workCategories.find(c => c.id === 65)` returned undefined

**Ursache:**
KV-Store Helper `getCustomDataValues()` überschreibt String-ID mit numerischer ID. Der Spread-Operator in der Return-Zeile legt zuerst parsedData (String-ID) und dann metadata (numerische ID) zusammen. Da Spread von links nach rechts evaluiert, gewinnt die numerische ID.

**Warum tritt es nur nach Reload auf?**
- Bei Create: Wir verwenden neue Category mit korrekter String-ID
- Nach Reload: Wir laden via getCustomDataValues() → Bug aktiv
- HTML wird generiert mit falscher numerischer ID
- Event Handler können Category nicht mehr finden

**Lösung:**
Direkte API-Calls verwenden statt getCustomDataValues(). In loadWorkCategories() Funktion:
1. API direkt aufrufen mit churchtoolsClient.get()
2. Erhalte Array von Raw Values
3. Manuell JSON parsen
4. String-ID aus JSON extrahieren als `id`
5. Numerische ID aus Raw Value als `kvStoreId`

**Implementiert in:**
- `main.ts`: Zeilen 150-164
- `admin.ts`: Zeilen 157-184

**Verification:**
Nach Fix sollte Console Log zeigen: `categoryId: "office"` (String!)

---

### Problem: Time Entries zeigen "Unknown" als Kategorie

**Symptom:**
- In Time Entries Tabelle steht "Unknown" statt Kategoriename
- Kategorie-Badge ist grau statt farbig
- categoryId in Entry ist numerisch statt String

**Ursache:**
1. `loadTimeEntries()` verwendet `getCustomDataValues()` → categoryId wird überschrieben mit numerischer ID
2. UI rendert Entries und sucht Category: `workCategories.find(c => c.id === entry.categoryId)`
3. Findet nichts weil 65 !== "office"
4. Fallback-Logic: `entry.categoryName || 'Unknown'`
5. Da categoryName auch nicht gesetzt (oder aus alter Version): Zeigt "Unknown"

**Warum kritisch?**
- User sieht nicht welche Kategorie ein Entry hat
- Kann keine sinnvollen Reports erstellen
- Daten sehen "kaputt" aus

**Lösung:**
Direkte API-Calls in loadTimeEntries(). Prozess:
1. Lade Raw Values direkt von API
2. Parse JSON manuell
3. Behalte String categoryId aus JSON
4. Optional: Update categoryName aus aktuellen workCategories (falls Category renamed wurde)

**Implementiert in:**
- `main.ts`: Zeilen 200-220

**Bonus:**
Mit direkten Calls können wir auch CategoryName aktualisieren falls Category umbenannt wurde.

---

### Problem: Excel Import zeigt keine Daten in UI

**Symptom:**
- Excel wird erfolgreich importiert (Notification erscheint)
- Bulk Entry Dialog bleibt leer oder zeigt nicht
- Beim manuellen "Add Row" erscheint nur diese eine neue Row
- bulkEntryRows ist gefüllt (Console Log zeigt Daten)

**Ursache:**
`showBulkEntry = true` fehlt im importFromExcel() Handler. Ohne dieses Flag:
- Bulk Dialog Conditional Render zeigt nicht
- bulkEntryRows werden gefüllt aber nicht gerendert
- User sieht leeren Screen

**Warum passiert das?**
- Developer vergisst Flag zu setzen
- Bulk Dialog hat Conditional Rendering: `if (showBulkEntry) { ... }`
- Ohne Flag bleibt Condition false
- HTML für Dialog wird nicht generiert

**Lösung:**
In importFromExcel() nach erfolgreichem Parse:
1. Setze bulkEntryRows = [] (clear)
2. Setze showBulkEntry = true (KRITISCH!)
3. Setze showAddManualEntry = false (close other dialogs)
4. Setze editingEntry = null (clear state)
5. Fill bulkEntryRows mit parsed data
6. Rufe render() auf

**Implementiert in:**
- `main.ts`: Zeilen 820-830 (vor Row Iteration)

**Verification:**
Nach Import sollte Bulk Dialog sofort erscheinen mit allen importierten Rows.

---

### Problem: Bulk Save zeigt Erfolg aber speichert nichts

**Symptom:**
- "Successfully saved X entries!" Notification erscheint
- Nach Reload: Keine neuen Entries in der Liste
- Oder: Nur einige Entries wurden gespeichert

**Mögliche Ursachen:**

**Ursache 1: Validation schlägt fehl aber savedCount wird erhöht**
- Validation findet Fehler
- Aber: savedCount++ läuft trotzdem
- Success Notification zeigt falsche Anzahl

**Fix:**
- Validation VOR der Save-Loop
- Bei Fehler: return früh, keine Saves
- savedCount++ nur bei tatsächlichem Success

**Ursache 2: CreateCustomDataValue schlägt fehl (silent)**
- API Call failed
- Aber: Kein Error Handling
- Loop läuft weiter, savedCount++

**Fix:**
- Try-catch um createCustomDataValue
- Bei Error: Console Error, aber weiter
- Nur increment savedCount bei Success
- Oder: Await und prüfe Response

**Ursache 3: loadTimeEntries() wird nicht aufgerufen**
- Entries werden gespeichert
- Aber UI zeigt alte Liste (nicht refreshed)

**Fix:**
- Nach Save-Loop: Await loadTimeEntries()
- Dann render()
- Erst dann Success Notification

**Implementiert in:**
- `main.ts`: Zeilen 950-1100 (saveBulkEntries mit allen Fixes)

---

## Best Practices

### 1. Immer direkte API-Calls für Kategorien und Entries

**Warum:**
- getCustomDataValues() hat KV-Store ID Bug
- Direkte Calls geben volle Kontrolle
- Können String-ID und numerische ID separat extrahieren

**Wie:**
1. Get Module ID und Category ID
2. churchtoolsClient.get(`/custommodules/{moduleId}/customdatacategories/{categoryId}/customdatavalues`)
3. Parse Raw Values: `rawValues.map(v => ({ ...JSON.parse(v.value), kvStoreId: v.id }))`

**Wo anwenden:**
- Alle Load-Funktionen für Categories
- Alle Load-Funktionen für Time Entries
- Count Functions
- Reassignment Functions

---

### 2. Event Handler bei jedem Render neu attachen

**Warum:**
- HTML wird komplett neu generiert
- Event Listener sind an alte DOM Nodes gebunden
- Neue Nodes haben keine Listener

**Wie:**
- Erstelle attachEventHandlers() Function
- querySelectorAll für alle Button-Klassen
- addEventListener für jedes Element
- Rufe attachEventHandlers() am Ende von render() auf

**Alternativ:**
- Event Delegation auf parent element
- Weniger Listener, bessere Performance
- Aber: Komplexere Logic für Target-Identifikation

---

### 3. State Management für Dialoge

**Pattern:**
- Boolean State Variables für Dialog-Visibility
- Object State Variables für Dialog-Data
- Conditional Rendering basierend auf State

**Beispiel State:**
- showDeleteDialog: boolean
- categoryToDelete: WorkCategory | null
- replacementCategoryId: string

**Dialog öffnen:**
- Setze showDeleteDialog = true
- Setze categoryToDelete = selectedCategory
- render()

**Dialog schließen:**
- Setze showDeleteDialog = false
- Setze categoryToDelete = null
- Clear andere Dialog-States
- render()

---

### 4. Notifications statt Alerts

**User Requirement:**
- Niemals alert(), confirm(), prompt() für Informationen
- Nur Custom Toast Notifications
- Success: Auto-hide
- Error/Warning: Manual close

**Implementation:**
- showNotification(message, type) Function
- Type: 'success' | 'error' | 'warning'
- Conditional setTimeout nur für Success
- Close-Button für Error/Warning

---

### 5. Reload nach DB-Änderungen

**Warum:**
- Client State kann out-of-sync mit DB sein
- Andere Users könnten Änderungen gemacht haben
- kvStoreId könnte sich geändert haben (bei Create)

**Pattern:**
- Nach Create: Reload um neue IDs zu bekommen
- Nach Update: Optional reload (wenn andere Felder sich ändern könnten)
- Nach Delete: Reload um konsistent zu bleiben

**Beispiel:**
1. await createCategory(...)
2. await loadWorkCategories()
3. render()
4. showNotification('Success!', 'success')

---

### 6. Validation vor DB-Operations

**Warum:**
- DB-Operations sind teuer (API Calls)
- User bekommt schnelleres Feedback
- Verhindert inkonsistente Daten

**Pattern:**
1. Collect all data
2. Validate: Required fields, Format, References
3. Bei Fehler: Show Error Notification, return early
4. Nur wenn valid: DB Operations
5. Success Notification

**Beispiel Validations:**
- Required fields: if (!field) { error; return; }
- Format: if (end <= start) { error; return; }
- References: if (!categoryExists) { error; return; }

---

## Troubleshooting

### "Category not found for ID: 65"

**Diagnose Steps:**
1. Console Log categoryId in Event Handler
2. Console Log typeof categoryId
3. Console Log workCategories Array
4. Console Log find Result

**Was zu sehen sein sollte:**
- categoryId: "office" (String!)
- typeof: "string"
- workCategories: Array mit id: "office"
- find Result: Category Object

**Wenn categoryId eine Zahl ist (65):**
→ KV-Store ID Problem!
→ Prüfe loadWorkCategories() verwendet direkte API-Calls
→ Prüfe HTML data-attribute hat String-ID

**Fix:**
- loadWorkCategories() refactoren zu direkten API-Calls
- Siehe "Kritische Designentscheidungen #1"

---

### Notifications verschwinden zu schnell / nicht

**Symptome:**

**Error verschwindet automatisch:**
- Sollte dauerhaft bleiben
- Fehler: setTimeout läuft für alle Types
- Fix: Conditional setTimeout nur für type === 'success'

**Success bleibt dauerhaft:**
- Sollte nach 3s verschwinden
- Fehler: setTimeout fehlt
- Fix: setTimeout mit duration für success

**Check:**
1. Console Log type in showNotification
2. Console Log ob setTimeout gesetzt wird
3. Check Close-Button nur bei error/warning

**Fix Pattern:**
- if (type === 'success') { setTimeout(...) }
- else { addCloseButton() }

---

### Excel Import funktioniert nicht

**Check-Liste:**

**1. File-Input Event gefeuert?**
- Console Log in onChange Handler
- Falls nein: Check input type="file" und onChange binding

**2. bulkEntryRows gefüllt?**
- Console Log bulkEntryRows.length nach Import
- Console Log einzelne Rows
- Falls leer: Check Excel parsing

**3. showBulkEntry gesetzt?**
- Console Log showBulkEntry nach Import
- Falls false: Setze true nach Parse

**4. render() aufgerufen?**
- Console Log in render()
- Falls nicht: Rufe render() nach Import auf

**Debug Template:**
1. Add Console Logs an allen Checkpoints
2. Import Excel
3. Check Console Output
4. Identify wo Flow bricht

---

### Time Entries zeigen alte Kategorienamen nach Rename

**Ursache:**
TimeEntry speichert sowohl categoryId als auch categoryName. Bei Category-Rename:
- categoryId bleibt gleich (gut)
- categoryName ist alt (schlecht)

**Fix in loadTimeEntries():**
Nach Parse von jedem Entry:
1. Finde aktuelle Category via categoryId
2. Falls gefunden: Update entry.categoryName = currentCategory.name
3. Speichere Entry mit aktualisiertem Namen (optional)
4. Oder: Nur in Memory updaten (billig)

**Optionen:**

**Option 1: Nur UI Update (empfohlen)**
- Update categoryName in Memory
- Keine DB Writes
- Schnell und einfach
- Bei jedem Load: Fresh Category Names

**Option 2: DB Update**
- Update alle Entries in DB
- Langsam bei vielen Entries
- Aber: Historical Accuracy
- Nur wenn wirklich benötigt

**Location:**
- `main.ts`: loadTimeEntries() kann optional categoryName Update enthalten

---

## Änderungshistorie

### v1.0.0 - Initial Implementation (2025-01-15)
- Clock-in/Clock-out Funktionalität
- Manual entries (Create, Edit, Delete)
- Category management (Create, Edit, Delete)
- Basic reporting (Stunden pro Kategorie)
- Time Entries Liste mit Filtering

### v1.1.0 - Excel Import/Export (2025-01-18)
- Template download mit zwei Sheets
- Excel import mit FileReader
- Category matching (case-insensitive)
- Bulk entry interface
- Validation mit detaillierten Fehlermeldungen

### v1.2.0 - Critical Bug Fixes (2025-01-22)
- **KRITISCH:** KV-Store ID Problem behoben
- Direkte API-Calls statt getCustomDataValues()
- Category edit/delete funktioniert nach Reload
- Time entries zeigen korrekte Kategorien
- Alle Module gefixt (main.ts, admin.ts)

### v1.3.0 - Category Deletion Improvements (2025-01-22)
- Pre-deletion check für benutzte Kategorien
- Reassignment dialog mit Dropdown
- Automatic entry reassignment
- Update von beiden Feldern (categoryId + categoryName)
- Count display für betroffene Entries

### v1.4.0 - Notification System (2025-01-22)
- Custom Toast notifications statt Alerts
- Persistent error notifications mit Close-Button
- Auto-hide für success notifications (3s)
- Stacking für multiple notifications
- Slide-in/Slide-out Animationen
- User-Requirement erfüllt

### v1.5.0 - Documentation Overhaul (2025-01-22)
- Umfassende Implementation Documentation
- User Requirements als separate Sacred Document
- TODO Roadmap mit Phasen
- Maintenance Guidelines mit Git Workflow
- Modular Documentation Structure
- Best Practices und Troubleshooting

---

## Für KI-Assistenten - Quick Reference

### Vor Änderungen Checklist
1. ✅ Lies USER-REQUIREMENTS.md (user decisions sind SACRED!)
2. ✅ Lies MAINTENANCE.md (kritische Regeln!)
3. ✅ Lies TODO.md (was steht an?)
4. ✅ Lies diese Datei (technische Details)
5. ✅ Prüfe "Bekannte Probleme" - nicht erneut einführen!

### Nach Änderungen Checklist
1. ✅ Update diese Datei (Features, Problems, Solutions)
2. ✅ Update TODO.md (Tasks verschieben, neue hinzufügen)
3. ✅ Update MAINTENANCE.md nur bei neuen Best Practices/Rules
4. ✅ **NIEMALS** USER-REQUIREMENTS.md ohne User-Anfrage ändern
5. ✅ Pre-Commit Check (siehe MAINTENANCE.md)
6. ✅ **COMMIT** mit aussagekräftiger Message

### Kritische Don'ts
- ❌ **NIEMALS** getCustomDataValues() für Categories/Entries
- ❌ **NIEMALS** alert() statt Toast Notifications
- ❌ **NIEMALS** Event Handlers ohne Re-Attach bei Render
- ❌ **NIEMALS** kvStoreId im JSON speichern
- ❌ **NIEMALS** ohne Reload nach DB-Changes

### Kritische Files
- `src/entry-points/main.ts` - 2300+ Zeilen - VORSICHT bei Änderungen!
- `src/entry-points/admin.ts` - 900+ Zeilen
- `src/utils/kv-store.ts` - **NICHT ÄNDERN** (Hat Bug, nutze direkte Calls)
- `docs/` - **IMMER AKTUELL HALTEN**

### Template für neue Probleme
```markdown
### Problem: [Kurze Beschreibung]

**Symptom:**
- Was sieht der User?
- Was steht in Console?

**Ursache:**
Technische Erklärung

**Lösung:**
Lösungsbeschreibung ohne Code

**Wo:** [Datei:Zeilen]
**Datum:** [YYYY-MM-DD]
```

---

**Maintainer:** Entwickelt mit Claude (Anthropic)
**Letzte Aktualisierung:** 2025-01-22
**Version:** 1.5
