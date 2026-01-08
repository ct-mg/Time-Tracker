# Time Tracker Extension - Known Issues & Solutions

> **⚠️ PFLICHTLEKTÜRE!** Diese Probleme wurden bereits gelöst. Führe sie NICHT erneut ein!

---

## Übersicht

Dieses Dokument enthält alle bekannten Probleme der Time Tracker Extension mit ausführlichen Lösungen. Jedes Problem wurde bereits gelöst und ist in Production getestet.

**Für KI-Assistenten:** Lies diese Datei VOR Code-Änderungen, um bereits gelöste Probleme nicht erneut einzuführen!

---


---

## Problem 1: Kategorien nicht löschbar nach Reload

### Symptome

- Nach Seiten-Reload zeigen Edit/Delete Buttons keine Wirkung
- Console Log zeigt: `categoryId: 65` (Zahl statt String "office")
- Event Handler finden Kategorie nicht im Array
- `workCategories.find(c => c.id === 65)` returned undefined

### Root Cause

**KV-Store ID Bug:**
Die Helper-Funktion `getCustomDataValues()` in `src/utils/kv-store.ts` überschreibt die String-ID mit der numerischen KV-Store ID.

**Technische Details:**
- Zeile 232-235: `{ ...parsedData, ...metadata }`
- parsedData.id = "office" (String)
- metadata.id = 65 (Number)
- Spread-Operator → metadata gewinnt → id = 65

**Warum tritt es nur nach Reload auf?**
- Bei Create: Wir verwenden neue Category mit korrekter String-ID
- Bei Reload: Wir laden via `getCustomDataValues()` → Bug aktiv
- HTML wird mit falscher numerischer ID generiert
- Event Handler können Category nicht finden (Type Mismatch)

### Lösung

**FIX: Verwende direkte API-Calls statt getCustomDataValues()**

**In loadWorkCategories():**
1. API direkt aufrufen: `churchtoolsClient.get('/custommodules/{moduleId}/customdatacategories/{categoryId}/customdatavalues')`
2. Raw Values Array erhalten: `[{ id: number, value: string }, ...]`
3. Manuell JSON parsen: `JSON.parse(rawVal.value)`
4. String-ID aus JSON: `parsed.id`
5. Numerische ID separat: `kvStoreId: rawVal.id`

**Implementiert in:**
- `main.ts` Zeilen 150-164
- `admin.ts` Zeilen 157-184

### Verification

**Nach Fix sollte Console Log zeigen:**
```
categoryId: "office" (String!)
typeof categoryId: "string"
```

**Test:**
1. Create Category → funktioniert
2. Reload Page
3. Edit Category → funktioniert!
4. Delete Category → funktioniert!

### Status

✅ **GELÖST** (2025-01-22)

---

## Problem 2: Time Entries zeigen "Unknown" als Kategorie

### Symptome

- In Time Entries Tabelle steht "Unknown" statt Kategoriename
- Kategorie-Badge ist grau statt farbig
- categoryId in Entry ist numerisch (65) statt String ("office")

### Root Cause

**Gleicher KV-Store ID Bug:**
1. `loadTimeEntries()` verwendet `getCustomDataValues()`
2. categoryId wird überschrieben mit numerischer ID
3. UI rendert Entries und sucht Category: `workCategories.find(c => c.id === entry.categoryId)`
4. Findet nichts weil `65 !== "office"`
5. Fallback-Logic: `entry.categoryName || 'Unknown'`
6. Da categoryName auch fehlt oder überschrieben: "Unknown"

### Warum kritisch?

- User sieht nicht welche Kategorie ein Entry hat
- Kann keine sinnvollen Reports erstellen
- Daten sehen "kaputt" aus
- Vertrauensverlust

### Lösung

**FIX: Direkte API-Calls in loadTimeEntries()**

**Prozess:**
1. Lade Raw Values direkt von API
2. Parse JSON manuell: `JSON.parse(rawVal.value)`
3. Behalte String categoryId aus JSON
4. **BONUS:** Update categoryName aus aktuellen workCategories (falls Category renamed wurde)

**Implementiert in:**
- `main.ts` Zeilen 200-220

**Optional: CategoryName Update**
```typescript
// Nach Parse von jedem Entry:
const currentCategory = workCategories.find(c => c.id === entry.categoryId);
if (currentCategory) {
    entry.categoryName = currentCategory.name;  // Fresh Name!
}
```

### Verification

**Test:**
1. Create Entry mit Category "Office"
2. Reload Page
3. Entry zeigt "Office" (nicht "Unknown") ✅
4. Badge hat richtige Farbe ✅

### Status

✅ **GELÖST** (2025-01-22)

---

## Problem 3: Excel Import zeigt keine Daten in UI

### Symptome

- Excel wird erfolgreich importiert (Success Notification erscheint)
- Bulk Entry Dialog bleibt leer oder zeigt nicht
- Beim manuellen "Add Row" erscheint nur diese eine neue Row
- Console Log zeigt: `bulkEntryRows.length: 10` (Daten sind da!)

### Root Cause

**Missing State Flag:**
`showBulkEntry = true` fehlt im `importFromExcel()` Handler.

**Warum?**
- Bulk Dialog hat Conditional Rendering: `if (showBulkEntry) { render dialog }`
- Ohne Flag: Condition bleibt false
- HTML für Dialog wird nicht generiert
- User sieht leeren Screen

### Developer Error

- Developer vergisst State Flag zu setzen
- Fokus auf Import-Logic, vergisst UI-Update
- Passiert leicht bei multi-step Operations

### Lösung

**FIX: State Flags korrekt setzen**

**In importFromExcel() nach erfolgreichem Parse:**
1. `bulkEntryRows = []` (clear old data)
2. `showBulkEntry = true` ← **KRITISCH!**
3. `showAddManualEntry = false` (close other dialogs)
4. `editingEntry = null` (clear edit state)
5. Fill `bulkEntryRows` mit parsed data
6. `render()` (trigger UI update)

**Implementiert in:**
- `main.ts` Zeilen 820-830 (vor Row Iteration)

### Verification

**Test:**
1. Click "Import from Excel"
2. Select valid Excel file
3. Bulk Dialog öffnet sofort ✅
4. Alle Rows sichtbar ✅
5. Can edit/delete rows ✅

### Status

✅ **GELÖST** (2025-01-22)

---

## Problem 4: Bulk Save zeigt Erfolg aber speichert nichts

### Symptome

- "Successfully saved X entries!" Notification erscheint
- Nach Reload: Keine neuen Entries in der Liste
- Oder: Nur einige Entries wurden gespeichert (nicht alle)

### Mögliche Root Causes

#### Cause A: Validation schlägt fehl aber savedCount wird erhöht

**Problem:**
- Validation findet Fehler (z.B. ungültige Category ID)
- Aber: Loop läuft weiter, `savedCount++` wird ausgeführt
- Success Notification zeigt falsche Anzahl

**Fix:**
- Validation VOR der Save-Loop
- Bei Fehler: `return` früh, keine Saves
- `savedCount++` nur bei tatsächlichem Success

#### Cause B: createCustomDataValue schlägt fehl (silent)

**Problem:**
- API Call failed (Network, Permission, Validation)
- Aber: Kein Error Handling
- Loop läuft weiter, `savedCount++` läuft

**Fix:**
- Try-catch um `createCustomDataValue`
- Bei Error: Console Error, aber weiter
- Nur increment savedCount bei Success
- Oder: Await und prüfe Response

#### Cause C: loadTimeEntries() wird nicht aufgerufen

**Problem:**
- Entries werden in DB gespeichert (erfolgreich)
- Aber: UI zeigt alte Liste (nicht refreshed)
- User sieht keine neuen Entries

**Fix:**
- Nach Save-Loop: `await loadTimeEntries()`
- Dann: `render()`
- Dann: Success Notification

### Lösung

**FIX: Multi-Layer Validation und Reload**

**Complete Flow:**
1. **Validation Step 1:** Required fields
2. **Validation Step 2:** Time validity (end > start)
3. **Validation Step 3:** Category IDs valid
4. Bei Fehler: Detailed Error Toast, return früh
5. **Save Loop:** Nur bei valid data
6. **Post-Save:** `await loadTimeEntries()`
7. **Post-Save:** `render()`
8. **Post-Save:** Success Toast

**Implementiert in:**
- `main.ts` Zeilen 950-1100 (saveBulkEntries mit allen Fixes)

### Verification

**Test:**
1. Import 10 Entries with valid data
2. Save → Success ✅
3. Reload → All 10 Entries visible ✅

**Test (Error Case):**
1. Import 10 Entries with 2 invalid Category IDs
2. Save → Error Toast mit Details ✅
3. Keine Entries gespeichert ✅

### Status

✅ **GELÖST** (2025-01-22)

---

## Troubleshooting Guide

### "Category not found for ID: 65"

**Diagnose Steps:**

1. **Check categoryId Type:**
   ```javascript
   console.log('categoryId:', categoryId);
   console.log('typeof:', typeof categoryId);
   ```

2. **Check Available Categories:**
   ```javascript
   console.log('workCategories:', workCategories);
   ```

3. **Check Find Result:**
   ```javascript
   console.log('Found:', workCategories.find(c => c.id === categoryId));
   ```

**Expected Output:**
- categoryId: `"office"` (String!)
- typeof: `"string"`
- workCategories: Array mit `id: "office"`
- Found: Category Object

**If categoryId is Number (65):**
→ **KV-Store ID Problem!**
→ Check `loadWorkCategories()` verwendet direkte API-Calls
→ Check HTML data-attribute hat String-ID

**Fix:**
Siehe [Problem 1](#problem-1-kategorien-nicht-löschbar-nach-reload)

---

### Notifications verschwinden zu schnell / nicht

**Symptom A: Error verschwindet automatisch**
- Sollte dauerhaft bleiben
- Fehler: setTimeout läuft für alle Types
- **Fix:** Conditional setTimeout nur für `type === 'success'`

**Symptom B: Success bleibt dauerhaft**
- Sollte nach 3s verschwinden
- Fehler: setTimeout fehlt
- **Fix:** setTimeout mit duration für success

**Diagnose:**
```javascript
console.log('[Notification] Type:', type);
console.log('[Notification] setTimeout:', willAutoHide);
```

**Fix Pattern:**
```javascript
if (type === 'success') {
    setTimeout(() => { /* remove */ }, duration);
} else {
    addCloseButton();  // Manual close für error/warning
}
```

**Implementiert in:**
- `main.ts` Zeilen 100-150
- `admin.ts` Zeilen 80-130

---

### Excel Import funktioniert nicht

**Check-Liste:**

**1. File-Input Event gefeuert?**
```javascript
console.log('[Import] File selected:', file.name);
```
Falls nein: Check `<input type="file">` und onChange binding

**2. bulkEntryRows gefüllt?**
```javascript
console.log('[Import] Rows before:', bulkEntryRows.length);
// ... import logic ...
console.log('[Import] Rows after:', bulkEntryRows.length);
```
Falls 0: Check Excel parsing logic

**3. showBulkEntry gesetzt?**
```javascript
console.log('[Import] showBulkEntry:', showBulkEntry);
```
Falls false: **Setze `showBulkEntry = true`** (siehe Problem 3)

**4. render() aufgerufen?**
```javascript
console.log('[Import] Calling render()');
render();
console.log('[Import] Render complete');
```
Falls nicht: Rufe `render()` nach Import auf

**Debug Template:**
```javascript
function importFromExcel(file) {
    console.log('[Import] 1. File:', file.name);

    reader.onload = (e) => {
        console.log('[Import] 2. Parse start');
        const rows = /* parse */;
        console.log('[Import] 3. Rows parsed:', rows.length);

        bulkEntryRows = [];
        showBulkEntry = true;  // ← CHECK THIS!
        console.log('[Import] 4. State set:', { showBulkEntry });

        // ... fill rows ...
        console.log('[Import] 5. Final rows:', bulkEntryRows.length);

        render();
        console.log('[Import] 6. Render complete');
    };
}
```

---

### Time Entries zeigen alte Kategorienamen nach Rename

**Ursache:**
TimeEntry speichert sowohl `categoryId` als auch `categoryName`. Bei Category-Rename:
- categoryId bleibt gleich ✅
- categoryName ist alt ❌

**Symptom:**
Entry zeigt "Office Work" aber Category heißt jetzt "Büro Arbeit"

**Fix: Update categoryName in loadTimeEntries()**

**Option 1: In-Memory Update (empfohlen):**
```javascript
// Nach Parse von jedem Entry:
const currentCategory = workCategories.find(c => c.id === entry.categoryId);
if (currentCategory) {
    entry.categoryName = currentCategory.name;  // Fresh!
}
```
- ✅ Keine DB Writes
- ✅ Schnell
- ✅ Bei jedem Load: Fresh Category Names

**Option 2: DB Update:**
```javascript
// Nach Name-Update in Category:
for (const entry of timeEntries) {
    if (entry.categoryId === renamedCategoryId) {
        entry.categoryName = newCategoryName;
        await updateCustomDataValue(/* save entry */);
    }
}
```
- ⚠️ Langsam bei vielen Entries
- ✅ Historical Accuracy
- ⚠️ Nur wenn wirklich benötigt

**Implementiert:** Option 1 (In-Memory)
- `main.ts` Zeilen 200-220 (loadTimeEntries kann optional categoryName Update enthalten)

---

## Prevention Checklist

**Vor Code-Änderungen:**
- [ ] Lies [KNOWN-ISSUES.md](KNOWN-ISSUES.md) (diese Datei!)
- [ ] Lies [ARCHITECTURE.md](ARCHITECTURE.md) (Design Decisions)
- [ ] Check: Ändere ich etwas das bereits gelöst wurde?
- [ ] Check: Verwende ich `getCustomDataValues()`? → ❌ NEIN!

**Nach Code-Änderungen:**
- [ ] Test: Kategorien editierbar nach Reload?
- [ ] Test: Time Entries zeigen richtige Kategorien?
- [ ] Test: Excel Import zeigt Bulk Dialog?
- [ ] Test: Notifications verhalten sich korrekt?
- [ ] Update diese Datei wenn neues Problem gefunden

**Bei Bugs:**
- [ ] Check Browser Console (F12)
- [ ] Check Network Tab (API Calls)
- [ ] Check Dev Server Output
- [ ] Check Git History (was hat sich geändert?)
- [ ] Dokumentiere Problem & Lösung hier!

---

## Für KI-Assistenten

### Critical Rules

**NIEMALS diese Fehler wiederholen:**
1. ❌ `getCustomDataValues()` für Categories/Entries verwenden
2. ❌ Nur String-ID oder nur numerische ID verwenden
3. ❌ `showBulkEntry` Flag vergessen nach Import
4. ❌ `loadTimeEntries()` nach Save vergessen
5. ❌ Validation nach Save statt vorher

**IMMER diese Patterns verwenden:**
1. ✅ Direkte API-Calls mit `churchtoolsClient.get()`
2. ✅ Duale IDs: `id` (string) + `kvStoreId` (number)
3. ✅ State Flags setzen vor `render()`
4. ✅ Reload nach DB-Änderungen
5. ✅ Validation VOR DB-Operations

### Debugging Template

**Wenn etwas nicht funktioniert:**

1. **Identifiziere Problem:**
   - Was macht User?
   - Was erwartet User?
   - Was passiert stattdessen?

2. **Check Console:**
   - Errors?
   - Warnings?
   - Unexpected values?

3. **Check diese Datei:**
   - Ist Problem bekannt?
   - Gibt es bereits Lösung?

4. **Add Debug Logs:**
   ```javascript
   console.log('[Feature] Step 1:', value1);
   console.log('[Feature] Step 2:', value2);
   // ... find where it breaks ...
   ```

5. **Fix & Document:**
   - Implementiere Fix
   - Test thoroughly
   - Update diese Datei
   - Git Commit mit Details

---

## Future Considerations

### Potential Issues (noch nicht aufgetreten)

**Performance bei >1000 Entries:**
- Symptom: Rendering wird langsam
- Solution: Virtual Scrolling implementieren
- Status: TODO (siehe [TODO.md](TODO.md))

**Memory Leak bei langem Session:**
- Symptom: Browser langsamer nach Stunden
- Solution: Event Listener Cleanup
- Status: Noch nicht beobachtet

**Excel Import bei >10000 Rows:**
- Symptom: Browser freezt
- Solution: Web Worker für Parsing
- Status: Noch nicht nötig (Max 100 Rows erwartet)

---

**Letzte Aktualisierung:** 2026-01-08
**Version:** 2.0.0
**Status:** ✅ Alle bekannten Issues gelöst
