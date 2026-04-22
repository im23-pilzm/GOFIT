import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';

type MuscleGroup = {
  id: number;
  name: string;
};

type Params = {
  mode?: string;
  draft?: string;
  workoutId?: string;
  selectedIds?: string;
};

export default function MuscleGroupSelectScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const raw = typeof params.selectedIds === 'string' ? params.selectedIds : '';
    return raw.split(',').filter(Boolean);
  });

  const mode = typeof params.mode === 'string' ? params.mode : 'primary';
  const isOtherMode = mode === 'other';

  useEffect(() => {
    const loadMuscleGroups = async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from('muscle_group')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        setMuscleGroups([]);
        setErrorMessage(error.message);
      } else {
        setMuscleGroups((data ?? []) as MuscleGroup[]);
      }

      setLoading(false);
    };

    loadMuscleGroups();
  }, []);

  const filteredMuscleGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return muscleGroups;
    }

    return muscleGroups.filter((entry) => entry.name.toLowerCase().includes(normalized));
  }, [muscleGroups, query]);

  const goBack = () => {
    const target =
      `/create-exercise?draft=${encodeURIComponent(typeof params.draft === 'string' ? params.draft : '')}` +
      `&workoutId=${encodeURIComponent(typeof params.workoutId === 'string' ? params.workoutId : '')}`;
    router.replace(target as Href);
  };

  const toggleSelection = (id: string) => {
    if (!isOtherMode) {
      setSelectedIds([id]);
      return;
    }

    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter((entry) => entry !== id);
      }

      return [...previous, id];
    });
  };

  const saveSelection = () => {
    const baseTarget =
      `/create-exercise?draft=${encodeURIComponent(typeof params.draft === 'string' ? params.draft : '')}` +
      `&workoutId=${encodeURIComponent(typeof params.workoutId === 'string' ? params.workoutId : '')}`;

    if (!isOtherMode) {
      const selectedId = selectedIds[0] ?? '';
      const selectedName = muscleGroups.find((entry) => String(entry.id) === selectedId)?.name ?? '';
      const target =
        `${baseTarget}` +
        `&selectedPrimaryMuscleId=${encodeURIComponent(selectedId)}` +
        `&selectedPrimaryMuscleName=${encodeURIComponent(selectedName)}` +
        `&primaryToken=${Date.now()}`;

      router.replace(target as Href);
      return;
    }

    const selectedNames = muscleGroups
      .filter((entry) => selectedIds.includes(String(entry.id)))
      .map((entry) => entry.name);

    const target =
      `${baseTarget}` +
      `&selectedOtherMuscleIds=${encodeURIComponent(selectedIds.join(','))}` +
      `&selectedOtherMuscleNames=${encodeURIComponent(JSON.stringify(selectedNames))}` +
      `&otherToken=${Date.now()}`;

    router.replace(target as Href);
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
          <View className="flex-row items-center justify-between gap-3">
            <Pressable onPress={goBack} className="h-10 w-[110px] items-center justify-center rounded-full border border-slate-700">
              <Text className="text-sm font-semibold text-slate-300">Go Back</Text>
            </Pressable>

            <Pressable onPress={saveSelection} className="h-10 w-[110px] items-center justify-center rounded-full bg-sky-500">
              <Text className="text-sm font-semibold text-sky-950">Save</Text>
            </Pressable>
          </View>

          <Text className="text-3xl font-extrabold text-white">
            {isOtherMode ? 'Select Other Musclegroups' : 'Select Musclegroup'}
          </Text>

          <View className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Search</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search musclegroups"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-2 text-base text-white"
            />
          </View>
        </View>

        {loading ? (
          <View className="py-10">
            <ActivityIndicator color="#cbd5e1" />
          </View>
        ) : null}

        {!loading && errorMessage ? (
          <View className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3">
            <Text className="text-sm text-rose-200">Failed to load musclegroups: {errorMessage}</Text>
          </View>
        ) : null}

        {!loading && filteredMuscleGroups.length === 0 ? (
          <View className="mt-5 rounded-xl border border-dashed border-slate-700 p-4">
            <Text className="text-slate-400">No musclegroups found.</Text>
          </View>
        ) : null}

        {!loading &&
          filteredMuscleGroups.map((entry) => {
            const selected = selectedIds.includes(String(entry.id));

            return (
              <Pressable
                key={entry.id}
                onPress={() => toggleSelection(String(entry.id))}
                className={`mt-3 rounded-xl border px-4 py-3 ${selected ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 bg-slate-900'}`}
              >
                <Text className="text-base font-semibold text-white">{entry.name}</Text>
                <Text className="mt-1 text-xs text-slate-400">
                  {selected ? 'Selected' : isOtherMode ? 'Tap to toggle' : 'Tap to choose'}
                </Text>
              </Pressable>
            );
          })}
      </ScrollView>
    </View>
  );
}
