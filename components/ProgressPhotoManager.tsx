import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useGym } from '../context/GymContext';
import { ProgressPhoto, PhotoPose } from '../types/gym';
import { ProgressComparisonModal } from './ProgressComparisonModal';
import GymTheme from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_ITEM_WIDTH = Math.floor((SCREEN_WIDTH - 44) / 2);

const POSE_LABELS: Record<PhotoPose, string> = {
  frente: 'Frente',
  costas: 'Costas',
  perfil_esquerdo: 'Perfil Esq.',
  perfil_direito: 'Perfil Dir.',
  outro: 'Outro',
};

export const ProgressPhotoManager: React.FC = () => {
  const { progressPhotos, addProgressPhoto, deleteProgressPhoto, bodyMetrics } = useGym();

  const [activeFilter, setActiveFilter] = useState<PhotoPose | 'todas'>('todas');
  const [selectedPhotoForDetail, setSelectedPhotoForDetail] = useState<ProgressPhoto | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // New photo modal state
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingPose, setPendingPose] = useState<PhotoPose>('frente');
  const [pendingNotes, setPendingNotes] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Get most recent InBody evaluation to auto-fill weight and % fat
  const sortedMetrics = [...bodyMetrics].sort((a, b) => b.timestamp - a.timestamp);
  const latestMetric = sortedMetrics[0];

  // Pick image from camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permissão necessária',
          'Precisas de permitir o acesso à câmara para tirar fotos de evolução.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPendingImageUri(result.assets[0].uri);
        setIsSaveModalOpen(true);
      }
    } catch (e) {
      console.error('Error taking photo:', e);
      Alert.alert('Erro', 'Não foi possível aceder à câmara.');
    }
  };

  // Pick image from phone gallery
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permissão necessária',
          'Precisas de permitir o acesso à galeria para selecionar fotos de evolução.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPendingImageUri(result.assets[0].uri);
        setIsSaveModalOpen(true);
      }
    } catch (e) {
      console.error('Error picking photo from gallery:', e);
      Alert.alert('Erro', 'Não foi possível aceder à galeria.');
    }
  };

  // Save photo permanently into private document directory
  const handleSavePhoto = async () => {
    if (!pendingImageUri) return;

    try {
      const dirPath = `${FileSystem.documentDirectory}gym_photos/`;
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }

      const fileName = `progress_${Date.now()}.jpg`;
      const permanentUri = `${dirPath}${fileName}`;

      await FileSystem.copyAsync({
        from: pendingImageUri,
        to: permanentUri,
      });

      await addProgressPhoto({
        uri: permanentUri,
        date: new Date().toISOString(),
        timestamp: Date.now(),
        pose: pendingPose,
        weightKg: latestMetric?.weightKg,
        bodyFatPercentage: latestMetric?.bodyFatPercentage,
        skeletalMuscleMassKg: latestMetric?.skeletalMuscleMassKg,
        notes: pendingNotes.trim() || undefined,
      });

      setIsSaveModalOpen(false);
      setPendingImageUri(null);
      setPendingNotes('');
    } catch (e) {
      console.error('Error saving progress photo to storage:', e);
      Alert.alert('Erro ao guardar', 'Não foi possível guardar a foto na memória local.');
    }
  };

  const handleDeletePhoto = (photo: ProgressPhoto) => {
    Alert.alert('Eliminar Foto', 'Tens a certeza que desejas eliminar esta foto de evolução?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteProgressPhoto(photo.id);
          setSelectedPhotoForDetail(null);
        },
      },
    ]);
  };

  // Filter photos
  const filteredPhotos = progressPhotos.filter((p) => {
    if (activeFilter === 'todas') return true;
    return p.pose === activeFilter;
  });

  return (
    <View style={styles.container}>
      {/* Top Action Bar */}
      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.primaryActionBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
          <Ionicons name="camera" size={18} color="#052e16" />
          <Text style={styles.primaryActionText}>Tirar Foto</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryActionBtn} onPress={handlePickFromGallery} activeOpacity={0.8}>
          <Ionicons name="images-outline" size={18} color={GymTheme.colors.textPrimary} />
          <Text style={styles.secondaryActionText}>Galeria</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.compareActionBtn}
          onPress={() => setIsComparisonOpen(true)}
          activeOpacity={0.8}>
          <Ionicons name="sparkles" size={18} color={GymTheme.colors.primary} />
          <Text style={styles.compareActionText}>Comparador</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        {(['todas', 'frente', 'costas', 'perfil_esquerdo', 'perfil_direito'] as const).map((pose) => {
          const isActive = activeFilter === pose;
          const label = pose === 'todas' ? 'Todas' : POSE_LABELS[pose];
          return (
            <TouchableOpacity
              key={pose}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(pose)}>
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={54} color={GymTheme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Sem fotos nesta categoria</Text>
          <Text style={styles.emptySub}>
            Tira uma foto no espelho para acompanhar visualmente a tua transformação corporal.
          </Text>
        </View>
      ) : (
        <View style={styles.photoGrid}>
          {filteredPhotos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.photoCard}
              activeOpacity={0.85}
              onPress={() => setSelectedPhotoForDetail(photo)}>
              <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} resizeMode="cover" />

              {/* Pose badge */}
              <View style={styles.poseBadge}>
                <Text style={styles.poseBadgeText}>{POSE_LABELS[photo.pose]}</Text>
              </View>

              {/* Photo Card Footer */}
              <View style={styles.photoFooter}>
                <Text style={styles.photoDate}>
                  {new Date(photo.timestamp).toLocaleDateString('pt-PT', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                {photo.weightKg ? (
                  <Text style={styles.photoMetrics}>
                    {photo.weightKg} kg{photo.bodyFatPercentage ? ` • ${photo.bodyFatPercentage}% GC` : ''}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Save New Photo Modal */}
      <Modal
        visible={isSaveModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSaveModalOpen(false)}>
        <View style={styles.saveModalOverlay}>
          <View style={styles.saveModalCard}>
            <View style={styles.saveModalHeader}>
              <Text style={styles.saveModalTitle}>Registar Foto de Evolução</Text>
              <TouchableOpacity onPress={() => setIsSaveModalOpen(false)}>
                <Ionicons name="close" size={24} color={GymTheme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {pendingImageUri && (
              <Image source={{ uri: pendingImageUri }} style={styles.previewImage} resizeMode="cover" />
            )}

            {/* Pose Selector */}
            <Text style={styles.inputSectionLabel}>POSIÇÃO / ÂNGULO:</Text>
            <View style={styles.poseSelectorGrid}>
              {(['frente', 'costas', 'perfil_esquerdo', 'perfil_direito', 'outro'] as const).map(
                (pose) => {
                  const isSelected = pendingPose === pose;
                  return (
                    <TouchableOpacity
                      key={pose}
                      style={[styles.poseChoiceBtn, isSelected && styles.poseChoiceBtnActive]}
                      onPress={() => setPendingPose(pose)}>
                      <Text
                        style={[
                          styles.poseChoiceText,
                          isSelected && styles.poseChoiceTextActive,
                        ]}>
                        {POSE_LABELS[pose]}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            {/* Linked InBody Data Preview */}
            {latestMetric && (
              <View style={styles.linkedDataCard}>
                <Ionicons name="fitness-outline" size={16} color={GymTheme.colors.primary} />
                <Text style={styles.linkedDataText}>
                  Associado à última avaliação: {latestMetric.weightKg} kg
                  {latestMetric.bodyFatPercentage ? ` • ${latestMetric.bodyFatPercentage}% GC` : ''}
                </Text>
              </View>
            )}

            {/* Notes Input */}
            <TextInput
              style={styles.notesInput}
              placeholder="Notas (opcional, ex: Pump pós-treino costas...)"
              placeholderTextColor={GymTheme.colors.textMuted}
              value={pendingNotes}
              onChangeText={setPendingNotes}
              maxLength={100}
            />

            {/* Action buttons */}
            <View style={styles.saveModalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsSaveModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Descartar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmSaveBtn} onPress={handleSavePhoto}>
                <Text style={styles.confirmSaveText}>Guardar Foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Photo Detail Modal */}
      <Modal
        visible={!!selectedPhotoForDetail}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoForDetail(null)}>
        <View style={styles.detailOverlay}>
          {selectedPhotoForDetail && (
            <View style={styles.detailContainer}>
              <View style={styles.detailHeader}>
                <View>
                  <Text style={styles.detailPose}>{POSE_LABELS[selectedPhotoForDetail.pose]}</Text>
                  <Text style={styles.detailDate}>
                    {new Date(selectedPhotoForDetail.timestamp).toLocaleDateString('pt-PT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedPhotoForDetail(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={26} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <Image
                source={{ uri: selectedPhotoForDetail.uri }}
                style={styles.detailImage}
                resizeMode="contain"
              />

              {/* Bottom InBody summary */}
              <View style={styles.detailFooter}>
                <View style={{ flex: 1 }}>
                  {selectedPhotoForDetail.weightKg ? (
                    <Text style={styles.detailMetrics}>
                      {selectedPhotoForDetail.weightKg} kg
                      {selectedPhotoForDetail.bodyFatPercentage
                        ? ` • ${selectedPhotoForDetail.bodyFatPercentage}% Gordura`
                        : ''}
                    </Text>
                  ) : null}
                  {selectedPhotoForDetail.notes ? (
                    <Text style={styles.detailNotes}>{selectedPhotoForDetail.notes}</Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.deletePhotoBtn}
                  onPress={() => handleDeletePhoto(selectedPhotoForDetail)}>
                  <Ionicons name="trash-outline" size={20} color={GymTheme.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Comparison Modal */}
      <ProgressComparisonModal
        visible={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        photos={progressPhotos}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GymTheme.colors.primary,
    borderRadius: GymTheme.borderRadius.md,
    paddingVertical: 12,
    gap: 6,
  },
  primaryActionText: {
    color: '#052e16',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GymTheme.colors.surface,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    borderRadius: GymTheme.borderRadius.md,
    paddingVertical: 12,
    gap: 6,
  },
  secondaryActionText: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  compareActionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: GymTheme.colors.primary,
    borderRadius: GymTheme.borderRadius.md,
    paddingVertical: 12,
    gap: 6,
  },
  compareActionText: {
    color: GymTheme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: GymTheme.colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  filterChipActive: {
    backgroundColor: GymTheme.colors.primary,
    borderColor: GymTheme.colors.primary,
  },
  filterChipText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#052e16',
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    color: GymTheme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: PHOTO_ITEM_WIDTH,
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  photoThumbnail: {
    width: '100%',
    height: Math.round(PHOTO_ITEM_WIDTH * 1.3),
    backgroundColor: '#1e293b',
  },
  poseBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  poseBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  photoFooter: {
    padding: 8,
  },
  photoDate: {
    color: GymTheme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  photoMetrics: {
    color: GymTheme.colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  saveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  saveModalCard: {
    backgroundColor: GymTheme.colors.cardElevated,
    borderRadius: GymTheme.borderRadius.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  saveModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveModalTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: GymTheme.borderRadius.md,
    backgroundColor: '#1e293b',
  },
  inputSectionLabel: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  poseSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  poseChoiceBtn: {
    backgroundColor: GymTheme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  poseChoiceBtnActive: {
    backgroundColor: GymTheme.colors.primary,
    borderColor: GymTheme.colors.primary,
  },
  poseChoiceText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  poseChoiceTextActive: {
    color: '#052e16',
    fontWeight: '800',
  },
  linkedDataCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  linkedDataText: {
    color: GymTheme.colors.primary,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  notesInput: {
    backgroundColor: GymTheme.colors.inputBackground,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    borderRadius: GymTheme.borderRadius.md,
    color: GymTheme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  saveModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
  },
  confirmSaveBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.md,
  },
  confirmSaveText: {
    color: '#052e16',
    fontSize: 13,
    fontWeight: '800',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  detailContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 30,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detailPose: {
    color: GymTheme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  detailDate: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  detailImage: {
    flex: 1,
    width: '100%',
  },
  detailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  detailMetrics: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  detailNotes: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  deletePhotoBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
  },
});
