# Time Tracker Extension - Implementation Guide

> **🤖 PFLICHTLEKTÜRE für KI-Assistenten:**
>
> 1. **LIES DIESE DOKUMENTATION VOLLSTÄNDIG**, bevor du Änderungen vornimmst
> 2. **AKTUALISIERE DIESE DOKUMENTATION** nach jeder Änderung (siehe [Dokumentations-Pflege](#dokumentations-pflege))
> 3. **PRÜFE DIE TODO-LISTE** für offene Aufgaben und Ideen aus vorherigen Sessions
> 4. **DOKUMENTIERE NEUE PROBLEME UND LÖSUNGEN** sofort, damit sie nicht vergessen werden
>
> Diese Dokumentation ist **lebendiges Wissen**. Deine Aufgabe ist es, sie aktuell zu halten!

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Architektur](#architektur)
3. [Kritische Designentscheidungen](#kritische-designentscheidungen)
4. [Features und Implementierung](#features-und-implementierung)
5. [Bekannte Probleme und Lösungen](#bekannte-probleme-und-lösungen)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [📋 TODO & Offene Aufgaben](#todo--offene-aufgaben)
9. [📝 Dokumentations-Pflege](#dokumentations-pflege)
10. [Änderungshistorie](#änderungshistorie)

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

```typescript
interface TimeEntry {
    userId: number;
    startTime: string;        // ISO datetime - auch unique identifier
    endTime: string | null;   // null = läuft noch
    categoryId: string;       // String-ID z.B. "office", "pastoral"
    categoryName: string;     // Anzeigename für UI
    description: string;
    isManual: boolean;
    createdAt: string;
}

interface WorkCategory {
    id: string;               // String-ID z.B. "office"
    name: string;            // Anzeigename z.B. "Office Work"
    color: string;           // Hex-Color z.B. "#007bff"
    kvStoreId?: number;      // Optional: KV-Store ID für Updates/Deletes
}
```

### KV-Store Struktur

```
Custom Module: timetracker
├── Category: timeentries (shorty)
│   └── Values: Alle TimeEntry Objekte
├── Category: workcategories (shorty)
│   └── Values: Alle WorkCategory Objekte
└── Category: settings (shorty)
    └── Value: Settings Objekt
```

---

## Kritische Designentscheidungen

### 1. ⚠️ **KV-Store ID-Problematik** (SEHR WICHTIG!)

**Problem:**
Die KV-Store Helper-Funktion `getCustomDataValues<T>()` in `src/utils/kv-store.ts` hat einen schwerwiegenden Bug:

```typescript
// In kv-store.ts Zeile 232-235
return {
    ...parsedData,  // String ID z.B. "office"
    ...metadata,    // Numeric ID z.B. 65 - ÜBERSCHREIBT parsedData.id!
};
```

Der Spread-Operator überschreibt die String-ID aus den gespeicherten Daten mit der numerischen KV-Store ID.

**Symptome:**
- Kategorien können nicht bearbeitet/gelöscht werden nach Reload
- HTML-Buttons haben `data-category-id="65"` statt `"office"`
- Event-Handler finden Kategorien nicht mehr
- Zeiteinträge zeigen "Unknown" als Kategorie

**Lösung:**
**NIEMALS** `getCustomDataValues()` für Kategorien oder Time Entries verwenden!

Stattdessen direkter API-Call:

```typescript
// RICHTIG - Direkt API aufrufen
const rawValues: Array<{ id: number; dataCategoryId: number; value: string }> =
    await churchtoolsClient.get(
        `/custommodules/${moduleId}/customdatacategories/${categoryId}/customdatavalues`
    );

const categories = rawValues.map(rawVal => {
    const parsed = JSON.parse(rawVal.value);
    return {
        id: parsed.id,           // String ID aus JSON
        name: parsed.name,
        color: parsed.color,
        kvStoreId: rawVal.id     // Numeric ID separat speichern
    };
});

// FALSCH - Verwendet getCustomDataValues
const categories = await getCustomDataValues<WorkCategory>(categoryId, moduleId);
// Dies überschreibt die String-ID mit der numerischen ID!
```

**Wo implementiert:**
- `main.ts` - Zeilen 150-164: `loadWorkCategories()`
- `main.ts` - Zeilen 200-220: `loadTimeEntries()`
- `admin.ts` - Zeilen 157-184: `loadWorkCategories()`

**Wichtig:** Diese Funktion wurde in ALLEN Modulen gefixt. Niemals zurück zu `getCustomDataValues()` wechseln!

---

### 2. **Zweifache ID-Verwaltung für Kategorien**

**Warum zwei IDs?**

```typescript
interface WorkCategory {
    id: string;           // User-facing ID für Referenzen
    kvStoreId?: number;   // DB-ID für Updates/Deletes
}
```

- `id` (string): Wird vom User erstellt (Auto-generiert aus Name), unveränderlich, wird in TimeEntries referenziert
- `kvStoreId` (number): Von der Datenbank vergeben, nur für CRUD-Operationen

**Workflow:**
1. **Create**: Nur `id`, `name`, `color` werden gespeichert
2. **Read**: Beide IDs werden aus API-Response extrahiert
3. **Update**: `kvStoreId` für API-Call, `id` bleibt im Wert
4. **Delete**: `kvStoreId` für API-Call

**Implementierung:**
```typescript
// Save Category
async function saveCategory(category: WorkCategory) {
    const { kvStoreId, ...categoryData } = category;  // kvStoreId nicht speichern
    const valueData = JSON.stringify(categoryData);

    if (kvStoreId) {
        await updateCustomDataValue(categoriesId, kvStoreId, { value: valueData });
    } else {
        await createCustomDataValue({ dataCategoryId: categoriesId, value: valueData });
        await loadWorkCategories(); // Reload um kvStoreId zu bekommen
    }
}

// Delete Category
async function deleteCategory(categoryId: string) {
    const category = workCategories.find(c => c.id === categoryId);
    if (category?.kvStoreId) {
        await deleteCustomDataValue(categoriesId, category.kvStoreId);
    }
}
```

---

### 3. **Notification System**

**Design-Anforderungen:**
- Erfolgs-Meldungen: Auto-ausblenden nach 3 Sekunden
- Fehler/Warnungen: Dauerhaft, manuell schließbar
- Mehrere Notifications gleichzeitig möglich
- Slide-in Animation von rechts

**Implementierung:**

```typescript
function showNotification(message: string, type: 'success' | 'error' | 'warning', duration = 3000) {
    // Container für Stacking
    let container = document.getElementById('notification-container');

    // Error/Warning: Close-Button hinzufügen, KEIN auto-remove
    if (type !== 'success') {
        const closeButton = document.createElement('button');
        // ... Close-Button Implementation
        // WICHTIG: Kein setTimeout für auto-remove!
    }

    // Success: Auto-remove nach duration
    if (type === 'success') {
        setTimeout(() => {
            // Slide-out animation, dann remove
        }, duration);
    }
}
```

**Verwendung:**
```typescript
// Erfolg - verschwindet automatisch
showNotification('Successfully saved 5 entries!', 'success');

// Fehler - bleibt bis User klickt
showNotification('Invalid category IDs in row(s) 1, 2: abc. Available: "office", "pastoral"', 'error');

// Warnung - bleibt bis User klickt
showNotification('No entries to save.', 'warning');
```

---

### 4. **Excel Import/Export**

**Warum kein Dropdown in Excel?**
Die `xlsx` Library unterstützt leider keine Excel Data Validation beim Export. Dropdown-Versuch wurde implementiert (Zeilen 617-638 in alter Version), funktioniert aber nicht.

**Lösung:**
- Zweites Sheet "Available Categories" mit allen gültigen IDs
- User muss IDs manuell kopieren
- Validierung beim Speichern fängt alle Fehler ab

**Validierung beim Import:**
```typescript
// Category-Matching (case-insensitive)
const categoryMatch = workCategories.find(
    c => c.name.toLowerCase() === categoryIdOrName.toLowerCase() ||
         c.id.toLowerCase() === categoryIdOrName.toLowerCase()
);
```

**Validierung beim Speichern:**
```typescript
// Alle ungültigen Kategorien finden
for (let i = 0; i < bulkEntryRows.length; i++) {
    const category = workCategories.find(c => c.id === row.categoryId);
    if (!category) {
        invalidRows.push(i + 1);
        invalidCategories.push(row.categoryId);
    }
}

// Detaillierte Fehlermeldung
if (invalidRows.length > 0) {
    showNotification(
        `Invalid category IDs in row(s) ${invalidRows.join(', ')}: ${invalidCategories.join(', ')}. Available: ${availableCategoryIds}`,
        'error',
        7000  // Längere Anzeige für lange Nachricht
    );
}
```

---

### 5. **Category Deletion mit Reassignment**

**Anforderung:**
Bevor eine Kategorie gelöscht wird, müssen alle Zeiteinträge, die diese Kategorie verwenden, einer anderen Kategorie zugewiesen werden.

**Workflow:**

```typescript
// 1. User klickt Delete
initiateDeleteCategory(categoryId)
    ↓
// 2. Prüfe ob Einträge existieren
const count = await countEntriesUsingCategory(categoryId);
    ↓
// 3a. Keine Einträge → Direkt löschen
if (count === 0) {
    await deleteCategory(categoryId);
}
    ↓
// 3b. Einträge vorhanden → Dialog zeigen
else {
    showDeleteDialog = true;
    categoryToDelete = category;
    render();
}
    ↓
// 4. User wählt Ersatzkategorie und bestätigt
confirmDeleteCategory()
    ↓
// 5. Alle Einträge neu zuweisen
await reassignTimeEntries(fromCategoryId, toCategoryId);
    ↓
// 6. Kategorie löschen
await deleteCategory(categoryId);
```

**Implementierung:**

```typescript
async function reassignTimeEntries(fromCategoryId: string, toCategoryId: string) {
    const timeEntriesCategory = await getCustomDataCategory('timeentries');

    // Direkt API aufrufen (wegen KV-Store ID Problem!)
    const rawValues = await churchtoolsClient.get(
        `/custommodules/${moduleId}/customdatacategories/${timeEntriesCategory.id}/customdatavalues`
    );

    const toCategory = workCategories.find(c => c.id === toCategoryId);

    for (const rawVal of rawValues) {
        const entry = JSON.parse(rawVal.value);

        if (entry.categoryId === fromCategoryId) {
            // BEIDE Felder aktualisieren!
            entry.categoryId = toCategoryId;
            entry.categoryName = toCategory.name;

            await updateCustomDataValue(
                timeEntriesCategory.id,
                rawVal.id,  // kvStoreId für Update
                { value: JSON.stringify(entry) }
            );
        }
    }
}
```

**UI:**
- Gelber Warning-Dialog mit Anzahl betroffener Einträge
- Dropdown zur Auswahl der Ersatzkategorie
- "Kategorie löschen und Einträge neu zuweisen" Button
- "Abbrechen" Button

---

## Features und Implementierung

### Clock-In/Clock-Out

**Status-Management:**
```typescript
let currentEntry: TimeEntry | null = null;

// Check beim Laden
const runningEntry = timeEntries.find(e => e.endTime === null);
if (runningEntry) currentEntry = runningEntry;
```

**Clock-In:**
```typescript
async function clockIn(categoryId: string, description: string) {
    if (currentEntry) {
        showNotification('Already clocked in!', 'error');
        return;
    }

    const newEntry: TimeEntry = {
        userId: user.id,
        startTime: new Date().toISOString(),  // Auch unique identifier!
        endTime: null,
        categoryId,
        categoryName: category.name,
        description,
        isManual: false,
        createdAt: new Date().toISOString()
    };

    await createCustomDataValue({
        dataCategoryId: timeEntriesCategory.id,
        value: JSON.stringify(newEntry)
    });

    currentEntry = newEntry;
}
```

**Clock-Out:**
```typescript
async function clockOut() {
    if (!currentEntry) return;

    // WICHTIG: Finde Entry über startTime (unique identifier)
    const entryToUpdate = timeEntries.find(e => e.startTime === currentEntry.startTime);

    entryToUpdate.endTime = new Date().toISOString();

    // KV-Store ID aus rohen Daten holen
    const rawValues = await churchtoolsClient.get(...);
    const rawEntry = rawValues.find(v => {
        const parsed = JSON.parse(v.value);
        return parsed.startTime === currentEntry.startTime;
    });

    await updateCustomDataValue(
        timeEntriesCategory.id,
        rawEntry.id,  // kvStoreId
        { value: JSON.stringify(entryToUpdate) }
    );

    currentEntry = null;
}
```

**Timer Update:**
```typescript
let timerInterval: number | null = null;

function startTimerUpdate() {
    if (timerInterval) return;
    timerInterval = window.setInterval(() => {
        const timerEl = element.querySelector('#current-timer');
        if (timerEl && currentEntry) {
            timerEl.textContent = formatDuration(
                new Date().getTime() - new Date(currentEntry.startTime).getTime()
            );
        }
    }, 1000);
}
```

---

### Bulk Entry mit Excel Import

**Template Download:**
```typescript
function downloadExcelTemplate() {
    // Prüfe ob Kategorien existieren
    if (workCategories.length === 0) {
        showNotification('No categories available. Please create categories in the Admin panel first.', 'error');
        return;
    }

    // Sheet 1: Time Entries Template
    const worksheetData = [
        ['Start Date', 'Start Time', 'End Date', 'End Time', 'Category ID', 'Description'],
        ['2025-01-20', '09:00', '2025-01-20', '17:00', workCategories[0].id, 'Example']
    ];

    // Sheet 2: Available Categories (für Copy/Paste)
    const categoriesData = [
        ['Category Name', 'Category ID (copy this to Time Entries sheet)', 'Color'],
        ...workCategories.map(cat => [cat.name, cat.id, cat.color])
    ];

    // Workbook erstellen und downloaden
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries');
    XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Available Categories');
    XLSX.writeFile(workbook, `TimeTracker_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
}
```

**Excel Import:**
```typescript
function importFromExcel(file: File) {
    const reader = new FileReader();

    reader.onload = (e) => {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

        // WICHTIG: Bulk Entry Dialog öffnen!
        bulkEntryRows = [];
        showBulkEntry = true;

        for (const row of rows.slice(1)) {
            // Excel Serial Date konvertieren
            let parsedDate = row[0];
            if (!isNaN(Number(row[0]))) {
                const date = XLSX.SSF.parse_date_code(Number(row[0]));
                parsedDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
            }

            // Category matching (case-insensitive)
            const categoryIdOrName = String(row[4]).trim();
            const categoryMatch = workCategories.find(
                c => c.name.toLowerCase() === categoryIdOrName.toLowerCase() ||
                     c.id.toLowerCase() === categoryIdOrName.toLowerCase()
            );

            bulkEntryRows.push({
                id: nextBulkRowId++,
                startDate: parsedDate,
                startTime: row[1],
                endDate: parsedDate,
                endTime: row[3],
                categoryId: categoryMatch ? categoryMatch.id : categoryIdOrName,
                description: row[5] || ''
            });
        }

        render();
        showNotification(`Successfully imported ${bulkEntryRows.length} entries from Excel!`, 'success');
    };

    reader.readAsBinaryString(file);
}
```

**Bulk Save mit Validierung:**
```typescript
async function saveBulkEntries() {
    // 1. Prüfe required fields
    for (const row of bulkEntryRows) {
        if (!row.startDate || !row.startTime || !row.endDate || !row.endTime) {
            showNotification('All date and time fields are required.', 'error');
            return;
        }
    }

    // 2. Prüfe time validity
    const start = new Date(`${row.startDate}T${row.startTime}`);
    const end = new Date(`${row.endDate}T${row.endTime}`);
    if (end <= start) {
        showNotification('End time must be after start time for all entries.', 'error');
        return;
    }

    // 3. Prüfe category validity
    const invalidRows = [];
    const invalidCategories = [];
    for (let i = 0; i < bulkEntryRows.length; i++) {
        const category = workCategories.find(c => c.id === row.categoryId);
        if (!category) {
            invalidRows.push(i + 1);
            if (!invalidCategories.includes(row.categoryId)) {
                invalidCategories.push(row.categoryId);
            }
        }
    }

    if (invalidRows.length > 0) {
        const availableCategoryIds = workCategories.map(c => `"${c.id}"`).join(', ');
        showNotification(
            `Invalid category IDs in row(s) ${invalidRows.join(', ')}: ${invalidCategories.join(', ')}. Available: ${availableCategoryIds}`,
            'error',
            7000
        );
        return;
    }

    // 4. Speichere alle Einträge
    let savedCount = 0;
    for (const row of bulkEntryRows) {
        const category = workCategories.find(c => c.id === row.categoryId);
        const newEntry: TimeEntry = {
            userId: user.id,
            startTime: new Date(`${row.startDate}T${row.startTime}`).toISOString(),
            endTime: new Date(`${row.endDate}T${row.endTime}`).toISOString(),
            categoryId: row.categoryId,
            categoryName: category.name,  // Sicher wegen Validierung
            description: row.description,
            isManual: true,
            createdAt: new Date().toISOString()
        };

        await createCustomDataValue({
            dataCategoryId: timeEntriesCategory.id,
            value: JSON.stringify(newEntry)
        });

        savedCount++;
    }

    // 5. Clean up und reload
    bulkEntryRows = [];
    showBulkEntry = false;
    await loadTimeEntries();  // Wichtig: Von DB neu laden!
    render();

    if (savedCount > 0) {
        showNotification(`Successfully saved ${savedCount} ${savedCount === 1 ? 'entry' : 'entries'}!`, 'success');
    } else {
        showNotification('No entries were saved.', 'warning');
    }
}
```

---

### Category Management (Admin)

**Auto-ID Generation:**
```typescript
function generateCategoryId(name: string): string {
    return name.toLowerCase()
        .replace(/[äöü]/g, c => ({'ä':'ae', 'ö':'oe', 'ü':'ue'}[c]))
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
}
```

**Event Handler für Edit/Delete Buttons:**

```typescript
function attachEventHandlers() {
    // Edit Buttons
    const editCategoryBtns = element.querySelectorAll('.edit-category-btn');
    editCategoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = (e.currentTarget as HTMLElement).dataset.categoryId;
            const category = workCategories.find(c => c.id === categoryId);

            if (category) {
                editingCategory = { ...category };  // Copy!
                showAddCategory = false;
                render();
            }
        });
    });

    // Delete Buttons
    const deleteCategoryBtns = element.querySelectorAll('.delete-category-btn');
    deleteCategoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = (e.currentTarget as HTMLElement).dataset.categoryId;
            initiateDeleteCategory(categoryId);  // Prüfung + Dialog
        });
    });
}
```

**WICHTIG:** Event Handlers müssen bei jedem `render()` neu attached werden, da HTML komplett neu generiert wird!

---

## Bekannte Probleme und Lösungen

### Problem: Kategorien nicht löschbar nach Reload

**Symptom:**
- Nach Seiten-Reload zeigen Edit/Delete Buttons keine Wirkung
- Console Log: `categoryId: 65` statt `"office"`
- Event Handler findet Kategorie nicht

**Ursache:**
KV-Store ID überschreibt String-ID (siehe "KV-Store ID-Problematik")

**Lösung:**
Direkte API-Calls verwenden statt `getCustomDataValues()`. Siehe Zeilen 150-164 und 157-184.

---

### Problem: Time Entries zeigen "Unknown" als Kategorie

**Symptom:**
- In Time Entries Tabelle steht "Unknown" statt Kategoriename
- Kategorie-Badge ist grau statt farbig

**Ursache:**
1. `loadTimeEntries()` verwendet `getCustomDataValues()` → categoryId wird überschrieben
2. `category = workCategories.find(c => c.id === entry.categoryId)` findet nichts
3. Fallback: `entry.categoryName || 'Unknown'`

**Lösung:**
Direkte API-Calls in `loadTimeEntries()`. Siehe Zeilen 200-220 in main.ts.

---

### Problem: Excel Import zeigt keine Daten in UI

**Symptom:**
- Excel wird importiert (Notification zeigt Erfolg)
- Bulk Entry Dialog zeigt aber keine Rows
- Beim manuellen "Add Row" erscheint nur diese eine Row

**Ursache:**
`showBulkEntry = true` fehlt im Import-Handler

**Lösung:**
```typescript
function importFromExcel(file: File) {
    // ...
    bulkEntryRows = [];
    showBulkEntry = true;        // ← WICHTIG!
    showAddManualEntry = false;
    editingEntry = null;
    // ...
}
```

---

### Problem: Bulk Save zeigt Erfolg aber speichert nichts

**Symptom:**
- "Successfully saved X entries!" Notification
- Entries erscheinen nicht in der Liste

**Ursache:**
1. Validation schlägt fehl (z.B. ungültige Category ID)
2. Aber `savedCount` wird trotzdem erhöht
3. Oder: `loadTimeEntries()` wird nicht aufgerufen nach Save

**Lösung:**
```typescript
// 1. Validation VOR dem Speichern
if (invalidRows.length > 0) {
    showNotification('Invalid category IDs...', 'error');
    return;  // Früh abbrechen!
}

// 2. Nach erfolgreicher Speicherung: Reload
await loadTimeEntries();  // Von DB neu laden
render();

// 3. Nur bei tatsächlichem Erfolg
if (savedCount > 0) {
    showNotification(`Successfully saved ${savedCount} entries!`, 'success');
}
```

---

## Best Practices

### 1. Immer direkte API-Calls für Kategorien und Entries

```typescript
// ✅ RICHTIG
const rawValues = await churchtoolsClient.get(`/custommodules/${moduleId}/customdatacategories/${categoryId}/customdatavalues`);
const data = rawValues.map(v => JSON.parse(v.value));

// ❌ FALSCH
const data = await getCustomDataValues(categoryId, moduleId);
```

### 2. Event Handler bei jedem Render neu attachen

```typescript
function render() {
    element.innerHTML = `...`;
    attachEventHandlers();  // Immer nach HTML-Update!
}
```

### 3. State Management für Dialoge

```typescript
// State
let showDeleteDialog = false;
let categoryToDelete: WorkCategory | null = null;
let replacementCategoryId = '';

// Dialog öffnen
function openDialog() {
    showDeleteDialog = true;
    categoryToDelete = category;
    render();  // Dialog erscheint
}

// Dialog schließen
function closeDialog() {
    showDeleteDialog = false;
    categoryToDelete = null;
    render();  // Dialog verschwindet
}
```

### 4. Notifications statt Alerts

```typescript
// ✅ RICHTIG
showNotification('Successfully saved!', 'success');
showNotification('Invalid data!', 'error');

// ❌ FALSCH
alert('Successfully saved!');
alert('Invalid data!');
```

### 5. Reload nach DB-Änderungen

```typescript
async function saveEntries() {
    // ... DB operations ...

    await loadTimeEntries();  // Reload von DB
    render();                 // UI Update
}
```

### 6. Validation vor DB-Operations

```typescript
async function save() {
    // 1. Validation
    if (!isValid()) {
        showNotification('Validation failed', 'error');
        return;  // Früh abbrechen!
    }

    // 2. DB Operation
    await performDbOperation();

    // 3. Success
    showNotification('Saved!', 'success');
}
```

---

## Troubleshooting

### "Category not found for ID: 65"

**Diagnose:**
```typescript
console.log('[TimeTracker] Button clicked, categoryId:', categoryId);
console.log('[TimeTracker] Available categories:', workCategories);
console.log('[TimeTracker] Found category:', workCategories.find(c => c.id === categoryId));
```

**Wenn categoryId eine Zahl ist (65):**
→ KV-Store ID Problem! Siehe "KV-Store ID-Problematik"

**Fix:** Verwende direkte API-Calls in `loadWorkCategories()`

---

### Notifications verschwinden zu schnell / nicht

**Symptome:**
- Error verschwindet automatisch → Sollte dauerhaft bleiben
- Success bleibt dauerhaft → Sollte verschwinden

**Check:**
```typescript
// Success: type === 'success', mit setTimeout
// Error/Warning: type !== 'success', mit Close-Button, OHNE setTimeout
```

**Fix:** Siehe "Notification System" Implementierung

---

### Excel Import funktioniert nicht

**Check-Liste:**
1. Wird File-Input Event gefeuert? → Console Log
2. Wird `bulkEntryRows` gefüllt? → Console Log
3. Wird `showBulkEntry = true` gesetzt?
4. Wird `render()` aufgerufen nach Import?

**Debug:**
```typescript
function importFromExcel(file: File) {
    console.log('[Import] File:', file.name);
    reader.onload = (e) => {
        console.log('[Import] Rows before:', bulkEntryRows.length);
        // ... import logic ...
        console.log('[Import] Rows after:', bulkEntryRows.length);
        console.log('[Import] showBulkEntry:', showBulkEntry);
    };
}
```

---

### Time Entries zeigen alte Kategorienamen nach Rename

**Ursache:**
TimeEntry speichert sowohl `categoryId` als auch `categoryName`

**Fix:**
In `loadTimeEntries()` categoryName aktualisieren:

```typescript
timeEntries = rawValues.map(rawVal => {
    const entry = JSON.parse(rawVal.value);

    // Update categoryName from current categories
    const currentCategory = workCategories.find(c => c.id === entry.categoryId);
    if (currentCategory) {
        entry.categoryName = currentCategory.name;
    }

    return entry;
});
```

---

## Änderungshistorie

### v1.0.0 - Initial Implementation
- Clock-in/Clock-out
- Manual entries
- Category management
- Basic reporting

### v1.1.0 - Excel Import/Export
- Template download mit Categories sheet
- Excel import mit validation
- Bulk entry interface

### v1.2.0 - Bug Fixes
- **KRITISCH:** KV-Store ID Problem behoben
- Category edit/delete nach Reload gefixt
- Time entries zeigen richtige Kategorien

### v1.3.0 - Category Deletion Improvements
- Pre-deletion check für benutzte Kategorien
- Reassignment dialog
- Automatic entry reassignment

### v1.4.0 - Notification System
- Toast notifications statt Alerts
- Persistent error notifications mit Close-Button
- Auto-hide für success notifications
- Stacking für multiple notifications

---

## 📋 TODO & Offene Aufgaben

> **Für KI-Assistenten:** Prüfe diese Liste bei jeder Session und arbeite offene Punkte ab. Füge neue Ideen und Aufgaben hinzu, damit sie nicht verloren gehen.

### 🔴 Kritisch (High Priority)

_Aktuell keine kritischen Aufgaben_

### 🟡 Wichtig (Medium Priority)

1. **Performance-Optimierung bei vielen Einträgen**
   - Problem: Bei >1000 Einträgen wird Rendering langsam
   - Idee: Virtuelle Scrolling für Time Entries Tabelle implementieren
   - Status: Offen
   - Session: Noch nicht begonnen

2. **Excel Dropdown-Alternative**
   - Problem: xlsx Library unterstützt keine Dropdowns
   - Idee: Alternative Library prüfen (exceljs, xlsx-populate)
   - Status: Offen
   - Hinweis: Aktuell funktioniert Copy/Paste aus "Available Categories" Sheet gut

### 🟢 Nice-to-Have (Low Priority)

1. **Bulk Edit für Time Entries**
   - Idee: Mehrere Einträge gleichzeitig auswählen und Kategorie ändern
   - Status: Offen
   - Use Case: User hat 10 Einträge mit falscher Kategorie

2. **Dark Mode Support**
   - Idee: Dark Mode für bessere Lesbarkeit bei Nacht
   - Status: Offen
   - Aufwand: Mittel (alle Inline-Styles anpassen)

3. **Notification Sound Toggle**
   - Idee: Optionaler Sound bei Success/Error Notifications
   - Status: Offen
   - User Feedback: Noch nicht angefragt

4. **Time Entry Templates**
   - Idee: Häufig verwendete Einträge als Templates speichern
   - Status: Offen
   - Use Case: "Montags Meeting 9-10 Uhr" als Template

### 💡 Ideen für zukünftige Features

1. **Approval Workflow**
   - Zeiteinträge müssen von Vorgesetzten genehmigt werden
   - Status in TimeEntry: pending, approved, rejected
   - Admin kann genehmigen/ablehnen

2. **Team Dashboard**
   - Manager sieht Zeiteinträge des Teams
   - Aggregierte Statistiken
   - Filter nach Person, Kategorie, Zeitraum

3. **Break Time Tracking**
   - Pausen separat erfassen
   - Von Arbeitszeit abziehen
   - Gesetzliche Pausenregelungen beachten

4. **Email Notifications**
   - Wöchentliche Zusammenfassung per Email
   - Erinnerung bei fehlendem Clock-Out
   - Benachrichtigung bei Überstunden

5. **Mobile App / PWA**
   - Progressive Web App für Mobile
   - Offline-Funktionalität
   - Push Notifications

### 📌 Abgeschlossene Aufgaben (zur Historie)

- ✅ KV-Store ID Problem behoben (2025-01-22)
- ✅ Excel Import/Export implementiert (2025-01-22)
- ✅ Category Deletion mit Reassignment (2025-01-22)
- ✅ Notification System mit persistent errors (2025-01-22)

---

## 📝 Dokumentations-Pflege

> **🤖 PFLICHT für alle KI-Assistenten:** Nach JEDER Änderung am Code MUSS diese Dokumentation aktualisiert werden!

### Wann dokumentieren?

**Immer dokumentieren bei:**
- ✅ Neuen Features oder Funktionen
- ✅ Bug Fixes (besonders wenn das Problem kompliziert war)
- ✅ Designentscheidungen (warum wurde etwas so gemacht?)
- ✅ Workarounds für Library-Limitationen
- ✅ Performance-Optimierungen
- ✅ Neuen bekannten Problemen
- ✅ API-Änderungen
- ✅ Datenstruktur-Änderungen

**Beispiel:**
```markdown
### Problem: Category Filter funktioniert nicht nach Excel Import

**Symptom:**
- Nach Excel Import zeigt Category Filter keine Kategorien
- Console Error: "workCategories is undefined"

**Ursache:**
loadWorkCategories() wird nicht vor importFromExcel() aufgerufen

**Lösung:**
In initialize() Reihenfolge geändert:
```typescript
// Erst Kategorien laden
await loadWorkCategories();
// Dann Import-Handler registrieren
attachEventHandlers();
```

**Wo:** main.ts Zeile 120-125
**Commit:** abc123
**Datum:** 2025-01-22
```

### Wie dokumentieren?

1. **Update der betroffenen Sektion**
   - Suche die relevante Sektion (z.B. "Features und Implementierung")
   - Füge neue Informationen hinzu oder aktualisiere bestehende

2. **Neue Probleme in "Bekannte Probleme"**
   - Symptome klar beschreiben
   - Ursache erklären
   - Lösung mit Code-Beispiel
   - Dateipfad und Zeilennummern angeben

3. **Changelog aktualisieren**
   - Neue Version erstellen wenn sinnvoll
   - Alle Änderungen kurz auflisten
   - Datum und Session-Info

4. **TODO-Liste pflegen**
   - Neue Ideen aus User-Konversation hinzufügen
   - Abgeschlossene Tasks nach "Abgeschlossene Aufgaben" verschieben
   - Prioritäten anpassen wenn nötig

### Was MUSS in die Dokumentation?

**Kritische Informationen:**
- ⚠️ **Bugs mit Workarounds**: Damit nicht wieder der falsche Weg genommen wird
- ⚠️ **"Don't"-Patterns**: Was man NICHT tun sollte und warum
- ⚠️ **Abhängigkeiten**: Was muss vor was geladen/aufgerufen werden?
- ⚠️ **State Management**: Welche Variablen beeinflussen was?
- ⚠️ **Side Effects**: Welche Funktionen haben Nebeneffekte?

**User-Anforderungen:**
- Warum wurde eine Entscheidung so getroffen?
- Was waren die User-Anforderungen?
- Welche Alternativen wurden erwogen?

**Technische Details:**
- API-Calls und ihre Parameter
- Datenstrukturen und deren Felder
- Validierungslogik
- Error Handling

### Dokumentations-Qualität checken

**Gute Dokumentation erkennt man daran:**
- ✅ Ein neuer KI-Assistent kann sofort produktiv arbeiten
- ✅ Bekannte Probleme werden nicht erneut eingeführt
- ✅ Designentscheidungen sind nachvollziehbar
- ✅ Code-Beispiele sind aktuell und funktionieren
- ✅ TODO-Liste ist gepflegt

**Schlechte Dokumentation:**
- ❌ "Siehe Code" ohne weitere Erklärung
- ❌ Veraltete Code-Beispiele
- ❌ Keine Begründung für Entscheidungen
- ❌ Fehlende Zeilennummern/Dateipfade
- ❌ TODO-Liste veraltet oder leer

### Git Commit Workflow - WICHTIG!

> **🚨 PFLICHT:** Nach JEDER Änderung committen!
>
> **Warum?** Damit man jederzeit auf einen funktionierenden Stand zurückkehren kann, falls etwas schief geht.

**Commit-Frequenz:**
- ✅ Nach jedem abgeschlossenen Feature
- ✅ Nach jedem Bug-Fix
- ✅ Nach größeren Dokumentations-Updates
- ✅ Vor risikoreichen Refactorings
- ✅ Am Ende einer Arbeits-Session

**Commit-Message Format:**

```bash
# Feature mit Tests und Doku
git commit -m "feat: Add bulk delete for time entries

- Implement multi-select checkbox in time entries table
- Add bulk delete button with confirmation dialog
- Add validation: prevent delete of currently running entry
- Update docs/timetracker-implementation.md with new feature
- Tested with 5, 50, and 500 entries"

# Bug Fix mit Erklärung
git commit -m "fix: Category edit buttons not working after page reload

- Root cause: KV-Store ID overwrites string ID in loadWorkCategories()
- Solution: Call API directly instead of using getCustomDataValues()
- Update docs/timetracker-implementation.md with problem and solution
- Add debug logging for future troubleshooting"

# Reiner Doku-Update
git commit -m "docs: Add troubleshooting section for notification issues

- Document when to use error vs success notifications
- Add checklist for notification debugging
- Update TODO list with notification sound feature idea"

# Refactoring
git commit -m "refactor: Extract notification logic into separate function

- Move showNotification() from main.ts to utils/notifications.ts
- Add JSDoc comments
- No functional changes, all tests pass"

# TODO/Ideen Updates
git commit -m "docs: Add TODO items from user feedback

- Performance optimization for large datasets
- Dark mode support
- Bulk edit functionality"
```

**Commit-Message Struktur:**

1. **Type:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
2. **Kurze Beschreibung** (max 50 Zeichen)
3. **Leerzeile**
4. **Details** als Bullet-Points:
   - Was wurde geändert?
   - Warum wurde es geändert?
   - Welche Files wurden aktualisiert?
   - Besonderheiten/Caveats?

**Commit-Beispiele nach Situation:**

```bash
# Nach User-Conversation mit mehreren Änderungen
git commit -m "feat: Excel import improvements and persistent error notifications

Session Changes:
- Excel import now opens bulk entry dialog automatically
- Category validation with detailed error messages
- Error notifications stay until manually closed
- Success notifications auto-hide after 3s
- Toast notification system with animation
- Update docs with notification system design decisions

Files changed:
- src/entry-points/main.ts: +150/-80
- docs/timetracker-implementation.md: +300
- README.md: +10/-5

User feedback addressed:
- Excel import data not visible in UI
- Invalid categories should show clear error
- Alerts should be replaced with nice notifications"

# Nach Bug-Fix Session
git commit -m "fix: Multiple critical bugs in category management

Session fixes:
1. Categories not editable after reload (KV-Store ID issue)
2. Time entries showing 'Unknown' category
3. Delete buttons not working

Root cause: getCustomDataValues() overwrites string IDs
Solution: Direct API calls for all category/entry loading

Files changed:
- src/entry-points/main.ts: loadWorkCategories(), loadTimeEntries()
- src/entry-points/admin.ts: loadWorkCategories()
- docs/timetracker-implementation.md: Added critical bug documentation

This is a critical fix - all future category loading MUST use direct API calls!"

# Vor Feierabend / Ende Session
git commit -m "chore: End of session checkpoint - all features working

Session summary:
- Category deletion with reassignment ✅
- Excel import/export ✅
- Notification system ✅
- All known bugs fixed ✅
- Documentation updated ✅

Next session TODO:
- Performance optimization for >1000 entries
- Consider Excel dropdown alternatives

Everything tested and working in dev environment."
```

**Wann NICHT committen:**

- ❌ Code kompiliert nicht
- ❌ Tests schlagen fehl
- ❌ Feature nur halb fertig
- ❌ Debugging-Code noch drin (console.logs sind OK)
- ❌ Experimenteller Code ohne Plan

**Branch Strategy:**

```bash
# Für neue Features: Feature Branch
git checkout -b feature/bulk-delete
# ... work ...
git commit -m "feat: Add bulk delete functionality"
git checkout main
git merge feature/bulk-delete

# Für Bug Fixes: Direkt in main (kleine Projekte)
git checkout main
git commit -m "fix: Category edit buttons"

# Für Experimente: Experiment Branch
git checkout -b experiment/virtual-scrolling
# ... try things ...
# Wenn erfolgreich: merge
# Wenn nicht: einfach löschen
```

**Git-Historie als Dokumentation:**

```bash
# Siehe was in letzter Session gemacht wurde
git log --oneline -10

# Siehe alle Änderungen an einer Datei
git log --oneline -- src/entry-points/main.ts

# Siehe Details eines Commits
git show abc123

# Finde heraus wann ein Bug eingeführt wurde
git log --all --grep="notification"

# Zurück zu funktionierendem Stand
git log --oneline  # Finde commit hash
git checkout abc123 -- src/entry-points/main.ts  # Restore file
```

**Pre-Commit Checklist:**

Vor jedem Commit prüfen:
- ✅ `npm run build` läuft ohne Fehler
- ✅ Code kompiliert (TypeScript Errors behoben)
- ✅ Keine TODO-Comments für kritische Fixes
- ✅ Console Logs entfernt oder sinnvoll (Debug-Level)
- ✅ Dokumentation aktualisiert wenn nötig
- ✅ Commit-Message ist aussagekräftig

---

## Für KI-Assistenten - Quick Reference

**Bevor du Änderungen machst:**

1. ✅ Lies diese komplette Dokumentation
2. ✅ Prüfe TODO-Liste für Kontext
3. ✅ Prüfe ob das Problem bereits gelöst wurde (siehe "Bekannte Probleme")
4. ✅ Verwende NIEMALS `getCustomDataValues()` für Kategorien/Entries
5. ✅ Teste nach Änderungen: Edit/Delete Buttons, Excel Import, Notifications

**Nach Änderungen:**

1. ✅ Dokumentiere neue Features/Fixes in dieser Datei
2. ✅ Update TODO-Liste (neue Ideen hinzufügen, erledigte verschieben)
3. ✅ Update Changelog mit neuer Version
4. ✅ Pre-Commit Check: Build läuft? Docs aktualisiert?
5. ✅ **COMMIT MIT AUSSAGEKRÄFTIGER MESSAGE** (siehe Git Commit Workflow)
6. ✅ Regelmäßig committen - nicht alles auf einmal!

**Kritische Dateien:**
- `src/entry-points/main.ts` - Hauptlogik (2300+ Zeilen)
- `src/entry-points/admin.ts` - Admin-Panel (900+ Zeilen)
- `src/utils/kv-store.ts` - **NICHT ÄNDERN** (Hat den ID-Bug)
- `docs/timetracker-implementation.md` - **IMMER AKTUELL HALTEN**

**Bei Debugging:**
- Immer Console Logs für IDs checken (String vs Number)
- Event Handler Probleme → Sind sie nach render() attached?
- Kategorie nicht gefunden → Ist loadWorkCategories() korrekt?
- Notification verschwindet/bleibt nicht → Type richtig? (error vs success)

**Template für neue Problem-Dokumentation:**
```markdown
### Problem: [Kurze Beschreibung]

**Symptom:**
- [Was sieht der User?]
- [Was steht in der Console?]

**Ursache:**
[Technische Erklärung]

**Lösung:**
[Code-Beispiel und Erklärung]

**Wo:** [Datei:Zeilen]
**Session:** [Datum]
```

---

## Support und Kontakt

Bei Fragen zur Implementierung oder wenn neue Probleme auftreten:
1. Prüfe diese Dokumentation
2. Check Console Logs
3. Dokumentiere neue Findings in dieser Datei

**Letzte Aktualisierung:** 2025-01-22
**Maintainer:** Entwickelt mit Claude (Anthropic)
**Dokumentation Version:** 1.1
