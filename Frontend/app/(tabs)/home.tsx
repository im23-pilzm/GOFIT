import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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

export default function HomeScreen() {
  const { session } = useAuth();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const topCardHeight = Math.max(120, Math.min(180, Math.round(screenHeight * 0.17)));
  const calendarHeight = Math.max(topCardHeight * 1.9, Math.min(320, Math.round(screenHeight * 0.34)));
  const statsHeight = Math.max(calendarHeight * 1.15, Math.min(420, Math.round(screenHeight * 0.42)));

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
    if (!session?.user?.id) {
      setWorkouts([]);
      setScheduledWorkouts([]);
      return;
    }

    const fetchData = async () => {
      setLoadingData(true);

      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('id, name, started_at')
        .eq('user_id', session.user.id)
        .order('started_at', { ascending: false })
        .limit(40);

      if (workoutError) {
        Alert.alert('Workouts not loaded', workoutError.message);
      } else {
        setWorkouts((workoutData ?? []) as Workout[]);
      }

      const monthStart = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1, 0, 0, 0);
      const monthEnd = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0, 23, 59, 59);

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('workout_schedule')
        .select('id, workout_id, workout_name, scheduled_for')
        .eq('user_id', session.user.id)
        .gte('scheduled_for', monthStart.toISOString())
        .lte('scheduled_for', monthEnd.toISOString())
        .order('scheduled_for', { ascending: true });

      if (scheduleError) {
        Alert.alert('Calendar not loaded', scheduleError.message);
      } else {
        setScheduledWorkouts((scheduleData ?? []) as ScheduledWorkout[]);
      }

      setLoadingData(false);
    };

    fetchData();
  }, [displayMonth, session?.user?.id]);

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
    if (!session?.user?.id) {
      Alert.alert('Not signed in', 'Please sign in first.');
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

    const { data, error } = await supabase
      .from('workout_schedule')
      .insert({
        user_id: session.user.id,
        workout_id: selectedWorkout.id,
        workout_name: selectedWorkout.name,
        scheduled_for: scheduledDate.toISOString(),
      })
      .select('id, workout_id, workout_name, scheduled_for')
      .single();

    setSavingSchedule(false);

    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }

    setScheduledWorkouts((previous) => {
      const next = [...previous, data as ScheduledWorkout];
      return next.sort(
        (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
      );
    });
    Alert.alert('Saved', 'Workout added to your calendar.');
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-slate-900"
        contentContainerClassName="px-4 pb-6"
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-3 flex-row">
          <View
            className="mr-3 flex-1 rounded-[18px] border border-slate-600 bg-slate-800 p-3.5"
            style={{ height: topCardHeight }}
          >
            <Text className="text-xl font-extrabold text-white">Workouts</Text>
            <Text className="mt-2 text-slate-300">{workouts.length} saved workouts</Text>
          </View>
          <View
            className="flex-1 rounded-[18px] border border-slate-600 bg-slate-800 p-3.5"
            style={{ height: topCardHeight }}
          >
            <Text className="text-xl font-extrabold text-white">Volumen</Text>
            <Text className="mt-2 text-slate-300">Coming soon</Text>
          </View>
        </View>

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
          style={{ height: statsHeight }}
        >
          <Text className="text-xl font-extrabold text-white">Statistik</Text>
        </View>
      </ScrollView>

      <Modal visible={calendarVisible} animationType="slide" transparent onRequestClose={closeCalendar}>
        <View className="flex-1 bg-black/60">
          <View className="mt-auto max-h-[88%] rounded-t-3xl border border-slate-700 bg-slate-900 px-4 pb-6 pt-4">
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
              <ScrollView showsVerticalScrollIndicator={false}>
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
                    disabled={savingSchedule || workouts.length === 0}
                    className={`rounded-lg px-4 py-3 ${
                      savingSchedule || workouts.length === 0 ? 'bg-slate-600' : 'bg-cyan-600'
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
      </Modal>
    </>
  );
}