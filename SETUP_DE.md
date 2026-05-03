# GOFIT - Ausführlicher Setup-Guide

## 📋 Inhaltsverzeichnis
1. [Projektübersicht](#projektübersicht)
2. [Voraussetzungen](#voraussetzungen)
3. [Installation](#installation)
4. [Konfiguration](#konfiguration)
5. [Starten der Anwendung](#starten-der-anwendung)
6. [Testen](#testen)
7. [Troubleshooting](#troubleshooting)
8. [Projektstruktur](#projektstruktur)

---

## 🏋️ Projektübersicht

**GOFIT** ist eine mobile Fitness-Tracking-Anwendung mit folgenden Komponenten:

- **Frontend**: React Native-App mit Expo (iOS/Android/Web)
- **Backend**: Node.js/Express REST-API
- **Datenbank**: Supabase (PostgreSQL)
- **Authentifizierung**: Supabase Auth

### Hauptfunktionalität
- Benutzerregistrierung und Login
- Verwaltung von Trainingseinheiten
- Übungen mit Muskelgruppen und Ausrüstung
- Trainingsplanung und -zeitplan
- Mehrsprachige Unterstützung (mit LanguageContext)

---

## ✅ Voraussetzungen

Stelle sicher, dass folgende Software auf deinem System installiert ist:

### Erforderlich
- **Node.js**: v18 oder höher
  - Download: [nodejs.org](https://nodejs.org)
  - Überprüfung: `node --version` und `npm --version`

- **Git**: Zur Versionskontrolle
  - Download: [git-scm.com](https://git-scm.com)

### Optional, aber empfohlen
- **Docker & Supabase CLI**: Für lokale Supabase-Entwicklung
  - Docker: [docker.com](https://www.docker.com)
  - Supabase CLI: `npm install -g supabase`

### Konto erforderlich
- **Supabase Account**: [supabase.com](https://supabase.com)
  - Kostenlos verfügbar
  - Für Cloud-Datenbank oder lokale Entwicklung

---

## 📦 Installation

### 1. Repository klonen und Abhängigkeiten installieren

```bash
# Ins Projektverzeichnis navigieren
cd GOFIT

# Root-Abhängigkeiten installieren (Workspace)
npm install

# Dies installiert automatisch Abhängigkeiten in Frontend/ und Backend/
```

### 2. Überprüfe die Installation

```bash
# Prüfe ob alle Abhängigkeiten installiert wurden
npm ls

# Sollte ohne Fehler durchlaufen
```

---

## ⚙️ Konfiguration

### Schritt 1: Umgebungsvariablen einrichten

Du benötigst eine `.env` Datei im **Backend** Verzeichnis:

```bash
# Backend/.env erstellen
# macOS/Linux:
touch Backend/.env

# PowerShell(Windows):
New-Item -ItemType File -Path "Backend/.env" -Force
```

**Inhalt der `Backend/.env`:**
```env
# Supabase Konfiguration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=optional-service-role-key

# Server Konfiguration
PORT=3005
NODE_ENV=development

# CORS (für lokale Entwicklung)
CORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006

# Datenbank (falls direkte PostgreSQL-Verbindung nötig)
DATABASE_URL=postgresql://user:password@localhost:5432/gofit
```

**Frontend `.env` (optional, für zusätzliche Konfiguration):**
```bash
# Frontend/.env erstellen
# macOS/Linux:
touch Frontend/.env.local

# PowerShell(Windows):
New-Item -ItemType File -Path "Backend/.env.local" -Force
```

**Inhalt der `Frontend/.env.local`:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### Schritt 2: Supabase-Credentials beschaffen

1. Melde dich bei [supabase.com](https://supabase.com) an
2. Erstelle ein neues Projekt oder verwende ein existierendes
3. Gehe zu **Settings → API**
4. Kopiere:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` Key → `SUPABASE_ANON_KEY`

### Hinweis zur Anmeldung

Wenn in Supabase **E-Mail-Bestätigung** aktiviert ist, ist das normal:

- `Login` funktioniert erst nach bestätigter E-Mail.
- `Register` erstellt den Account, aber loggt nicht automatisch ein.
- Wenn du für Tests sofortiges Einloggen willst, deaktiviere die E-Mail-Bestätigung in Supabase Auth.

### Schritt 3: Datenbank initialisieren

#### Option A: Mit Cloud-Supabase

Die Migrations befinden sich in `supabase/migrations/`. Diese werden automatisch bei der Verbindung ausgeführt.

#### Option B: Lokal mit Supabase CLI

```bash
# Supabase lokal starten
supabase start

# Dies startet einen lokalen Docker-Container mit PostgreSQL

# Migrationen anwenden
supabase migration up

# Credentials werden angezeigt - in .env eintragen
```

---

## 🚀 Starten der Anwendung

### Backend starten

```bash
# Im Backend-Verzeichnis
cd Backend

# Im Entwicklungsmodus starten
npm run dev

# Output:
# Server is running on port 3005
# Database connection successful ✓
```

**Der Backend läuft dann auf:** `http://localhost:3005`

### Frontend starten (neue Terminal-Session)

```bash
# Im Frontend-Verzeichnis
cd Frontend

# Metro Bundler starten
npm start

# Verschiedene Optionen nach Start:
# i → iOS simulator
# a → Android emulator
# w → Web browser
# j → Debugger
# r → Reload
# m → Toggle menu
```

**Oder spezifische Plattform:**

```bash
# iOS
npm run ios

# Android
npm run android

# Web Browser
npm run web
```

### Erste Schritte in der App

1. **Login/Registrierung**: Neue Benutzer registrieren oder existierende Credentials verwenden
2. **Dashboard**: Nach erfolgreichem Login zum Home-Tab
3. **Trainings erstellen**: "Create Workout" Tab nutzen
4. **Übungen verwalten**: Übungen mit Muskelgruppen und Ausrüstung auswählen

---

## 🧪 Testen

### Backend Tests ausführen

```bash
cd Backend

# Alle Tests
npm test

# Mit Detailinformationen
npm test -- --verbose

# Nur eine Test-Datei
npm test exercises.test.js
```

**Verfügbare Tests:**
- `exercises.test.js` - Übungsverwaltung
- `workoutExercises.test.js` - Trainingsübungen
- `workoutSets.test.js` - Trainings-Sets

### Frontend Linting

```bash
cd Frontend

# Code-Qualitätsprüfung
npm run lint

# Zeigt ESLint-Fehler und Warnungen
```

---

## 🔗 API-Endpoints

Der Backend stellt folgende API-Endpoints bereit (Prefix: `/api`):

### Authentifizierung
- `POST /auth/signup` - Registrierung
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Token aktualisieren

### Benutzer
- `GET /users/:id` - Benutzerprofil
- `PUT /users/:id` - Profil aktualisieren

### Trainingsplan
- `GET /workout-schedule` - Trainingsplan abrufen
- `POST /workout-schedule` - Plan erstellen
- `PUT /workout-schedule/:id` - Plan aktualisieren

### Übungen
- `GET /exercises` - Alle Übungen
- `POST /exercises` - Übung erstellen
- `DELETE /exercises/:id` - Übung löschen

### Trainingseinheiten
- `GET /workouts` - Alle Trainingseinheiten
- `POST /workouts` - Training erstellen
- `PUT /workouts/:id` - Training aktualisieren

### Ausrüstung & Muskelgruppen
- `GET /exercise-metadata/equipment` - Verfügbare Ausrüstung
- `GET /exercise-metadata/muscle-groups` - Verfügbare Muskelgruppen

---

## 📁 Projektstruktur

```
GOFIT/
├── Backend/                          # Express REST-API
│   ├── src/
│   │   ├── index.js                  # Server Entry Point
│   │   ├── db.js                     # Datenbank-Setup
│   │   ├── supabaseClient.js         # Supabase Client
│   │   ├── routes/
│   │   │   ├── auth.js               # Authentifizierung
│   │   │   ├── users.js              # Benutzer-Management
│   │   │   ├── exercises.js          # Übungen
│   │   │   ├── workouts.js           # Trainingseinheiten
│   │   │   ├── workoutSchedule.js    # Trainingsplan
│   │   │   └── exerciseMetadata.js   # Ausrüstung, Muskelgruppen
│   │   └── *.test.js                 # Jest Tests
│   ├── package.json
│   └── .env                          # Umgebungsvariablen (lokal)
│
├── Frontend/                         # React Native / Expo App
│   ├── app/                          # Expo Router Pages
│   │   ├── _layout.tsx               # Root Layout
│   │   ├── index.tsx                 # Home/Splashscreen
│   │   ├── login.tsx                 # Login-Seite
│   │   ├── register.tsx              # Registrierungs-Seite
│   │   ├── (tabs)/                   # Tab Navigation
│   │   │   ├── home.tsx              # Home Tab
│   │   │   ├── createWorkout.tsx     # Training erstellen
│   │   │   ├── workouts.tsx          # Trainings-Historie
│   │   │   └── profile.tsx           # Profil
│   │   ├── create-exercise.tsx       # Übung erstellen
│   │   ├── exercise-select.tsx       # Übungs-Auswahl
│   │   ├── equipment-select.tsx      # Ausrüstungs-Auswahl
│   │   ├── muscle-group-select.tsx   # Muskelgruppen-Auswahl
│   │   └── current-workout.tsx       # Aktives Training
│   ├── context/
│   │   ├── AuthContext.tsx           # Auth State Management
│   │   └── LanguageContext.tsx       # Mehrsprachigkeit
│   ├── hooks/
│   │   ├── useAuth.ts                # Auth Hook
│   │   └── useLanguage.ts            # Language Hook
│   ├── lib/
│   │   ├── api.ts                    # API Client
│   │   └── supabase.ts               # Supabase Client
│   ├── assets/icons/                 # App Icons & Assets
│   ├── global.css                    # Globale Styles
│   ├── tailwind.config.js            # TailwindCSS Config
│   ├── package.json
│   └── .env.local                    # Umgebungsvariablen (lokal)
│
├── supabase/                         # Datenbank Setup
│   ├── config.toml                   # Supabase lokale Config
│   └── migrations/                   # SQL Migrationen
│       ├── *_remote_schema.sql       # DB Schema
│       ├── *_fix_signup_user_trigger.sql
│       ├── *_add_workout_schedule.sql
│       └── ...
│
├── package.json                      # Root Workspace Config
├── README.md                         # Original README
└── SETUP_DE.md                       # Dieses Setup-Dokument
```

---

## 🐛 Troubleshooting

### Problem: Backend startet nicht

**Fehler:** `Error: SUPABASE_URL is not set`

**Lösung:**
```bash
# Prüfe die Backend/.env Datei
cat Backend/.env

# Stelle sicher, dass folgende Variablen gesetzt sind:
# SUPABASE_URL
# SUPABASE_KEY
# DATABASE_URL (falls vorhanden)

# Backend neu starten
npm run dev
```

### Problem: Frontend kann sich nicht mit Backend verbinden

**Fehler:** `TypeError: Network request failed`

**Lösung:**
```bash
# 1. Prüfe ob Backend läuft
curl http://localhost:3000/

# 2. Prüfe Frontend .env
cat Frontend/.env.local

# 3. CORS aktivieren - in Backend/.env prüfen:
CORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006

# 4. Metro Bundler neustarten
npm start -c
```

### Problem: Supabase Migrations fehler

**Fehler:** `Migration failed`

**Lösung:**
```bash
# Mit CLI Migrationen prüfen
supabase migration list

# Lokal zurücksetzen und neu starten
supabase db reset

# Oder Cloud DB prüfen
# → Dashboard → SQL Editor → Migrations Tab
```

### Problem: Tests schlagen fehl

**Fehler:** `FAIL  src/exercises.test.js`

**Lösung:**
```bash
cd Backend

# Alle Abhängigkeiten neu installieren
npm install

# Tests mit Verbose-Output
npm test -- --verbose

# Einzelnen Test debuggen
npm test exercises.test.js -- --no-coverage
```

### Problem: Port schon in Benutzung

**Fehler:** `Error: listen EADDRINUSE: address already in use :::3000`

**Lösung:**
```bash
# Linux/Mac: Prozess auf Port 3000 finden und beenden
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Oder anderen Port in .env verwenden:
PORT=3001
```

### Problem: "Module not found" Fehler

**Fehler:** `Error: Cannot find module 'express'`

**Lösung:**
```bash
# Stelle sicher, dass du im richtigen Verzeichnis bist
cd Backend

# Node Modules neu installieren
rm -rf node_modules package-lock.json
npm install

# Mit npm v7+ sollte auch root-level Installieren funktionieren
cd ..
npm install
```

---

## 💡 Entwicklungs-Tipps

### Hot Reload aktivieren
- **Frontend**: Automatisch durch Metro Bundler
- **Backend**: Mit `npm run dev` (nutzt `node` - nicht automatisch)

```bash
# Für Hot Reload im Backend (optional):
npm install -D nodemon
# Dann in package.json: "dev": "nodemon src/index.js"
```

### Debugging

**Frontend - React Native Debugger:**
```bash
# Im Expo Menu (npm start):
# Drücke 'j' für Debugger
# Oder scanne QR-Code mit Handy
```

**Backend - Node.js Debugger:**
```bash
# Mit Inspect starten
node --inspect src/index.js

# In Chrome: chrome://inspect
```

### Datenbank-Abfragen lokal testen

```bash
# Supabase Studio öffnen (bei lokaler Entwicklung)
supabase studio

# Web-UI unter http://localhost:54323
```

### API testen mit cURL

```bash
# Health Check
curl http://localhost:3000/

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Alle Übungen abrufen
curl http://localhost:3000/api/exercises
```

---

## 📚 Weitere Ressourcen

- **Supabase Dokumentation**: https://supabase.com/docs
- **Expo Dokumentation**: https://docs.expo.dev
- **React Native**: https://reactnative.dev
- **Express.js**: https://expressjs.com
- **PostgreSQL**: https://www.postgresql.org/docs

---

## 📝 Lizenz

Dieses Projekt unterliegt der MIT-Lizenz. Siehe [LICENSE](LICENSE) für Details.

---

## ❓ Häufig gestellte Fragen

**F: Kann ich die App auf meinem echten Handy testen?**
A: Ja! Nutze die Expo Go App und scanne den QR-Code nach `npm start`

**F: Wie speichere ich meine Trainings offline?**
A: AsyncStorage ist bereits integriert - Daten werden lokal gecacht

**F: Kann ich die App web-basiert nutzen?**
A: Ja, aber mit Einschränkungen - `npm run web` startet die Web-Version

**F: Wie aktiviere ich Multi-Language-Support?**
A: LanguageContext ist vorhanden - nutze den `useLanguage` Hook

**F: Muss ich Supabase Cloud verwenden oder kann ich lokal entwickeln?**
A: Beides möglich - lokal mit `supabase start`, Cloud für Production

---

**Fragen oder Probleme?** Prüfe den [Troubleshooting](#troubleshooting) Bereich oder öffne ein Issue im Repository!

