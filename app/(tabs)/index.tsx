import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../../context/GymContext';
import { WorkoutTemplate } from '../../types/gym';
import GymTheme from '../../constants/theme';

export default function WorkoutsScreen() {
  const router = useRouter();
  const {
    templates,
    exercises,
    sessions,
    startWorkout,
    activeSession,
    deleteTemplate,
    lastBackupAt,
    exportBackup,
  } = useGym();

  // Backup reminder: show when there is data and no backup in the last 7 days
  const BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
  const daysSinceBackup = lastBackupAt
    ? Math.floor((Date.now() - lastBackupAt) / (24 * 60 * 60 * 1000))
    : null;
  const needsBackup =
    sessions.length > 0 && (!lastBackupAt || Date.now() - lastBackupAt > BACKUP_INTERVAL_MS);

  const handleQuickBackup = async () => {
    const ok = await exportBackup();
    if (!ok) {
      Alert.alert('Exportação', 'Não foi possível abrir a partilha de ficheiros.');
    }
  };

  const handleStartTemplate = (template: WorkoutTemplate) => {
    if (activeSession) {
      Alert.alert(
        'Treino já em curso',
        'Já tens um treino ativo. Queres descartá-lo para iniciar este novo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar Novo',
            style: 'destructive',
            onPress: () => {
              startWorkout(template);
              router.push('/active-workout');
            },
          },
        ]
      );
      return;
    }

    startWorkout(template);
    router.push('/active-workout');
  };

  const handleStartEmpty = () => {
    if (activeSession) {
      router.push('/active-workout');
      return;
    }
    startWorkout();
    router.push('/active-workout');
  };

  const confirmDeleteTemplate = (template: WorkoutTemplate) => {
    Alert.alert(
      'Eliminar Rotina',
      `Tens a certeza que desejas eliminar "${template.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteTemplate(template.id),
        },
      ]
    );
  };

  const openTemplateOptions = (template: WorkoutTemplate) => {
    Alert.alert(template.title, 'O que queres fazer com esta rotina?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => confirmDeleteTemplate(template),
      },
      {
        text: 'Editar',
        onPress: () => router.push({ pathname: '/new-routine', params: { id: template.id } }),
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      {/* Backup reminder */}
      {needsBackup && (
        <View style={styles.backupBanner}>
          <Ionicons name="cloud-upload-outline" size={22} color={GymTheme.colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.backupBannerTitle}>Faz uma cópia de segurança</Text>
            <Text style={styles.backupBannerSub}>
              {daysSinceBackup === null
                ? 'Ainda não exportaste nenhuma cópia. Os dados só existem neste telemóvel.'
                : `Última cópia há ${daysSinceBackup} dias. Guarda-a no Google Drive.`}
            </Text>
          </View>
          <TouchableOpacity style={styles.backupBannerBtn} onPress={handleQuickBackup}>
            <Text style={styles.backupBannerBtnText}>Exportar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Start Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Início Rápido</Text>
        <TouchableOpacity
          style={styles.emptyWorkoutBtn}
          onPress={handleStartEmpty}
          activeOpacity={0.8}>
          <View style={styles.emptyWorkoutLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="flash" size={22} color={GymTheme.colors.primary} />
            </View>
            <View>
              <Text style={styles.emptyWorkoutTitle}>Iniciar Treino Livre</Text>
              <Text style={styles.emptyWorkoutSub}>Sem rotina predefinida</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={20} color={GymTheme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Routines / Templates Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rotinas ({templates.length})</Text>
          <TouchableOpacity
            style={styles.addRoutineBtn}
            onPress={() => router.push('/new-routine')}
            activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={GymTheme.colors.primary} />
            <Text style={styles.addRoutineText}>Nova Rotina</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.templateList}>
          {templates.map((tpl) => {
            // Find exercise names for preview
            const exerciseNames = tpl.exerciseIds
              .map((id) => exercises.find((e) => e.id === id)?.name)
              .filter(Boolean);

            return (
              <View key={tpl.id} style={styles.templateCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{tpl.title}</Text>
                    {tpl.description ? (
                      <Text style={styles.cardDesc} numberOfLines={2}>
                        {tpl.description}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => openTemplateOptions(tpl)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={20}
                      color={GymTheme.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Exercises preview */}
                <View style={styles.exercisePreview}>
                  <Text style={styles.previewText} numberOfLines={2}>
                    {exerciseNames.length > 0
                      ? exerciseNames.join(' • ')
                      : 'Sem exercícios definidos'}
                  </Text>
                </View>

                {/* Target Muscles Pills */}
                <View style={styles.pillsRow}>
                  {tpl.targetMuscles.map((muscle) => (
                    <View key={muscle} style={styles.musclePill}>
                      <Text style={styles.musclePillText}>{muscle.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>

                {/* Start Button */}
                <TouchableOpacity
                  style={styles.startBtn}
                  onPress={() => handleStartTemplate(tpl)}
                  activeOpacity={0.8}>
                  <Ionicons name="play" size={16} color="#052e16" />
                  <Text style={styles.startBtnText}>Iniciar Treino</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GymTheme.colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 60,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  backupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: GymTheme.borderRadius.lg,
    padding: 12,
  },
  backupBannerTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  backupBannerSub: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  backupBannerBtn: {
    backgroundColor: GymTheme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.full,
  },
  backupBannerBtnText: {
    color: '#1c1917',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  addRoutineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: GymTheme.borderRadius.full,
  },
  addRoutineText: {
    color: GymTheme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GymTheme.colors.card,
    padding: 16,
    borderRadius: GymTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  emptyWorkoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWorkoutTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyWorkoutSub: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  templateList: {
    gap: 14,
  },
  templateCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  exercisePreview: {
    backgroundColor: GymTheme.colors.surface,
    padding: 10,
    borderRadius: GymTheme.borderRadius.md,
  },
  previewText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  musclePill: {
    backgroundColor: GymTheme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: GymTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  musclePillText: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GymTheme.colors.primary,
    paddingVertical: 12,
    borderRadius: GymTheme.borderRadius.lg,
    gap: 8,
  },
  startBtnText: {
    color: '#052e16',
    fontSize: 14,
    fontWeight: '700',
  },
});
