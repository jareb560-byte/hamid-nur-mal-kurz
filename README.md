# HAMID — Nur mal kurz.

**[Jetzt spielen](https://jareb560-byte.github.io/hamid-nur-mal-kurz/)**

Ein liebevoll freches, deutschsprachiges 3D-Haushaltsabenteuer. Hamid wollte eigentlich Feierabend machen. Leider warten die Leiter auf dem Balkon, die Telekom-Hotline, der Sicherungskasten, der Familien-Mainframe und drei ganz sicher nicht verhungernde Katzen.

Steuere Hamid durch eine begehbare Wohnung und erledige rechtzeitig die Aufgaben. Halte das Haushaltschaos unter 100, baue eine Erfolgsserie auf und rette im Finale den Familienserver. Ein Durchlauf dauert ungefähr vier bis sechs Minuten, zuzüglich der frei lesbaren Anleitungen.

## Sechs Stationen

- **Balkon-Akrobatik:** Eine wackelige Leiter mit Gegenbewegungen sechs Sekunden im Gleichgewicht halten.
- **Strom & Selbstvertrauen:** Eine blinkende Folge fiktiver Schalter merken und wiederholen.
- **Die Warteschleife:** Drei sachliche Antworten wählen. Großbuchstaben helfen selten.
- **Noch ein Häppchen:** Die Futtertaste halten und bei genau einer Portion loslassen.
- **Mainframe-Magie:** Den Jobablauf aus PRÜFEN, STARTEN und ARCHIVIEREN ausführen.
- **Gut informierte Kreise:** Erkennen, welches Detail einer Geschichte sich verändert hat.

Alle Stationen kommen durch eine gewichtete, gesetzte Aufgabenplanung regelmäßig vor. Das Finale hat einen eigenen Ablauf mit sechs Befehlen.

## Bedienung

| Aktion | Tastatur / Maus | Touch |
| --- | --- | --- |
| Laufen | WASD oder Pfeiltasten, relativ zur Ansicht | Linker Joystick |
| Aufgabe beginnen | E / Leertaste, im leuchtenden Kreis | ANPACKEN |
| Sprint | Umschalt | FLITZEN |
| Antworten / Schalter | 1–4 oder anklicken | Antippen |
| Futter einfüllen | Leertaste halten | Futtertaste halten |
| Leiter ausbalancieren | Links / Rechts | Richtungstasten halten |
| Pause | P / Escape | Pause oben rechts |

Aufgabenkarten und Symbole markieren den Ort. Hamid muss dorthin laufen, bevor er anpacken kann. Während der Anleitung und nach einem Minispiel-Erfolg pausiert die Zeit. Während der eigentlichen Aufgabe läuft der Haushalt weiter; die Frist der gerade bearbeiteten Aufgabe ist geschützt. Ein ausgeblendeter Tab oder Fokusverlust pausiert das Spiel automatisch.

## Schwierigkeitsgrade

| Modus | Startzeit | Normale Aufgaben | Auftragsfrist |
| --- | --- | --- | --- |
| Sonntagsmodus | 5:00 | 9 | 65 Sekunden |
| Nur mal kurz | 4:10 | 12 | 49 Sekunden |
| Papa weiß es besser | 3:50 | 15 | 39 Sekunden |

Das Finale gewährt mindestens 65 Sekunden. Erledigte Aufgaben senken das Chaos, verpasste erhöhen es. Fehler in Minispielen kosten Chaos und setzen die Serie zurück; die Aufgabe kann erneut versucht werden. Rekord und Tonwahl werden nur auf dem eigenen Gerät gespeichert. Es gibt keine Konten, Analyse-Tracker, Online-Rangliste oder Datenübertragung des Spielstands.

## Lokal starten

Node.js 24, npm und ein Browser mit WebGL 2 werden benötigt.

```sh
npm ci
npm run dev
```

Die lokale Adresse ist `http://127.0.0.1:5193`. `npm run build` erzeugt eine vollständig statische Webapp in `dist/pages`. Relative Assetpfade unterstützen GitHub Pages und andere statische Webserver. GitHub Actions prüft Typen und Spiellogik und veröffentlicht bei Änderungen auf `main`.

## Prüfung

```sh
npm run typecheck
npm test
npm run build
npm run test:browser
```

Die Modelltests prüfen deterministische Aufgabenplanung, alle Schwierigkeitsgrade, Fristen, Pause, Kollisionen, Sprint, Wertung und beide Endzustände. Die Playwright-Tests verwenden lokal installiertes Google Chrome und prüfen Desktop, Touch-Ansichten, echte Eingaben in Minispiele und das Finale. Die Entwicklungsansicht enthält ausschließlich bei `import.meta.env.DEV` Testzugänge; diese werden aus dem Produktionsbuild entfernt. Geräteemulation ersetzt keinen Leistungstest auf einem echten Smartphone.

## Technik und Gestaltung

- `src/simulation.ts`: unabhängiger Spielzustand, 60-Hz-Simulation, Kollisionen und Aufgabenplanung.
- `src/world.ts`: originale, gegliederte Three.js-Wohnung und animierte Spielfiguren. Parkett ist instanziiert; unbewegliche Geometrie wird nach Material zusammengefasst. Schatten, warmes Licht, grafische Details und kleine Staubpartikel.
- `src/Game.tsx`: deutsche Oberfläche, Tastatur und Pointer-Capture-Steuerung, Fokuspausen und lokale Rekorde.
- `src/minigames.tsx`: sechs eigenständige Spielmechaniken mit lesbaren Anleitungen und Tastaturalternativen.
- `src/audio.ts`: eigener synthetisierter Soundtrack und Effekte über Web Audio, Start erst nach Interaktion.
- `public/art`: zwei speziell erstellte Illustrationen nach der vom Nutzer bereitgestellten Referenz. Das ursprüngliche private Foto wird nicht mitveröffentlicht. Prompts und Herkunft stehen in [ARTWORK.md](ARTWORK.md).

Die Webapp verwendet React, Three.js, Lucide und die Base-UI-Komponenten der Sites-Projektvorlage. `vite.game.config.ts` ist der aktive Build für die statische Pages-Version. Die zusätzliche Vorlagenkonfiguration wird dafür nicht benötigt. Bewegungsreduktion des Betriebssystems wird beachtet. Der Familienhumor und alle Dialoge sind fiktive Überzeichnungen; elektrische Schaltbilder und Reparaturanleitungen sind kein Bestandteil des Spiels.
