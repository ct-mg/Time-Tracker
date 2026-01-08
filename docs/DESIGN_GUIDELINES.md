# Design Guidelines - Time Tracker Extension

Diese Richtlinien definieren das visuelle und funktionale Design der Time Tracker Extension. Sie dienen dazu, Konsistenz zu gewährleisten und sicherzustellen, dass neue Features dem etablierten minimalistischen Stil folgen.

---

## 1. 🚫 Keine Emojis (Essential)
**Historie:** In v1.8.0 (2025-11-22) wurden alle Emojis entfernt.
- **Regel:** Verwende niemals Emojis in der Benutzeroberfläche (Labels, Buttons, Tabs).
- **Grund:** Emojis wirken oft inkonsistent zwischen Betriebssystemen und widersprechen dem professionellen, minimalistischen Design.

## 2. 🎨 Clean minimalist Design
- **Fokus:** Klare Linien, viel White-Space, dezente Farben.
- **Icons:** Verwende ausschließlich cleane SVG Icons (vorzugsweise Heroicons oder ähnliche minimalistische Sets).
- **Icons Sizing:** In der Regel `w-4 h-4` oder `w-5 h-5` für Standard-Interaktionen.
- **Typografie:** Nutze die Standard-Fonts von ChurchTools/Tailwind (Sans-serif). Keine verspielten Fonts.

## 3. 🌑 Dark Mode Support
- Alle neuen Komponenten **MÜSSEN** Dark Mode Unterstützung bieten.
- Nutze Tailwind `dark:` Klassen für Hintergrundfarben (`dark:bg-gray-800`), Text (`dark:text-white`) und Border (`dark:border-gray-700`).

## 4. 🧩 Komponenten-Bibliothek
- Nutze bestehende Base-Komponenten (`BaseButton`, `BaseCard`, `BaseModal`, `BaseBadge`).
- **Konsistenz:** Button-Styles (Primary/Secondary/Danger) müssen app-weit identisch sein.

## 5. 💡 User Feedback (Toasts)
- Gemäß **ARCHITECTURE.md #3**:
  - **Success:** Auto-hide nach 3 Sekunden.
  - **Error/Warning:** Bleiben stehen bis zum manuellen Schließen.
- Nutze niemals native `alert()` oder `confirm()` Browser-Dialoge.

## 6. 📱 Responsiveness
- Benutzeroberflächen müssen auf Desktop und Tablet/Mobile funktionieren.
- Nutze Tailwinds responsive Utilities (`md:`, `lg:`) für Layout-Anpassungen.

---

**Letzte Aktualisierung:** 2026-01-08  
**Status:** ✅ Aktiv
