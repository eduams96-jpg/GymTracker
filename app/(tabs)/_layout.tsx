import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GymTheme from '../../constants/theme';
import { ActiveWorkoutBanner } from '../../components/ActiveWorkoutBanner';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: GymTheme.colors.background }}>
      <ActiveWorkoutBanner />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: GymTheme.colors.primary,
          tabBarInactiveTintColor: GymTheme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: GymTheme.colors.card,
            borderTopColor: GymTheme.colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: GymTheme.colors.background,
            borderBottomColor: GymTheme.colors.border,
            borderBottomWidth: 1,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            color: GymTheme.colors.textPrimary,
            fontSize: 18,
            fontWeight: '700',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Treinar',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'barbell' : 'barbell-outline'}
                size={22}
                color={color as string}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Histórico',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={22}
                color={color as string}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="exercises"
          options={{
            title: 'Exercícios',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'body' : 'body-outline'}
                size={22}
                color={color as string}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="body"
          options={{
            title: 'InBody',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'scale' : 'scale-outline'}
                size={22}
                color={color as string}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Progresso',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'stats-chart' : 'stats-chart-outline'}
                size={22}
                color={color as string}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
