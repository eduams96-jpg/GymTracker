import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GymTheme from '../constants/theme';

interface OneRepMaxCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  initialWeight?: number;
  initialReps?: number;
}

export const OneRepMaxCalculatorModal: React.FC<OneRepMaxCalculatorModalProps> = ({
  visible,
  onClose,
  initialWeight = 80,
  initialReps = 8,
}) => {
  const [weight, setWeight] = useState<string>(`${initialWeight || 80}`);
  const [reps, setReps] = useState<string>(`${initialReps || 8}`);

  const parsedWeight = parseFloat(weight.replace(',', '.')) || 0;
  const parsedReps = parseInt(reps, 10) || 0;

  // Brzycki: weight / (1.0278 - (0.0278 * reps))
  const brzycki1RM =
    parsedReps <= 1
      ? parsedWeight
      : Math.round(parsedWeight * (36 / (37 - Math.min(parsedReps, 30))));

  // Epley: weight * (1 + reps / 30)
  const epley1RM =
    parsedReps <= 1
      ? parsedWeight
      : Math.round(parsedWeight * (1 + parsedReps / 30));

  const average1RM = Math.round((brzycki1RM + epley1RM) / 2);

  const PERCENTAGES = [
    { percent: 100, repsRange: '1 rep', focus: 'Força Máxima' },
    { percent: 95, repsRange: '2 reps', focus: 'Força Pura' },
    { percent: 90, repsRange: '3-4 reps', focus: 'Força Elevada' },
    { percent: 85, repsRange: '5-6 reps', focus: 'Força / Hipertrofia' },
    { percent: 80, repsRange: '7-8 reps', focus: 'Hipertrofia Ideal' },
    { percent: 75, repsRange: '9-10 reps', focus: 'Hipertrofia' },
    { percent: 70, repsRange: '11-12 reps', focus: 'Hipertrofia / Volume' },
    { percent: 65, repsRange: '13-15 reps', focus: 'Resistência Muscular' },
    { percent: 60, repsRange: '15-20 reps', focus: 'Resistência / Aquecimento' },
  ];

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={[styles.safeArea, { paddingTop: topInset }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={GymTheme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calculadora de 1RM</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Inputs Card */}
          <View style={styles.inputCard}>
            <Text style={styles.cardHeading}>Dados da Série Realizada</Text>
            <View style={styles.inputsRow}>
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Carga Levantada (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                  selectTextOnFocus
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Repetições Feitas</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  value={reps}
                  onChangeText={setReps}
                  selectTextOnFocus
                />
              </View>
            </View>
          </View>

          {/* 1RM Result Banner */}
          <View style={styles.resultBanner}>
            <View style={styles.resultLeft}>
              <Text style={styles.resultLabel}>1RM ESTIMADO</Text>
              <Text style={styles.resultValue}>{average1RM} kg</Text>
              <Text style={styles.resultSub}>
                Brzycki: {brzycki1RM}kg • Epley: {epley1RM}kg
              </Text>
            </View>
            <View style={styles.trophyIcon}>
              <Ionicons name="trophy" size={32} color={GymTheme.colors.accent} />
            </View>
          </View>

          {/* Percentages Table */}
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>Percentagens & Zonas de Carga</Text>
            <Text style={styles.tableSubtitle}>
              Planeia os teus treinos de força e hipertrofia com base no teu 1RM.
            </Text>

            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { width: 50 }]}>% 1RM</Text>
                <Text style={[styles.th, { width: 75, textAlign: 'center' }]}>Carga</Text>
                <Text style={[styles.th, { width: 85, textAlign: 'center' }]}>Reps Alvo</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Foco Principal</Text>
              </View>

              {PERCENTAGES.map((item) => {
                const targetWeight = Math.round((average1RM * item.percent) / 100);
                const isHighlight = item.percent === 80;

                return (
                  <View
                    key={item.percent}
                    style={[styles.tableRow, isHighlight && styles.tableRowHighlight]}>
                    <Text
                      style={[
                        styles.tdPercent,
                        isHighlight && { color: GymTheme.colors.primary },
                      ]}>
                      {item.percent}%
                    </Text>
                    <Text style={styles.tdWeight}>{targetWeight} kg</Text>
                    <Text style={styles.tdReps}>{item.repsRange}</Text>
                    <Text style={styles.tdFocus} numberOfLines={1}>
                      {item.focus}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GymTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  inputCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 12,
  },
  cardHeading: {
    color: GymTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputBox: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: GymTheme.colors.inputBackground,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    borderRadius: GymTheme.borderRadius.md,
    color: GymTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 10,
  },
  resultBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: GymTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultLeft: {
    gap: 2,
  },
  resultLabel: {
    color: GymTheme.colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  resultValue: {
    color: GymTheme.colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
  },
  resultSub: {
    color: GymTheme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  trophyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 8,
  },
  tableTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  tableSubtitle: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  table: {
    borderRadius: GymTheme.borderRadius.md,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
  },
  th: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tableRowHighlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  tdPercent: {
    width: 50,
    color: GymTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  tdWeight: {
    width: 75,
    color: GymTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  tdReps: {
    width: 85,
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  tdFocus: {
    flex: 1,
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
  },
});
