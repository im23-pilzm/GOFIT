import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, View } from 'react-native';
import { useLanguage } from '@/hooks/useLanguage';

const ICONS: Record<string, number> = {
  home: require('../../assets/icons/home.png'),
  workouts: require('../../assets/icons/dumbbell 1.png'),
  profile: require('../../assets/icons/profile.png'),
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [barWidth, setBarWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const visibleRoutes = useMemo(
    () =>
      state.routes.filter((route) => {
        const hasTabIcon = Object.prototype.hasOwnProperty.call(ICONS, route.name);
        if (!hasTabIcon) {
          return false;
        }

        const { options } = descriptors[route.key];
        const routeOptions = options as { href?: string | null };
        return routeOptions.href !== null;
      }),
    [descriptors, state.routes]
  );

  const activeVisibleIndex = useMemo(() => {
    const currentRoute = state.routes[state.index];
    return visibleRoutes.findIndex((route) => route.key === currentRoute?.key);
  }, [state.index, state.routes, visibleRoutes]);

  const tabWidth = useMemo(() => {
    if (!barWidth || visibleRoutes.length === 0) {
      return 0;
    }
    return barWidth / visibleRoutes.length;
  }, [barWidth, visibleRoutes.length]);

  const activePillWidth = 56;

  useEffect(() => {
    if (!tabWidth) {
      return;
    }

    if (activeVisibleIndex < 0) {
      return;
    }

    const targetX = activeVisibleIndex * tabWidth + (tabWidth - activePillWidth) / 2;

    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: true,
      stiffness: 240,
      damping: 24,
      mass: 0.8,
    }).start();
  }, [activeVisibleIndex, tabWidth, translateX]);

  return (
    <View
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        height: 70,
        backgroundColor: '#0f172a',
        borderTopColor: '#334155',
        borderTopWidth: 1,
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      {tabWidth && activeVisibleIndex >= 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 13,
            left: 0,
            width: activePillWidth,
            height: 44,
            borderRadius: 14,
            backgroundColor: '#1e293b',
            borderWidth: 1,
            borderColor: '#334155',
            transform: [{ translateX }],
          }}
        />
      ) : null}

      {visibleRoutes.map((route) => {
        const { options } = descriptors[route.key];
        const isFocused = state.routes[state.index]?.key === route.key;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconSource = ICONS[route.name];
        const iconColor = isFocused ? '#e2e8f0' : '#94a3b8';

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Image source={iconSource} style={{ width: 24, height: 24, tintColor: iconColor }} resizeMode="contain" />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { language } = useLanguage();
  const homeTitle = language === 'de-CH' ? 'Start' : 'Home';
  const workoutsTitle = language === 'de-CH' ? 'Workouts' : 'Workouts';
  const profileTitle = language === 'de-CH' ? 'Profil' : 'Profile';

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: homeTitle,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: workoutsTitle,
        }}
      />
      <Tabs.Screen
        name="createWorkout"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: profileTitle,
        }}
      />
    </Tabs>
  );
}
