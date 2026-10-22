import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../context/GymContext';
import GymTheme from '../constants/theme';

export const ActiveWorkoutBanner: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { activeSession } = useGym();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!activeSession) return;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - activeSession.startTime) / 1000);
      setSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Don't show banner if already on active workout screen or no active session
  if (!activeSession || pathname === '/active-workout') {
    return null;
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <TouchableOpacity
      style={styles.banner}
      activeOpacity={0.85}
      onPress={() => router.push('/active-workout')}>
      <View style={styles.left}>
        <View style={styles.pulseDot} />
        <View>
          <Text style={styles.title} numberOfLines={1}>
            {activeSession.title}
          </Text>
          <Text style={styles.subtitle}>
            Em progresso • {timeFormatted} • {activeSession.exercises.length} exercícios
          </Text>
        </View>
      </View>

      <View style={styles.btn}>
        <Text style={styles.btnText}>Retomar</Text>
        <Ionicons name="chevron-forward" size={16} color={GymTheme.colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#0F261E',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GymTheme.colors.primary,
  },
  title: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: GymTheme.borderRadius.full,
  },
  btnText: {
    color: GymTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
