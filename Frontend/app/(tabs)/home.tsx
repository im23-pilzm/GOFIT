import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const topCardHeight = Math.max(120, Math.min(180, Math.round(screenHeight * 0.17)));
  const calendarHeight = Math.max(topCardHeight * 1.9, Math.min(320, Math.round(screenHeight * 0.34)));
  const statsHeight = Math.max(calendarHeight * 1.15, Math.min(420, Math.round(screenHeight * 0.42)));

  return (
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
        </View>
        <View
          className="flex-1 rounded-[18px] border border-slate-600 bg-slate-800 p-3.5"
          style={{ height: topCardHeight }}
        >
          <Text className="text-xl font-extrabold text-white">Volumen</Text>
        </View>
      </View>

      <View
        className="mb-3 rounded-[18px] border border-slate-600 bg-slate-800 p-3.5"
        style={{ height: calendarHeight }}
      >
        <Text className="text-xl font-extrabold text-white">Kalender</Text>
      </View>

      <View
        className="rounded-[18px] border border-slate-600 bg-slate-800 p-3.5"
        style={{ height: statsHeight }}
      >
        <Text className="text-xl font-extrabold text-white">Statistik</Text>
      </View>
    </ScrollView>
  );
}