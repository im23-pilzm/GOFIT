import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Href, useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';

type Workout = {
  id: string;
  name: string;
  started_at: string;
};

function formatLastDone(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function WorkoutsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { language } = useLanguage();

  const copy = language === 'de-CH'
    ? {
        notSigned: 'Nicht angemeldet',
        loginAgain: 'Bitte melde dich erneut an.',
        createSessionFailed: 'Workout-Session konnte nicht erstellt werden',
        copyExerciseFailed: 'Workout-Übung konnte nicht kopiert werden',
        startFailed: 'Start fehlgeschlagen',
        startFailedBody: 'Workout konnte nicht gestartet werden',
        deleteWorkoutTitle: 'Workout löschen',
        deleteWorkoutQuestion: 'Löschen',
        cancel: 'Abbrechen',
        delete: 'Löschen',
        deleteFailed: 'Löschen fehlgeschlagen',
        deleteFailedBody: 'Workout konnte nicht gelöscht werden',
        title: 'Workouts',
        subtitle: 'Plane einen neuen Workout oder starte einen bestehenden.',
        addWorkout: 'Workout hinzufügen',
        existing: 'Vorhandene Workouts',
        existingHint: 'Tippe auf Starten, um einen Workout direkt zu beginnen.',
        none: 'Noch keine Workouts vorhanden.',
        editWorkout: 'Workout bearbeiten',
        deleteWorkout: 'Workout löschen',
        deleting: 'Löscht...',
        lastDone: 'Zuletzt:',
        starting: 'Startet...',
        start: 'Starten',
      }
    : {
        notSigned: 'Not signed in',
        loginAgain: 'Please log in again.',
        createSessionFailed: 'Failed to create workout session',
        copyExerciseFailed: 'Failed to copy workout exercise',
        startFailed: 'Start failed',
        startFailedBody: 'Failed to start workout',
        deleteWorkoutTitle: 'Delete workout',
        deleteWorkoutQuestion: 'Delete',
        cancel: 'Cancel',
        delete: 'Delete',
        deleteFailed: 'Delete failed',
        deleteFailedBody: 'Failed to delete workout',
        title: 'Workouts',
        subtitle: 'Plan a new workout or start an existing one.',
        addWorkout: 'Add Workout',
        existing: 'Existing Workouts',
        existingHint: 'Tap start to begin a workout immediately.',
        none: 'No workouts yet.',
        editWorkout: 'Edit workout',
        deleteWorkout: 'Delete workout',
        deleting: 'Deleting...',
        lastDone: 'Last done:',
        starting: 'Starting...',
        start: 'Start',
      };
  const [loading, setLoading] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);
  const [startingWorkoutId, setStartingWorkoutId] = useState<string | null>(null);
  const [openMenuWorkoutId, setOpenMenuWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setWorkouts([]);
      return;
    }

    const loadWorkouts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('workouts')
        .select('id, name, started_at')
        .eq('user_id', session.user.id)
        .order('started_at', { ascending: false })
        .limit(40);

      if (error) {
        setWorkouts([]);
      } else {
        setWorkouts((data ?? []) as Workout[]);
      }

      setLoading(false);
    };

    loadWorkouts();
  }, [session?.user?.id]);

  const uniqueWorkouts = useMemo(() => {
    const byName = new Map<string, Workout>();

    for (const workout of workouts) {
      const key = workout.name.trim().toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, workout);
      }
    }

    return [...byName.values()];
  }, [workouts]);

  const goToCreateWorkout = () => {
    router.push('/(tabs)/createWorkout' as Href);
  };

  const goToCurrentWorkout = async (workout: Workout) => {
    if (!session?.user?.id) {
      Alert.alert(copy.notSigned, copy.loginAgain);
      return;
    }

    setStartingWorkoutId(workout.id);

    try {
      const { data: sourceExercises, error: sourceExercisesError } = await supabase
        .from('workout_exercise')
        .select('id, exercise_id, position, rest_timer_seconds, sets(id, position, weight_kg, reps)')
        .eq('workout_id', workout.id)
        .order('position', { ascending: true });

      if (sourceExercisesError) {
        throw new Error(sourceExercisesError.message);
      }

      const totalPlannedSets = (sourceExercises ?? []).reduce((sum, row: any) => {
        const rowSets = Array.isArray(row.sets) ? row.sets.length : 0;
        return sum + rowSets;
      }, 0);

      const { data: createdWorkout, error: createdWorkoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: session.user.id,
          name: workout.name,
          started_at: new Date().toISOString(),
          total_sets: totalPlannedSets,
          total_volume_kg: 0,
          duration_seconds: null,
          finished_at: null,
        })
        .select('id, name')
        .single();

      if (createdWorkoutError || !createdWorkout) {
        throw new Error(createdWorkoutError?.message ?? copy.createSessionFailed);
      }

      for (const sourceExercise of (sourceExercises ?? []) as any[]) {
        const { data: insertedWorkoutExercise, error: insertWorkoutExerciseError } = await supabase
          .from('workout_exercise')
          .insert({
            workout_id: createdWorkout.id,
            exercise_id: sourceExercise.exercise_id,
            position: sourceExercise.position,
            rest_timer_seconds: sourceExercise.rest_timer_seconds ?? 90,
          })
          .select('id')
          .single();

        if (insertWorkoutExerciseError || !insertedWorkoutExercise) {
          throw new Error(insertWorkoutExerciseError?.message ?? copy.copyExerciseFailed);
        }

        const sourceSets = Array.isArray(sourceExercise.sets) ? [...sourceExercise.sets] : [];
        sourceSets.sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));

        if (sourceSets.length > 0) {
          const copiedSets = sourceSets.map((setRow: any, index: number) => ({
            workout_exercise_id: insertedWorkoutExercise.id,
            position: Number(setRow.position ?? index + 1),
            weight_kg: Number(setRow.weight_kg ?? 0),
            reps: Number(setRow.reps ?? 0),
            completed: false,
          }));

          const { error: insertSetsError } = await supabase.from('sets').insert(copiedSets);

          if (insertSetsError) {
            throw new Error(insertSetsError.message);
          }
        }
      }

      const target = `/current-workout?workoutId=${encodeURIComponent(createdWorkout.id)}&workoutName=${encodeURIComponent(createdWorkout.name)}`;
      router.push(target as Href);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.startFailedBody;
      Alert.alert(copy.startFailed, message);
    } finally {
      setStartingWorkoutId(null);
    }
  };

  const goToEditWorkout = (workout: Workout) => {
    const target = `/(tabs)/createWorkout?workoutId=${encodeURIComponent(workout.id)}`;
    router.push(target as Href);
  };

  const deleteWorkout = (workout: Workout) => {
    setOpenMenuWorkoutId(null);

    Alert.alert(copy.deleteWorkoutTitle, `${copy.deleteWorkoutQuestion} "${workout.name}"?`, [
      {
        text: copy.cancel,
        style: 'cancel',
      },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: async () => {
          setDeletingWorkoutId(workout.id);

          try {
            const { data: exerciseRows, error: exerciseRowsError } = await supabase
              .from('workout_exercise')
              .select('id')
              .eq('workout_id', workout.id);

            if (exerciseRowsError) {
              throw new Error(exerciseRowsError.message);
            }

            const workoutExerciseIds = (exerciseRows ?? []).map((row) => row.id);

            if (workoutExerciseIds.length > 0) {
              const { error: setsDeleteError } = await supabase
                .from('sets')
                .delete()
                .in('workout_exercise_id', workoutExerciseIds);

              if (setsDeleteError) {
                throw new Error(setsDeleteError.message);
              }
            }

            const { error: workoutExerciseDeleteError } = await supabase
              .from('workout_exercise')
              .delete()
              .eq('workout_id', workout.id);

            if (workoutExerciseDeleteError) {
              throw new Error(workoutExerciseDeleteError.message);
            }

            const { error: workoutDeleteError } = await supabase
              .from('workouts')
              .delete()
              .eq('id', workout.id)
              .eq('user_id', session?.user?.id ?? '');

            if (workoutDeleteError) {
              throw new Error(workoutDeleteError.message);
            }

            setWorkouts((previous) => previous.filter((entry) => entry.id !== workout.id));
          } catch (error) {
            const message = error instanceof Error ? error.message : copy.deleteFailedBody;
            Alert.alert(copy.deleteFailed, message);
          } finally {
            setDeletingWorkoutId(null);
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-extrabold text-white">{copy.title}</Text>
        <Text className="mt-2 text-slate-300">{copy.subtitle}</Text>

        <TouchableOpacity
          onPress={goToCreateWorkout}
          className="mt-5 rounded-2xl bg-sky-500 px-5 py-4"
          activeOpacity={0.9}
        >
          <Text className="text-center text-base font-extrabold text-sky-950">{copy.addWorkout}</Text>
        </TouchableOpacity>

        <View className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <Text className="text-lg font-bold text-white">{copy.existing}</Text>
          <Text className="mt-1 text-slate-400">{copy.existingHint}</Text>

          {loading ? (
            <View className="py-10">
              <ActivityIndicator color="#cbd5e1" />
            </View>
          ) : null}

          {!loading && uniqueWorkouts.length === 0 ? (
            <Text className="mt-4 text-slate-400">{copy.none}</Text>
          ) : null}

          {!loading &&
            uniqueWorkouts.map((workout) => (
              <View key={workout.id} className="mt-4 rounded-xl border border-slate-800 bg-slate-800/70 p-3">
                <View className="relative flex-row items-center justify-between">
                  <Text className="flex-1 pr-3 text-base font-semibold text-white">{workout.name}</Text>

                  <Pressable
                    onPress={() =>
                      setOpenMenuWorkoutId((current) => (current === workout.id ? null : workout.id))
                    }
                    className={`h-8 w-8 items-center justify-center rounded-md border ${
                      openMenuWorkoutId === workout.id
                        ? 'border-slate-500 bg-slate-700/70'
                        : 'border-slate-700 bg-slate-900/80'
                    }`}
                  >
                    <View className="flex-row items-center gap-1">
                      <View className="h-1 w-1 rounded-full bg-slate-300" />
                      <View className="h-1 w-1 rounded-full bg-slate-300" />
                      <View className="h-1 w-1 rounded-full bg-slate-300" />
                    </View>
                  </Pressable>

                  {openMenuWorkoutId === workout.id ? (
                    <View className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-slate-600 bg-slate-900 p-2">
                      <Pressable
                        onPress={() => {
                          setOpenMenuWorkoutId(null);
                          goToEditWorkout(workout);
                        }}
                        className="rounded-lg px-3 py-2 active:bg-slate-800"
                      >
                        <Text className="text-sm font-medium text-slate-200">{copy.editWorkout}</Text>
                      </Pressable>

                      <View className="my-1 h-px bg-slate-700" />

                      <Pressable
                        onPress={() => deleteWorkout(workout)}
                        disabled={deletingWorkoutId === workout.id}
                        className="rounded-lg px-3 py-2 active:bg-slate-800"
                      >
                        <Text className="text-sm font-medium text-rose-300">
                          {deletingWorkoutId === workout.id ? copy.deleting : copy.deleteWorkout}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                <Text className="mt-1 text-xs text-slate-400">{copy.lastDone} {formatLastDone(workout.started_at)}</Text>

                <Pressable
                  onPress={() => goToCurrentWorkout(workout)}
                  disabled={startingWorkoutId === workout.id}
                  className="mt-3 self-start rounded-lg border border-emerald-500 px-3 py-2"
                >
                  <Text className="text-sm font-semibold text-emerald-300">
                    {startingWorkoutId === workout.id ? copy.starting : copy.start}
                  </Text>
                </Pressable>
              </View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}
