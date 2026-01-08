# Component Library - UI Design System

Dieses Dokument beschreibt die wiederverwendbaren Basis-Komponenten der Vue 3 Time Tracker Extension. Diese Komponenten bilden das Fundament für ein konsistentes, minimalistisches Design ohne Emojis.

---

## Base Components

### 1. BaseButton
Ein vielseitiger Button-Wrapper mit integrierten Lade-Stati und Animationen.
- **Varianten:** `primary`, `secondary`, `danger`, `ghost`, `success`.
- **Größen:** `sm`, `md`, `lg`.
- **Props:** `loading`, `disabled`, `icon` (Slot).

### 2. BaseCard
Container für Content-Blöcke.
- **Props:** `padding` (`none`, `sm`, `md`, `lg`), `hoverable`.
- **Features:** Schatten-Effekte, abgerundete Ecken, Dark-Mode Support.

### 3. BaseBadge
Status-Indikatoren oder Kategorien.
- **Varianten:** `neutral`, `primary`, `success`, `warning`, `danger`.
- **Props:** `rounded` (pill-style).

### 4. BaseModal
Modaler Dialog mit Animationen.
- **Features:** Teleport zum Body, Backdrop-Click, Escape-Key Support.
- **Slots:** `header`, `body`, `footer`.

---

## Animation System

Wir nutzen eine Kombination aus Vue Transitions und CSS-Hilfsklassen in `src/utils/animations.ts`.

### Transition Presets
- **Fade:** Sanftes Ein-/Ausblenden.
- **Scale:** Pop-in Effekt für Modals.
- **Slide:** Einrutschen für Sidebars oder Toolbars (z.B. BulkActionsToolbar).
- **List:** Staggered Animationen für Listen (TimeEntriesList).

### Micro-Interactions
- Hover-Effekte auf Karten und Buttons.
- Pulse-Animationen für Lade-Zustände.

---

## Konventionen & Design-Regeln

Die visuellen Konventionen (wie das Emoji-Verbot, SVG-Icon-Nutzung und Dark-Mode Regeln) sind zentral in den **[DESIGN_GUIDELINES.md](DESIGN_GUIDELINES.md)** dokumentiert. 

Bitte stelle sicher, dass alle Komponenten aus dieser Bibliothek diesen Richtlinien folgen.

---

**Letzte Aktualisierung:** 2026-01-08  
**Status:** ✅ Konsolidiert (Redundanz entfernt)
