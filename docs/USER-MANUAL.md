# Time Tracker - Benutzerhandbuch

**Version:** 2.0  
**Stand:** November 2025  
**Für:** ChurchTools Time Tracker Extension

---

## Inhaltsverzeichnis

1. [Erste Schritte](#erste-schritte)
2. [Zeiterfassung](#zeiterfassung)
3. [Zeiteinträge verwalten](#zeiteinträge-verwalten)
4. [Abwesenheiten](#abwesenheiten)
5. [Berichte & Statistiken](#berichte--statistiken)
6. [Excel Import/Export](#excel-importexport)
7. [Häufig gestellte Fragen](#häufig-gestellte-fragen)

---

## Erste Schritte

### Was ist der Time Tracker?

Der Time Tracker ist eine ChurchTools Extension zur Erfassung von Arbeitszeiten. Sie können:
- ✅ Arbeitszeiten starten und stoppen (Clock-In/Clock-Out)
- ✅ Manuelle Zeiteinträge erstellen
- ✅ Pausen erfassen
- ✅ Abwesenheiten verwalten
- ✅ Überstunden und Soll-Ist-Vergleiche sehen
- ✅ Daten nach Excel exportieren

### Zugriff auf den Time Tracker

1. Melden Sie sich bei ChurchTools an
2. Klicken Sie auf **Ihr Profil** (oben rechts)
3. Wählen Sie **"Time Tracker"** aus dem Menü

> **Hinweis:** Ihr Administrator muss Ihnen Zugriff auf die Extension gewährt haben.

---

## Zeiterfassung

### Clock-In: Arbeit beginnen

So starten Sie die Zeiterfassung:

1. Klicken Sie auf den **"Clock In"** Button (grün)
2. Wählen Sie eine **Arbeitskategorie** aus (z.B. "Büroarbeit", "Meeting")
3. Optional: Aktivieren Sie **"Pause"** wenn es sich um eine Pause handelt
4. Klicken Sie **"Start"**

**Der Timer läuft jetzt!** Sie sehen die laufende Zeit im Dashboard.

### Clock-Out: Arbeit beenden

So beenden Sie die Zeiterfassung:

1. Klicken Sie auf den **"Clock Out"** Button (rot)
2. Optional: Fügen Sie eine **Beschreibung** hinzu
3. Klicken Sie **"Stop"**

**Fertig!** Der Eintrag wird gespeichert und in Ihrer Liste angezeigt.

### Manuelle Zeiteinträge

Wenn Sie vergessen haben, ein- oder auszustempeln:

1. Klicken Sie auf **"+ Add Time Entry"**
2. Wählen Sie **Datum und Uhrzeit** (Start & Ende)
3. Wählen Sie die **Kategorie**
4. Optional: Fügen Sie eine **Beschreibung** hinzu
5. Klicken Sie **"Save"**

> **Tipp:** Sie können auch Einträge für vergangene Tage erstellen!

---

## Zeiteinträge verwalten

### Zeiteinträge anzeigen

Ihre Zeiteinträge werden gruppiert nach:
- **Kalenderwochen** (aktuellste zuerst)
- **Tagen** innerhalb jeder Woche

Für jeden Tag sehen Sie:
- 📊 **IST-Stunden** (tatsächlich gearbeitet)
- 🎯 **SOLL-Stunden** (Ihr Ziel)
- **Fortschrittsbalken** (grün = Ziel erreicht, rot = unter Ziel)

### Eintrag bearbeiten

1. Finden Sie den Eintrag in der Liste
2. Klicken Sie auf **"Edit"** (Stift-Symbol)
3. Ändern Sie die Werte
4. Klicken Sie **"Save"**

### Eintrag löschen

1. Finden Sie den Eintrag in der Liste
2. Klicken Sie auf **"Delete"** (Mülleimer-Symbol)
3. Bestätigen Sie mit **"Yes, delete"**

> **Achtung:** Gelöschte Einträge können nicht wiederhergestellt werden!

---

## Abwesenheiten

### Urlaub / Krankmeldung erfassen

So erfassen Sie Abwesenheiten:

1. Wechseln Sie zum Tab **"Absences"**
2. Klicken Sie **"+ Add Absence"**
3. Wählen Sie:
   - **Start-Datum**
   - **End-Datum** (oder gleicher Tag)
   - **Grund** (Urlaub, Krank, etc.)
4. Klicken Sie **"Save"**

### Abwesenheiten werden berücksichtigt

Abwesenheiten werden automatisch:
- ✅ In Ihren Überstunden eingerechnet
- ✅ Im Kalender angezeigt
- ✅ Von den SOLL-Stunden abgezogen

---

## Berichte & Statistiken

### Dashboard-Statistiken

Oben im Dashboard sehen Sie:

**Zeitraum-Auswahl:**
- Heute
- Diese Woche
- Dieser Monat
- Letzter Monat

**Für jeden Zeitraum:**
- 📊 **IST** = Tatsächlich gearbeitete Stunden
- 🎯 **SOLL** = Ihre Zielstunden
- ⏱️ **Überstunden** = Differenz (IST - SOLL)

**Farben:**
- 🟢 **Grün** = Ziel erreicht oder überschritten
- 🔴 **Rot** = Unter dem Ziel

### Detaillierte Berichte

Wechseln Sie zum Tab **"Reports"** für:

- 📈 **Stunden pro Kategorie** (Balkendiagramm)
- 📅 **Zeitraum auswählen** (Woche, Monat, Jahr, Custom)
- 🔍 **Filter nach Kategorie**

---

## Excel Import/Export

### Daten exportieren

So exportieren Sie Ihre Zeiteinträge:

1. Wechseln Sie zum Tab **"Time Entries"**
2. Klicken Sie **"Export to Excel"**
3. Wählen Sie den **Zeitraum** (Week, Month, Year, All Time)
4. Klicken Sie **"Download"**

**Die Excel-Datei enthält:**
- Alle Zeiteinträge
- Kategorien
- Dauer in Stunden
- Überstunden-Berechnung

### Daten importieren (Admin-Feature)

> **Hinweis:** Excel-Import ist ein Admin-Feature und muss aktiviert sein.

So importieren Sie Zeiteinträge:

1. Laden Sie das **Excel-Template** herunter
2. Füllen Sie die Vorlage aus:
   - **Date:** TT.MM.JJJJ oder JJJJ-MM-TT
   - **Start Time:** HH:MM
   - **End Time:** HH:MM
   - **Category:** Name oder ID der Kategorie
   - **Description:** Optional
3. Klicken Sie **"Import from Excel"**
4. Wählen Sie Ihre ausgefüllte Datei
5. Prüfen Sie die Vorschau
6. Klicken Sie **"Import"**

**Validierung:**
- ❌ Ungültige Einträge werden rot markiert
- ⚠️ Warnungen werden gelb markiert
- ✅ Valide Einträge werden grün markiert

---

## Häufig gestellte Fragen

### Wie werden Überstunden berechnet?

**Formel:**
```
Überstunden = IST-Stunden - (SOLL-Stunden - Abwesenheits-Stunden)
```

**Beispiel:**
- SOLL pro Woche: 40h
- IST gearbeitet: 45h
- Urlaub: 8h
- **Überstunden = 45h - (40h - 8h) = 13h**

### Was sind Arbeitskategorien?

Arbeitskategorien helfen Ihnen, Ihre Zeit zu organisieren:
- **Büroarbeit**
- **Meetings**
- **Projektarbeit**
- **Reisezeit**
- etc.

Ihr Administrator erstellt diese Kategorien im Admin-Panel.

### Kann ich Einträge nachträglich ändern?

**Ja!** Sie können:
- ✅ Vergangene Einträge bearbeiten
- ✅ Vergangene Einträge löschen
- ✅ Neue Einträge für vergangene Tage hinzufügen

### Was sind Pausen?

Wenn Sie **"Pause"** aktivieren beim Clock-In:
- ⏸️ Die Zeit wird NICHT als Arbeitszeit gezählt
- 📊 Pausen werden separat ausgewiesen
- ⏱️ Pausen werden nicht in Überstunden eingerechnet

**Beispiel:** Mittagspause

### Wie funktioniert die Wochenansicht?

Zeiteinträge werden nach **ISO-Kalenderwochen** gruppiert:
- **KW 47** = Kalenderwoche 47 (z.B. 20. - 26. November)
- Für jeden Tag sehen Sie IST vs. SOLL
- Am Ende der Woche: Wochensumme

### Benutzereinstellungen & Dark Mode
Klicken Sie oben rechts auf Ihren Namen oder Avatar, um das Benutzermenü zu öffnen.
Hier können Sie das Theme der Anwendung ändern:
- **Light:** Helles Design (Standard bei Tag)
- **Dark:** Dunkles Design (Augenschonend bei Nacht)
- **System:** Passt sich automatisch Ihrem Betriebssystem an

### Kann ich meine Daten löschen?

**Einzelne Einträge:** Ja, über den "Delete" Button

**Alle Daten:** Nein, nur Ihr Administrator kann das ChurchTools Custom Module zurücksetzen.

### Wo werden meine Daten gespeichert?

Alle Daten werden sicher in **ChurchTools** gespeichert:
- ✅ Verschlüsselte Verbindung (HTTPS)
- ✅ ChurchTools-eigene Datenbank
- ✅ Backup nach ChurchTools-Standard

**Der Time Tracker speichert nichts außerhalb von ChurchTools!**

---

## Für Manager & HR

### Manager Dashboard

Als **Manager** sehen Sie:
- ✅ Ihre eigenen Zeiteinträge
- ✅ Zeiteinträge Ihrer zugewiesenen Mitarbeiter
- 🔍 Filter-Optionen nach Person

**Zugriff:** Ihr Administrator muss Sie als Manager konfigurieren.

### HR Dashboard

Als **HR-Mitarbeiter** sehen Sie:
- ✅ ALLE Zeiteinträge aller Mitarbeiter
- 📊 Team-Statistiken
- 📥 Export für alle Mitarbeiter

**Zugriff:** Ihr Administrator muss Sie der HR-Gruppe zuweisen.

---

## Support & Hilfe

### Probleme melden

Bei technischen Problemen:

1. **Screenshot:** Machen Sie einen Screenshot des Problems
2. **Beschreibung:** Was haben Sie versucht? Was ist passiert?
3. **Kontakt:** Wenden Sie sich an Ihren ChurchTools-Administrator

### Feature-Wünsche

Haben Sie Ideen für neue Features?
- Teilen Sie diese Ihrem Administrator mit
- Oder erstellen Sie ein Issue auf GitHub (falls vorhanden)

---

## Tastenkombinationen

| Aktion | Tastenkombination |
|--------|-------------------|
| Refresh | F5 |
| Neuer Eintrag | (keine) |
| Suche | Strg+F (Browser-Suche) |

> **Tipp:** Die Extension nutzt Standard-Browser-Tastenkombinationen.

---

## Versions-Historie

### Version 2.0 (November 2025)
- ✨ HR/Manager Dashboard
- ✨ Permission-basierte Filterung
- ✨ Manager-zu-Mitarbeiter Zuweisungen
- ✅ Verbesserte Change Tracking UX
- ✅ Toast-Notifications

### Version 1.5 (November 2025)
- ✨ Per-User Work Week Configuration
- ✨ Automatische Backups
- ✅ Settings Corruption Prevention

### Version 1.0 (November 2025)
- ✨ Erste Veröffentlichung
- ✅ Clock-In/Clock-Out
- ✅ Manuelle Zeiteinträge
- ✅ Abwesenheiten
- ✅ Excel Import/Export
- ✅ Berichte & Statistiken

---

## Rechtliche Hinweise

### Datenschutz

Der Time Tracker verarbeitet:
- ✅ Ihre Arbeitszeiten
- ✅ Ihre ChurchTools-Benutzerdaten
- ✅ Von Ihnen eingegebene Beschreibungen

**Alle Daten bleiben in ChurchTools** und unterliegen der ChurchTools-Datenschutzerklärung.

### Arbeitsrecht

**Hinweis:** Der Time Tracker ist ein Tool zur Zeiterfassung. Ihre Organisation ist verantwortlich für:
- Arbeitsrechtliche Compliance
- Korrekte Vertragsstunden
- Überstunden-Regelungen
- Datenschutz-Compliance

---

**Ende des Benutzerhandbuchs**

Bei Fragen wenden Sie sich an Ihren ChurchTools-Administrator.
