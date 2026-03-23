-- GOFIT Database Schema
-- Fitness tracking application

-- Users
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name  VARCHAR(100),
    last_name   VARCHAR(100),
    date_of_birth DATE,
    gender      VARCHAR(20),
    height_cm   NUMERIC(5, 2),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Muscle groups (e.g. chest, back, legs)
CREATE TABLE muscle_groups (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Exercise categories (e.g. strength, cardio, flexibility)
CREATE TABLE exercise_categories (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Exercise library
CREATE TABLE exercises (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    category_id INT REFERENCES exercise_categories(id) ON DELETE SET NULL,
    is_custom   BOOLEAN NOT NULL DEFAULT FALSE,
    created_by  INT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Which muscle groups an exercise targets
CREATE TABLE exercise_muscle_groups (
    exercise_id     INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_group_id INT NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE,
    is_primary      BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (exercise_id, muscle_group_id)
);

-- Workout templates (reusable plans)
CREATE TABLE workouts (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    is_public   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercises within a workout template
CREATE TABLE workout_exercises (
    id           SERIAL PRIMARY KEY,
    workout_id   INT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id  INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    position     INT NOT NULL,                   -- ordering within the workout
    sets         INT,
    reps         INT,
    duration_sec INT,                            -- for timed exercises
    rest_sec     INT,
    notes        TEXT,
    UNIQUE (workout_id, position)
);

-- Completed workout sessions (instances of workouts)
CREATE TABLE workout_sessions (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id  INT REFERENCES workouts(id) ON DELETE SET NULL,
    name        VARCHAR(150),
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMPTZ,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Actual sets performed during a session
CREATE TABLE session_sets (
    id                  SERIAL PRIMARY KEY,
    session_id          INT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id         INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number          INT NOT NULL,
    reps                INT,
    weight_kg           NUMERIC(6, 2),
    duration_sec        INT,                     -- for timed exercises / cardio
    distance_m          NUMERIC(8, 2),           -- for cardio
    rpe                 NUMERIC(3, 1),           -- Rate of Perceived Exertion (1-10)
    is_warmup           BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, exercise_id, set_number)
);

-- Body measurements / weight tracking
CREATE TABLE body_measurements (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    measured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    weight_kg       NUMERIC(5, 2),
    body_fat_pct    NUMERIC(4, 1),
    chest_cm        NUMERIC(5, 2),
    waist_cm        NUMERIC(5, 2),
    hips_cm         NUMERIC(5, 2),
    thigh_cm        NUMERIC(5, 2),
    bicep_cm        NUMERIC(5, 2),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User fitness goals
CREATE TABLE goals (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    goal_type       VARCHAR(50) NOT NULL,        -- e.g. weight_loss, muscle_gain, endurance
    target_value    NUMERIC(10, 2),
    unit            VARCHAR(50),                 -- e.g. kg, reps, km
    target_date     DATE,
    achieved        BOOLEAN NOT NULL DEFAULT FALSE,
    achieved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Food / nutritional items
CREATE TABLE foods (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    brand           VARCHAR(150),
    calories_kcal   NUMERIC(6, 2),
    protein_g       NUMERIC(6, 2),
    carbs_g         NUMERIC(6, 2),
    fat_g           NUMERIC(6, 2),
    fiber_g         NUMERIC(6, 2),
    serving_size_g  NUMERIC(6, 2),
    is_custom       BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      INT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily nutrition log
CREATE TABLE nutrition_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_id     INT NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    meal_type   VARCHAR(50),                     -- e.g. breakfast, lunch, dinner, snack
    quantity_g  NUMERIC(7, 2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_workout_sessions_user      ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_workout   ON workout_sessions(workout_id);
CREATE INDEX idx_session_sets_session       ON session_sets(session_id);
CREATE INDEX idx_session_sets_exercise      ON session_sets(exercise_id);
CREATE INDEX idx_body_measurements_user     ON body_measurements(user_id, measured_at);
CREATE INDEX idx_goals_user                 ON goals(user_id);
CREATE INDEX idx_nutrition_logs_user        ON nutrition_logs(user_id, logged_at);
CREATE INDEX idx_exercises_category         ON exercises(category_id);
