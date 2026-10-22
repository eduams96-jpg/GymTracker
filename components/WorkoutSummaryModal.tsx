import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutSession } from '../types/gym';
import GymTheme from '../constants/theme';

interface WorkoutSummaryModalProps {
  session: WorkoutSession | null;
  visible: boolean;
  onClose: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  session,
  visible,
  onClose,
}) => {
  if (!session) return null;

  const minutes = Math.floor(session.durationSeconds / 60);
  const seconds = session.durationSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Trophy badge */}
          <View style={styles.iconCircle}>
            <Ionicons name="trophy" size={38} color={GymTheme.colors.accent} />
          </View>

          <Text style={styles.congratsTitle}>Treino Concluído!</Text>
          <Text style={styles.sessionTitle}>{session.title}</Text>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color={GymTheme.colors.primary} />
              <Text style={styles.statValue}>{timeFormatted}</Text>
              <Text style={styles.statLabel}>Duração</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="barbell-outline" size={20} color={GymTheme.colors.info} />
              <Text style={styles.statValue}>{session.totalVolumeKg.toLocaleString()} kg</Text>
              <Text style={styles.statLabel}>Volume Total</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="checkmark-done" size={20} color={GymTheme.colors.primaryLight} />
              <Text style={styles.statValue}>{session.completedSetsCount}</Text>
              <Text style={styles.statLabel}>Séries Feitas</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="flame" size={20} color={GymTheme.colors.danger} />
              <Text style={styles.statValue}>
                {session.caloriesBurned ? `${session.caloriesBurned} kcal` : '—'}
              </Text>
              <Text style={styles.statLabel}>Calorias</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="trophy" size={20} color={GymTheme.colors.accent} />
              <Text style={styles.statValue}>{session.prCount}</Text>
              <Text style={styles.statLabel}>Novos PRs</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Excelente! Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: GymTheme.colors.cardElevated,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  congratsTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  sessionTitle: {
    color: GymTheme.colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: GymTheme.colors.surface,
    padding: 14,
    borderRadius: GymTheme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    gap: 4,
  },
  statValue: {
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  statLabel: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  doneBtn: {
    backgroundColor: GymTheme.colors.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: GymTheme.borderRadius.lg,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#052e16',
    fontSize: 16,
    fontWeight: '700',
  },
});
