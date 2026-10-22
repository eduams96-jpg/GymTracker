import React, { useState } from 'react';
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
import { StorageService } from '../../services/storage';
import { ExerciseProgressionChart } from '../../components/ExerciseProgressionChart';
import { OneRepMaxCalculatorModal } from '../../components/OneRepMaxCalculatorModal';
import GymTheme from '../../constants/theme';

export default function StatsScreen() {
  const { sessions, personalRecords, exportBackup, restoreBackup, resetAllData } = useGym();

  const [is1RMModalOpen, setIs1RMModalOpen] = useState(false);
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
            await resetAllData();
            Alert.alert('Dados Repostos', 'A aplicação foi reiniciada com sucesso.');
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const success = await exportBackup();
      if (!success) {
        Alert.alert('Exportação', 'Não foi possível aceder à partilha de ficheiros.');
      }
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro ao exportar o backup.');
    }
  };

  const handleRestore = async () => {
    if (!restoreJsonInput.trim()) {
      Alert.alert('Aviso', 'Cola o conteúdo do ficheiro de backup JSON.');
      return;
    }

    try {
      const ok = await restoreBackup(restoreJsonInput.trim());
      if (ok) {
        Alert.alert('Sucesso', 'Cópia de segurança restaurada com sucesso!');
        setIsRestoreModalOpen(false);
        setRestoreJsonInput('');
      } else {
        Alert.alert('Erro', 'O ficheiro JSON não tem um formato de backup válido.');
      }
    } catch {
      Alert.alert('Erro', 'Formato JSON inválido.');
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

      {/* Restore Backup Modal */}
      <Modal visible={isRestoreModalOpen} transparent animationType="fade">
        <View style={styles.restoreOverlay}>
          <View style={styles.restoreCard}>
            <Text style={styles.restoreTitle}>Restaurar Cópia de Segurança</Text>
            <Text style={styles.restoreSub}>
              Cola abaixo o conteúdo JSON do teu ficheiro de backup para restaurar treinos, rotinas e exercícios.
            </Text>

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
