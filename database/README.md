# GOFIT – Database Schema

This directory contains the SQL schema for the GOFIT fitness-tracking application.

## File

| File | Description |
|------|-------------|
| `schema.sql` | Full DDL – creates all tables, foreign keys, and indexes |

## Entity Overview

```
users
 ├── workouts  (templates)
 │    └── workout_exercises  (ordered list of exercises in a template)
 ├── workout_sessions  (completed instances of a workout)
 │    └── session_sets  (individual sets performed per exercise)
 ├── body_measurements
 ├── goals
 └── nutrition_logs
          └── foods
exercises
 ├── exercise_categories
 └── exercise_muscle_groups  (joins to muscle_groups)
```

## Tables

### `users`
Stores account information and basic physical attributes (height, date of birth) used for calculations.

### `muscle_groups`
Reference list of muscle groups (e.g. *chest*, *back*, *quadriceps*).

### `exercise_categories`
High-level exercise types: *strength*, *cardio*, *flexibility*, *sport*, etc.

### `exercises`
Library of exercises – both built-in and user-created custom exercises.

### `exercise_muscle_groups`
Many-to-many join between exercises and muscle groups; the `is_primary` flag distinguishes primary from secondary muscles.

### `workouts`
Reusable workout templates created by a user (optionally public so other users can browse them).

### `workout_exercises`
Ordered exercises within a workout template, with default sets/reps/duration targets.

### `workout_sessions`
A recorded instance of a workout – has a start time, an optional end time, and may be linked to a template.

### `session_sets`
Every individual set logged during a session: reps, weight, duration, distance, and RPE (Rate of Perceived Exertion).

### `body_measurements`
Periodic body weight and circumference measurements for progress tracking. The `measured_at` timestamp records the exact time of measurement (useful since weight can vary throughout the day).

### `goals`
User-defined fitness goals with an optional target value, unit, and deadline.

### `foods`
Nutritional database of food items (shared + user-created). Stores macros per serving.

### `nutrition_logs`
Daily food diary – links a user, a food item, a timestamp (`logged_at`), a meal type, and the consumed quantity in grams.

## Running the Schema

```bash
# PostgreSQL
psql -U <user> -d <database> -f database/schema.sql
```
