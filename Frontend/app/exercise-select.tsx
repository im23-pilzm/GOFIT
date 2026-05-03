import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';

type MuscleGroup = {
  name: string;
};

type Equipment = {
  name: string;
};

type ExerciseMuscle = {
  role: string;
  muscle_group: MuscleGroup;
};

type Exercise = {
  id: string;
  name: string;
  equipment: Equipment | null;
  exercise_muscles: ExerciseMuscle[];
};

type SupabaseExerciseRow = {
  id: string;
  name: string;
  equipment: Equipment[] | Equipment | null;
  exercise_muscles:
    | {
        role: string;
        muscle_group: MuscleGroup[] | MuscleGroup | null;
      }[]
    | null;
};

type Params = {
  selectedIds?: string;
  draft?: string;
  workoutId?: string;
  workoutName?: string;
};

export default function ExerciseSelectScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { language } = useLanguage();

  const copy = language === 'de-CH'
    ? {
        unknown: 'Unbekannt',
        noEquipment: 'Kein Gerät',
        goBack: 'Zurück',
        title: 'Übung auswählen',
        createExercise: 'Übung erstellen',
        subtitle: 'Wähle eine Übung aus der Liste oder erstelle zuerst eine neue.',
        search: 'Suche',
        searchPlaceholder: 'Übungen suchen',
        failedLoad: 'Übungen konnten nicht geladen werden:',
        noResults: 'Keine Übungen gefunden.',
        alreadySelected: 'Bereits ausgewählt',
        tapToAdd: 'Tippen zum Hinzufügen',
        equipment: 'Gerät:',
        targets: 'Zielmuskeln:',
        noMuscles: 'Keine Muskeln',
      }
    : {
        unknown: 'Unknown',
        noEquipment: 'No equipment',
        goBack: 'Go Back',
        title: 'Select Exercise',
        createExercise: 'Create Exercise',
        subtitle: 'Pick one from the list or add a new one first.',
        search: 'Search',
        searchPlaceholder: 'Search exercises',
        failedLoad: 'Failed to load exercises:',
        noResults: 'No exercises found.',
        alreadySelected: 'Already selected',
        tapToAdd: 'Tap to add to workout',
        equipment: 'Equipment:',
        targets: 'Targets:',
        noMuscles: 'No muscles',
      };

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedIdSet = useMemo(() => {
    const raw = typeof params.selectedIds === 'string' ? params.selectedIds : '';
    return new Set(raw.split(',').filter(Boolean));
  }, [params.selectedIds]);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, equipment(name), exercise_muscles(role, muscle_group(name))')
      .order('name', { ascending: true })
      .limit(250);

    if (error) {
      setExercises([]);
      setErrorMessage(error.message);
    } else {
      const normalizedExercises = ((data ?? []) as SupabaseExerciseRow[]).map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        equipment: Array.isArray(exercise.equipment) ? exercise.equipment[0] ?? null : exercise.equipment,
        exercise_muscles: (exercise.exercise_muscles ?? []).map((exerciseMuscle) => ({
          role: exerciseMuscle.role,
          muscle_group: Array.isArray(exerciseMuscle.muscle_group)
            ? exerciseMuscle.muscle_group[0] ?? { name: copy.unknown }
            : exerciseMuscle.muscle_group ?? { name: copy.unknown },
        })),
      }));

      setExercises(normalizedExercises);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExercises();
      return () => undefined;
    }, [loadExercises])
  );

  const filteredExercises = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return exercises;
    }

    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(normalized));
  }, [exercises, query]);

  const goBack = () => {
    const draftParam = typeof params.draft === 'string' ? params.draft : '';
    const workoutIdParam = typeof params.workoutId === 'string' ? params.workoutId : '';
    const workoutNameParam = typeof params.workoutName === 'string' ? params.workoutName : '';
    const target =
      `/(tabs)/createWorkout?draft=${encodeURIComponent(draftParam)}` +
      `&workoutId=${encodeURIComponent(workoutIdParam)}` +
      `&workoutName=${encodeURIComponent(workoutNameParam)}`;

    router.replace(target as Href);
  };

  const openCreateExercise = () => {
    const draftParam = typeof params.draft === 'string' ? params.draft : '';
    const workoutIdParam = typeof params.workoutId === 'string' ? params.workoutId : '';
    const workoutNameParam = typeof params.workoutName === 'string' ? params.workoutName : '';
    const target =
      `/create-exercise?draft=${encodeURIComponent(draftParam)}` +
      `&workoutId=${encodeURIComponent(workoutIdParam)}` +
      `&workoutName=${encodeURIComponent(workoutNameParam)}`;

    router.push(target as Href);
  };

  const selectExercise = (exercise: Exercise) => {
    const draftParam = typeof params.draft === 'string' ? params.draft : '';
    const workoutIdParam = typeof params.workoutId === 'string' ? params.workoutId : '';
    const workoutNameParam = typeof params.workoutName === 'string' ? params.workoutName : '';
    const target =
      `/(tabs)/createWorkout?selectedExerciseId=${encodeURIComponent(exercise.id)}` +
      `&selectedExerciseName=${encodeURIComponent(exercise.name)}` +
      `&selectedToken=${Date.now()}` +
			`&draft=${encodeURIComponent(draftParam)}` +
      `&workoutId=${encodeURIComponent(workoutIdParam)}` +
      `&workoutName=${encodeURIComponent(workoutNameParam)}`;

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
        <View className="gap-3">
          <View className="flex-row items-center">
            <Pressable onPress={goBack} className="h-10 flex-row items-center rounded-full border border-slate-700 px-4">
              <Text className="text-sm font-semibold text-slate-300">{copy.goBack}</Text>
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-3xl font-extrabold text-white">{copy.title}</Text>

            <Pressable onPress={openCreateExercise} className="h-10 flex-row items-center rounded-full bg-sky-500 px-4">
              <Text className="text-sm font-semibold text-sky-950">{copy.createExercise}</Text>
            </Pressable>
          </View>

          <Text className="text-sm text-slate-400">{copy.subtitle}</Text>
        </View>

        <View className="mt-5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">{copy.search}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            className="mt-2 text-base text-white"
          />
        </View>

        {loading ? (
          <View className="py-10">
            <ActivityIndicator color="#cbd5e1" />
          </View>
        ) : null}

        {!loading && errorMessage ? (
          <View className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3">
            <Text className="text-sm text-rose-200">{copy.failedLoad} {errorMessage}</Text>
          </View>
        ) : null}

        {!loading && filteredExercises.length === 0 ? (
          <View className="mt-5 rounded-xl border border-dashed border-slate-700 p-4">
            <Text className="text-slate-400">{copy.noResults}</Text>
          </View>
        ) : null}

        {!loading &&
          filteredExercises.map((exercise) => {
            const disabled = selectedIdSet.has(exercise.id);
            const primaryMuscles = exercise.exercise_muscles
              .filter((em) => em.role === 'primary')
              .map((em) => em.muscle_group.name);
            const secondaryMuscles = exercise.exercise_muscles
              .filter((em) => em.role === 'secondary')
              .map((em) => em.muscle_group.name);
            const allMuscles = [...primaryMuscles, ...secondaryMuscles];
            const equipmentName = exercise.equipment?.name || copy.noEquipment;

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
                  {disabled ? copy.alreadySelected : copy.tapToAdd}
                </Text>
                <View className="mt-2 flex-col gap-1">
                  <Text className={`text-xs ${disabled ? 'text-slate-600' : 'text-slate-300'}`}>
                    <Text className="font-semibold">{copy.equipment}</Text> {equipmentName}
                  </Text>
                  <Text className={`text-xs ${disabled ? 'text-slate-600' : 'text-slate-300'}`}>
                    <Text className="font-semibold">{copy.targets}</Text> {allMuscles.length > 0 ? allMuscles.join(', ') : copy.noMuscles}
                  </Text>
                </View>
              </Pressable>
            );
          })}
      </ScrollView>
    </View>
  );
}
