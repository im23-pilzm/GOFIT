import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';

type Equipment = {
  id: number;
  name: string;
};

type Params = {
  draft?: string;
  workoutId?: string;
  selectedEquipmentId?: string;
};

export default function EquipmentSelectScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedEquipmentId = typeof params.selectedEquipmentId === 'string' ? params.selectedEquipmentId : '';

  useEffect(() => {
    const loadEquipment = async () => {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from('equipment')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        setEquipment([]);
        setErrorMessage(error.message);
      } else {
        setEquipment((data ?? []) as Equipment[]);
      }

      setLoading(false);
    };

    loadEquipment();
  }, []);

  const filteredEquipment = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return equipment;
    }

    return equipment.filter((entry) => entry.name.toLowerCase().includes(normalized));
  }, [equipment, query]);

  const goBack = () => {
    const target =
      `/create-exercise?draft=${encodeURIComponent(typeof params.draft === 'string' ? params.draft : '')}` +
      `&workoutId=${encodeURIComponent(typeof params.workoutId === 'string' ? params.workoutId : '')}`;
    router.replace(target as Href);
  };

  const selectEquipment = (entry: Equipment) => {
    const target =
      `/create-exercise?draft=${encodeURIComponent(typeof params.draft === 'string' ? params.draft : '')}` +
      `&workoutId=${encodeURIComponent(typeof params.workoutId === 'string' ? params.workoutId : '')}` +
      `&selectedEquipmentId=${encodeURIComponent(String(entry.id))}` +
      `&selectedEquipmentName=${encodeURIComponent(entry.name)}` +
      `&equipmentToken=${Date.now()}`;

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
          <Pressable onPress={goBack} className="h-10 w-[110px] items-center justify-center rounded-full border border-slate-700">
            <Text className="text-sm font-semibold text-slate-300">Go Back</Text>
          </Pressable>

          <Text className="text-3xl font-extrabold text-white">Select Equipment</Text>

          <View className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Search</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search equipment"
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
            <Text className="text-sm text-rose-200">Failed to load equipment: {errorMessage}</Text>
          </View>
        ) : null}

        {!loading && filteredEquipment.length === 0 ? (
          <View className="mt-5 rounded-xl border border-dashed border-slate-700 p-4">
            <Text className="text-slate-400">No equipment found.</Text>
          </View>
        ) : null}

        {!loading &&
          filteredEquipment.map((entry) => {
            const selected = String(entry.id) === selectedEquipmentId;

            return (
              <Pressable
                key={entry.id}
                onPress={() => selectEquipment(entry)}
                className={`mt-3 rounded-xl border px-4 py-3 ${selected ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 bg-slate-900'}`}
              >
                <Text className="text-base font-semibold text-white">{entry.name}</Text>
              </Pressable>
            );
          })}
      </ScrollView>
    </View>
  );
}
