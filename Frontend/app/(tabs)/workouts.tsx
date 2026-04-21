import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Href, useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
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
  const [loading, setLoading] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);
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

  const goToCurrentWorkout = (workout: Workout) => {
    const target = `/current-workout?workoutId=${encodeURIComponent(workout.id)}&workoutName=${encodeURIComponent(workout.name)}`;
    router.push(target as Href);
  };

  const goToEditWorkout = (workout: Workout) => {
    const target = `/(tabs)/createWorkout?workoutId=${encodeURIComponent(workout.id)}`;
    router.push(target as Href);
  };

  const deleteWorkout = (workout: Workout) => {
    setOpenMenuWorkoutId(null);

    Alert.alert('Delete workout', `Delete "${workout.name}"?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
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
            const message = error instanceof Error ? error.message : 'Failed to delete workout';
            Alert.alert('Delete failed', message);
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
        <Text className="text-3xl font-extrabold text-white">Workouts</Text>
        <Text className="mt-2 text-slate-300">Plane einen neuen Workout oder starte einen bestehenden.</Text>

        <TouchableOpacity
          onPress={goToCreateWorkout}
          className="mt-5 rounded-2xl bg-sky-500 px-5 py-4"
          activeOpacity={0.9}
        >
          <Text className="text-center text-base font-extrabold text-sky-950">Workout hinzufügen</Text>
        </TouchableOpacity>

        <View className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <Text className="text-lg font-bold text-white">Vorhandene Workouts</Text>
          <Text className="mt-1 text-slate-400">Tippe auf Starten, um einen Workout direkt zu beginnen.</Text>

          {loading ? (
            <View className="py-10">
              <ActivityIndicator color="#cbd5e1" />
            </View>
          ) : null}

          {!loading && uniqueWorkouts.length === 0 ? (
            <Text className="mt-4 text-slate-400">Noch keine Workouts vorhanden.</Text>
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
                        <Text className="text-sm font-medium text-slate-200">Edit workout</Text>
                      </Pressable>

                      <View className="my-1 h-px bg-slate-700" />

                      <Pressable
                        onPress={() => deleteWorkout(workout)}
                        disabled={deletingWorkoutId === workout.id}
                        className="rounded-lg px-3 py-2 active:bg-slate-800"
                      >
                        <Text className="text-sm font-medium text-rose-300">
                          {deletingWorkoutId === workout.id ? 'Deleting...' : 'Delete workout'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                <Text className="mt-1 text-xs text-slate-400">Zuletzt: {formatLastDone(workout.started_at)}</Text>

                <Pressable
                  onPress={() => goToCurrentWorkout(workout)}
                  className="mt-3 self-start rounded-lg border border-emerald-500 px-3 py-2"
                >
                  <Text className="text-sm font-semibold text-emerald-300">Starten</Text>
                </Pressable>
              </View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}
