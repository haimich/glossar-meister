# Glossar Meister

# Glossar-Lernapp

## 1. Ziel

Eine private, kostengünstige Web-App zur Verwaltung und zum Lernen von Glossarbegriffen für einzelne Kunden. Die Begriffe werden am Desktop importiert und gepflegt, während der Lernmodus auf dem Smartphone genutzt werden kann, auch offline im Zug.

Die App soll in Version 1 bewusst schlank bleiben: ein verlässlicher CSV-Import, eine einfache Begriffstabelle und ein schneller Karteikartenmodus sind wichtiger als umfangreiche Terminologie- oder KI-Funktionen.

## 2. Zielgruppe

Die App ist in Version 1 ausschließlich für eine einzelne Nutzerin bzw. einen einzelnen Nutzer gedacht.

Mehrbenutzerbetrieb, Teamfunktionen, Rollen, Teilen von Glossaren und öffentliche Lernsets sind nicht Bestandteil von Version 1.

## 3. Hauptnutzen

- Glossare pro Kunde strukturiert speichern.

- Begriffe komfortabel am Desktop importieren und bearbeiten.

- Begriffe mobil im Karteikartenstil lernen.

- Lernrichtung zwischen Deutsch und Rumänisch wechseln.

- Begriffe, die häufig gewusst wurden, seltener anzeigen.

- Gelernt werden kann auch offline, sofern das Glossar vorher synchronisiert wurde.

- Betrieb mit keinen oder minimalen laufenden Kosten, z. B. über den Supabase Free Tier.

## 4. Abgrenzung

Die App soll keine vollständige Alternative zu professioneller Terminologiesoftware wie InterpretBank sein und keine generische Lernplattform wie Quizlet nachbauen.

Version 1 enthält nicht:

- KI-gestützte Terminologieextraktion.

- Dokumentanalyse.

- Team- oder Kundenfreigaben.

- Rollen- und Rechteverwaltung jenseits eines privaten Nutzerkontos.

- Komplexe Spaced-Repetition-Algorithmen.

- App-Store-native iOS- oder Android-App.

- Automatische Übersetzung.

- Gemeinsame zentrale Terminologiedatenbank über alle Kunden hinweg.



## Sprache der Benutzeroberfläche

Die gesamte Benutzeroberfläche ist in Deutsch.

Beispielhafte Labels:

- Glossare

- Neues Glossar

- CSV importieren

- Begriffe

- Deutsch

- Rumänisch

- Notizen

- Lernen

- Richtung wechseln

- Karte anzeigen

- Bearbeiten

- Löschen

- Speichern

- Abbrechen

Im Lernmodus werden für die Bewertung der Karte einfache Symbolbuttons verwendet:

- Daumen runter: `Nicht gewusst`

- Daumen hoch: `Gewusst`

Die Buttons können visuell icon-only sein, müssen aber barrierefreie deutsche Labels haben, z. B. `aria-label="Nicht gewusst"` und `aria-label="Gewusst"`.

### Lernmodus

Der Lernmodus ist für Smartphones optimiert.

Funktionen:

- Glossar auswählen

- Lernrichtung festlegen:

  - Deutsch -> Rumänisch

  - Rumänisch -> Deutsch

- Karte anzeigen

- Rückseite anzeigen

- Notizen auf der Rückseite anzeigen

- Bewertung per Daumen runter / Daumen hoch

- Nächste Karte anzeigen

Die Rückseite enthält:

- die gesuchte Übersetzung

- die Notizen zum Begriff

### Einfache Lernlogik

Version 1 nutzt eine einfache Logik, bei der häufig gewusste Karten seltener erscheinen.

Empfohlene Umsetzung:

- Jede Karte hat pro Lernrichtung einen Lernstatus.

- Bei `Nicht gewusst` kommt die Karte bald wieder.

- Bei `Gewusst` wird das Wiederholungsintervall größer.

Beispielhafte Intervalle:

- Stufe 0: sofort oder nach wenigen Minuten

- Stufe 1: 1 Tag

- Stufe 2: 3 Tage

- Stufe 3: 7 Tage

- Stufe 4: 14 Tage

- Stufe 5: 30 Tage

Diese Logik ist ausreichend für Version 1. Eine komplexe SM-2- oder Anki-ähnliche Implementierung ist nicht erforderlich.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/611cde88-c725-423b-bf1d-d77822a96c14).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
