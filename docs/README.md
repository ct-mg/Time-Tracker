# Time Tracker Extension - Dokumentation

Willkommen zur technischen Dokumentation der Time Tracker Extension für ChurchTools!

## 📚 Dokumentations-Übersicht

### Für Entwickler & KI-Assistenten

- **[timetracker-implementation.md](timetracker-implementation.md)** ⭐ **START HIER!**
  - Vollständige technische Implementierungsdokumentation
  - Kritische Designentscheidungen und ihre Begründungen
  - Bekannte Probleme und deren Lösungen
  - TODO-Liste mit offenen Aufgaben
  - **PFLICHTLEKTÜRE** vor Code-Änderungen!

### ChurchTools Framework Dokumentation

Die folgenden Dateien dokumentieren das ChurchTools Extension Framework:

- **[getting-started.md](getting-started.md)** - Erste Schritte mit ChurchTools Extensions
- **[core-concepts.md](core-concepts.md)** - Kernkonzepte des Extension Frameworks
- **[entry-points.md](entry-points.md)** - Entry Points und deren Konfiguration
- **[key-value-store.md](key-value-store.md)** - KV-Store für Datenpersistenz
- **[communication.md](communication.md)** - Kommunikation zwischen Extension und ChurchTools
- **[api-reference.md](api-reference.md)** - API-Referenz
- **[manifest.md](manifest.md)** - Manifest-Datei Konfiguration
- **[build-and-deploy.md](build-and-deploy.md)** - Build und Deployment

## 🤖 Für KI-Assistenten

### Beim Start einer neuen Session:

1. **Lies zuerst:** [timetracker-implementation.md](timetracker-implementation.md)
2. **Prüfe:** TODO-Liste für Kontext und offene Aufgaben
3. **Beachte:** "Bekannte Probleme und Lösungen" - nicht erneut lösen!
4. **Verwende:** Best Practices und Code-Patterns aus der Dokumentation

### Nach Code-Änderungen:

1. **Update:** [timetracker-implementation.md](timetracker-implementation.md)
   - Neue Features dokumentieren
   - Probleme und Lösungen hinzufügen
   - TODO-Liste aktualisieren
2. **Commit:** Mit aussagekräftiger Message inkl. Doku-Update
3. **Qualitätsscheck:** Kann ein neuer KI-Assistent damit arbeiten?

### Kritische Regel:

> ⚠️ **NIEMALS** Code ändern ohne die Dokumentation gelesen zu haben!
> Bereits gelöste Probleme werden sonst erneut eingeführt.

## 📝 Dokumentations-Pflege

Diese Dokumentation ist **lebendiges Wissen** und muss aktuell gehalten werden.

### Verantwortung

- **Alle KI-Assistenten** sind verantwortlich für die Aktualität
- **Nach jeder Code-Änderung** muss die Dokumentation aktualisiert werden
- **Neue Probleme und Lösungen** sofort dokumentieren
- **TODO-Liste** kontinuierlich pflegen

### Qualitätskriterien

Gute Dokumentation ermöglicht:
- ✅ Schneller Einstieg für neue KI-Assistenten
- ✅ Vermeidung bereits gelöster Probleme
- ✅ Nachvollziehbare Designentscheidungen
- ✅ Kontinuierliche Weiterentwicklung ohne Wissensverlust

## 🔍 Schnellzugriff

### Häufige Probleme

- **Kategorien nicht löschbar nach Reload** → [Bekannte Probleme](timetracker-implementation.md#bekannte-probleme-und-lösungen)
- **"Unknown" als Kategorie** → [Bekannte Probleme](timetracker-implementation.md#bekannte-probleme-und-lösungen)
- **Excel Import zeigt keine Daten** → [Bekannte Probleme](timetracker-implementation.md#bekannte-probleme-und-lösungen)

### Wichtige Code-Patterns

- **Kategorien laden** → [Kritische Designentscheidungen](timetracker-implementation.md#1-️-kv-store-id-problematik-sehr-wichtig)
- **Event Handler** → [Best Practices](timetracker-implementation.md#2-event-handler-bei-jedem-render-neu-attachen)
- **Notifications** → [Notification System](timetracker-implementation.md#3-notification-system)

### Entwicklung

- **Setup** → [../README.md](../README.md#development-setup)
- **Build** → [build-and-deploy.md](build-and-deploy.md)
- **API Referenz** → [api-reference.md](api-reference.md)

## 📊 Dokumentations-Status

**Letzte Aktualisierung:** 2025-01-22
**Version:** 1.1
**Status:** ✅ Vollständig und aktuell

### Abgedeckte Bereiche

- ✅ Architektur und Datenstrukturen
- ✅ Alle Features vollständig dokumentiert
- ✅ Kritische Designentscheidungen erklärt
- ✅ Bekannte Probleme mit Lösungen
- ✅ Best Practices
- ✅ Troubleshooting Guide
- ✅ TODO-Liste
- ✅ Dokumentations-Pflege Prozess

### Nächste Schritte

Siehe [TODO-Liste in timetracker-implementation.md](timetracker-implementation.md#todo--offene-aufgaben)

## 💡 Verbesserungsvorschläge

Hast du Ideen zur Verbesserung dieser Dokumentation?
→ Füge sie zur TODO-Liste in [timetracker-implementation.md](timetracker-implementation.md#todo--offene-aufgaben) hinzu!

---

**Maintainer:** Entwickelt mit Claude (Anthropic)
**Kontakt:** Siehe [Support](timetracker-implementation.md#support-und-kontakt)
