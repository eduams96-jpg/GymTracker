import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../../context/GymContext';
import { describeStorageError } from '../../services/storage';
import { EditWorkoutModal } from '../../components/EditWorkoutModal';
import { WorkoutSession } from '../../types/gym';
import GymTheme from '../../constants/theme';

export default function HistoryScreen() {
  const router = useRouter();
  const {
    sessions,
    deleteSession,
    updateSession,
    startWorkoutFromSession,
    cancelWorkout,
    activeSession,
  } = useGym();
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedSessionId((prev) => (prev === id ? null : id));
  };

  const handleRepeatWorkout = (session: WorkoutSession) => {
    if (activeSession) {
      Alert.alert(
        'Treino Ativo em Curso',
        `Já tens o treino "${activeSession.title}" a decorrer. Desejas descartar o treino atual e repetir "${session.title}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Descartar & Repetir',
            style: 'destructive',
            onPress: () => {
              cancelWorkout();
              startWorkoutFromSession(session);
              router.push('/active-workout');
            },
          },
        ]
      );
    } else {
      startWorkoutFromSession(session);
      router.push('/active-workout');
    }
  };

  const confirmDelete = (session: WorkoutSession) => {
    Alert.alert(
      'Eliminar Treino',
      `Tens a certeza que desejas eliminar "${session.title}" do teu histórico?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(session.id);
            } catch (e) {
              Alert.alert('Erro', describeStorageError(e, 'Não foi possível eliminar o treino.'));
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('pt-PT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }: { item: WorkoutSession }) => {
          const isExpanded = expandedSessionId === item.id;

          return (
            <View style={styles.sessionCard}>
              <View style={styles.cardHeader}>
                <TouchableOpacity
                  onPress={() => toggleExpand(item.id)}
                  activeOpacity={0.8}
                  style={styles.headerLeft}>
                  <View style={styles.dateCircle}>
                    <Ionicons name="calendar-outline" size={16} color={GymTheme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.sessionDate}>{formatDate(item.startTime)}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.headerActions}>
                  <TouchableOpacity
                    onPress={() => setEditingSession(item)}
                    style={styles.editHeaderBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="pencil-outline" size={17} color={GymTheme.colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => confirmDelete(item)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={18} color={GymTheme.colors.danger} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => toggleExpand(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={GymTheme.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Metrics */}
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{formatDuration(item.durationSeconds)}</Text>
                  <Text style={styles.metricLbl}>Duração</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{item.totalVolumeKg.toLocaleString()} kg</Text>
                  <Text style={styles.metricLbl}>Volume</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>
                    {item.completedSetsCount ||
                      item.exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.completed).length, 0)}
                  </Text>
                  <Text style={styles.metricLbl}>Séries</Text>
                </View>

                {item.caloriesBurned ? (
                  <>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Ionicons name="flame" size={12} color={GymTheme.colors.danger} />
                        <Text style={[styles.metricVal, { color: GymTheme.colors.danger }]}>
                          {item.caloriesBurned}
                        </Text>
                      </View>
                      <Text style={styles.metricLbl}>kcal</Text>
                    </View>
                  </>
                ) : null}

                {item.prCount > 0 && (
                  <>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Ionicons name="trophy" size={12} color={GymTheme.colors.accent} />
                        <Text style={[styles.metricVal, { color: GymTheme.colors.accent }]}>
                          {item.prCount}
                        </Text>
                      </View>
                      <Text style={styles.metricLbl}>Recordes</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Card Actions: Repetir & Editar */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.repeatBtn}
                  onPress={() => handleRepeatWorkout(item)}
                  activeOpacity={0.85}>
                  <Ionicons name="repeat" size={15} color="#022c22" />
                  <Text style={styles.repeatBtnText}>Repetir Treino</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setEditingSession(item)}
                  activeOpacity={0.8}>
                  <Ionicons name="pencil" size={14} color={GymTheme.colors.textSecondary} />
                  <Text style={styles.editBtnText}>Editar</Text>
                </TouchableOpacity>
              </View>

              {/* Expanded details */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  <Text style={styles.exercisesHeading}>Exercícios Realizados:</Text>
                  {item.exercises.map((ex) => (
                    <View key={ex.id} style={styles.exerciseDetailCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.exerciseNameText}>{ex.exerciseName}</Text>
                        {ex.notes ? (
                          <Text style={styles.exerciseNoteText}>📝 {ex.notes}</Text>
                        ) : null}
                      </View>
                      <View style={styles.setsList}>
                        {ex.sets.map((s) => (
                          <View key={s.id} style={styles.setRowDetail}>
                            <Text style={styles.setNumText}>Série {s.setNumber}</Text>
                            <Text style={styles.setDetailText}>
                              {s.weightKg} kg × {s.reps} reps
                            </Text>
                            {s.completed ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={16}
                                color={GymTheme.colors.primary}
                              />
                            ) : (
                              <Text style={styles.incompletedText}>Incompleta</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={48} color={GymTheme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum treino registado</Text>
            <Text style={styles.emptySub}>
              Quando terminares o teu primeiro treino, o resumo detalhado aparecerá aqui.
            </Text>
          </View>
        }
      />

      {/* Edit Workout Modal */}
      <EditWorkoutModal
        visible={!!editingSession}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onSave={updateSession}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GymTheme.colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  sessionCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sessionDate: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  editHeaderBtn: {
    padding: 4,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  repeatBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: GymTheme.colors.primary,
    paddingVertical: 10,
    borderRadius: GymTheme.borderRadius.md,
  },
  repeatBtnText: {
    color: '#022c22',
    fontSize: 13,
    fontWeight: '800',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: GymTheme.colors.surface,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    paddingVertical: 10,
    borderRadius: GymTheme.borderRadius.md,
  },
  editBtnText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: GymTheme.colors.surface,
    borderRadius: GymTheme.borderRadius.md,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  metricLbl: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: GymTheme.colors.border,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: GymTheme.colors.border,
    gap: 12,
  },
  exercisesHeading: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  exerciseDetailCard: {
    backgroundColor: GymTheme.colors.surface,
    padding: 12,
    borderRadius: GymTheme.borderRadius.md,
    gap: 8,
  },
  exerciseNameText: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseNoteText: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  setsList: {
    gap: 4,
  },
  setRowDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  setNumText: {
    color: GymTheme.colors.textMuted,
    fontSize: 12,
    width: 60,
  },
  setDetailText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  incompletedText: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySub: {
    color: GymTheme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
