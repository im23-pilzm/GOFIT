import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

type Params = {
  workoutId?: string;
  workoutName?: string;
};

type WorkoutSet = {
  id: string;
  position: number;
  weightKgInput: string;
  repsInput: string;
  completed: boolean;
};

type WorkoutExercise = {
  id: string;
  exerciseId: string;
  name: string;
  position: number;
  restTimerSeconds: number;
  sets: WorkoutSet[];
};

type EditableField = 'weight' | 'reps';

type EditingCell = {
  setId: string;
  field: EditableField;
};

function formatElapsed(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatPauseTimer(seconds: number): string {
  if (seconds <= 0) {
    return '0';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m${remainingSeconds}s`;
}

function parseNumberInput(value: string) {
  const normalized = value.replace(',', '.').trim();

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, parsed);
}

function toInitialNumericInput(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? String(parsed) : '0';
  }

  return '0';
}

function formatCellValue(value: string) {
  return String(parseNumberInput(value));
}

function formatVolume(value: number) {
  return `${new Intl.NumberFormat().format(Math.round(value))} kg`;
}

function formatRestCountdown(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function CurrentWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<Params>();

  const workoutId = typeof params.workoutId === 'string' ? params.workoutId : '';
  const fallbackWorkoutName = typeof params.workoutName === 'string' ? params.workoutName : 'Workout';

  const [workoutName, setWorkoutName] = useState(fallbackWorkoutName);
  const [startedAtIso, setStartedAtIso] = useState<string>(new Date().toISOString());
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mutatingSets, setMutatingSets] = useState(false);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [openPausePickerExerciseId, setOpenPausePickerExerciseId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restTimerSecondsLeft, setRestTimerSecondsLeft] = useState(0);
  const [restTimerExerciseName, setRestTimerExerciseName] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!restTimerVisible || restTimerSecondsLeft <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRestTimerSecondsLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimerSecondsLeft, restTimerVisible]);

  useEffect(() => {
    if (restTimerVisible && restTimerSecondsLeft <= 0) {
      setRestTimerVisible(false);
      setRestTimerExerciseName(null);
    }
  }, [restTimerSecondsLeft, restTimerVisible]);

  const elapsedSeconds = useMemo(() => {
    const start = new Date(startedAtIso).getTime();
    return Math.max(0, Math.floor((now - start) / 1000));
  }, [now, startedAtIso]);

  const totalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [exercises]
  );

  const completedSets = useMemo(
    () =>
      exercises.reduce(
        (sum, exercise) => sum + exercise.sets.filter((setItem) => setItem.completed).length,
        0
      ),
    [exercises]
  );

  const totalVolume = useMemo(
    () =>
      exercises.reduce((sum, exercise) => {
        const exerciseVolume = exercise.sets.reduce((setSum, setItem) => {
          if (!setItem.completed) {
            return setSum;
          }

          const weight = parseNumberInput(setItem.weightKgInput);
          const reps = parseNumberInput(setItem.repsInput);
          return setSum + weight * reps;
        }, 0);

        return sum + exerciseVolume;
      }, 0),
    [exercises]
  );

  const pauseTimerOptions = useMemo(() => {
    const options: number[] = [];

    for (let seconds = 0; seconds <= 1800; seconds += 15) {
      options.push(seconds);
    }

    return options;
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !workoutId) {
      setLoading(false);
      return;
    }

    const loadWorkout = async () => {
      setLoading(true);

      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('id, name, started_at')
        .eq('id', workoutId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (workoutError || !workout) {
        setLoading(false);
        Alert.alert('Load failed', workoutError?.message ?? 'Workout not found.');
        return;
      }

      const { data: workoutExerciseRows, error: workoutExerciseError } = await supabase
        .from('workout_exercise')
        .select('id, exercise_id, position, rest_timer_seconds, exercises(name), sets(id, position, weight_kg, reps, completed)')
        .eq('workout_id', workoutId)
        .order('position', { ascending: true });

      if (workoutExerciseError) {
        setLoading(false);
        Alert.alert('Load failed', workoutExerciseError.message);
        return;
      }

      const mappedExercises: WorkoutExercise[] = ((workoutExerciseRows ?? []) as any[]).map((row, index) => {
        const sortedSets = Array.isArray(row.sets) ? [...row.sets] : [];
        sortedSets.sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));

        return {
          id: String(row.id),
          exerciseId: String(row.exercise_id),
          name: String(row.exercises?.name ?? 'Exercise'),
          position: Number(row.position ?? index + 1),
          restTimerSeconds: Number(row.rest_timer_seconds ?? 90),
          sets: sortedSets.map((setRow: any, setIndex: number) => ({
            id: String(setRow.id),
            position: setIndex + 1,
            weightKgInput: toInitialNumericInput(setRow.weight_kg),
            repsInput: toInitialNumericInput(setRow.reps),
            completed: Boolean(setRow.completed),
          })),
        };
      });

      setWorkoutName(String(workout.name ?? fallbackWorkoutName));
      setStartedAtIso(String(workout.started_at ?? new Date().toISOString()));
      setExercises(mappedExercises);
      setLoading(false);
    };

    loadWorkout();
  }, [fallbackWorkoutName, session?.user?.id, workoutId]);

  const updateSetField = (
    workoutExerciseId: string,
    setId: string,
    field: 'weightKgInput' | 'repsInput',
    nextValue: string
  ) => {
    setExercises((previous) =>
      previous.map((exercise) => {
        if (exercise.id !== workoutExerciseId) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((setItem) =>
            setItem.id === setId
              ? {
                  ...setItem,
                  [field]: nextValue,
                }
              : setItem
          ),
        };
      })
    );
  };

  const toggleSetDone = (workoutExerciseId: string, setId: string) => {
    const targetExercise = exercises.find((exercise) => exercise.id === workoutExerciseId);
    const targetSet = targetExercise?.sets.find((setItem) => setItem.id === setId);
    const willBeCompleted = Boolean(targetSet && !targetSet.completed);

    setExercises((previous) =>
      previous.map((exercise) => {
        if (exercise.id !== workoutExerciseId) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((setItem) =>
            setItem.id === setId
              ? {
                  ...setItem,
                  completed: !setItem.completed,
                }
              : setItem
          ),
        };
      })
    );

    if (targetExercise && willBeCompleted) {
      setRestTimerSecondsLeft(Math.max(0, targetExercise.restTimerSeconds));
      setRestTimerVisible(true);
      setRestTimerExerciseName(targetExercise.name);
    }
  };

  const adjustRestTimer = (deltaSeconds: number) => {
    setRestTimerSecondsLeft((previous) => {
      const next = previous + deltaSeconds;
      return Math.max(0, Math.min(3600, next));
    });
  };

  const updateExercisePauseTimer = (workoutExerciseId: string, nextSeconds: number) => {
    const normalized = Number.isFinite(nextSeconds) ? Math.max(0, Math.floor(nextSeconds)) : 0;

    setExercises((previous) =>
      previous.map((exercise) =>
        exercise.id === workoutExerciseId
          ? {
              ...exercise,
              restTimerSeconds: normalized,
            }
          : exercise
      )
    );
  };

  const addSetToExercise = async (exercise: WorkoutExercise) => {
    if (!session?.user?.id || !workoutId || mutatingSets) {
      return;
    }

    setMutatingSets(true);

    try {
      const lastSet = exercise.sets[exercise.sets.length - 1];
      const nextPosition = exercise.sets.length + 1;
      const nextWeight = lastSet ? parseNumberInput(lastSet.weightKgInput) : 20;
      const nextReps = lastSet ? Math.floor(parseNumberInput(lastSet.repsInput)) : 10;

      const { data: insertedSet, error: insertError } = await supabase
        .from('sets')
        .insert({
          workout_exercise_id: exercise.id,
          position: nextPosition,
          weight_kg: nextWeight,
          reps: nextReps,
          completed: false,
        })
        .select('id, position, weight_kg, reps, completed')
        .single();

      if (insertError || !insertedSet) {
        throw new Error(insertError?.message ?? 'Failed to add set');
      }

      setExercises((previous) =>
        previous.map((item) => {
          if (item.id !== exercise.id) {
            return item;
          }

          return {
            ...item,
            sets: [
              ...item.sets,
              {
                id: String(insertedSet.id),
                position: Number(insertedSet.position ?? nextPosition),
                weightKgInput: toInitialNumericInput(insertedSet.weight_kg),
                repsInput: toInitialNumericInput(insertedSet.reps),
                completed: Boolean(insertedSet.completed),
              },
            ],
          };
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add set';
      Alert.alert('Add set failed', message);
    } finally {
      setMutatingSets(false);
    }
  };

  const deleteSetFromExercise = (exercise: WorkoutExercise, setId: string) => {
    if (!session?.user?.id || !workoutId || mutatingSets) {
      return;
    }

    Alert.alert('Delete set', 'Delete this set from the workout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setMutatingSets(true);

          try {
            const { error: deleteError } = await supabase
              .from('sets')
              .delete()
              .eq('id', setId)
              .eq('workout_exercise_id', exercise.id);

            if (deleteError) {
              throw new Error(deleteError.message);
            }

            const { data: remainingSets, error: reloadError } = await supabase
              .from('sets')
              .select('id, position, weight_kg, reps, completed')
              .eq('workout_exercise_id', exercise.id)
              .order('position', { ascending: true });

            if (reloadError) {
              throw new Error(reloadError.message);
            }

            const normalizedSets = (remainingSets ?? []).map((setRow, index) => ({
              ...setRow,
              position: index + 1,
            }));

            for (const setRow of normalizedSets) {
              const { error: updatePositionError } = await supabase
                .from('sets')
                .update({ position: setRow.position })
                .eq('id', setRow.id)
                .eq('workout_exercise_id', exercise.id);

              if (updatePositionError) {
                throw new Error(updatePositionError.message);
              }
            }

            setExercises((previous) =>
              previous.map((item) => {
                if (item.id !== exercise.id) {
                  return item;
                }

                return {
                  ...item,
                  sets: normalizedSets.map((setRow) => ({
                    id: String(setRow.id),
                    position: Number(setRow.position),
                    weightKgInput: toInitialNumericInput(setRow.weight_kg),
                    repsInput: toInitialNumericInput(setRow.reps),
                    completed: Boolean(setRow.completed),
                  })),
                };
              })
            );

            setEditingCell((current) => (current?.setId === setId ? null : current));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete set';
            Alert.alert('Delete set failed', message);
          } finally {
            setMutatingSets(false);
          }
        },
      },
    ]);
  };

  const saveAllChanges = async (markAsFinished: boolean) => {
    if (!session?.user?.id || !workoutId) {
      Alert.alert('Not signed in', 'Please log in again.');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('No exercises', 'This workout has no exercises.');
      return;
    }

    setSaving(true);

    try {
      for (const exercise of exercises) {
        const { error: exerciseUpdateError } = await supabase
          .from('workout_exercise')
          .update({
            rest_timer_seconds: exercise.restTimerSeconds,
          })
          .eq('id', exercise.id)
          .eq('workout_id', workoutId);

        if (exerciseUpdateError) {
          throw new Error(exerciseUpdateError.message);
        }

        for (const [setIndex, setItem] of exercise.sets.entries()) {
          const { error: setUpdateError } = await supabase
            .from('sets')
            .update({
              position: setIndex + 1,
              weight_kg: parseNumberInput(setItem.weightKgInput),
              reps: Math.floor(parseNumberInput(setItem.repsInput)),
              completed: setItem.completed,
            })
            .eq('id', setItem.id)
            .eq('workout_exercise_id', exercise.id);

          if (setUpdateError) {
            throw new Error(setUpdateError.message);
          }
        }
      }

      const updatePayload: Record<string, unknown> = {
        total_sets: completedSets,
        total_volume_kg: Math.round(totalVolume),
      };

      if (markAsFinished) {
        updatePayload.duration_seconds = elapsedSeconds;
        updatePayload.finished_at = new Date().toISOString();
      }

      const { error: workoutUpdateError } = await supabase
        .from('workouts')
        .update(updatePayload)
        .eq('id', workoutId)
        .eq('user_id', session.user.id);

      if (workoutUpdateError) {
        throw new Error(workoutUpdateError.message);
      }

      if (markAsFinished) {
        Alert.alert('Workout finished', 'Your workout was saved successfully.');
        router.replace('/(tabs)/workouts' as Href);
      } else {
        Alert.alert('Saved', 'Your workout progress has been saved.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save workout';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrentWorkoutSession = () => {
    if (!session?.user?.id || !workoutId) {
      return;
    }

    Alert.alert('Delete current workout', `Delete the current workout session for "${workoutName}"?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);

          try {
            const { data: exerciseRows, error: exerciseRowsError } = await supabase
              .from('workout_exercise')
              .select('id')
              .eq('workout_id', workoutId);

            if (exerciseRowsError) {
              throw new Error(exerciseRowsError.message);
            }

            const workoutExerciseIds = (exerciseRows ?? []).map((row) => row.id);

            if (workoutExerciseIds.length > 0) {
              const { error: setsResetError } = await supabase
                .from('sets')
                .update({
                  completed: false,
                })
                .in('workout_exercise_id', workoutExerciseIds);

              if (setsResetError) {
                throw new Error(setsResetError.message);
              }
            }

            const { error: workoutResetError } = await supabase
              .from('workouts')
              .update({
                duration_seconds: null,
                total_volume_kg: 0,
                total_sets: 0,
                finished_at: null,
                started_at: new Date().toISOString(),
              })
              .eq('id', workoutId)
              .eq('user_id', session.user.id);

            if (workoutResetError) {
              throw new Error(workoutResetError.message);
            }

            router.replace('/(tabs)/workouts' as Href);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete current workout session';
            Alert.alert('Delete failed', message);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-slate-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + (restTimerVisible ? 116 : 28),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setOpenPausePickerExerciseId(null)}
        >
          <Text className="text-3xl font-extrabold text-white">{workoutName}</Text>
          <Text className="mt-2 text-slate-300">Live workout logging</Text>

          <View className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <Text className="text-sm font-semibold uppercase tracking-wide text-slate-300">Information</Text>

            {loading ? (
              <Text className="mt-3 text-slate-400">Loading workout...</Text>
            ) : (
              <View className="mt-3 gap-2">
                <Text className="text-base text-slate-200">Time: <Text className="font-bold text-white">{formatElapsed(elapsedSeconds)}</Text></Text>
                <Text className="text-base text-slate-200">Sets done: <Text className="font-bold text-white">{completedSets}/{totalSets}</Text></Text>
                <Text className="text-base text-slate-200">Volume: <Text className="font-bold text-white">{formatVolume(totalVolume)}</Text></Text>
              </View>
            )}
          </View>

          {!loading && exercises.length === 0 ? (
            <View className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-4">
              <Text className="text-slate-400">No exercises found in this workout.</Text>
            </View>
          ) : null}

          {!loading &&
            exercises.map((exercise, index) => (
              <View key={exercise.id} className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs uppercase tracking-wide text-slate-400">Exercise {index + 1}</Text>
                    <Text className="mt-1 text-lg font-bold text-white">{exercise.name}</Text>
                  </View>
                </View>

                <View className="mt-3">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pause Timer</Text>
                  <Pressable
                    onPress={() =>
                      setOpenPausePickerExerciseId((current) =>
                        current === exercise.id ? null : exercise.id
                      )
                    }
                    className="mt-1 self-start"
                  >
                    <Text className="text-base font-bold text-sky-300">
                      {formatPauseTimer(exercise.restTimerSeconds)}
                    </Text>
                  </Pressable>
                </View>

                {openPausePickerExerciseId === exercise.id ? (
                  <View className="mt-2 rounded-lg border border-slate-700 bg-slate-950/80 p-2">
                    <ScrollView className="max-h-28" nestedScrollEnabled>
                      {pauseTimerOptions.map((seconds) => {
                        const isSelected = seconds === exercise.restTimerSeconds;

                        return (
                          <Pressable
                            key={seconds}
                            onPress={() => {
                              updateExercisePauseTimer(exercise.id, seconds);
                              setOpenPausePickerExerciseId(null);
                            }}
                            className={`rounded-md px-2.5 py-1.5 ${isSelected ? 'bg-sky-500/20' : ''}`}
                          >
                            <Text
                              className={`text-xs ${
                                isSelected ? 'font-bold text-sky-300' : 'text-slate-200'
                              }`}
                            >
                              {formatPauseTimer(seconds)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                <View className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
                  <View className="flex-row border-b border-slate-800 pb-2">
                    <Text className="w-10 text-xs font-bold uppercase text-slate-400">Set</Text>
                    <Text className="flex-1 text-xs font-bold uppercase text-slate-400">Weight (kg)</Text>
                    <Text className="w-16 text-xs font-bold uppercase text-slate-400">Reps</Text>
                    <Text className="w-10 text-center text-xs font-bold uppercase text-slate-400">✓</Text>
                  </View>

                  {exercise.sets.map((setItem, setIndex) => {
                    return (
                      <Swipeable
                        key={setItem.id}
                        renderRightActions={() => (
                          <View className="ml-2 justify-center">
                            <Pressable
                              onPress={() => deleteSetFromExercise(exercise, setItem.id)}
                              disabled={mutatingSets || saving || deleting || loading}
                              className="h-full min-h-[38px] items-center justify-center rounded-lg bg-rose-500 px-3"
                            >
                              <Text className="text-xs font-bold text-rose-50">Delete</Text>
                            </Pressable>
                          </View>
                        )}
                      >
                        <View
                          className={`flex-row items-center py-2 ${setIndex !== exercise.sets.length - 1 ? 'border-b border-slate-800' : ''}`}
                        >
                          <Text className="w-10 text-sm font-semibold text-slate-200">{setIndex + 1}</Text>

                          {editingCell?.setId === setItem.id && editingCell.field === 'weight' ? (
                            <TextInput
                              value={setItem.weightKgInput}
                              onChangeText={(value) =>
                                updateSetField(exercise.id, setItem.id, 'weightKgInput', value)
                              }
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                              keyboardType="decimal-pad"
                              className="mr-2 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
                              placeholder="0"
                              placeholderTextColor="#64748b"
                            />
                          ) : (
                            <Pressable
                              onPress={() => setEditingCell({ setId: setItem.id, field: 'weight' })}
                              className="mr-2 flex-1 px-1 py-1.5"
                            >
                              <Text className="text-sm text-slate-200">{formatCellValue(setItem.weightKgInput)}</Text>
                            </Pressable>
                          )}

                          {editingCell?.setId === setItem.id && editingCell.field === 'reps' ? (
                            <TextInput
                              value={setItem.repsInput}
                              onChangeText={(value) =>
                                updateSetField(exercise.id, setItem.id, 'repsInput', value)
                              }
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                              keyboardType="number-pad"
                              className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white"
                              placeholder="0"
                              placeholderTextColor="#64748b"
                            />
                          ) : (
                            <Pressable
                              onPress={() => setEditingCell({ setId: setItem.id, field: 'reps' })}
                              className="w-16 px-1 py-1.5"
                            >
                              <Text className="text-sm text-slate-200">{formatCellValue(setItem.repsInput)}</Text>
                            </Pressable>
                          )}

                          <Pressable
                            onPress={() => toggleSetDone(exercise.id, setItem.id)}
                            className="ml-1 h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900"
                          >
                            <Text
                              className={`text-sm font-bold ${
                                setItem.completed ? 'text-emerald-300' : 'text-slate-500'
                              }`}
                            >
                              ✓
                            </Text>
                          </Pressable>
                        </View>
                      </Swipeable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={() => addSetToExercise(exercise)}
                  disabled={mutatingSets || saving || deleting || loading}
                  className={`mt-3 rounded-lg border px-3 py-2 ${
                    mutatingSets || saving || deleting || loading
                      ? 'border-emerald-500/40'
                      : 'border-emerald-500'
                  }`}
                >
                  <Text className="text-center text-sm font-semibold text-emerald-300">Add New Set</Text>
                </Pressable>
              </View>
            ))}

          <View className="mt-6 gap-3">
            <Pressable
              onPress={() => saveAllChanges(true)}
              disabled={saving || deleting || loading}
              className={`rounded-xl px-4 py-3 ${
                saving || deleting || loading ? 'bg-sky-300/60' : 'bg-sky-400'
              }`}
            >
              <Text className="text-center text-sm font-extrabold text-sky-950">
                {saving ? 'Saving...' : 'Finish Workout'}
              </Text>
            </Pressable>

            <Pressable
              onPress={deleteCurrentWorkoutSession}
              disabled={saving || deleting || loading}
              className={`rounded-xl border px-4 py-3 ${
                saving || deleting || loading
                  ? 'border-rose-400/40 bg-rose-500/10'
                  : 'border-rose-400 bg-rose-500/10'
              }`}
            >
              <Text className="text-center text-sm font-bold text-rose-300">
                {deleting ? 'Deleting...' : 'Delete Current Workout'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {restTimerVisible ? (
          <View
            className="absolute bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 px-5"
            style={{ paddingTop: 10, paddingBottom: insets.bottom + 10 }}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rest Timer</Text>
                <Text className="mt-0.5 text-2xl font-extrabold text-white">{formatRestCountdown(restTimerSecondsLeft)}</Text>
                {restTimerExerciseName ? (
                  <Text className="text-xs text-slate-400">{restTimerExerciseName}</Text>
                ) : null}
              </View>

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => adjustRestTimer(-15)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
                >
                  <Text className="text-xs font-bold text-slate-200">-15s</Text>
                </Pressable>

                <Pressable
                  onPress={() => adjustRestTimer(15)}
                  className="rounded-lg border border-sky-400 bg-sky-500/20 px-3 py-2"
                >
                  <Text className="text-xs font-bold text-sky-200">+15s</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
