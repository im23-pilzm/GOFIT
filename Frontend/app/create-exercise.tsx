import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type CreateExerciseResponse = {
  id: string;
  name: string;
};

type DraftState = {
  name: string;
  isPublic: boolean;
  equipmentId: string | null;
  equipmentName: string;
  primaryMuscleId: string | null;
  primaryMuscleName: string;
  otherMuscleIds: string[];
  otherMuscleNames: string[];
};

type Params = {
  draft?: string;
  workoutId?: string;
  selectedEquipmentId?: string;
  selectedEquipmentName?: string;
  equipmentToken?: string;
  selectedPrimaryMuscleId?: string;
  selectedPrimaryMuscleName?: string;
  primaryToken?: string;
  selectedOtherMuscleIds?: string;
  selectedOtherMuscleNames?: string;
  otherToken?: string;
};

const createDefaultDraft = (): DraftState => ({
  name: '',
  isPublic: false,
  equipmentId: null,
  equipmentName: '',
  primaryMuscleId: null,
  primaryMuscleName: '',
  otherMuscleIds: [],
  otherMuscleNames: [],
});

function parseStringArray(value: string | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry));
    }
  } catch {
    return [];
  }

  return [];
}

function normalizeDraft(raw: unknown): DraftState {
  const fallback = createDefaultDraft();

  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const value = raw as Partial<DraftState>;

  return {
    name: typeof value.name === 'string' ? value.name : fallback.name,
    isPublic: typeof value.isPublic === 'boolean' ? value.isPublic : fallback.isPublic,
    equipmentId: typeof value.equipmentId === 'string' ? value.equipmentId : fallback.equipmentId,
    equipmentName: typeof value.equipmentName === 'string' ? value.equipmentName : fallback.equipmentName,
    primaryMuscleId: typeof value.primaryMuscleId === 'string' ? value.primaryMuscleId : fallback.primaryMuscleId,
    primaryMuscleName:
      typeof value.primaryMuscleName === 'string' ? value.primaryMuscleName : fallback.primaryMuscleName,
    otherMuscleIds: Array.isArray(value.otherMuscleIds)
      ? value.otherMuscleIds.map((entry) => String(entry))
      : fallback.otherMuscleIds,
    otherMuscleNames: Array.isArray(value.otherMuscleNames)
      ? value.otherMuscleNames.map((entry) => String(entry))
      : fallback.otherMuscleNames,
  };
}

function parseNullableInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : NaN;
}

export default function CreateExerciseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { session } = useAuth();

  const [draft, setDraft] = useState<DraftState>(createDefaultDraft);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastAppliedDraftRef = useRef<string | undefined>(undefined);
  const lastEquipmentTokenRef = useRef<string | undefined>(undefined);
  const lastPrimaryTokenRef = useRef<string | undefined>(undefined);
  const lastOtherTokenRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const draftRaw = typeof params.draft === 'string' ? params.draft : undefined;
    if (!draftRaw || draftRaw === lastAppliedDraftRef.current) {
      return;
    }

    try {
      const parsed = JSON.parse(draftRaw);
      setDraft(normalizeDraft(parsed));
      lastAppliedDraftRef.current = draftRaw;
    } catch {
      setDraft(createDefaultDraft());
    }
  }, [params.draft]);

  useEffect(() => {
    const token = typeof params.equipmentToken === 'string' ? params.equipmentToken : undefined;
    if (!token || token === lastEquipmentTokenRef.current) {
      return;
    }

    lastEquipmentTokenRef.current = token;

    const selectedEquipmentId =
      typeof params.selectedEquipmentId === 'string' && params.selectedEquipmentId.length > 0
        ? params.selectedEquipmentId
        : null;
    const selectedEquipmentName =
      typeof params.selectedEquipmentName === 'string' ? params.selectedEquipmentName : '';

    setDraft((previous) => ({
      ...previous,
      equipmentId: selectedEquipmentId,
      equipmentName: selectedEquipmentName,
    }));
  }, [params.equipmentToken, params.selectedEquipmentId, params.selectedEquipmentName]);

  useEffect(() => {
    const token = typeof params.primaryToken === 'string' ? params.primaryToken : undefined;
    if (!token || token === lastPrimaryTokenRef.current) {
      return;
    }

    lastPrimaryTokenRef.current = token;

    const selectedPrimaryMuscleId =
      typeof params.selectedPrimaryMuscleId === 'string' && params.selectedPrimaryMuscleId.length > 0
        ? params.selectedPrimaryMuscleId
        : null;
    const selectedPrimaryMuscleName =
      typeof params.selectedPrimaryMuscleName === 'string' ? params.selectedPrimaryMuscleName : '';

    setDraft((previous) => ({
      ...previous,
      primaryMuscleId: selectedPrimaryMuscleId,
      primaryMuscleName: selectedPrimaryMuscleName,
      otherMuscleIds: previous.otherMuscleIds.filter((muscleId) => muscleId !== selectedPrimaryMuscleId),
      otherMuscleNames: previous.otherMuscleIds
        .map((muscleId, index) => ({ muscleId, name: previous.otherMuscleNames[index] }))
        .filter((entry) => entry.muscleId !== selectedPrimaryMuscleId)
        .map((entry) => entry.name),
    }));
  }, [params.primaryToken, params.selectedPrimaryMuscleId, params.selectedPrimaryMuscleName]);

  useEffect(() => {
    const token = typeof params.otherToken === 'string' ? params.otherToken : undefined;
    if (!token || token === lastOtherTokenRef.current) {
      return;
    }

    lastOtherTokenRef.current = token;

    const idsRaw = typeof params.selectedOtherMuscleIds === 'string' ? params.selectedOtherMuscleIds : '';
    const nextIds = idsRaw.split(',').filter(Boolean);
    const nextNames = parseStringArray(typeof params.selectedOtherMuscleNames === 'string' ? params.selectedOtherMuscleNames : undefined);

    setDraft((previous) => ({
      ...previous,
      otherMuscleIds: previous.primaryMuscleId
        ? nextIds.filter((muscleId) => muscleId !== previous.primaryMuscleId)
        : nextIds,
      otherMuscleNames: nextNames,
    }));
  }, [params.otherToken, params.selectedOtherMuscleIds, params.selectedOtherMuscleNames]);

  const draftParam = useMemo(() => encodeURIComponent(JSON.stringify(draft)), [draft]);
  const workoutIdParam = typeof params.workoutId === 'string' ? params.workoutId : '';

  const discard = () => {
    const target =
      `/exercise-select?draft=${draftParam}` +
      `&workoutId=${encodeURIComponent(workoutIdParam)}`;

    router.replace(target as Href);
  };

  const openEquipmentSelect = () => {
    const target =
      `/equipment-select?draft=${draftParam}` +
      `&workoutId=${encodeURIComponent(workoutIdParam)}` +
      `&selectedEquipmentId=${encodeURIComponent(draft.equipmentId ?? '')}`;

    router.push(target as Href);
  };

  const openPrimaryMuscleSelect = () => {
    const target =
      `/muscle-group-select?mode=primary&draft=${draftParam}` +
      `&workoutId=${encodeURIComponent(workoutIdParam)}` +
      `&selectedIds=${encodeURIComponent(draft.primaryMuscleId ?? '')}`;

    router.push(target as Href);
  };

  const openOtherMusclesSelect = () => {
    const target =
      `/muscle-group-select?mode=other&draft=${draftParam}` +
      `&workoutId=${encodeURIComponent(workoutIdParam)}` +
      `&selectedIds=${encodeURIComponent(draft.otherMuscleIds.join(','))}`;

    router.push(target as Href);
  };

  const saveExercise = async () => {
    if (!session?.access_token) {
      setErrorMessage('Please sign in again.');
      return;
    }

    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setErrorMessage('Exercise name is required.');
      return;
    }

    if (!draft.primaryMuscleId) {
      setErrorMessage('Please select one muscle group.');
      return;
    }

    const parsedEquipmentId = parseNullableInteger(draft.equipmentId ?? '');
    if (Number.isNaN(parsedEquipmentId)) {
      setErrorMessage('Equipment ID must be a whole number.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const createdExercise = await apiRequest<CreateExerciseResponse>('/api/exercises', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          equipment_id: parsedEquipmentId,
          exercise_type_id: null,
          is_public: draft.isPublic,
        }),
      }, session.access_token);

      const otherMuscleIds = draft.otherMuscleIds.filter((muscleId) => muscleId !== draft.primaryMuscleId);
      const musclePayload = [
        { exercise_id: createdExercise.id, muscle_group_id: draft.primaryMuscleId, role: 'primary' },
        ...otherMuscleIds.map((muscleId) => ({
          exercise_id: createdExercise.id,
          muscle_group_id: muscleId,
          role: 'secondary',
        })),
      ];

      const { error: muscleInsertError } = await supabase.from('exercise_muscles').insert(musclePayload);
      if (muscleInsertError) {
        throw new Error(muscleInsertError.message);
      }

      Alert.alert('Saved', `${createdExercise.name} has been created.`);
      const target =
        `/exercise-select?draft=${draftParam}` +
        `&workoutId=${encodeURIComponent(workoutIdParam)}`;
      router.replace(target as Href);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create exercise.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 16 : 0}
    >
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <Pressable
              onPress={discard}
              disabled={saving}
              className={`h-10 flex-1 flex-row items-center justify-center rounded-xl border border-slate-700 ${saving ? 'opacity-50' : ''}`}
            >
              <Text className="text-sm font-semibold text-slate-300">Discard</Text>
            </Pressable>

            <Pressable
              onPress={saveExercise}
              disabled={saving}
              className={`h-10 flex-1 flex-row items-center justify-center rounded-xl ${saving ? 'bg-sky-400/60' : 'bg-sky-400'}`}
            >
              {saving ? (
                <ActivityIndicator color="#082f49" />
              ) : (
                <Text className="text-sm font-extrabold text-sky-950">Save</Text>
              )}
            </Pressable>
          </View>

          <View>
            <Text className="text-3xl font-extrabold text-white">Create Exercise</Text>
            <Text className="mt-1 text-sm text-slate-400">Add a new movement to your exercise library.</Text>
          </View>
        </View>

        <View className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</Text>
          <TextInput
            value={draft.name}
            onChangeText={(value) => setDraft((previous) => ({ ...previous, name: value }))}
            placeholder="e.g. Bench Press"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
            className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white"
          />

          <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Equipment</Text>
          <Pressable onPress={openEquipmentSelect} className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
            <Text className="text-base font-semibold text-white">
              {draft.equipmentName || 'Select Equipment'}
            </Text>
            <Text className="mt-1 text-xs text-slate-400">Choose equipment from your list.</Text>
          </Pressable>

          <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Musclegroup</Text>
          <Pressable
            onPress={openPrimaryMuscleSelect}
            className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          >
            <Text className="text-base font-semibold text-white">
              {draft.primaryMuscleName || 'Select Musclegroup'}
            </Text>
            <Text className="mt-1 text-xs text-slate-400">Select the primary muscle group.</Text>
          </Pressable>

          <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Other Musclegroups</Text>
          <Pressable
            onPress={openOtherMusclesSelect}
            className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          >
            <Text className="text-base font-semibold text-white">
              {draft.otherMuscleNames.length > 0 ? draft.otherMuscleNames.join(', ') : 'Select Other Musclegroups'}
            </Text>
            <Text className="mt-1 text-xs text-slate-400">Select additional supporting muscle groups.</Text>
          </Pressable>

          <View className="mt-5 flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
            <View>
              <Text className="text-base font-semibold text-white">Public exercise</Text>
              <Text className="mt-1 text-sm text-slate-400">Let other users see this exercise.</Text>
            </View>
            <Switch
              value={draft.isPublic}
              onValueChange={(value) => setDraft((previous) => ({ ...previous, isPublic: value }))}
              trackColor={{ true: '#38bdf8', false: '#475569' }}
            />
          </View>

          {errorMessage ? <Text className="mt-4 text-sm text-rose-300">{errorMessage}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}