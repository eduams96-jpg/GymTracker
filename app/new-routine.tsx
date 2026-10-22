import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../context/GymContext';
import { Exercise, MuscleGroup } from '../types/gym';
import { ExerciseSelectModal } from '../components/ExerciseSelectModal';
import GymTheme from '../constants/theme';

export default function NewRoutineScreen() {
  const router = useRouter();
  const { saveNewTemplate } = useGym();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddExercise = (exercise: Exercise) => {
    if (!selectedExercises.some((e) => e.id === exercise.id)) {
      setSelectedExercises((prev) => [...prev, exercise]);
    }
  };

  const handleRemoveExercise = (id: string) => {
    setSelectedExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Título obrigatório', 'Por favor insere um nome para a rotina.');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert(
        'Sem exercícios',
        'Adiciona pelo menos um exercício à tua rotina.'
      );
      return;
    }

    // Extract unique muscle groups from selected exercises
    const targetMuscles = Array.from(
      new Set(selectedExercises.map((e) => e.muscleGroup))
    ) as MuscleGroup[];

    await saveNewTemplate({
      title: title.trim(),
      description: description.trim() || undefined,
      targetMuscles,
      exerciseIds: selectedExercises.map((e) => e.id),
    });

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome da Rotina *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Treino de Perna e Glúteos"
            placeholderTextColor={GymTheme.colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descrição (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notas sobre aquecimento, descanso ou objetivos..."
            placeholderTextColor={GymTheme.colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {/* Selected Exercises Section */}
        <View style={styles.inputGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>
              Exercícios ({selectedExercises.length})
            </Text>
            <TouchableOpacity
              style={styles.addExBtn}
              onPress={() => setIsModalOpen(true)}>
              <Ionicons name="add" size={16} color={GymTheme.colors.primary} />
              <Text style={styles.addExBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {selectedExercises.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => setIsModalOpen(true)}>
              <Ionicons
                name="barbell-outline"
                size={28}
                color={GymTheme.colors.textMuted}
              />
              <Text style={styles.emptyCardText}>
                Toca para adicionar o primeiro exercício
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.exerciseList}>
              {selectedExercises.map((item, index) => (
                <View key={item.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseLeft}>
                    <Text style={styles.orderNumber}>#{index + 1}</Text>
                    <View>
                      <Text style={styles.exerciseName}>{item.name}</Text>
                      <Text style={styles.exerciseMuscle}>
                        {item.muscleGroup.toUpperCase()} • {item.equipment}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemoveExercise(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={GymTheme.colors.danger}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, (!title.trim() || selectedExercises.length === 0) && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Guardar Rotina</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Select Exercise Modal */}
      <ExerciseSelectModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectExercise={handleAddExercise}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GymTheme.colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: GymTheme.colors.textPrimary,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: GymTheme.borderRadius.full,
  },
  addExBtnText: {
    color: GymTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: GymTheme.colors.border,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyCardText: {
    color: GymTheme.colors.textMuted,
    fontSize: 13,
  },
  exerciseList: {
    gap: 8,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  exerciseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  orderNumber: {
    color: GymTheme.colors.accent,
    fontWeight: '700',
    fontSize: 12,
    width: 24,
  },
  exerciseName: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseMuscle: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: GymTheme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#052e16',
    fontSize: 16,
    fontWeight: '700',
  },
});
