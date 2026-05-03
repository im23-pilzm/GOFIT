# GOFIT

## Kurzbeschreibung

GOFIT ist eine plattformübergreifende Fitness-App (Mobile & Web) zum Erstellen, Verwalten und Nachverfolgen von Trainingseinheiten. Die Anwendung kombiniert ein Expo/React-Native-Frontend mit einem Node.js/Express-Backend und verwendet Supabase (Postgres) als Backend-as-a-Service für Authentifizierung und Datenpersistenz.

## Hauptfunktionen

- Benutzerregistrierung und -anmeldung (Supabase Auth)
- Erstellen und Verwalten von Workouts und Übungs-Sets
- Auswahl von Übungen nach Muskelgruppen und Ausrüstung
- Trainingsplanung und wiederkehrende Trainings (Schedule)
- Lokaler Cache / Offline-Fähigkeit via AsyncStorage
- Mehrsprachigkeit (LanguageContext)

## Tech-Stack

- Frontend: Expo / React Native, Expo Router, Tailwind (nativewind)
- Backend: Node.js, Express
- Auth & DB: Supabase (Postgres)
- Tests: Jest (Backend)
- Deployment: Supabase Cloud oder eigene PostgreSQL-Instanz

## Architekturübersicht

Die App ist in zwei Hauptkomponenten aufgeteilt:

- `Frontend/`: Die mobile App mit Expo und einer Router-basierten Seitenstruktur in `app/`. Enthält Kontexte (`AuthContext`, `LanguageContext`) und Hooks (`useAuth`, `useLanguage`).
- `Backend/`: Eine Express-API in `src/` mit Routen für Authentifizierung, Nutzer, Übungen, Workouts und Trainingspläne. Nutzt `supabase-js` zur Kommunikation mit Supabase.

Die Kommunikation zwischen Frontend und Backend erfolgt über REST-API-Endpunkte unter dem Prefix `/api`.

## Projektstruktur (Kurz)

Siehe vollständige Struktur im Repository. Wichtige Ordner:

- `Frontend/app/` — Expo-Routen und UI
- `Backend/src/` — Express-Server, `routes/` und Tests
- `supabase/migrations/` — SQL-Migrationen für die Datenbank

Für ein detailliertes Setup siehe `SETUP_DE.md` (Schritt-für-Schritt-Anleitung).

## Entwicklung & Beitrag

Wenn du zum Projekt beitragen möchtest:

1. Forke das Repository und erstelle einen Feature-Branch.
2. Richte deine lokale Umgebung nach `SETUP_DE.md` ein.
3. Schreibe Tests für neue Backend-Funktionalität (Jest) und führe `npm test` im `Backend`-Ordner aus.
4. Öffne ein PR mit einer klaren Beschreibung und Referenzen zu Issues.

Coding-Standards:

- Schreibe klare Commit-Nachrichten
- Halte die Trennung von Frontend- und Backend-Logik ein
- Schreibe Tests für kritische Pfade

## Tests

Backend-Tests liegen in `Backend/src/*.test.js` und werden mit Jest ausgeführt:

```bash
cd Backend
npm test
```

## Bekannte Probleme & Hinweise

- Lokale Supabase-Entwicklung benötigt Docker und/oder die Supabase CLI.
- Achte darauf, die richtigen `SUPABASE_URL` und `SUPABASE_KEY` in den `.env`-Dateien zu verwenden.

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Details in der `LICENSE`-Datei.

