import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type Workout = {
  id: string;
  name: string;
  started_at: string;
};

type ScheduledWorkout = {
  id: string;
  workout_id: string | null;
  workout_name: string;
  scheduled_for: string;
};

type MuscleSummary = {
  name: string;
  count: number;
};

type WorkoutStats = {
  totalWorkouts: number;
  totalVolumeKg: number;
  totalSets: number;
  averageDurationMinutes: number;
  mostTrainedMuscles: MuscleSummary[];
};

type WorkoutMuscleEntry = {
  role?: string | null;
  muscle_group?: {
    name?: string | null;
  } | null;
};

type WorkoutExerciseEntry = {
  id: string;
  exercise_id: string;
  exercises?: {
    name?: string | null;
    exercise_muscles?: WorkoutMuscleEntry[] | null;
  } | null;
};

type WorkoutRecord = Workout & {
  duration_seconds?: number | null;
  total_volume_kg?: number | null;
  total_sets?: number | null;
  workout_exercise?: WorkoutExerciseEntry[];
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function dayKey(year: number, monthIndex: number, day: number) {
  const month = String(monthIndex + 1).padStart(2, '0');
  const date = String(day).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function toDayKey(isoTimestamp: string) {
  const parsed = new Date(isoTimestamp);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(date: Date) {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(Math.round(value));
}

export default function HomeScreen() {
  const { session } = useAuth();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const calendarHeight = Math.max(260, Math.min(360, Math.round(screenHeight * 0.35)));
  const statsHeight = Math.max(340, Math.min(520, Math.round(screenHeight * 0.44)));

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [timeInput, setTimeInput] = useState('18:00');
  const [loadingData, setLoadingData] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const calendarScrollRef = useRef<ScrollView | null>(null);
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats>({
    totalWorkouts: 0,
    totalVolumeKg: 0,
    totalSets: 0,
    averageDurationMinutes: 0,
    mostTrainedMuscles: [],
  });

  const selectedDateKey = useMemo(() => {
    if (!selectedDay) {
      return '';
    }
    return dayKey(displayMonth.getFullYear(), displayMonth.getMonth(), selectedDay);
  }, [displayMonth, selectedDay]);

  const scheduleByDay = useMemo(() => {
    const grouped: Record<string, ScheduledWorkout[]> = {};

    for (const entry of scheduledWorkouts) {
      const key = toDayKey(entry.scheduled_for);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    }

    return grouped;
  }, [scheduledWorkouts]);

  const selectedDayEntries = selectedDateKey ? scheduleByDay[selectedDateKey] ?? [] : [];

  useEffect(() => {
    // Keep a valid default selection so users can add quickly from the calendar modal.
    if (workouts.length === 0) {
      if (selectedWorkoutId) {
        setSelectedWorkoutId('');
      }
      return;
    }

    const exists = workouts.some((workout) => workout.id === selectedWorkoutId);
    if (!exists) {
      setSelectedWorkoutId(workouts[0].id);
    }
  }, [workouts, selectedWorkoutId]);

  const upcomingSchedules = useMemo(() => {
    const now = Date.now();
    return [...scheduledWorkouts]
      .filter((entry) => new Date(entry.scheduled_for).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
      .slice(0, 3);
  }, [scheduledWorkouts]);

  const calendarCells = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();

    const cells: (number | null)[] = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [displayMonth]);

  useEffect(() => {
    if (!session?.user?.id || !session.access_token) {
      setWorkouts([]);
      setScheduledWorkouts([]);
      setWorkoutStats({
        totalWorkouts: 0,
        totalVolumeKg: 0,
        totalSets: 0,
        averageDurationMinutes: 0,
        mostTrainedMuscles: [],
      });
      return;
    }

    const fetchData = async () => {
      setLoadingData(true);

      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select(
          'id, name, started_at, duration_seconds, total_volume_kg, total_sets, workout_exercise(id, exercise_id, exercises(name, exercise_muscles(role, muscle_group(name))))'
        )
        .eq('user_id', session.user.id)
        .order('started_at', { ascending: false })
        .limit(40);

      if (workoutError) {
        Alert.alert('Workouts not loaded', workoutError.message);
      } else {
        const loadedWorkouts = (workoutData ?? []) as WorkoutRecord[];

        setWorkouts(loadedWorkouts);

        const muscleCounts = new Map<string, number>();
        let totalVolumeKg = 0;
        let totalSets = 0;
        let totalDurationSeconds = 0;
        let countedDurations = 0;

        for (const workout of loadedWorkouts) {
          totalVolumeKg += Number(workout.total_volume_kg ?? 0);
          totalSets += Number(workout.total_sets ?? 0);

          if (typeof workout.duration_seconds === 'number' && workout.duration_seconds > 0) {
            totalDurationSeconds += workout.duration_seconds;
            countedDurations += 1;
          }

          for (const workoutExercise of workout.workout_exercise ?? []) {
            for (const muscleEntry of workoutExercise.exercises?.exercise_muscles ?? []) {
              const muscleName = muscleEntry.muscle_group?.name?.trim();
              if (!muscleName) {
                continue;
              }

              muscleCounts.set(muscleName, (muscleCounts.get(muscleName) ?? 0) + 1);
            }
          }
        }

        const mostTrainedMuscles = [...muscleCounts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        setWorkoutStats({
          totalWorkouts: loadedWorkouts.length,
          totalVolumeKg,
          totalSets,
          averageDurationMinutes: countedDurations > 0 ? totalDurationSeconds / 60 / countedDurations : 0,
          mostTrainedMuscles,
        });
      }

      const monthStart = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1, 0, 0, 0);
      const monthEnd = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0, 23, 59, 59);

      try {
        const scheduleData = await apiRequest<ScheduledWorkout[]>(
          `/api/workout-schedule?from=${encodeURIComponent(monthStart.toISOString())}&to=${encodeURIComponent(monthEnd.toISOString())}`,
          { method: 'GET' },
          session.access_token
        );
        setScheduledWorkouts(scheduleData ?? []);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        Alert.alert('Calendar not loaded', message);
      }

      setLoadingData(false);
    };

    fetchData();
  }, [displayMonth, session?.access_token, session?.user?.id]);

  const openCalendar = () => {
    setCalendarVisible(true);
  };

  const closeCalendar = () => {
    setCalendarVisible(false);
  };

  const goToPreviousMonth = () => {
    const prev = new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1);
    setDisplayMonth(prev);
    setSelectedDay(1);
  };

  const goToNextMonth = () => {
    const next = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1);
    setDisplayMonth(next);
    setSelectedDay(1);
  };

  const addWorkoutToSelectedDay = async () => {
    if (!session?.user?.id || !session.access_token) {
      Alert.alert('Not signed in', 'Please sign in first.');
      return;
    }

    if (workouts.length === 0) {
      Alert.alert('No workouts available', 'Complete a workout first, then schedule it in the calendar.');
      return;
    }

    if (!selectedDay) {
      Alert.alert('Choose a day', 'Select a calendar day first.');
      return;
    }

    if (!selectedWorkoutId) {
      Alert.alert('Choose a workout', 'Select one of your workouts to schedule.');
      return;
    }

    const selectedWorkout = workouts.find((workout) => workout.id === selectedWorkoutId);
    if (!selectedWorkout) {
      Alert.alert('Workout missing', 'Please choose a valid workout.');
      return;
    }

    const normalizedTime = timeInput.trim() || '18:00';
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timePattern.test(normalizedTime)) {
      Alert.alert('Invalid time', 'Use HH:MM, for example 18:30.');
      return;
    }

    const [hours, minutes] = normalizedTime.split(':').map(Number);
    const scheduledDate = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
      selectedDay,
      hours,
      minutes,
      0
    );

    setSavingSchedule(true);

    try {
      const data = await apiRequest<ScheduledWorkout>(
        '/api/workout-schedule',
        {
          method: 'POST',
          body: JSON.stringify({
            workout_id: selectedWorkout.id,
            workout_name: selectedWorkout.name,
            scheduled_for: scheduledDate.toISOString(),
          }),
        },
        session.access_token
      );

      setScheduledWorkouts((previous) => {
        const next = [...previous, data];
        return next.sort(
          (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
        );
      });
      Alert.alert('Saved', 'Workout added to your calendar.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Could not save', message);
      return;
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleTimeInputFocus = () => {
    requestAnimationFrame(() => {
      calendarScrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-slate-900"
        contentContainerClassName="px-4 pb-6"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={openCalendar}
          className="mb-3 rounded-[18px] border border-slate-600 bg-slate-800 p-3.5"
          style={{ height: calendarHeight }}
        >
          <Text className="text-xl font-extrabold text-white">Kalender</Text>
          <Text className="mt-2 text-slate-300">Tap to open and schedule workouts</Text>
          <View className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            {upcomingSchedules.length === 0 ? (
              <Text className="text-slate-400">No upcoming workouts scheduled.</Text>
            ) : (
              upcomingSchedules.map((entry) => (
                <View key={entry.id} className="mb-2 last:mb-0">
                  <Text className="font-semibold text-white">{entry.workout_name}</Text>
                  <Text className="text-slate-400">{formatDateTime(new Date(entry.scheduled_for))}</Text>
                </View>
              ))
            )}
          </View>
        </Pressable>

        <View
          className="rounded-[18px] border border-slate-600 bg-slate-800 p-3.5"
          style={{ minHeight: statsHeight }}
        >
          <Text className="text-xl font-extrabold text-white">Statistik</Text>
          <Text className="mt-2 text-slate-300">A quick look at your training volume and muscle coverage.</Text>

          <View className="mt-4 flex-row flex-wrap justify-between">
            <View className="mb-3 w-[48%] rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
              <Text className="text-xs uppercase tracking-wide text-slate-400">Total workouts</Text>
              <Text className="mt-2 text-2xl font-extrabold text-white">{workoutStats.totalWorkouts}</Text>
            </View>
            <View className="mb-3 w-[48%] rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
              <Text className="text-xs uppercase tracking-wide text-slate-400">Total volume</Text>
              <Text className="mt-2 text-2xl font-extrabold text-white">{formatNumber(workoutStats.totalVolumeKg)} kg</Text>
            </View>
            <View className="mb-3 w-[48%] rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
              <Text className="text-xs uppercase tracking-wide text-slate-400">Total sets</Text>
              <Text className="mt-2 text-2xl font-extrabold text-white">{formatNumber(workoutStats.totalSets)}</Text>
            </View>
            <View className="mb-3 w-[48%] rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
              <Text className="text-xs uppercase tracking-wide text-slate-400">Avg duration</Text>
              <Text className="mt-2 text-2xl font-extrabold text-white">
                {workoutStats.averageDurationMinutes > 0 ? `${Math.round(workoutStats.averageDurationMinutes)} min` : '--'}
              </Text>
            </View>
          </View>

          <View className="mt-1 rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
            <Text className="text-base font-bold text-white">Muscles trained most</Text>
            {workoutStats.mostTrainedMuscles.length === 0 ? (
              <Text className="mt-2 text-slate-400">No muscle data yet. Once workouts include exercises, this will show your top trained muscle groups.</Text>
            ) : (
              <View className="mt-3 gap-2">
                {workoutStats.mostTrainedMuscles.map((muscle) => (
                  <View key={muscle.name} className="flex-row items-center justify-between rounded-xl bg-slate-800 px-3 py-2">
                    <Text className="font-semibold text-white">{muscle.name}</Text>
                    <Text className="text-slate-300">{muscle.count} exercises</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={calendarVisible}
        animationType="slide"
        transparent={false}
        presentationStyle="fullScreen"
        onRequestClose={closeCalendar}
      >
        <KeyboardAvoidingView
          className="flex-1"
          style={{ flex: 1, backgroundColor: '#0f172a' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 12 : 0}
        >
          <View className="flex-1 bg-slate-900">
            <View
              className="flex-1 bg-slate-900 px-4"
              style={{
                paddingTop: Math.max(insets.top + 8, 16),
                paddingBottom: Math.max(insets.bottom, 16),
              }}
            >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xl font-extrabold text-white">Workout Calendar</Text>
              <TouchableOpacity onPress={closeCalendar} className="rounded-lg bg-slate-800 px-3 py-2">
                <Text className="font-semibold text-white">Close</Text>
              </TouchableOpacity>
            </View>

            <View className="mb-3 flex-row items-center justify-between rounded-xl bg-slate-800 px-3 py-2">
              <TouchableOpacity onPress={goToPreviousMonth}>
                <Text className="text-lg font-bold text-white">{'<'}</Text>
              </TouchableOpacity>
              <Text className="text-base font-bold text-white">{monthLabel(displayMonth)}</Text>
              <TouchableOpacity onPress={goToNextMonth}>
                <Text className="text-lg font-bold text-white">{'>'}</Text>
              </TouchableOpacity>
            </View>

            {loadingData ? (
              <View className="items-center py-8">
                <ActivityIndicator color="#94a3b8" />
                <Text className="mt-2 text-slate-300">Loading calendar data...</Text>
              </View>
            ) : (
              <ScrollView
                ref={calendarScrollRef}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 24) }}
              >
                <View className="mb-2 flex-row justify-between">
                  {WEEKDAY_LABELS.map((label) => (
                    <Text key={label} className="w-[13.5%] text-center text-xs font-semibold text-slate-400">
                      {label}
                    </Text>
                  ))}
                </View>

                <View className="mb-4 flex-row flex-wrap justify-between">
                  {calendarCells.map((day, index) => {
                    if (!day) {
                      return <View key={`empty-${index}`} className="mb-2 h-12 w-[13.5%]" />;
                    }

                    const key = dayKey(displayMonth.getFullYear(), displayMonth.getMonth(), day);
                    const count = scheduleByDay[key]?.length ?? 0;
                    const isSelected = selectedDay === day;

                    return (
                      <TouchableOpacity
                        key={`day-${day}`}
                        className={`mb-2 h-12 w-[13.5%] items-center justify-center rounded-lg border ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500/20'
                            : 'border-slate-700 bg-slate-800'
                        }`}
                        onPress={() => setSelectedDay(day)}
                      >
                        <Text className={`font-bold ${isSelected ? 'text-cyan-200' : 'text-white'}`}>
                          {day}
                        </Text>
                        {count > 0 ? <View className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View className="mb-3 rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <Text className="mb-2 text-base font-bold text-white">Selected day workouts</Text>
                  {selectedDayEntries.length === 0 ? (
                    <Text className="text-slate-400">No workouts scheduled for this day.</Text>
                  ) : (
                    selectedDayEntries.map((entry) => (
                      <View key={entry.id} className="mb-2 last:mb-0">
                        <Text className="font-semibold text-white">{entry.workout_name}</Text>
                        <Text className="text-slate-400">{formatDateTime(new Date(entry.scheduled_for))}</Text>
                      </View>
                    ))
                  )}
                </View>

                <View className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <Text className="mb-2 text-base font-bold text-white">Add workout to selected day</Text>

                  <Text className="mb-1 text-sm text-slate-300">Optional time (HH:MM)</Text>
                  <TextInput
                    value={timeInput}
                    onChangeText={setTimeInput}
                    onFocus={handleTimeInputFocus}
                    placeholder="18:00"
                    placeholderTextColor="#64748b"
                    className="mb-3 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
                    autoCapitalize="none"
                  />

                  <Text className="mb-2 text-sm text-slate-300">Choose workout</Text>
                  {workouts.length === 0 ? (
                    <Text className="mb-3 text-slate-400">
                      You do not have workouts yet. Complete a workout first, then schedule it here.
                    </Text>
                  ) : (
                    <View className="mb-3 max-h-44 rounded-lg border border-slate-700 bg-slate-900 p-2">
                      <ScrollView nestedScrollEnabled>
                        {workouts.map((workout) => {
                          const active = selectedWorkoutId === workout.id;
                          return (
                            <TouchableOpacity
                              key={workout.id}
                              onPress={() => setSelectedWorkoutId(workout.id)}
                              className={`mb-2 rounded-lg border px-3 py-2 ${
                                active
                                  ? 'border-cyan-400 bg-cyan-500/20'
                                  : 'border-slate-700 bg-slate-800/80'
                              }`}
                            >
                              <Text className={`font-semibold ${active ? 'text-cyan-200' : 'text-white'}`}>
                                {workout.name}
                              </Text>
                              <Text className="text-xs text-slate-400">
                                Last done {new Date(workout.started_at).toLocaleDateString()}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={addWorkoutToSelectedDay}
                    disabled={savingSchedule}
                    className={`rounded-lg px-4 py-3 ${
                      savingSchedule ? 'bg-slate-600' : 'bg-cyan-600'
                    }`}
                  >
                    <Text className="text-center font-extrabold text-white">
                      {savingSchedule ? 'Saving...' : 'Add Workout'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}