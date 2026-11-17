import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../../context/GymContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageService, describeStorageError } from '../../services/storage';
import { ExerciseProgressionChart } from '../../components/ExerciseProgressionChart';
import { OneRepMaxCalculatorModal } from '../../components/OneRepMaxCalculatorModal';
import { PlateCalculatorModal } from '../../components/PlateCalculatorModal';
import GymTheme from '../../constants/theme';

export default function StatsScreen() {
  const {
    sessions,
    personalRecords,
    exportBackup,
    restoreBackup,
    markBackupSaved,
    resetAllData,
  } = useGym();

  const [is1RMModalOpen, setIs1RMModalOpen] = useState(false);
  const [isPlateModalOpen, setIsPlateModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');

  const totalWorkouts = sessions.length;
  const totalVolumeKg = sessions.reduce((acc, s) => acc + s.totalVolumeKg, 0);
  const totalVolumeTonnes = (totalVolumeKg / 1000).toFixed(1);
  const totalDurationSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalHours = (totalDurationSeconds / 3600).toFixed(1);
  const totalCaloriesBurned = sessions.reduce((acc, s) => acc + (s.caloriesBurned || 0), 0);

  // Calculate workouts in last 7 days
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const workoutsThisWeek = sessions.filter((s) => s.startTime >= sevenDaysAgo).length;

  // Streak & last 14 days calendar
  const workoutDaysSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      const d = new Date(s.startTime);
      set.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      );
    }
    return set;
  }, [sessions]);

  const last14Days = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayLabel = d.toLocaleDateString('pt-PT', { weekday: 'narrow' }).toUpperCase();
      const dateNum = d.getDate();
      days.push({
        key,
        dayLabel,
        dateNum,
        isToday: i === 0,
        hasWorkout: workoutDaysSet.has(key),
      });
    }
    return days;
  }, [workoutDaysSet]);

  const workoutsIn14Days = useMemo(
    () => last14Days.filter((d) => d.hasWorkout).length,
    [last14Days]
  );

  // Consecutive days streak (either ending today or yesterday)
  const currentStreak = useMemo(() => {
    let count = 0;
    const checkDate = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayKey = `${checkDate.getFullYear()}-${pad(checkDate.getMonth() + 1)}-${pad(checkDate.getDate())}`;

    // If no workout today, check if yesterday had one to maintain streak
    if (!workoutDaysSet.has(todayKey)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const key = `${checkDate.getFullYear()}-${pad(checkDate.getMonth() + 1)}-${pad(checkDate.getDate())}`;
      if (workoutDaysSet.has(key)) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [workoutDaysSet]);

  // Volume Semanal por Grupo Muscular (apenas séries de trabalho)
  const weeklyMuscleSets = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    const recent = sessions.filter((s) => s.startTime >= cutoff);
    const counts: Record<string, number> = {
      peito: 0,
      costas: 0,
      pernas: 0,
      ombros: 0,
      biceps: 0,
      triceps: 0,
      abdominais: 0,
    };

    for (const s of recent) {
      for (const ex of s.exercises) {
        const completed = ex.sets.filter(
          (st) => st.completed && st.type !== 'warmup' && st.reps > 0
        ).length;
        if (counts[ex.muscleGroup] !== undefined) {
          counts[ex.muscleGroup] += completed;
        }
      }
    }

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [sessions]);

  const prList = Object.values(personalRecords).sort((a, b) => b.maxWeightKg - a.maxWeightKg);
  const topExercisePR = prList[0];

  const topExerciseHistory = topExercisePR
    ? StorageService.getExerciseHistory(sessions, topExercisePR.exerciseId)
    : [];

  const handleResetData = () => {
    Alert.alert(
      '⚠️ Repor Todos os Dados',
      'Tens a certeza absoluta? Esta ação apagará todo o histórico de treinos, avaliações corporais e recordes para começares com a app totalmente limpa.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Repor Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAllData();
              Alert.alert('Dados Repostos', 'A aplicação foi reiniciada com sucesso.');
            } catch (e) {
              Alert.alert('Erro', describeStorageError(e, 'Não foi possível repor os dados.'));
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const result = await exportBackup();
      if (result.shared) {
        const photoNote =
          result.photosMissing > 0
            ? `

⚠️ ${result.photosMissing} foto(s) não foram incluídas porque o ficheiro já não existe no telemóvel.`
            : '';
        Alert.alert(
          'Cópia de Segurança',
          `A cópia inclui ${result.photosIncluded} foto(s). A janela de partilha foi aberta. Conseguiste guardar o ficheiro com sucesso?${photoNote}`,
          [
            { text: 'Ainda não', style: 'cancel' },
            {
              text: 'Sim, guardei',
              onPress: async () => {
                await markBackupSaved();
                Alert.alert('Sucesso', 'Data da última cópia de segurança registada!');
              },
            },
          ]
        );
      } else {
        Alert.alert('Exportação', 'Não foi possível aceder à partilha de ficheiros.');
      }
    } catch (e) {
      Alert.alert('Erro', describeStorageError(e, 'Ocorreu um erro ao exportar o backup.'));
    }
  };

  /** Valida o backup, mostra o resumo e só restaura após confirmação. */
  const confirmAndRestore = (raw: string) => {
    const preview = StorageService.previewBackup(raw);
    if (!preview) {
      Alert.alert(
        'Erro',
        'O ficheiro não tem um formato de backup válido ou está corrompido. Os dados atuais não foram alterados.'
      );
      return;
    }

    const exportDateStr = preview.exportedAt
      ? new Date(preview.exportedAt).toLocaleDateString('pt-PT')
      : 'Desconhecida';
    const photoLine =
      preview.photoFiles > 0 || preview.progressPhotos === 0
        ? `${preview.progressPhotos} fotos (${preview.photoFiles} com ficheiro)`
        : `${preview.progressPhotos} fotos (cópia antiga: sem ficheiros de imagem)`;

    Alert.alert(
      'Restaurar Cópia de Segurança',
      `Esta cópia contém:
• ${preview.sessions} treinos
• ${preview.templates} rotinas
• ${preview.exercises} exercícios
• ${preview.bodyMetrics} avaliações corporais
• ${photoLine}
Exportada a: ${exportDateStr}

⚠️ Atenção: Todos os dados atuais serão substituídos por esta cópia. Desejas avançar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Restaurar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await restoreBackup(raw);
              const dropped =
                result.photosDropped > 0
                  ? `

${result.photosDropped} foto(s) de uma cópia antiga não foram restauradas porque os ficheiros não existem neste telemóvel.`
                  : '';
              Alert.alert(
                'Sucesso',
                `Cópia de segurança restaurada com sucesso! ${result.photosRestored} foto(s) recuperadas.${dropped}`
              );
              setIsRestoreModalOpen(false);
              setRestoreJsonInput('');
            } catch (e) {
              Alert.alert('Erro', describeStorageError(e, 'Não foi possível restaurar os dados.'));
            }
          },
        },
      ]
    );
  };

  const handleRestore = () => {
    const raw = restoreJsonInput.trim();
    if (!raw) {
      Alert.alert('Aviso', 'Escolhe o ficheiro de backup ou cola o conteúdo JSON.');
      return;
    }
    confirmAndRestore(raw);
  };

  const handlePickBackupFile = async () => {
    let cachedUri: string | null = null;
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      cachedUri = picked.assets[0].uri;
      const raw = await FileSystem.readAsStringAsync(cachedUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      confirmAndRestore(raw);
    } catch (e) {
      console.error('Error reading backup file:', e);
      Alert.alert('Erro', 'Não foi possível ler o ficheiro escolhido.');
    } finally {
      // A cópia temporária pode conter fotos e dados de saúde
      if (cachedUri) FileSystem.deleteAsync(cachedUri, { idempotent: true }).catch(() => {});
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      {/* Overview Metric Cards */}
      <View style={styles.grid}>
        <View style={styles.statCard}>
          <View style={styles.cardIconBox}>
            <Ionicons name="barbell" size={20} color={GymTheme.colors.primary} />
          </View>
          <Text style={styles.statNumber}>{totalWorkouts}</Text>
          <Text style={styles.statTitle}>Treinos Realizados</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.cardIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Ionicons name="scale" size={20} color={GymTheme.colors.info} />
          </View>
          <Text style={styles.statNumber}>{totalVolumeTonnes} t</Text>
          <Text style={styles.statTitle}>Volume Total Levantado</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.cardIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Ionicons name="time" size={20} color={GymTheme.colors.accent} />
          </View>
          <Text style={styles.statNumber}>{totalHours} h</Text>
          <Text style={styles.statTitle}>Tempo no Ginásio</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Ionicons name="flame" size={20} color={GymTheme.colors.danger} />
          </View>
          <Text style={styles.statNumber}>{totalCaloriesBurned.toLocaleString()}</Text>
          <Text style={styles.statTitle}>Calorias Queimadas (kcal)</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="calendar" size={20} color={GymTheme.colors.primary} />
          </View>
          <Text style={styles.statNumber}>{workoutsThisWeek}</Text>
          <Text style={styles.statTitle}>Esta Semana</Text>
        </View>
      </View>

      {/* Streak / Frequency: Last 14 Days */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="flame" size={20} color={GymTheme.colors.accent} />
            <Text style={styles.sectionTitle}>Atividade Recente (14 Dias)</Text>
          </View>
          <Text style={styles.prCount}>
            {currentStreak > 1 ? `🔥 ${currentStreak}d seguidos • ` : ''}
            {workoutsIn14Days} de 14 dias
          </Text>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.daysRow}>
            {last14Days.map((day) => (
              <View key={day.key} style={styles.dayCol}>
                <Text style={styles.dayLabelText}>{day.dayLabel}</Text>
                <View
                  style={[
                    styles.dayCircle,
                    day.hasWorkout && styles.dayCircleActive,
                    day.isToday && styles.dayCircleToday,
                  ]}>
                  {day.hasWorkout ? (
                    <Ionicons name="checkmark" size={12} color="#052e16" />
                  ) : (
                    <Text
                      style={[
                        styles.dayNumText,
                        day.isToday && { color: GymTheme.colors.accent },
                      ]}>
                      {day.dateNum}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Weekly Muscle Volume */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="pie-chart" size={19} color={GymTheme.colors.primary} />
            <Text style={styles.sectionTitle}>Volume Semanal por Músculo</Text>
          </View>
          <Text style={styles.prCount}>Últimos 7 dias</Text>
        </View>

        <View style={styles.muscleVolumeCard}>
          {weeklyMuscleSets.length === 0 || weeklyMuscleSets.every(([_, c]) => c === 0) ? (
            <Text style={styles.emptyMuscleText}>
              Ainda não registaste treinos nesta semana. Completa séries para ver o balanço muscular!
            </Text>
          ) : (
            weeklyMuscleSets
              .filter(([_, count]) => count > 0)
              .map(([muscle, count]) => {
                const maxCount = Math.max(...weeklyMuscleSets.map(([_, c]) => c), 1);
                const progressWidth = Math.min(100, Math.round((count / maxCount) * 100));

                return (
                  <View key={muscle} style={styles.muscleRow}>
                    <View style={styles.muscleRowHeader}>
                      <Text style={styles.muscleNameText}>{muscle.toUpperCase()}</Text>
                      <Text style={styles.muscleSetsText}>{count} séries</Text>
                    </View>
                    <View style={styles.muscleBarBg}>
                      <View style={[styles.muscleBarFill, { width: `${progressWidth}%` }]} />
                    </View>
                  </View>
                );
              })
          )}
        </View>
      </View>

      {/* Tools Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ferramentas de Treino</Text>
        <TouchableOpacity
          style={styles.toolCard}
          onPress={() => setIs1RMModalOpen(true)}
          activeOpacity={0.8}>
          <View style={styles.toolLeft}>
            <View style={styles.toolIconCircle}>
              <Ionicons name="calculator" size={22} color={GymTheme.colors.accent} />
            </View>
            <View>
              <Text style={styles.toolTitle}>Calculadora de 1RM</Text>
              <Text style={styles.toolSub}>Tabela de percentagens & zonas de hipertrofia</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={GymTheme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolCard, { marginTop: 10 }]}
          onPress={() => setIsPlateModalOpen(true)}
          activeOpacity={0.8}>
          <View style={styles.toolLeft}>
            <View style={[styles.toolIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="barbell" size={22} color={GymTheme.colors.info} />
            </View>
            <View>
              <Text style={styles.toolTitle}>Calculadora de Discos</Text>
              <Text style={styles.toolSub}>Distribuição exata de anilhas na barra por cada lado</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={GymTheme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Featured Exercise Progression */}
      {topExercisePR && topExerciseHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destaque de Progressão ({topExercisePR.exerciseName})</Text>
          <ExerciseProgressionChart history={topExerciseHistory} />
        </View>
      )}

      {/* PR / Records Leaderboard */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="trophy" size={20} color={GymTheme.colors.accent} />
            <Text style={styles.sectionTitle}>Quadro de Recordes (PRs)</Text>
          </View>
          <Text style={styles.prCount}>{prList.length} recordes</Text>
        </View>

        {prList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Ainda não tens recordes guardados. Completa séries de exercícios para registrar os teus máximos!
            </Text>
          </View>
        ) : (
          <View style={styles.prList}>
            {prList.map((pr, index) => {
              const formattedDate = new Date(pr.bestDate).toLocaleDateString('pt-PT', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <View key={pr.exerciseId} style={styles.prRow}>
                  <View style={styles.prRank}>
                    <Text style={styles.prRankText}>#{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prExerciseName}>{pr.exerciseName}</Text>
                    <Text style={styles.prSubDate}>
                      {formattedDate} • 1RM est: ~{pr.estimated1RM} kg
                    </Text>
                  </View>
                  <View style={styles.prValues}>
                    <Text style={styles.prWeight}>{pr.maxWeightKg} kg</Text>
                    <Text style={styles.prReps}>× {pr.bestReps} reps</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Backup & Data Management (Android Specific) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cópia de Segurança & Dados (Android)</Text>
        <Text style={styles.backupSub}>
          Os teus dados são guardados localmente no telemóvel. Exporta cópias regulares para o Google Drive ou ficheiros.
        </Text>

        <View style={styles.backupActions}>
          <TouchableOpacity
            style={styles.backupBtn}
            onPress={handleExport}
            activeOpacity={0.8}>
            <Ionicons name="share-outline" size={18} color="#052e16" />
            <Text style={styles.backupBtnText}>Exportar Cópia (JSON)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={() => setIsRestoreModalOpen(true)}
            activeOpacity={0.8}>
            <Ionicons name="download-outline" size={18} color={GymTheme.colors.textPrimary} />
            <Text style={styles.restoreBtnText}>Restaurar Cópia</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Danger Zone: Reset All Data */}
      <View style={styles.dangerSection}>
        <View style={styles.dangerHeader}>
          <Ionicons name="warning-outline" size={20} color={GymTheme.colors.danger} />
          <Text style={styles.dangerTitle}>Zona de Perigo / Repor Dados</Text>
        </View>
        <Text style={styles.dangerSub}>
          Queres começar do zero? Esta opção apaga todos os treinos registados, avaliações corporais e recordes pessoais.
        </Text>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={handleResetData}
          activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.resetBtnText}>Repor Todos os Dados da App</Text>
        </TouchableOpacity>
      </View>

      {/* 1RM Calculator Modal */}
      <OneRepMaxCalculatorModal
        visible={is1RMModalOpen}
        onClose={() => setIs1RMModalOpen(false)}
      />

      {/* Plate Calculator Modal */}
      <PlateCalculatorModal
        visible={isPlateModalOpen}
        onClose={() => setIsPlateModalOpen(false)}
      />

      {/* Restore Backup Modal */}
      <Modal
        visible={isRestoreModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRestoreModalOpen(false)}>
        <View style={styles.restoreOverlay}>
          <View style={styles.restoreCard}>
            <Text style={styles.restoreTitle}>Restaurar Cópia de Segurança</Text>
            <Text style={styles.restoreSub}>
              Escolhe o ficheiro de backup (inclui as fotos de progresso) ou, para cópias antigas, cola o conteúdo JSON abaixo.
            </Text>

            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handlePickBackupFile}
              activeOpacity={0.8}>
              <Ionicons name="document-outline" size={18} color={GymTheme.colors.textPrimary} />
              <Text style={styles.restoreBtnText}>Escolher Ficheiro de Backup</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.restoreInput}
              placeholder='{"version": 1, "exercises": ...}'
              placeholderTextColor={GymTheme.colors.textMuted}
              value={restoreJsonInput}
              onChangeText={setRestoreJsonInput}
              multiline
            />

            <View style={styles.restoreModalActions}>
              <TouchableOpacity
                style={styles.restoreCancelBtn}
                onPress={() => setIsRestoreModalOpen(false)}>
                <Text style={styles.restoreCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.restoreConfirmBtn}
                onPress={handleRestore}>
                <Text style={styles.restoreConfirmText}>Restaurar Dados</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 40,
    gap: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 6,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNumber: {
    color: GymTheme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  statTitle: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  calendarCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabelText: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  dayCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GymTheme.colors.surface,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: GymTheme.colors.primary,
    borderColor: GymTheme.colors.primary,
  },
  dayCircleToday: {
    borderColor: GymTheme.colors.accent,
    borderWidth: 1.5,
  },
  dayNumText: {
    color: GymTheme.colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },
  muscleVolumeCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 12,
  },
  emptyMuscleText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  muscleRow: {
    gap: 5,
  },
  muscleRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleNameText: {
    color: GymTheme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  muscleSetsText: {
    color: GymTheme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  muscleBarBg: {
    height: 8,
    backgroundColor: GymTheme.colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  muscleBarFill: {
    height: '100%',
    backgroundColor: GymTheme.colors.primary,
    borderRadius: 4,
  },
  prCount: {
    color: GymTheme.colors.textMuted,
    fontSize: 13,
  },
  prList: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    overflow: 'hidden',
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
    gap: 12,
  },
  prRank: {
    width: 30,
    alignItems: 'center',
  },
  prRankText: {
    color: GymTheme.colors.accent,
    fontWeight: '800',
    fontSize: 13,
  },
  prExerciseName: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  prSubDate: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  prValues: {
    alignItems: 'flex-end',
  },
  prWeight: {
    color: GymTheme.colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  prReps: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
  },
  emptyBox: {
    backgroundColor: GymTheme.colors.card,
    padding: 20,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  emptyText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  toolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  toolSub: {
    color: GymTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  backupSub: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GymTheme.colors.primary,
    paddingVertical: 12,
    borderRadius: GymTheme.borderRadius.lg,
    gap: 6,
  },
  backupBtnText: {
    color: '#052e16',
    fontWeight: '700',
    fontSize: 13,
  },
  restoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GymTheme.colors.surface,
    paddingVertical: 12,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    gap: 6,
  },
  restoreBtnText: {
    color: GymTheme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  restoreOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  restoreCard: {
    backgroundColor: GymTheme.colors.cardElevated,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 12,
  },
  restoreTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  restoreSub: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  restoreInput: {
    backgroundColor: GymTheme.colors.inputBackground,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    borderRadius: GymTheme.borderRadius.md,
    color: GymTheme.colors.textPrimary,
    padding: 12,
    fontSize: 13,
    height: 120,
    textAlignVertical: 'top',
  },
  restoreModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  restoreCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  restoreCancelText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 14,
  },
  restoreConfirmBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.md,
  },
  restoreConfirmText: {
    color: '#052e16',
    fontSize: 14,
    fontWeight: '700',
  },
  dangerSection: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: GymTheme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    gap: 8,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dangerTitle: {
    color: GymTheme.colors.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  dangerSub: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GymTheme.colors.danger,
    paddingVertical: 12,
    borderRadius: GymTheme.borderRadius.lg,
    gap: 8,
    marginTop: 4,
  },
  resetBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
