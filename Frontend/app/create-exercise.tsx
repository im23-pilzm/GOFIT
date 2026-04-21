import { useState } from 'react';
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
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';

type CreateExerciseResponse = {
  id: string;
  name: string;
};

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
  const { session } = useAuth();

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [exerciseTypeId, setExerciseTypeId] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const goBack = () => {
    router.back();
  };

  const saveExercise = async () => {
    if (!session?.access_token) {
      setErrorMessage('Please sign in again.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Exercise name is required.');
      return;
    }

    const parsedEquipmentId = parseNullableInteger(equipmentId);
    if (Number.isNaN(parsedEquipmentId)) {
      setErrorMessage('Equipment ID must be a whole number.');
      return;
    }

    const parsedExerciseTypeId = parseNullableInteger(exerciseTypeId);
    if (Number.isNaN(parsedExerciseTypeId)) {
      setErrorMessage('Exercise type ID must be a whole number.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const createdExercise = await apiRequest<CreateExerciseResponse>('/api/exercises', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          image_url: imageUrl.trim() || null,
          equipment_id: parsedEquipmentId,
          exercise_type_id: parsedExerciseTypeId,
          is_public: isPublic,
        }),
      }, session.access_token);

      Alert.alert('Saved', `${createdExercise.name} has been created.`);
      router.back();
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
          <View className="flex-row items-center">
            <Pressable onPress={goBack} className="h-10 flex-row items-center rounded-full border border-slate-700 px-4">
              <Text className="text-sm font-semibold text-slate-300">Go Back</Text>
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
            value={name}
            onChangeText={setName}
            placeholder="e.g. Bench Press"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
            className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white"
          />

          <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Image URL</Text>
          <TextInput
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white"
          />

          <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Equipment ID</Text>
          <TextInput
            value={equipmentId}
            onChangeText={setEquipmentId}
            placeholder="Optional numeric ID"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white"
          />

          <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Exercise Type ID</Text>
          <TextInput
            value={exerciseTypeId}
            onChangeText={setExerciseTypeId}
            placeholder="Optional numeric ID"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white"
          />

          <View className="mt-5 flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
            <View>
              <Text className="text-base font-semibold text-white">Public exercise</Text>
              <Text className="mt-1 text-sm text-slate-400">Let other users see this exercise.</Text>
            </View>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: '#38bdf8', false: '#475569' }} />
          </View>

          {errorMessage ? <Text className="mt-4 text-sm text-rose-300">{errorMessage}</Text> : null}

          <Pressable
            onPress={saveExercise}
            disabled={saving}
            className={`mt-5 items-center rounded-xl px-4 py-3 ${saving ? 'bg-sky-400/60' : 'bg-sky-400'}`}
          >
            {saving ? (
              <ActivityIndicator color="#082f49" />
            ) : (
              <Text className="text-base font-extrabold text-sky-950">Save Exercise</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}