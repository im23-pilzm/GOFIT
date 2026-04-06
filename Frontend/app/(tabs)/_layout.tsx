import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, View } from 'react-native';

const ICONS: Record<string, number> = {
  home: require('../../assets/icons/home.png'),
  workouts: require('../../assets/icons/dumbbell 1.png'),
  profile: require('../../assets/icons/profile.png'),
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [barWidth, setBarWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const tabWidth = useMemo(() => {
    if (!barWidth || state.routes.length === 0) {
      return 0;
    }
    return barWidth / state.routes.length;
  }, [barWidth, state.routes.length]);

  const activePillWidth = 56;

  useEffect(() => {
    if (!tabWidth) {
      return;
    }

    const targetX = state.index * tabWidth + (tabWidth - activePillWidth) / 2;

    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: true,
      stiffness: 240,
      damping: 24,
      mass: 0.8,
    }).start();
  }, [state.index, tabWidth, translateX]);

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
      {tabWidth ? (
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

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

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
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
