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

## Problem 3: Excel Import State Updates

### Symptome
- Excel wird importiert, aber kein Dialog erscheint
- Keine Reaktivität nach Daten-Upload

### Root Cause
**Reactive State nicht aktualisiert:**
Wenn Daten in eine `ref` oder einen `reactive` Store geladen werden, muss sichergestellt sein, dass Trigger-Variablen (z.B. `showImportModal`) ebenfalls aktualisiert werden.

### Lösung
**FIX: Reaktive Updates in Stores bündeln**

1.  Daten parsen
2.  Store-Methode aufrufen
3.  Store updated State (`entries.value = ...`) und UI-Flag (`showModal.value = true`)

**Wichtig:** State-Änderungen sollten atomar und innerhalb von Actions im Store passieren.

---

## Problem 4: Bulk Save Consistency

### Symptome
- Success-Toast erscheint, aber Daten sind nicht in DB
- Partielle Speicherung bei Fehlern

### Lösung
**FIX: Validation first:**
Alle Einträge client-seitig validieren, BEVOR der erste API-Call rausgeht.
Nutze `await Promise.all()` für parallele Speicherungen nur wenn API-Limit das zulässt, ansonsten sequentiell verarbeiten um Race Conditions zu vermeiden.
Nach Speicherung: `await timeEntriesStore.loadTimeEntries()` um aktuelle Server-Daten zu holen.

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

### Excel Import Checklist
1. File Input `@change` Event korrekt gebunden?
2. `FileReader` liest Daten asynchron?
3. Store Action wird mit `await` aufgerufen?
4. UI-Variable (Modal Visibility) wird reactive gesetzt?

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
3. ❌ Reactive State Updates vergessen (UI outdated)
4. ❌ `loadTimeEntries()` nach API-Write vergessen
5. ❌ Validation nach Async-Call statt vorher

**IMMER diese Patterns verwenden:**
1. ✅ Direkte API-Calls mit `churchtoolsClient.get()`
2. ✅ Duale IDs: `id` (string) + `kvStoreId` (number)
3. ✅ Store-Actions nutzen für State-Updates
4. ✅ Refresh Store Data nach DB-Änderungen
5. ✅ Validation VOR Async-Operations

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
