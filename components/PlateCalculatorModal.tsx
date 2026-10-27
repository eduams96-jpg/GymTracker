import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GymTheme from '../constants/theme';

interface PlateConfig {
  weight: number;
  label: string;
  color: string;
  textColor: string;
  height: number;
  width: number;
}

const AVAILABLE_PLATES: PlateConfig[] = [
  { weight: 25, label: '25', color: '#DC2626', textColor: '#FFFFFF', height: 110, width: 22 },
  { weight: 20, label: '20', color: '#2563EB', textColor: '#FFFFFF', height: 100, width: 20 },
  { weight: 15, label: '15', color: '#D97706', textColor: '#FFFFFF', height: 86, width: 18 },
  { weight: 10, label: '10', color: '#059669', textColor: '#FFFFFF', height: 74, width: 16 },
  { weight: 5, label: '5', color: '#E2E8F0', textColor: '#0F172A', height: 62, width: 14 },
  { weight: 2.5, label: '2.5', color: '#991B1B', textColor: '#FFFFFF', height: 50, width: 12 },
  { weight: 1.25, label: '1.25', color: '#64748B', textColor: '#FFFFFF', height: 40, width: 10 },
];

const BAR_OPTIONS = [
  { weight: 20, label: '20 kg (Olímpica)' },
  { weight: 15, label: '15 kg (Feminina / Curta)' },
  { weight: 10, label: '10 kg (EZ / Técnica)' },
  { weight: 0, label: '0 kg (Máquina / Smith)' },
];

interface PlateCalculatorModalProps {
  visible: boolean;
  initialWeight?: number;
  onClose: () => void;
  onApplyWeight?: (weight: number) => void;
}

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  visible,
  initialWeight = 60,
  onClose,
  onApplyWeight,
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeight || 60);
  const [barWeight, setBarWeight] = useState<number>(20);

  // Sync initialWeight whenever modal opens with new value
  React.useEffect(() => {
    if (visible && initialWeight > 0) {
      setTargetWeight(initialWeight);
    }
  }, [visible, initialWeight]);

  const stepWeight = (delta: number) => {
    setTargetWeight((prev) => {
      const next = Math.max(0, Math.round((prev + delta) * 10) / 10);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      return next;
    });
  };

  // Compute plates per side
  const calculation = useMemo(() => {
    const netWeight = Math.max(0, targetWeight - barWeight);
    const weightPerSide = netWeight / 2;

    let remaining = weightPerSide;
    const platesPerSide: { plate: PlateConfig; count: number }[] = [];

    for (const plate of AVAILABLE_PLATES) {
      if (remaining >= plate.weight) {
        const count = Math.floor(remaining / plate.weight);
        platesPerSide.push({ plate, count });
        remaining = Math.round((remaining - count * plate.weight) * 100) / 100;
      }
    }

    const achievedWeight = barWeight + (weightPerSide - remaining) * 2;
    const isExact = remaining < 0.05;

    return {
      netWeight,
      weightPerSide,
      platesPerSide,
      remainingPerSide: remaining,
      achievedWeight,
      isExact,
    };
  }, [targetWeight, barWeight]);

  // Flattened plates list for visual sleeve rendering (one element per individual plate)
  const visualPlates = useMemo(() => {
    const list: PlateConfig[] = [];
    calculation.platesPerSide.forEach(({ plate, count }) => {
      for (let i = 0; i < count; i++) {
        list.push(plate);
      }
    });
    return list;
  }, [calculation.platesPerSide]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIcon}>
                <Ionicons name="barbell" size={20} color={GymTheme.colors.primary} />
              </View>
              <Text style={styles.title}>Calculadora de Discos</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={26} color={GymTheme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Target Weight Controller */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PESO TOTAL ALVO</Text>
              <View style={styles.weightDisplayRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => stepWeight(-5)}
                  activeOpacity={0.7}>
                  <Text style={styles.stepBtnText}>-5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => stepWeight(-2.5)}
                  activeOpacity={0.7}>
                  <Text style={styles.stepBtnText}>-2.5</Text>
                </TouchableOpacity>

                <View style={styles.weightInputBox}>
                  <TextInput
                    style={styles.weightInput}
                    keyboardType="numeric"
                    value={targetWeight === 0 ? '' : `${targetWeight}`}
                    onChangeText={(val) => {
                      const num = parseFloat(val.replace(',', '.'));
                      setTargetWeight(isNaN(num) ? 0 : Math.max(0, num));
                    }}
                    selectTextOnFocus
                  />
                  <Text style={styles.weightUnit}>kg</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => stepWeight(2.5)}
                  activeOpacity={0.7}>
                  <Text style={styles.stepBtnText}>+2.5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => stepWeight(5)}
                  activeOpacity={0.7}>
                  <Text style={styles.stepBtnText}>+5</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bar Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TIPO DE BARRA</Text>
              <View style={styles.barOptionsRow}>
                {BAR_OPTIONS.map((opt) => {
                  const isSelected = barWeight === opt.weight;
                  return (
                    <TouchableOpacity
                      key={opt.weight}
                      style={[styles.barOptionBtn, isSelected && styles.barOptionBtnActive]}
                      onPress={() => {
                        setBarWeight(opt.weight);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        }
                      }}
                      activeOpacity={0.8}>
                      <Text
                        style={[
                          styles.barOptionText,
                          isSelected && styles.barOptionTextActive,
                        ]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Visual Barbell Sleeve */}
            <View style={styles.visualCard}>
              <Text style={styles.visualTitle}>
                DISCOS POR CADA LADO ({calculation.weightPerSide} kg)
              </Text>

              {targetWeight < barWeight ? (
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle" size={18} color="#FBBF24" />
                  <Text style={styles.warningText}>
                    O peso total ({targetWeight} kg) é inferior ao peso da barra ({barWeight} kg).
                  </Text>
                </View>
              ) : visualPlates.length === 0 ? (
                <View style={styles.emptySleeveBox}>
                  <Ionicons name="barbell-outline" size={32} color={GymTheme.colors.textMuted} />
                  <Text style={styles.emptySleeveText}>Barra vazia (apenas o peso da barra)</Text>
                </View>
              ) : (
                <View style={styles.sleeveContainer}>
                  {/* Barbell Bar (Left) */}
                  <View style={styles.barbellShaft} />
                  {/* Barbell Collar (Sleeve Stopper) */}
                  <View style={styles.barbellCollar} />
                  {/* Sleeve Plate Area */}
                  <View style={styles.platesStack}>
                    {visualPlates.map((plate, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.plateItem,
                          {
                            backgroundColor: plate.color,
                            height: plate.height,
                            width: plate.width,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.plateLabel,
                            { color: plate.textColor, fontSize: plate.width > 16 ? 9 : 7 },
                          ]}>
                          {plate.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {/* Barbell Sleeve Remaining Rod */}
                  <View style={styles.barbellSleeveEnd} />
                </View>
              )}

              {/* Exact / Remainder Feedback */}
              {!calculation.isExact && targetWeight >= barWeight && (
                <View style={styles.warningBox}>
                  <Ionicons name="information-circle" size={16} color="#60A5FA" />
                  <Text style={styles.warningText}>
                    Sobra de {calculation.remainingPerSide * 2} kg total ({calculation.remainingPerSide} kg/lado) com os discos standard disponíveis.
                  </Text>
                </View>
              )}
            </View>

            {/* Breakdown Badges */}
            {calculation.platesPerSide.length > 0 && targetWeight >= barWeight && (
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Montagem por lado:</Text>
                <View style={styles.badgesWrap}>
                  {calculation.platesPerSide.map(({ plate, count }) => (
                    <View
                      key={plate.weight}
                      style={[styles.plateBadge, { borderColor: plate.color }]}>
                      <View style={[styles.badgeColorDot, { backgroundColor: plate.color }]} />
                      <Text style={styles.badgeText}>
                        <Text style={styles.badgeCount}>{count}×</Text> {plate.label} kg
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.summaryFormula}>
                  <Text style={styles.summaryFormulaText}>
                    2 × {calculation.weightPerSide - calculation.remainingPerSide} kg + {barWeight} kg (barra) ={' '}
                    <Text style={styles.formulaHighlight}>{calculation.achievedWeight} kg</Text>
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            {onApplyWeight ? (
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  onApplyWeight(targetWeight);
                  onClose();
                }}
                activeOpacity={0.85}>
                <Ionicons name="checkmark-circle" size={18} color="#022c22" />
                <Text style={styles.applyBtnText}>Usar Carga ({targetWeight} kg)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.85}>
                <Text style={styles.closeBtnText}>Fechar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: GymTheme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: GymTheme.colors.cardBorder,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'android' ? 24 : 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: GymTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    color: GymTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  weightDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  stepBtn: {
    backgroundColor: GymTheme.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: GymTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  weightInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GymTheme.colors.inputBackground,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 2,
    borderColor: GymTheme.colors.primary,
    paddingHorizontal: 10,
    height: 48,
  },
  weightInput: {
    color: GymTheme.colors.primary,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 60,
    padding: 0,
  },
  weightUnit: {
    color: GymTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  barOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  barOptionBtn: {
    backgroundColor: GymTheme.colors.surface,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: GymTheme.borderRadius.md,
  },
  barOptionBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: GymTheme.colors.primary,
  },
  barOptionText: {
    color: GymTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  barOptionTextActive: {
    color: GymTheme.colors.primary,
    fontWeight: '700',
  },
  visualCard: {
    backgroundColor: GymTheme.colors.surface,
    borderRadius: GymTheme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    gap: 12,
  },
  visualTitle: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sleeveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 124,
    paddingHorizontal: 10,
  },
  barbellShaft: {
    width: 28,
    height: 14,
    backgroundColor: '#64748B',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  barbellCollar: {
    width: 14,
    height: 60,
    backgroundColor: '#94A3B8',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  platesStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 2,
  },
  plateItem: {
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
    elevation: 2,
  },
  plateLabel: {
    fontWeight: '900',
    transform: [{ rotate: '-90deg' }],
  },
  barbellSleeveEnd: {
    flex: 1,
    height: 20,
    backgroundColor: '#94A3B8',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    maxWidth: 70,
    marginLeft: 2,
  },
  emptySleeveBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptySleeveText: {
    color: GymTheme.colors.textMuted,
    fontSize: 13,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: GymTheme.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  breakdownCard: {
    backgroundColor: GymTheme.colors.surface,
    borderRadius: GymTheme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    gap: 10,
  },
  breakdownTitle: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GymTheme.colors.cardElevated,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: GymTheme.borderRadius.sm,
    borderWidth: 1.5,
    gap: 6,
  },
  badgeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    color: GymTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  badgeCount: {
    fontWeight: '800',
    color: GymTheme.colors.primary,
  },
  summaryFormula: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: GymTheme.colors.border,
  },
  summaryFormulaText: {
    color: GymTheme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  formulaHighlight: {
    color: GymTheme.colors.primary,
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  applyBtn: {
    backgroundColor: GymTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: GymTheme.borderRadius.lg,
    gap: 8,
  },
  applyBtnText: {
    color: '#022c22',
    fontSize: 15,
    fontWeight: '800',
  },
  closeBtn: {
    backgroundColor: GymTheme.colors.surface,
    paddingVertical: 12,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    alignItems: 'center',
  },
  closeBtnText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
