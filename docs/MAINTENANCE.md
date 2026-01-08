# Maintenance Guidelines - Time Tracker Extension

> **🚨 PFLICHTLEKTÜRE für alle KI-Assistenten!**
>
> Diese Regeln MÜSSEN befolgt werden, um die Code-Qualität und Wartbarkeit zu gewährleisten.

---

## Inhaltsverzeichnis

1. [Kritische Regeln](#kritische-regeln)
2. [Git Commit Workflow](#git-commit-workflow)
3. [Dokumentations-Pflege](#dokumentations-pflege)
4. [Development Workflow](#development-workflow)
5. [Testing & Quality Checks](#testing--quality-checks)
6. [Troubleshooting](#troubleshooting)

---

## Kritische Regeln

### 1. ⚠️ NIEMALS getCustomDataValues() für Kategorien/Entries verwenden

**Warum?**
Die Funktion hat einen Bug: Spread-Operator überschreibt String-IDs mit numerischen KV-Store IDs.

**Was zu tun ist:**
- ✅ Verwende IMMER direkte API-Calls via `churchtoolsClient.get()`
- ✅ Parse JSON manuell mit `JSON.parse(rawVal.value)`
- ✅ Extrahiere kvStoreId separat: `kvStoreId: rawVal.id`

**Wo betroffen:**
**Wo betroffen:**
- `src/stores/time-entries.store.ts`
- `src/stores/settings.store.ts`

**Wenn du diesen Fehler machst:**
- Kategorien können nach Reload nicht mehr bearbeitet/gelöscht werden
- Time Entries zeigen "Unknown" als Kategorie
- Event Handler finden Kategorien nicht mehr

---


---

### 3. ⚠️ NIEMALS alert() verwenden - nur Toasts!

**User-Anforderung:**
- Success Toasts: Auto-hide nach 3 Sekunden
- Error/Warning Toasts: Persistent, manuell schließbar

**Was zu tun ist:**
- ✅ Verwende `showNotification(message, type)`
- ✅ Success: `type = 'success'`
- ✅ Error: `type = 'error'`
- ✅ Warning: `type = 'warning'`

**Niemals:**
- ❌ `alert('...')`
- ❌ `confirm('...')` für Informationen (OK für destructive actions)

---

### 4. ⚠️ Zwei IDs für WorkCategory verwalten

**Struktur:**
- `id` (string): User-facing, unveränderlich, wird in TimeEntries referenziert
- `kvStoreId` (number): DB-ID für Updates/Deletes, wird NICHT im JSON gespeichert

**Beim Speichern:**
- ✅ `kvStoreId` VOR Stringify entfernen
- ✅ Nach Create: Reload um `kvStoreId` zu bekommen

**Beim Löschen:**
- ✅ Verwende `kvStoreId` für API-Call

---

### 4. ⚠️ Refresh Store Data nach DB-Updates

**Warum?**
Lokaler Store-State kann nach API-Writes out-of-sync mit der DB sein.

**Was zu tun ist:**
- ✅ Nach jedem Create/Update/Delete: Store Action (z.B. `fetchAll()`) aufrufen.
- ✅ Optimistic UI Updates sind erlaubt, aber sollten verifiziert werden.

---

## Git Commit Workflow

### Commit-Frequenz: HÄUFIG!

**Commit nach:**
- ✅ Jedem abgeschlossenen Feature
- ✅ Jedem Bug-Fix
- ✅ Größeren Dokumentations-Updates
- ✅ VOR risikoreichen Refactorings
- ✅ Am Ende einer Arbeits-Session

**NICHT committen wenn:**
- ❌ Code kompiliert nicht
- ❌ Tests schlagen fehl
- ❌ Feature nur halb fertig
- ❌ Experimenteller Code ohne Plan

---

### Commit-Message Format

**Struktur:**
```
<type>: <short description>

<detailed explanation>
- What was changed?
- Why was it changed?
- Which files were updated?
- Any caveats?
```

**Types:**
- `feat`: Neues Feature
- `fix`: Bug Fix
- `docs`: Nur Dokumentation
- `refactor`: Code-Refactoring ohne Funktionsänderung
- `test`: Tests hinzufügen
- `chore`: Maintenance Tasks

---

### Commit-Beispiele

#### Feature mit Dokumentation
```bash
git commit -m "feat: Add bulk delete for time entries

- Implement multi-select checkbox in time entries table
- Add bulk delete button with confirmation dialog
- Add validation: prevent delete of currently running entry
- Update docs/IMPLEMENTATION.md with new feature
- Tested with 5, 50, and 500 entries"
```

#### Bug Fix mit Erklärung
```bash
git commit -m "fix: Category edit buttons not working after page reload

- Root cause: KV-Store ID overwrites string ID in loadWorkCategories()
- Solution: Call API directly instead of using getCustomDataValues()
- Update docs/IMPLEMENTATION.md with problem and solution
- Add debug logging for future troubleshooting

Files changed:
- src/entry-points/main.ts: loadWorkCategories() line 150-164
- src/entry-points/admin.ts: loadWorkCategories() line 157-184
- docs/IMPLEMENTATION.md: Added to 'Bekannte Probleme' section"
```

#### Reiner Doku-Update
```bash
git commit -m "docs: Add troubleshooting section for notification issues

- Document when to use error vs success notifications
- Add checklist for notification debugging
- Update TODO.md with notification sound feature idea
- No code changes"
```

#### Session-Ende Checkpoint
```bash
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

---

### Pre-Commit Checklist

Vor jedem Commit prüfen:
- [ ] `npm run build` läuft ohne Fehler
- [ ] TypeScript Errors behoben
- [ ] Keine kritischen TODO-Comments
- [ ] Debug-Console.logs entfernt (oder sinnvoll)
- [ ] Dokumentation aktualisiert wenn nötig
- [ ] Commit-Message ist aussagekräftig
- [ ] Code wurde getestet

---

### Branch Strategy

**Für Features:**
```bash
git checkout -b feature/bulk-delete
# ... work ...
git commit -m "feat: Add bulk delete functionality"
git checkout main
git merge feature/bulk-delete
```

**Für Bug Fixes:**
```bash
# Direkt in main (kleine Projekte)
git checkout main
git commit -m "fix: Category edit buttons"
```

**Für Experimente:**
```bash
git checkout -b experiment/virtual-scrolling
# ... try things ...
# Wenn erfolgreich: merge
# Wenn nicht: einfach löschen
```

---

### Git als Dokumentation nutzen

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

---

## Dokumentations-Pflege

### Wann dokumentieren?

**Immer dokumentieren bei:**
- ✅ Neuen Features oder Funktionen
- ✅ Bug Fixes (besonders komplizierte)
- ✅ Designentscheidungen (warum so gemacht?)
- ✅ Workarounds für Library-Limitationen
- ✅ Performance-Optimierungen
- ✅ Neuen bekannten Problemen
- ✅ API-Änderungen
- ✅ Datenstruktur-Änderungen

**Welche Files updaten?**
- `IMPLEMENTATION.md`: Technische Details, Known Issues
- `USER-REQUIREMENTS.md`: Nur bei neuen User-Anforderungen (selten!)
- `TODO.md`: Tasks abschließen, neue hinzufügen
- `MAINTENANCE.md`: Neue Best Practices, neue Regeln

---

### Wie dokumentieren?

**1. Problem dokumentieren:**
```markdown
### Problem: [Kurze Beschreibung]

**Symptom:**
- Was sieht der User?
- Was steht in der Console?

**Ursache:**
Technische Erklärung

**Lösung:**
Beschreibung der Lösung (OHNE Code-Beispiele)

**Wo:** [Datei:Zeilen]
**Datum:** [YYYY-MM-DD]
```

**2. Feature dokumentieren:**
```markdown
### Feature: [Name]

**Purpose:**
Was macht das Feature?

**User Benefit:**
Warum ist es nützlich?

**Key Points:**
- Wichtiger Aspekt 1
- Wichtiger Aspekt 2

**Location:** [Datei:Zeilen]
```

**3. Design Decision dokumentieren:**
```markdown
### Design Decision: [Thema]

**Decision:**
Was wurde entschieden?

**Reason:**
Warum so entschieden?

**Alternatives Considered:**
Was wurde nicht gewählt und warum?

**Impact:**
Was bedeutet das für die Zukunft?
```

---

### Was NICHT dokumentieren

**Keine Code-Beispiele!**
- ❌ TypeScript Code Snippets
- ❌ Function Implementations
- ❌ HTML Templates

**Warum?**
- Code ist im Code, nicht in der Doku
- Spart Tokens
- Code kann veralten, Doku bleibt aktuell

**Was stattdessen:**
- ✅ Beschreibe WAS die Funktion tut
- ✅ Beschreibe WARUM sie so ist
- ✅ Beschreibe WO sie ist (Datei:Zeilen)
- ✅ Beschreibe wichtige ENTSCHEIDUNGEN

---

### Dokumentations-Qualität checken

**Gute Dokumentation:**
- ✅ Ein neuer KI-Assistent kann sofort produktiv arbeiten
- ✅ Bekannte Probleme werden nicht erneut eingeführt
- ✅ Designentscheidungen sind nachvollziehbar
- ✅ TODO-Liste ist gepflegt und aktuell

**Schlechte Dokumentation:**
- ❌ "Siehe Code" ohne weitere Erklärung
- ❌ Veraltete Informationen
- ❌ Keine Begründung für Entscheidungen
- ❌ Fehlende Zeilennummern/Dateipfade
- ❌ TODO-Liste veraltet oder leer

---

## Development Workflow

### Session Start

1. **Pull latest changes**
   ```bash
   git pull
   ```

2. **Read Documentation**
   - `docs/README.md` - Übersicht
   - `docs/TODO.md` - Was steht an?
   - `docs/IMPLEMENTATION.md` - Technische Details

3. **Start Dev Server**
   ```bash
   npm run dev
   ```

4. **Test in ChurchTools**
   - Navigate to extension
   - Check Console for errors
   - Test last changed features

---

### During Development

**Best Practices:**
- ✅ Keep `npm run dev` running (Hot Reload)
- ✅ Test frequently in ChurchTools
- ✅ Check browser console for errors
- ✅ Add console.log for debugging (remove before commit)
- ✅ Commit nach jedem logischen Unit of Work

**Debug-Logging:**
```typescript
// OK für Debugging (vor Commit entfernen oder sinnvoll machen)
console.log('[TimeTracker] Button clicked, categoryId:', categoryId);
console.log('[TimeTracker] Available categories:', workCategories);

// OK dauerhaft (wichtige State Changes)
console.log('[TimeTracker] Loaded', timeEntries.length, 'time entries');
```

---

### Session End

1. **Commit all changes**
   ```bash
   git status  # Was hat sich geändert?
   git add .
   git commit -m "feat/fix/docs: description"
   ```

2. **Update TODO.md**
   - Was wurde erledigt?
   - Was ist als nächstes dran?
   - Neue Ideen hinzufügen

3. **Create Summary Commit if needed**
   - Bei mehreren kleinen Commits: Optional Summary
   - Oder: Squash Commits vor Push

---

## Testing & Quality Checks

### Manual Testing Checklist

**Nach jedem Feature/Fix:**
- [ ] Feature funktioniert wie erwartet
- [ ] Keine Console Errors
- [ ] Notifications zeigen sich korrekt
- [ ] Reload: Feature funktioniert noch
- [ ] Edge Cases getestet

**Category Management:**
- [ ] Create Category → erscheint in Liste
- [ ] Edit Category → Name/Color ändern sich
- [ ] Delete Category ohne Entries → funktioniert
- [ ] Delete Category mit Entries → Dialog zeigt, Reassignment funktioniert
- [ ] Nach Reload: Edit/Delete funktioniert noch

**Time Entries:**
- [ ] Clock-In → Timer läuft
- [ ] Clock-Out → Entry erscheint in Liste
- [ ] Manual Entry → wird gespeichert
- [ ] Edit Entry → Änderungen persistieren
- [ ] Delete Entry → wird entfernt
- [ ] Nach Reload: Einträge zeigen korrekte Kategorien

**Excel Import:**
- [ ] Template Download → zwei Sheets
- [ ] Excel Import → Bulk Dialog öffnet automatisch
- [ ] Validation: Invalid Category → Error Toast mit Details
- [ ] Validation: Missing Fields → Error Toast
- [ ] Validation: End before Start → Error Toast
- [ ] Save Bulk → Einträge erscheinen in Liste

**Notifications:**
- [ ] Success Toast → verschwindet nach 3s
- [ ] Error Toast → bleibt, hat Close-Button
- [ ] Warning Toast → bleibt, hat Close-Button
- [ ] Multiple Toasts → stacken sich

---

### Build Check

```bash
# Before Commit
npm run build

# Check für Errors
# Check Bundle Size (sollte nicht drastisch wachsen)
```

---

## Troubleshooting

### "Category not found for ID: 65"

**Diagnose:**
- categoryId ist eine Zahl (65) statt String ("office")
- → KV-Store ID Problem!

**Fix:**
- Check `loadWorkCategories()` verwendet direkte API-Calls
- Check `loadTimeEntries()` verwendet direkte API-Calls

---


---

### Notifications verschwinden zu schnell / nicht

**Diagnose:**
- Checke `type` Parameter: 'success', 'error', 'warning'
- Success sollte setTimeout haben
- Error/Warning sollten KEIN setTimeout haben

**Fix:**
- Check `showNotification()` Implementierung
- Conditional setTimeout nur für `type === 'success'`

---

### Excel Import funktioniert nicht

**Check-Liste:**
1. File-Input Event gefeuert? → Console Log
2. `bulkEntryRows` gefüllt? → Console Log
3. `showBulkEntry = true` gesetzt?
4. `render()` aufgerufen nach Import?

**Common Mistakes:**
- Reactive State wird nicht updated
- Asynchrone Operationen nichtawaited

---

### Time Entries zeigen "Unknown" Kategorie

**Diagnose:**
- Check `loadTimeEntries()` verwendet `getCustomDataValues()` → FALSCH!
- Check `loadWorkCategories()` läuft VOR `loadTimeEntries()`

**Fix:**
- Verwende direkte API-Calls in `loadTimeEntries()`

---

## Performance Monitoring

### Watch For

- Bundle Size growth (npm run build output)
- API Call frequency (Network Tab)
- Memory leaks in long sessions
- Slow rendering with many entries

### If Performance Degrades

1. **Profile in Browser DevTools**
   - Performance Tab → Record
   - Identify bottlenecks

2. **Check Bundle Size**
   ```bash
   npm run build
   # Check dist/ file sizes
   ```

3. **Optimize**
   - Lazy loading for components
   - Virtual scrolling for large lists
   - Debounce search/filter
   - Memoization for expensive calculations

---

## Security Reminders

- **Never commit** `.env` file (already in .gitignore)
- **Never hardcode** credentials
- **Always validate** user input
- **Check permissions** before sensitive operations
- **Sanitize** user-generated content

---

## Für KI-Assistenten - Quick Reference

### Vor Änderungen
1. ✅ Lies ALLE Docs (README, IMPLEMENTATION, USER-REQUIREMENTS, TODO)
2. ✅ Prüfe TODO-Liste für Kontext
3. ✅ Prüfe ob Problem bereits gelöst wurde
4. ✅ Verwende NIEMALS `getCustomDataValues()` für Kategorien/Entries
5. ✅ Teste nach Änderungen

### Nach Änderungen
1. ✅ Dokumentiere in IMPLEMENTATION.md
2. ✅ Update TODO.md
3. ✅ Pre-Commit Check
4. ✅ **COMMIT MIT AUSSAGEKRÄFTIGER MESSAGE**
5. ✅ Regelmäßig committen - nicht alles auf einmal!

### Kritische Files
### Kritische Files
- `src/stores/*.ts` - Business Logik (State Management)
- `src/components/**/*.vue` - UI Komponenten
- `src/utils/kv-store.ts` - **NICHT ÄNDERN** (Hat den ID-Bug)
- `docs/` - **IMMER AKTUELL HALTEN**

---

**Letzte Aktualisierung:** 2026-01-08
**Version:** 2.0.0
