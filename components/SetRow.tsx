import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutSet } from '../types/gym';
import GymTheme from '../constants/theme';

interface SetRowProps {
  set: WorkoutSet;
  workoutExerciseId: string;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  isNextActive?: boolean;
  displayNumber?: number; // Number among working sets (warm-ups/drops don't count)
}

export const SetRow: React.FC<SetRowProps> = ({
  set,
  workoutExerciseId,
  isNextActive = false,
  displayNumber,
  onUpdate,
  onToggleComplete,
  onDelete,
}) => {
  const isCompleted = set.completed;

  const cycleType = () => {
    const nextType: Record<WorkoutSet['type'], WorkoutSet['type']> = {
      normal: 'warmup',
      warmup: 'drop',
      drop: 'failure',
      failure: 'normal',
    };
    onUpdate({ type: nextType[set.type] });
  };

  const getTypeBadge = () => {
    switch (set.type) {
      case 'warmup':
        return { label: 'A', bg: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' };
      case 'drop':
        return { label: 'D', bg: 'rgba(239, 68, 68, 0.2)', color: '#F87171' };
      case 'failure':
        return { label: 'F', bg: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24' };
      default:
        return { label: `${displayNumber ?? set.setNumber}`, bg: 'transparent', color: GymTheme.colors.textSecondary };
    }
  };

  const badge = getTypeBadge();

  return (
    <View
      style={[
        styles.row,
        isCompleted && styles.completedRow,
        !isCompleted && isNextActive && styles.activeFocusRow,
      ]}>
      {/* Set Badge / Type Toggle */}
      <TouchableOpacity
        style={[styles.setNumContainer, { backgroundColor: badge.bg }]}
        onPress={cycleType}
        activeOpacity={0.7}>
        <Text style={[styles.setNumText, { color: badge.color }]}>{badge.label}</Text>
      </TouchableOpacity>

      {/* Previous Record info */}
      <View style={styles.prevContainer}>
        <Text style={styles.prevText} numberOfLines={1}>
          {set.previousRecord || '—'}
        </Text>
      </View>

      {/* Weight Input (kg) */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, isCompleted && styles.inputCompleted]}
          keyboardType="numeric"
          selectTextOnFocus
          value={set.weightKg === 0 ? '' : `${set.weightKg}`}
          placeholder="0"
          placeholderTextColor={GymTheme.colors.textMuted}
          onChangeText={(text) => {
            const val = parseFloat(text.replace(',', '.'));
            onUpdate({ weightKg: isNaN(val) ? 0 : val });
          }}
        />
        <Text style={styles.unitText}>kg</Text>
      </View>

      {/* Reps Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, isCompleted && styles.inputCompleted]}
          keyboardType="number-pad"
          selectTextOnFocus
          value={set.reps === 0 ? '' : `${set.reps}`}
          placeholder="0"
          placeholderTextColor={GymTheme.colors.textMuted}
          onChangeText={(text) => {
            const val = parseInt(text, 10);
            onUpdate({ reps: isNaN(val) ? 0 : val });
          }}
        />
        <Text style={styles.unitText}>reps</Text>
      </View>

      {/* Checkbox button */}
      <TouchableOpacity
        style={[styles.checkBtn, isCompleted && styles.checkBtnCompleted]}
        onPress={onToggleComplete}
        activeOpacity={0.8}>
        <Ionicons
          name={isCompleted ? 'checkmark' : 'checkmark-outline'}
          size={18}
          color={isCompleted ? '#052e16' : GymTheme.colors.textMuted}
        />
      </TouchableOpacity>

      {/* Delete set option (small icon) */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={15} color={GymTheme.colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: GymTheme.borderRadius.md,
    marginVertical: 2,
    backgroundColor: 'transparent',
  },
  completedRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  activeFocusRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  setNumContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  setNumText: {
    fontSize: 13,
    fontWeight: '700',
  },
  prevContainer: {
    flex: 1.2,
    paddingRight: 6,
  },
  prevText: {
    color: GymTheme.colors.textMuted,
    fontSize: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GymTheme.colors.inputBackground,
    borderRadius: GymTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    paddingHorizontal: 6,
    marginRight: 6,
    height: 36,
  },
  input: {
    flex: 1,
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    padding: 0,
  },
  inputCompleted: {
    color: GymTheme.colors.primaryLight,
  },
  unitText: {
    fontSize: 10,
    color: GymTheme.colors.textMuted,
    marginLeft: 2,
  },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: GymTheme.borderRadius.md,
    backgroundColor: GymTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  checkBtnCompleted: {
    backgroundColor: GymTheme.colors.primary,
    borderColor: GymTheme.colors.primary,
  },
  deleteBtn: {
    padding: 4,
  },
});
