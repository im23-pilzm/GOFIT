import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
    router.push('/workout-erstellen' as Href);
  };

  const goToCurrentWorkout = (workout: Workout) => {
    const target = `/current-workout?workoutId=${encodeURIComponent(workout.id)}&workoutName=${encodeURIComponent(workout.name)}`;
    router.push(target as Href);
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
                <Text className="text-base font-semibold text-white">{workout.name}</Text>
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
