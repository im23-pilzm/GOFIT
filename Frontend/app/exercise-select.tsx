import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';

type Exercise = {
  id: string;
  name: string;
};

type Params = {
  selectedIds?: string;
  draft?: string;
  workoutId?: string;
};

export default function ExerciseSelectScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedIdSet = useMemo(() => {
    const raw = typeof params.selectedIds === 'string' ? params.selectedIds : '';
    return new Set(raw.split(',').filter(Boolean));
  }, [params.selectedIds]);

  useEffect(() => {
    const loadExercises = async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from('exercises')
        .select('id, name')
        .order('name', { ascending: true })
        .limit(250);

      if (error) {
        setExercises([]);
        setErrorMessage(error.message);
      } else {
        setExercises((data ?? []) as Exercise[]);
      }

      setLoading(false);
    };

    loadExercises();
  }, []);

  const filteredExercises = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return exercises;
    }

    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(normalized));
  }, [exercises, query]);

  const goBack = () => {
    router.back();
  };

  const selectExercise = (exercise: Exercise) => {
    const draftParam = typeof params.draft === 'string' ? params.draft : '';
    const workoutIdParam = typeof params.workoutId === 'string' ? params.workoutId : '';
    const target =
      `/(tabs)/createWorkout?selectedExerciseId=${encodeURIComponent(exercise.id)}` +
      `&selectedExerciseName=${encodeURIComponent(exercise.name)}` +
      `&selectedToken=${Date.now()}` +
			`&draft=${encodeURIComponent(draftParam)}` +
      `&workoutId=${encodeURIComponent(workoutIdParam)}`;

    router.navigate(target as Href);
  };

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-extrabold text-white">Select Exercise</Text>
          <Pressable onPress={goBack} className="rounded-lg border border-slate-700 px-3 py-2">
            <Text className="text-sm font-semibold text-slate-300">Cancel</Text>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises"
          placeholderTextColor="#94a3b8"
          className="mt-4 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
        />

        {loading ? (
          <View className="py-10">
            <ActivityIndicator color="#cbd5e1" />
          </View>
        ) : null}

        {!loading && errorMessage ? (
          <View className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3">
            <Text className="text-sm text-rose-200">Failed to load exercises: {errorMessage}</Text>
          </View>
        ) : null}

        {!loading && filteredExercises.length === 0 ? (
          <View className="mt-5 rounded-xl border border-dashed border-slate-700 p-4">
            <Text className="text-slate-400">No exercises found.</Text>
          </View>
        ) : null}

        {!loading &&
          filteredExercises.map((exercise) => {
            const disabled = selectedIdSet.has(exercise.id);

            return (
              <Pressable
                key={exercise.id}
                onPress={() => selectExercise(exercise)}
                disabled={disabled}
                className={`mt-3 rounded-xl border px-4 py-3 ${disabled ? 'border-slate-800 bg-slate-900/40' : 'border-slate-700 bg-slate-900'}`}
              >
                <Text className={`text-base font-semibold ${disabled ? 'text-slate-500' : 'text-white'}`}>
                  {exercise.name}
                </Text>
                <Text className={`mt-1 text-xs ${disabled ? 'text-slate-600' : 'text-slate-400'}`}>
                  {disabled ? 'Already selected' : 'Tap to add to workout'}
                </Text>
              </Pressable>
            );
          })}
      </ScrollView>
    </View>
  );
}
