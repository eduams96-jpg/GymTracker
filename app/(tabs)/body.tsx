import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../../context/GymContext';
import { BodyMetricLog } from '../../types/gym';
import { BodyEvolutionChart } from '../../components/BodyEvolutionChart';
import { ProgressPhotoManager } from '../../components/ProgressPhotoManager';
import GymTheme from '../../constants/theme';

export default function BodyTrackingScreen() {
  const { bodyMetrics, addBodyMetric, deleteBodyMetric } = useGym();

  const [activeSection, setActiveSection] = useState<'inbody' | 'photos'>('inbody');
  const [activeChartMetric, setActiveChartMetric] = useState<
    'weightKg' | 'skeletalMuscleMassKg' | 'bodyFatPercentage'
  >('weightKg');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [weight, setWeight] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [fatPercent, setFatPercent] = useState('');
  const [fatMass, setFatMass] = useState('');
  const [waterL, setWaterL] = useState('');
  const [visceralLevel, setVisceralLevel] = useState('');
  const [bmr, setBmr] = useState('');
  const [inbodyScore, setInbodyScore] = useState('');
  const [waistToHip, setWaistToHip] = useState('');

  // Circumference state
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [rightArm, setRightArm] = useState('');
  const [leftArm, setLeftArm] = useState('');
  const [rightThigh, setRightThigh] = useState('');
  const [leftThigh, setLeftThigh] = useState('');
  const [notes, setNotes] = useState('');

  // Sort logs by newest first
  const sortedLogs = [...bodyMetrics].sort((a, b) => b.timestamp - a.timestamp);
  const latestLog: BodyMetricLog | undefined = sortedLogs[0];

  const handleSaveEvaluation = async () => {
    const parsedWeight = parseFloat(weight.replace(',', '.'));
    if (!parsedWeight || isNaN(parsedWeight)) {
      Alert.alert('Peso obrigatório', 'Por favor insere o teu peso corporal.');
      return;
    }

    await addBodyMetric({
      date: new Date().toISOString(),
      timestamp: Date.now(),
      weightKg: parsedWeight,
      skeletalMuscleMassKg: parseFloat(muscleMass.replace(',', '.')) || undefined,
      bodyFatPercentage: parseFloat(fatPercent.replace(',', '.')) || undefined,
      bodyFatMassKg: parseFloat(fatMass.replace(',', '.')) || undefined,
      totalBodyWaterL: parseFloat(waterL.replace(',', '.')) || undefined,
      visceralFatLevel: parseInt(visceralLevel, 10) || undefined,
      bmrKcal: parseInt(bmr, 10) || undefined,
      inbodyScore: parseInt(inbodyScore, 10) || undefined,
      waistToHipRatio: parseFloat(waistToHip.replace(',', '.')) || undefined,
      chestCm: parseFloat(chest.replace(',', '.')) || undefined,
      waistCm: parseFloat(waist.replace(',', '.')) || undefined,
      hipsCm: parseFloat(hips.replace(',', '.')) || undefined,
      rightArmCm: parseFloat(rightArm.replace(',', '.')) || undefined,
      leftArmCm: parseFloat(leftArm.replace(',', '.')) || undefined,
      rightThighCm: parseFloat(rightThigh.replace(',', '.')) || undefined,
      leftThighCm: parseFloat(leftThigh.replace(',', '.')) || undefined,
      notes: notes.trim() || undefined,
    });

    // Reset inputs
    setWeight('');
    setMuscleMass('');
    setFatPercent('');
    setFatMass('');
    setWaterL('');
    setVisceralLevel('');
    setBmr('');
    setInbodyScore('');
    setWaistToHip('');
    setChest('');
    setWaist('');
    setHips('');
    setRightArm('');
    setLeftArm('');
    setRightThigh('');
    setLeftThigh('');
    setNotes('');

    setIsAddModalOpen(false);
  };

  const confirmDelete = (log: BodyMetricLog) => {
    const formattedDate = new Date(log.timestamp).toLocaleDateString('pt-PT');
    Alert.alert(
      'Eliminar Avaliação',
      `Tens a certeza que desejas eliminar a avaliação de ${formattedDate}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteBodyMetric(log.id),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      {/* Header & Add Button */}
      <View style={styles.topSection}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.screenTitle}>
            {activeSection === 'inbody' ? 'Composição Corporal' : 'Fotos de Evolução'}
          </Text>
          <Text style={styles.screenSub}>
            {activeSection === 'inbody'
              ? 'Evolução de peso, músculo, gordura e medidas'
              : 'Registo visual e comparador antes vs depois'}
          </Text>
        </View>

        {activeSection === 'inbody' && (
          <TouchableOpacity
            style={styles.addEvalBtn}
            onPress={() => setIsAddModalOpen(true)}
            activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#052e16" />
            <Text style={styles.addEvalBtnText}>Nova Avaliação</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Section Switcher: InBody vs Fotos */}
      <View style={styles.sectionSwitcher}>
        <TouchableOpacity
          style={[styles.switcherBtn, activeSection === 'inbody' && styles.switcherBtnActive]}
          onPress={() => setActiveSection('inbody')}
          activeOpacity={0.7}>
          <Ionicons
            name="stats-chart"
            size={16}
            color={activeSection === 'inbody' ? '#052e16' : GymTheme.colors.textSecondary}
          />
          <Text
            style={[
              styles.switcherBtnText,
              activeSection === 'inbody' && styles.switcherBtnTextActive,
            ]}>
            InBody & Medidas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switcherBtn, activeSection === 'photos' && styles.switcherBtnActive]}
          onPress={() => setActiveSection('photos')}
          activeOpacity={0.7}>
          <Ionicons
            name="camera"
            size={16}
            color={activeSection === 'photos' ? '#052e16' : GymTheme.colors.textSecondary}
          />
          <Text
            style={[
              styles.switcherBtnText,
              activeSection === 'photos' && styles.switcherBtnTextActive,
            ]}>
            Fotos de Progresso
          </Text>
        </TouchableOpacity>
      </View>

      {activeSection === 'photos' ? (
        <ProgressPhotoManager />
      ) : (
        <>
          {/* Latest Assessment Featured Card */}
      {latestLog ? (
        <View style={styles.featuredCard}>
          <View style={styles.featuredHeader}>
            <View>
              <Text style={styles.featuredSubtitle}>ÚLTIMA AVALIAÇÃO INBODY</Text>
              <Text style={styles.featuredDate}>
                {new Date(latestLog.timestamp).toLocaleDateString('pt-PT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>

            {latestLog.inbodyScore ? (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreNumber}>{latestLog.inbodyScore}</Text>
                <Text style={styles.scoreTotal}>/100 pts</Text>
              </View>
            ) : null}
          </View>

          {/* 4 Key InBody Metrics Grid */}
          <View style={styles.inbodyGrid}>
            <View style={styles.inbodyMetricItem}>
              <Text style={styles.inbodyMetricLabel}>PESO TOTAL</Text>
              <Text style={styles.inbodyMetricValue}>{latestLog.weightKg} kg</Text>
            </View>

            <View style={styles.inbodyMetricItem}>
              <Text style={styles.inbodyMetricLabel}>M. MUSCULAR (MME)</Text>
              <Text style={[styles.inbodyMetricValue, { color: GymTheme.colors.primary }]}>
                {latestLog.skeletalMuscleMassKg ? `${latestLog.skeletalMuscleMassKg} kg` : '—'}
              </Text>
            </View>

            <View style={styles.inbodyMetricItem}>
              <Text style={styles.inbodyMetricLabel}>% GORDURA (PGC)</Text>
              <Text style={[styles.inbodyMetricValue, { color: GymTheme.colors.accent }]}>
                {latestLog.bodyFatPercentage ? `${latestLog.bodyFatPercentage}%` : '—'}
              </Text>
            </View>

            <View style={styles.inbodyMetricItem}>
              <Text style={styles.inbodyMetricLabel}>MASSA GORDA</Text>
              <Text style={styles.inbodyMetricValue}>
                {latestLog.bodyFatMassKg ? `${latestLog.bodyFatMassKg} kg` : '—'}
              </Text>
            </View>
          </View>

          {/* Secondary InBody Details */}
          <View style={styles.secondaryDetailsRow}>
            {latestLog.visceralFatLevel ? (
              <View style={styles.secDetail}>
                <Ionicons name="shield-checkmark" size={14} color={GymTheme.colors.primaryLight} />
                <Text style={styles.secDetailText}>
                  Gordura Visceral: <Text style={styles.bold}>Nível {latestLog.visceralFatLevel}</Text>
                </Text>
              </View>
            ) : null}

            {latestLog.bmrKcal ? (
              <View style={styles.secDetail}>
                <Ionicons name="flame-outline" size={14} color={GymTheme.colors.accent} />
                <Text style={styles.secDetailText}>
                  TMB: <Text style={styles.bold}>{latestLog.bmrKcal} kcal</Text>
                </Text>
              </View>
            ) : null}

            {latestLog.totalBodyWaterL ? (
              <View style={styles.secDetail}>
                <Ionicons name="water-outline" size={14} color={GymTheme.colors.info} />
                <Text style={styles.secDetailText}>
                  Água: <Text style={styles.bold}>{latestLog.totalBodyWaterL} L</Text>
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Evolution Chart with Metric Switcher */}
      <View style={styles.section}>
        <View style={styles.chartSwitcherRow}>
          <TouchableOpacity
            style={[
              styles.switchBtn,
              activeChartMetric === 'weightKg' && styles.switchBtnActive,
            ]}
            onPress={() => setActiveChartMetric('weightKg')}>
            <Text
              style={[
                styles.switchBtnText,
                activeChartMetric === 'weightKg' && styles.switchBtnTextActive,
              ]}>
              Peso (kg)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchBtn,
              activeChartMetric === 'skeletalMuscleMassKg' && styles.switchBtnActive,
            ]}
            onPress={() => setActiveChartMetric('skeletalMuscleMassKg')}>
            <Text
              style={[
                styles.switchBtnText,
                activeChartMetric === 'skeletalMuscleMassKg' && styles.switchBtnTextActive,
              ]}>
              Massa Muscular (kg)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchBtn,
              activeChartMetric === 'bodyFatPercentage' && styles.switchBtnActive,
            ]}
            onPress={() => setActiveChartMetric('bodyFatPercentage')}>
            <Text
              style={[
                styles.switchBtnText,
                activeChartMetric === 'bodyFatPercentage' && styles.switchBtnTextActive,
              ]}>
              % Gordura
            </Text>
          </TouchableOpacity>
        </View>

        <BodyEvolutionChart
          logs={bodyMetrics}
          metricKey={activeChartMetric}
          title={
            activeChartMetric === 'weightKg'
              ? 'Evolução de Peso Corporal'
              : activeChartMetric === 'skeletalMuscleMassKg'
              ? 'Evolução de Massa Muscular (MME)'
              : 'Evolução de % Gordura (PGC)'
          }
          unit={activeChartMetric === 'bodyFatPercentage' ? '%' : 'kg'}
          color={
            activeChartMetric === 'skeletalMuscleMassKg'
              ? GymTheme.colors.primary
              : activeChartMetric === 'bodyFatPercentage'
              ? GymTheme.colors.accent
              : GymTheme.colors.info
          }
        />
      </View>

      {/* Latest Circumferences Card */}
      {latestLog && (latestLog.chestCm || latestLog.waistCm || latestLog.rightArmCm) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medidas Corporais Atuais (cm)</Text>
          <View style={styles.measurementsCard}>
            {latestLog.chestCm ? (
              <View style={styles.measItem}>
                <Text style={styles.measLabel}>Peito</Text>
                <Text style={styles.measValue}>{latestLog.chestCm} cm</Text>
              </View>
            ) : null}

            {latestLog.waistCm ? (
              <View style={styles.measItem}>
                <Text style={styles.measLabel}>Cintura</Text>
                <Text style={styles.measValue}>{latestLog.waistCm} cm</Text>
              </View>
            ) : null}

            {latestLog.hipsCm ? (
              <View style={styles.measItem}>
                <Text style={styles.measLabel}>Anca</Text>
                <Text style={styles.measValue}>{latestLog.hipsCm} cm</Text>
              </View>
            ) : null}

            {latestLog.rightArmCm ? (
              <View style={styles.measItem}>
                <Text style={styles.measLabel}>Braço D.</Text>
                <Text style={styles.measValue}>{latestLog.rightArmCm} cm</Text>
              </View>
            ) : null}

            {latestLog.leftArmCm ? (
              <View style={styles.measItem}>
                <Text style={styles.measLabel}>Braço E.</Text>
                <Text style={styles.measValue}>{latestLog.leftArmCm} cm</Text>
              </View>
            ) : null}

            {latestLog.rightThighCm ? (
              <View style={styles.measItem}>
                <Text style={styles.measLabel}>Coxa D.</Text>
                <Text style={styles.measValue}>{latestLog.rightThighCm} cm</Text>
              </View>
            ) : null}

            {latestLog.leftThighCm ? (
              <View style={styles.measItem}>
                <Text style={styles.measLabel}>Coxa E.</Text>
                <Text style={styles.measValue}>{latestLog.leftThighCm} cm</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* History of Evaluations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Histórico de Avaliações ({bodyMetrics.length})</Text>

        <View style={styles.logsList}>
          {sortedLogs.map((log) => {
            const dateStr = new Date(log.timestamp).toLocaleDateString('pt-PT', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.calendarIcon}>
                      <Ionicons name="calendar-outline" size={16} color={GymTheme.colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.logDate}>{dateStr}</Text>
                      {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {log.inbodyScore ? (
                      <View style={styles.miniScore}>
                        <Text style={styles.miniScoreText}>{log.inbodyScore} pts</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => confirmDelete(log)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={16} color={GymTheme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Values strip */}
                <View style={styles.logStrip}>
                  <View style={styles.logStripItem}>
                    <Text style={styles.logStripVal}>{log.weightKg} kg</Text>
                    <Text style={styles.logStripLbl}>Peso</Text>
                  </View>

                  <View style={styles.logStripDivider} />
                  <View style={styles.logStripItem}>
                    <Text style={[styles.logStripVal, { color: GymTheme.colors.primary }]}>
                      {log.skeletalMuscleMassKg ? `${log.skeletalMuscleMassKg} kg` : '—'}
                    </Text>
                    <Text style={styles.logStripLbl}>Músculo</Text>
                  </View>

                  <View style={styles.logStripDivider} />
                  <View style={styles.logStripItem}>
                    <Text style={[styles.logStripVal, { color: GymTheme.colors.accent }]}>
                      {log.bodyFatPercentage ? `${log.bodyFatPercentage}%` : '—'}
                    </Text>
                    <Text style={styles.logStripLbl}>Gordura</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
        </>
      )}

      {/* Modal: Add New InBody / Body Evaluation */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
              <Ionicons name="close" size={24} color={GymTheme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Nova Avaliação Corporal / InBody</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled">
            {/* Section 1: InBody Metrics */}
            <Text style={styles.formSectionHeading}>1. Composição Corporal (InBody)</Text>

            <View style={styles.formGrid}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Peso Corporal (kg) *</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 99.5"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Massa Muscular (kg)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 46.4"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={muscleMass}
                  onChangeText={setMuscleMass}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>% Gordura Corporal (%)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 19.1"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={fatPercent}
                  onChangeText={setFatPercent}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Massa Gorda (kg)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 19.0"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={fatMass}
                  onChangeText={setFatMass}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Água Corporal (L)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 58.9"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={waterL}
                  onChangeText={setWaterL}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Gordura Visceral (Nível)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  placeholder="Ex: 7"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={visceralLevel}
                  onChangeText={setVisceralLevel}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Taxa Metabólica Basal (kcal)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  placeholder="Ex: 2109"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={bmr}
                  onChangeText={setBmr}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Pontuação InBody (0-100)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  placeholder="Ex: 92"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={inbodyScore}
                  onChangeText={setInbodyScore}
                />
              </View>
            </View>

            {/* Section 2: Circumferences */}
            <Text style={[styles.formSectionHeading, { marginTop: 24 }]}>
              2. Medidas Corporais (cm)
            </Text>

            <View style={styles.formGrid}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Peito (cm)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 116"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={chest}
                  onChangeText={setChest}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Cintura (cm)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 92"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={waist}
                  onChangeText={setWaist}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Anca (cm)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 108"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={hips}
                  onChangeText={setHips}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Braço Direito (cm)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 42.5"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={rightArm}
                  onChangeText={setRightArm}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Braço Esquerdo (cm)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 42.0"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={leftArm}
                  onChangeText={setLeftArm}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Coxa Direita (cm)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 65.0"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={rightThigh}
                  onChangeText={setRightThigh}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Coxa Esquerda (cm)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="Ex: 64.5"
                  placeholderTextColor={GymTheme.colors.textMuted}
                  value={leftThigh}
                  onChangeText={setLeftThigh}
                />
              </View>
            </View>

            {/* Notes */}
            <View style={[styles.formGroup, { marginTop: 16 }]}>
              <Text style={styles.inputLabel}>Notas / Observações</Text>
              <TextInput
                style={[styles.modalInput, { height: 60 }]}
                placeholder="Ex: Avaliação oficial no ginásio..."
                placeholderTextColor={GymTheme.colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.saveEvalBtn, !weight.trim() && styles.saveEvalBtnDisabled]}
              disabled={!weight.trim()}
              onPress={handleSaveEvaluation}
              activeOpacity={0.8}>
              <Text style={styles.saveEvalBtnText}>Guardar Avaliação</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
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
    paddingBottom: 60,
    gap: 20,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  screenTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  screenSub: {
    color: GymTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  addEvalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GymTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.full,
    gap: 4,
  },
  addEvalBtnText: {
    color: '#052e16',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionSwitcher: {
    flexDirection: 'row',
    backgroundColor: GymTheme.colors.surface,
    borderRadius: GymTheme.borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  switcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 6,
    borderRadius: 8,
  },
  switcherBtnActive: {
    backgroundColor: GymTheme.colors.primary,
  },
  switcherBtnText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  switcherBtnTextActive: {
    color: '#052e16',
    fontWeight: '800',
  },
  featuredCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 14,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredSubtitle: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  featuredDate: {
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  scoreNumber: {
    color: GymTheme.colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  scoreTotal: {
    color: GymTheme.colors.textSecondary,
    fontSize: 11,
    marginLeft: 2,
  },
  inbodyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inbodyMetricItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: GymTheme.colors.surface,
    padding: 12,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    gap: 4,
  },
  inbodyMetricLabel: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inbodyMetricValue: {
    color: GymTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: GymTheme.colors.border,
    paddingTop: 10,
  },
  secDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  secDetailText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
  },
  bold: {
    color: GymTheme.colors.textPrimary,
    fontWeight: '700',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  chartSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: GymTheme.borderRadius.md,
  },
  switchBtnActive: {
    backgroundColor: GymTheme.colors.surface,
  },
  switchBtnText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  switchBtnTextActive: {
    color: GymTheme.colors.textPrimary,
    fontWeight: '700',
  },
  measurementsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: GymTheme.colors.card,
    padding: 14,
    borderRadius: GymTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  measItem: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: GymTheme.colors.surface,
    padding: 10,
    borderRadius: GymTheme.borderRadius.md,
    alignItems: 'center',
    gap: 2,
  },
  measLabel: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
  },
  measValue: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  logsList: {
    gap: 10,
  },
  logCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 10,
  },
  logCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logDate: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  logNotes: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
  },
  miniScore: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: GymTheme.borderRadius.sm,
  },
  miniScoreText: {
    color: GymTheme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  logStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: GymTheme.colors.surface,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.md,
  },
  logStripItem: {
    alignItems: 'center',
  },
  logStripVal: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  logStripLbl: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  logStripDivider: {
    width: 1,
    height: 20,
    backgroundColor: GymTheme.colors.border,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: GymTheme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
  },
  modalHeaderTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formSectionHeading: {
    color: GymTheme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formGroup: {
    flex: 1,
    minWidth: '45%',
    gap: 6,
  },
  inputLabel: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: GymTheme.colors.card,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    borderRadius: GymTheme.borderRadius.md,
    color: GymTheme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  saveEvalBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: GymTheme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 24,
  },
  saveEvalBtnDisabled: {
    opacity: 0.5,
  },
  saveEvalBtnText: {
    color: '#052e16',
    fontSize: 15,
    fontWeight: '700',
  },
});
