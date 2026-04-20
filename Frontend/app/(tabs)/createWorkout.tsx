import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

type ExerciseSelectionParams = {
	selectedExerciseId?: string;
	selectedExerciseName?: string;
	selectedToken?: string;
	draft?: string;
	workoutId?: string;
};

type EditableSet = {
	id: string;
	position: number;
	weightKg: number;
	reps: number;
	completed: boolean;
};

type EditableExercise = {
	id: string;
	name: string;
	position: number;
	restTimerSeconds: number;
	sets: EditableSet[];
};

type WorkoutDraft = {
	workoutName: string;
	exercises: EditableExercise[];
};

function createDefaultSet(position: number): EditableSet {
	return {
		id: `${Date.now()}-${Math.random()}`,
		position,
		weightKg: 20,
		reps: 10,
		completed: false,
	};
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

export default function CreateWorkoutScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const { session } = useAuth();
	const params = useLocalSearchParams<ExerciseSelectionParams>();

	const [workoutName, setWorkoutName] = useState('New Workout');
	const [exercises, setExercises] = useState<EditableExercise[]>([]);
	const [saving, setSaving] = useState(false);
	const [loadingWorkout, setLoadingWorkout] = useState(false);
	const [openPausePickerExerciseId, setOpenPausePickerExerciseId] = useState<string | null>(null);
	const lastAppliedDraftRef = useRef<string | undefined>(undefined);
	const lastHandledTokenRef = useRef<string | undefined>(undefined);
	const editingWorkoutId = typeof params.workoutId === 'string' ? params.workoutId : undefined;
	const selectedToken = typeof params.selectedToken === 'string' ? params.selectedToken : undefined;
	const selectedExerciseId =
		typeof params.selectedExerciseId === 'string' ? params.selectedExerciseId : undefined;
	const selectedExerciseName =
		typeof params.selectedExerciseName === 'string' ? params.selectedExerciseName : undefined;

	useEffect(() => {
		const draftRaw = typeof params.draft === 'string' ? params.draft : undefined;

		if (!draftRaw || draftRaw === lastAppliedDraftRef.current) {
			return;
		}

		try {
			const parsedDraft = JSON.parse(draftRaw) as WorkoutDraft;
			if (typeof parsedDraft.workoutName === 'string') {
				setWorkoutName(parsedDraft.workoutName);
			}

			if (Array.isArray(parsedDraft.exercises)) {
				setExercises(parsedDraft.exercises);
			}

			lastAppliedDraftRef.current = draftRaw;
		} catch {
			// Ignore malformed draft payload and keep local state.
		}
	}, [params.draft]);

	useEffect(() => {
		const hasDraft = typeof params.draft === 'string' && params.draft.length > 0;
		const hasSelectedPayload = Boolean(selectedToken && selectedExerciseId && selectedExerciseName);

		if (editingWorkoutId || hasDraft || hasSelectedPayload) {
			return;
		}

		setWorkoutName('New Workout');
		setExercises([]);
		setLoadingWorkout(false);
		lastAppliedDraftRef.current = undefined;
		lastHandledTokenRef.current = undefined;
	}, [editingWorkoutId, params.draft, selectedExerciseId, selectedExerciseName, selectedToken]);

	useEffect(() => {
		if (!editingWorkoutId || !session?.user?.id) {
			return;
		}

		if (typeof params.draft === 'string' && params.draft.length > 0) {
			return;
		}

		const loadWorkoutForEdit = async () => {
			setLoadingWorkout(true);

			const { data: workout, error: workoutError } = await supabase
				.from('workouts')
				.select('id, name')
				.eq('id', editingWorkoutId)
				.eq('user_id', session.user.id)
				.maybeSingle();

			if (workoutError || !workout) {
				setLoadingWorkout(false);
				Alert.alert('Load failed', workoutError?.message ?? 'Workout not found.');
				return;
			}

			const { data: workoutExerciseRows, error: workoutExerciseError } = await supabase
				.from('workout_exercise')
				.select('id, exercise_id, position, rest_timer_seconds, exercises(name), sets(id, position, weight_kg, reps, completed)')
				.eq('workout_id', editingWorkoutId)
				.order('position', { ascending: true });

			if (workoutExerciseError) {
				setLoadingWorkout(false);
				Alert.alert('Load failed', workoutExerciseError.message);
				return;
			}

			const mappedExercises: EditableExercise[] = ((workoutExerciseRows ?? []) as any[]).map((row, index) => {
				const rawSets = Array.isArray(row.sets) ? [...row.sets] : [];
				rawSets.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

				return {
					id: String(row.exercise_id),
					name: String(row.exercises?.name ?? 'Exercise'),
					position: Number(row.position ?? index + 1),
					restTimerSeconds: Number(row.rest_timer_seconds ?? 90),
					sets: rawSets.map((setRow: any, setIndex: number) => ({
						id: String(setRow.id ?? `${row.id}-${setIndex}`),
						position: Number(setRow.position ?? setIndex + 1),
						weightKg: Number(setRow.weight_kg ?? 0),
						reps: Number(setRow.reps ?? 0),
						completed: Boolean(setRow.completed),
					})),
				};
			});

			setWorkoutName(String(workout.name));
			setExercises(mappedExercises);
			setLoadingWorkout(false);
		};

		loadWorkoutForEdit();
	}, [editingWorkoutId, params.draft, session?.user?.id]);

	useEffect(() => {
		const token = selectedToken;

		if (!token || !selectedExerciseId || !selectedExerciseName) {
			return;
		}

		if (lastHandledTokenRef.current === token) {
			return;
		}

		lastHandledTokenRef.current = token;

		setExercises((previous) => {
			if (previous.some((exercise) => exercise.id === selectedExerciseId)) {
				return previous;
			}

			return [
				...previous,
				{
					id: selectedExerciseId,
					name: selectedExerciseName,
					position: previous.length + 1,
					restTimerSeconds: 90,
					sets: [createDefaultSet(1)],
				},
			];
		});
	}, [selectedExerciseId, selectedExerciseName, selectedToken]);

	const removeExercise = (exerciseId: string) => {
		setExercises((previous) =>
			previous
				.filter((exercise) => exercise.id !== exerciseId)
				.map((exercise, index) => ({
					...exercise,
					position: index + 1,
				}))
		);
	};

	const removeSetFromExercise = (exerciseId: string, setId: string) => {
		setExercises((previous) =>
			previous.map((exercise) => {
				if (exercise.id !== exerciseId) {
					return exercise;
				}

				const nextSets = exercise.sets
					.filter((setItem) => setItem.id !== setId)
					.map((setItem, index) => ({
						...setItem,
						position: index + 1,
					}));

				return {
					...exercise,
					sets: nextSets,
				};
			})
		);
	};

	const selectedExerciseIds = useMemo(() => exercises.map((exercise) => exercise.id), [exercises]);
	const pauseTimerOptions = useMemo(() => {
		const options: number[] = [];

		for (let seconds = 0; seconds <= 1800; seconds += 15) {
			options.push(seconds);
		}

		return options;
	}, []);

	const discardChanges = () => {
		router.replace('/(tabs)/workouts' as Href);
	};

	const openExerciseSelector = () => {
		const draftPayload = JSON.stringify({
			workoutName,
			exercises,
		});

		const selectedIdsParam = encodeURIComponent(selectedExerciseIds.join(','));
		const draftParam = encodeURIComponent(draftPayload);
		const workoutIdParam = editingWorkoutId ? `&workoutId=${encodeURIComponent(editingWorkoutId)}` : '';
		router.push((`/exercise-select?selectedIds=${selectedIdsParam}&draft=${draftParam}${workoutIdParam}` as Href));
	};

	const addSetToExercise = (exerciseId: string) => {
		setExercises((previous) =>
			previous.map((exercise) => {
				if (exercise.id !== exerciseId) {
					return exercise;
				}

				const newPosition = exercise.sets.length + 1;
				return {
					...exercise,
					sets: [...exercise.sets, createDefaultSet(newPosition)],
				};
			})
		);
	};

	const updateExercisePauseTimer = (exerciseId: string, nextSeconds: number) => {
		const normalized = Number.isFinite(nextSeconds) ? Math.max(0, Math.floor(nextSeconds)) : 0;

		setExercises((previous) =>
			previous.map((exercise) => {
				if (exercise.id !== exerciseId) {
					return exercise;
				}

				return {
					...exercise,
					restTimerSeconds: normalized,
				};
			})
		);
	};

	const saveWorkout = async () => {
		if (!session?.user?.id) {
			Alert.alert('Not signed in', 'Please log in again.');
			return;
		}

		const trimmedName = workoutName.trim();

		if (!trimmedName) {
			Alert.alert('Name required', 'Please enter a workout name.');
			return;
		}

		if (exercises.length === 0) {
			Alert.alert('Add exercise', 'Please add at least one exercise.');
			return;
		}

		setSaving(true);

		try {
			const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
			let workoutId = editingWorkoutId;

			if (workoutId) {
				const { data: updatedWorkout, error: updateWorkoutError } = await supabase
					.from('workouts')
					.update({
						name: trimmedName,
						total_sets: totalSets,
					})
					.eq('id', workoutId)
					.eq('user_id', session.user.id)
					.select('id')
					.maybeSingle();

				if (updateWorkoutError || !updatedWorkout) {
					throw new Error(updateWorkoutError?.message ?? 'Failed to update workout');
				}

				const { data: existingExerciseRows, error: existingExerciseRowsError } = await supabase
					.from('workout_exercise')
					.select('id')
					.eq('workout_id', workoutId);

				if (existingExerciseRowsError) {
					throw new Error(existingExerciseRowsError.message);
				}

				const existingWorkoutExerciseIds = (existingExerciseRows ?? []).map((row) => row.id);

				if (existingWorkoutExerciseIds.length > 0) {
					const { error: deleteSetsError } = await supabase
						.from('sets')
						.delete()
						.in('workout_exercise_id', existingWorkoutExerciseIds);

					if (deleteSetsError) {
						throw new Error(deleteSetsError.message);
					}
				}

				const { error: deleteWorkoutExerciseError } = await supabase
					.from('workout_exercise')
					.delete()
					.eq('workout_id', workoutId);

				if (deleteWorkoutExerciseError) {
					throw new Error(deleteWorkoutExerciseError.message);
				}
			} else {
				const { data: workout, error: workoutError } = await supabase
					.from('workouts')
					.insert({
						user_id: session.user.id,
						name: trimmedName,
						started_at: new Date().toISOString(),
						total_sets: totalSets,
					})
					.select('id')
					.single();

				if (workoutError || !workout) {
					throw new Error(workoutError?.message ?? 'Failed to create workout');
				}

				workoutId = workout.id;
			}

			for (const exercise of exercises) {
				const { data: workoutExercise, error: workoutExerciseError } = await supabase
					.from('workout_exercise')
					.insert({
						workout_id: workoutId,
						exercise_id: exercise.id,
						position: exercise.position,
						rest_timer_seconds: exercise.restTimerSeconds,
					})
					.select('id')
					.single();

				if (workoutExerciseError || !workoutExercise) {
					throw new Error(workoutExerciseError?.message ?? 'Failed to create workout exercise');
				}

				const setsPayload = exercise.sets.map((setItem, index) => ({
					workout_exercise_id: workoutExercise.id,
					position: index + 1,
					weight_kg: setItem.weightKg,
					reps: setItem.reps,
					completed: setItem.completed,
				}));

				const { error: setsError } = await supabase.from('sets').insert(setsPayload);

				if (setsError) {
					throw new Error(setsError.message);
				}
			}

			Alert.alert('Saved', editingWorkoutId ? 'Workout updated.' : 'New workout has been created.');
			router.replace('/(tabs)/workouts' as Href);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to save workout';
			Alert.alert('Save failed', message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<View className="flex-1 bg-slate-950">
			<ScrollView
				className="flex-1 px-5"
				contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				onScrollBeginDrag={() => setOpenPausePickerExerciseId(null)}
			>
				{loadingWorkout ? (
					<View className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
						<Text className="text-slate-300">Loading workout...</Text>
					</View>
				) : null}

				<View className="flex-row items-center justify-between gap-3">
					<Pressable
						onPress={discardChanges}
						className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
					>
						<Text className="text-center text-sm font-bold text-slate-200">Discard</Text>
					</Pressable>

					<Pressable
						onPress={saveWorkout}
						disabled={saving}
						className={`flex-1 rounded-xl px-4 py-3 ${saving ? 'bg-sky-300/60' : 'bg-sky-400'}`}
					>
						<Text className="text-center text-sm font-extrabold text-sky-950">{saving ? 'Saving...' : 'Save'}</Text>
					</Pressable>
				</View>

				<Text className="mt-6 text-3xl font-extrabold text-white">Create Workout</Text>
				<Text className="mt-2 text-slate-300">Build your workout by adding exercises and sets.</Text>

				<View className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
					<Text className="text-sm font-semibold uppercase tracking-wide text-slate-300">Workout name</Text>
					<TextInput
						value={workoutName}
						onChangeText={setWorkoutName}
						placeholder="e.g. Push Day"
						placeholderTextColor="#94a3b8"
						className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white"
					/>

					<Pressable
						onPress={openExerciseSelector}
						className="mt-4 rounded-xl border border-sky-400 bg-sky-400/20 px-4 py-3"
					>
						<Text className="text-center text-sm font-bold text-sky-200">Add New Exercise</Text>
					</Pressable>
				</View>

				{exercises.length === 0 ? (
					<View className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-4">
						<Text className="text-slate-400">No exercise selected yet.</Text>
					</View>
				) : null}

				{exercises.map((exercise, index) => (
					<View key={exercise.id} className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
						<View className="flex-row items-start justify-between">
							<View className="flex-1 pr-3">
								<Text className="text-xs uppercase tracking-wide text-slate-400">Exercise {index + 1}</Text>
								<Text className="mt-1 text-lg font-bold text-white">{exercise.name}</Text>
							</View>

							<Pressable
								onPress={() => removeExercise(exercise.id)}
								className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2"
							>
								<Text className="text-xs font-semibold text-rose-300">Delete exercise</Text>
							</Pressable>
						</View>

						<View className="mt-3">
							<Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pause Timer</Text>
							<Pressable
								onPress={() =>
									setOpenPausePickerExerciseId((current) => (current === exercise.id ? null : exercise.id))
								}
								className="mt-1 self-start"
							>
								<Text className="text-base font-bold text-sky-300">{formatPauseTimer(exercise.restTimerSeconds)}</Text>
							</Pressable>

							{openPausePickerExerciseId === exercise.id ? (
								<View className="mt-1.5 rounded-md bg-slate-900/60 p-1">
									<ScrollView className="max-h-32" showsVerticalScrollIndicator={false} nestedScrollEnabled>
										{pauseTimerOptions.map((seconds) => {
											const isActive = seconds === exercise.restTimerSeconds;

											return (
												<Pressable
													key={seconds}
													onPress={() => {
														updateExercisePauseTimer(exercise.id, seconds);
														setOpenPausePickerExerciseId(null);
													}}
													className={`rounded-md px-2.5 py-1.5 ${isActive ? 'bg-sky-500/20' : ''}`}
												>
													<Text className={`text-xs ${isActive ? 'font-bold text-sky-300' : 'text-slate-200'}`}>
														{formatPauseTimer(seconds)}
													</Text>
												</Pressable>
											);
										})}
									</ScrollView>
								</View>
							) : null}
						</View>

						<View className="mt-3 gap-2">
							<View className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
								<View className="flex-row border-b border-slate-800 pb-2">
									<Text className="w-12 text-xs font-bold uppercase text-slate-400">Set</Text>
									<Text className="flex-1 text-xs font-bold uppercase text-slate-400">Kg</Text>
									<Text className="flex-1 text-xs font-bold uppercase text-slate-400">Reps</Text>
									<Text className="flex-1 text-xs font-bold uppercase text-slate-400">Total</Text>
								</View>

								{exercise.sets.map((setItem, setIndex) => {
									const totalKg = setItem.weightKg * setItem.reps;

									return (
										<Swipeable
											key={setItem.id}
											renderRightActions={() => (
												<View className="ml-2 justify-center">
													<Pressable
														onPress={() => removeSetFromExercise(exercise.id, setItem.id)}
														className="h-full min-h-[44px] items-center justify-center rounded-lg bg-rose-500 px-3"
													>
														<Text className="text-xs font-bold text-rose-50">Delete</Text>
													</Pressable>
												</View>
											)}
										>
											<View
												className={`flex-row py-2 ${setIndex !== exercise.sets.length - 1 ? 'border-b border-slate-800' : ''}`}
											>
												<Text className="w-12 text-sm font-semibold text-slate-200">{setIndex + 1}</Text>
												<Text className="flex-1 text-sm text-slate-200">{setItem.weightKg}kg</Text>
												<Text className="flex-1 text-sm text-slate-200">{setItem.reps}</Text>
												<Text className="flex-1 text-sm text-slate-200">{totalKg}kg</Text>
											</View>
										</Swipeable>
									);
								})}
							</View>
						</View>

						<Pressable
							onPress={() => addSetToExercise(exercise.id)}
							className="mt-3 rounded-lg border border-emerald-500 px-3 py-2"
						>
							<Text className="text-center text-sm font-semibold text-emerald-300">Add New Set</Text>
						</Pressable>
					</View>
				))}
			</ScrollView>
		</View>
	);
}
