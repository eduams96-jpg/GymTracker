import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGym, useRestTimer } from '../context/GymContext';
import GymTheme from '../constants/theme';

export const RestTimerOverlay: React.FC = () => {
  const insets = useSafeAreaInsets();
  const restTimer = useRestTimer();
  const {
    adjustRestTimer,
    dismissRestTimer,
    isAudioMuted,
    toggleAudioMuted,
    activeSession,
  } = useGym();

  if (!restTimer.isActive) return null;

  const minutes = Math.floor(restTimer.remainingSeconds / 60);
  const seconds = restTimer.remainingSeconds % 60;
  const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const progressPercent = Math.min(
    100,
    Math.max(0, (restTimer.remainingSeconds / Math.max(restTimer.totalDuration, 1)) * 100)
  );

  const isLast3Seconds = restTimer.remainingSeconds > 0 && restTimer.remainingSeconds <= 3;
  const safeBottom = Math.max(insets.bottom, 24);
  const bottomOffset = activeSession ? safeBottom + 125 : safeBottom + 70;

  return (
    <View
      style={[
        styles.container,
        isLast3Seconds && styles.containerUrgent,
        { bottom: bottomOffset },
      ]}>
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={[styles.iconCircle, isLast3Seconds && styles.iconCircleUrgent]}>
            <Ionicons
              name={isLast3Seconds ? 'alarm' : 'timer-outline'}
              size={20}
              color={isLast3Seconds ? GymTheme.colors.primary : GymTheme.colors.accent}
            />
          </View>
          <View>
            <Text style={styles.title}>
              {isLast3Seconds ? `PREPARA-TE (${restTimer.remainingSeconds}s)` : 'Descanso'}
            </Text>
            <Text style={[styles.timerText, isLast3Seconds && styles.timerTextUrgent]}>
              {timeString}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {/* Mute/Sound Toggle */}
          <TouchableOpacity
            style={styles.soundBtn}
            onPress={toggleAudioMuted}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={isAudioMuted ? 'volume-mute' : 'volume-high'}
              size={18}
              color={isAudioMuted ? GymTheme.colors.textMuted : GymTheme.colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => adjustRestTimer(-15)}
            activeOpacity={0.7}>
            <Text style={styles.adjustBtnText}>-15s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => adjustRestTimer(30)}
            activeOpacity={0.7}>
            <Text style={styles.adjustBtnText}>+30s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={dismissRestTimer}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color={GymTheme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: GymTheme.colors.cardElevated,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 999,
  },
  containerUrgent: {
    borderColor: GymTheme.colors.primary,
    borderWidth: 1.5,
    shadowColor: GymTheme.colors.primary,
    shadowOpacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleUrgent: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  title: {
    color: GymTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerText: {
    color: GymTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerTextUrgent: {
    color: GymTheme.colors.primary,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  soundBtn: {
    padding: 6,
    backgroundColor: GymTheme.colors.surface,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtn: {
    backgroundColor: GymTheme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  adjustBtnText: {
    color: GymTheme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: GymTheme.colors.accent,
  },
});
