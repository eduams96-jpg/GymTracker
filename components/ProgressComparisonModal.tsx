import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressPhoto, PhotoPose } from '../types/gym';
import GymTheme from '../constants/theme';

interface ProgressComparisonModalProps {
  visible: boolean;
  onClose: () => void;
  photos: ProgressPhoto[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_CONTAINER_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);
const SLIDER_CONTAINER_HEIGHT = Math.round(SLIDER_CONTAINER_WIDTH * 1.33); // 3:4 aspect ratio

export const ProgressComparisonModal: React.FC<ProgressComparisonModalProps> = ({
  visible,
  onClose,
  photos,
}) => {
  const [selectedPose, setSelectedPose] = useState<PhotoPose | 'todas'>('frente');
  const [comparisonMode, setComparisonMode] = useState<'sideBySide' | 'slider'>('sideBySide');

  // Filter photos by pose
  const filteredPhotos = useMemo(() => {
    if (selectedPose === 'todas') return photos;
    return photos.filter((p) => p.pose === selectedPose);
  }, [photos, selectedPose]);

  // Sort photos chronologically (oldest first)
  const sortedPhotos = useMemo(() => {
    return [...filteredPhotos].sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredPhotos]);

  // Default: Photo A is oldest, Photo B is newest
  const [beforePhotoId, setBeforePhotoId] = useState<string | null>(null);
  const [afterPhotoId, setAfterPhotoId] = useState<string | null>(null);

  // Split slider position (0 to 1)
  const [sliderRatio, setSliderRatio] = useState(0.5);

  const beforePhoto = useMemo(() => {
    if (beforePhotoId) {
      const found = sortedPhotos.find((p) => p.id === beforePhotoId);
      if (found) return found;
    }
    return sortedPhotos[0] || null;
  }, [sortedPhotos, beforePhotoId]);

  const afterPhoto = useMemo(() => {
    if (afterPhotoId) {
      const found = sortedPhotos.find((p) => p.id === afterPhotoId);
      if (found) return found;
    }
    return sortedPhotos.length > 1 ? sortedPhotos[sortedPhotos.length - 1] : sortedPhotos[0] || null;
  }, [sortedPhotos, afterPhotoId]);

  // PanResponder for dragging slider handle
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
          const newRatio = Math.max(0.05, Math.min(0.95, gestureState.moveX / SLIDER_CONTAINER_WIDTH));
          setSliderRatio(newRatio);
        },
      }),
    []
  );

  if (!visible) return null;

  // Calculate delta statistics
  const daysDiff =
    beforePhoto && afterPhoto
      ? Math.round(
          Math.abs(afterPhoto.timestamp - beforePhoto.timestamp) / (1000 * 60 * 60 * 24)
        )
      : 0;

  const weightDelta =
    beforePhoto?.weightKg && afterPhoto?.weightKg
      ? (afterPhoto.weightKg - beforePhoto.weightKg).toFixed(1)
      : null;

  const fatDelta =
    beforePhoto?.bodyFatPercentage && afterPhoto?.bodyFatPercentage
      ? (afterPhoto.bodyFatPercentage - beforePhoto.bodyFatPercentage).toFixed(1)
      : null;

  const muscleDelta =
    beforePhoto?.skeletalMuscleMassKg && afterPhoto?.skeletalMuscleMassKg
      ? (afterPhoto.skeletalMuscleMassKg - beforePhoto.skeletalMuscleMassKg).toFixed(1)
      : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles" size={20} color={GymTheme.colors.primary} />
              <Text style={styles.headerTitle}>Comparador Antes vs Depois</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={26} color={GymTheme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[styles.modeBtn, comparisonMode === 'sideBySide' && styles.modeBtnActive]}
              onPress={() => setComparisonMode('sideBySide')}>
              <Ionicons
                name="grid-outline"
                size={16}
                color={comparisonMode === 'sideBySide' ? '#052e16' : GymTheme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeBtnText,
                  comparisonMode === 'sideBySide' && styles.modeBtnTextActive,
                ]}>
                Lado a Lado
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, comparisonMode === 'slider' && styles.modeBtnActive]}
              onPress={() => setComparisonMode('slider')}>
              <Ionicons
                name="swap-horizontal-outline"
                size={16}
                color={comparisonMode === 'slider' ? '#052e16' : GymTheme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeBtnText,
                  comparisonMode === 'slider' && styles.modeBtnTextActive,
                ]}>
                Slider Split
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {sortedPhotos.length < 2 ? (
              <View style={styles.emptyNotice}>
                <Ionicons name="images-outline" size={48} color={GymTheme.colors.textMuted} />
                <Text style={styles.emptyNoticeTitle}>Precisas de pelo menos 2 fotos</Text>
                <Text style={styles.emptyNoticeSub}>
                  Regista fotos em datas diferentes para desbloquear a comparação visual de evolução.
                </Text>
              </View>
            ) : (
              <>
                {/* Evolution Delta Card */}
                <View style={styles.deltaCard}>
                  <View style={styles.deltaHeader}>
                    <Text style={styles.deltaTitle}>DIFERENÇA DE EVOLUÇÃO</Text>
                    <Text style={styles.deltaDays}>
                      {daysDiff} {daysDiff === 1 ? 'dia' : 'dias'} de intervalo
                    </Text>
                  </View>

                  <View style={styles.deltaStatsGrid}>
                    <View style={styles.deltaStatItem}>
                      <Text style={styles.deltaStatLabel}>Peso</Text>
                      <Text
                        style={[
                          styles.deltaStatValue,
                          weightDelta && parseFloat(weightDelta) < 0
                            ? styles.positiveDelta
                            : styles.neutralDelta,
                        ]}>
                        {weightDelta ? (parseFloat(weightDelta) > 0 ? `+${weightDelta} kg` : `${weightDelta} kg`) : '—'}
                      </Text>
                    </View>

                    <View style={styles.deltaStatItem}>
                      <Text style={styles.deltaStatLabel}>% Gordura</Text>
                      <Text
                        style={[
                          styles.deltaStatValue,
                          fatDelta && parseFloat(fatDelta) < 0
                            ? styles.positiveDelta
                            : styles.neutralDelta,
                        ]}>
                        {fatDelta ? (parseFloat(fatDelta) > 0 ? `+${fatDelta}%` : `${fatDelta}%`) : '—'}
                      </Text>
                    </View>

                    <View style={styles.deltaStatItem}>
                      <Text style={styles.deltaStatLabel}>Massa Muscular</Text>
                      <Text
                        style={[
                          styles.deltaStatValue,
                          muscleDelta && parseFloat(muscleDelta) > 0
                            ? styles.positiveDelta
                            : styles.neutralDelta,
                        ]}>
                        {muscleDelta ? (parseFloat(muscleDelta) > 0 ? `+${muscleDelta} kg` : `${muscleDelta} kg`) : '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Side by Side Mode */}
                {comparisonMode === 'sideBySide' && beforePhoto && afterPhoto && (
                  <View style={styles.sideBySideContainer}>
                    {/* Before Photo Card */}
                    <View style={styles.sidePhotoCard}>
                      <View style={styles.sidePhotoBadgeBefore}>
                        <Text style={styles.sidePhotoBadgeText}>ANTES</Text>
                      </View>
                      <Image source={{ uri: beforePhoto.uri }} style={styles.sideImage} resizeMode="cover" />
                      <View style={styles.sidePhotoFooter}>
                        <Text style={styles.sidePhotoDate}>
                          {new Date(beforePhoto.timestamp).toLocaleDateString('pt-PT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                        <Text style={styles.sidePhotoMetrics}>
                          {beforePhoto.weightKg ? `${beforePhoto.weightKg} kg` : ''}
                          {beforePhoto.bodyFatPercentage ? ` • ${beforePhoto.bodyFatPercentage}% GC` : ''}
                        </Text>
                      </View>
                    </View>

                    {/* After Photo Card */}
                    <View style={styles.sidePhotoCard}>
                      <View style={styles.sidePhotoBadgeAfter}>
                        <Text style={styles.sidePhotoBadgeText}>DEPOIS</Text>
                      </View>
                      <Image source={{ uri: afterPhoto.uri }} style={styles.sideImage} resizeMode="cover" />
                      <View style={styles.sidePhotoFooter}>
                        <Text style={styles.sidePhotoDate}>
                          {new Date(afterPhoto.timestamp).toLocaleDateString('pt-PT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                        <Text style={styles.sidePhotoMetrics}>
                          {afterPhoto.weightKg ? `${afterPhoto.weightKg} kg` : ''}
                          {afterPhoto.bodyFatPercentage ? ` • ${afterPhoto.bodyFatPercentage}% GC` : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Split Slider Mode */}
                {comparisonMode === 'slider' && beforePhoto && afterPhoto && (
                  <View style={styles.sliderWrapper}>
                    <Text style={styles.sliderInstruction}>
                      Arrasta para a esquerda / direita para ver a transição
                    </Text>

                    <View style={styles.sliderViewport}>
                      {/* After Photo (Base) */}
                      <Image
                        source={{ uri: afterPhoto.uri }}
                        style={styles.sliderImageFull}
                        resizeMode="cover"
                      />

                      {/* Before Photo (Clipped Overlay) */}
                      <View
                        style={[
                          styles.sliderClippedContainer,
                          { width: SLIDER_CONTAINER_WIDTH * sliderRatio },
                        ]}>
                        <Image
                          source={{ uri: beforePhoto.uri }}
                          style={styles.sliderImageFull}
                          resizeMode="cover"
                        />
                      </View>

                      {/* Draggable Divider Handle */}
                      <View
                        style={[
                          styles.sliderDividerLine,
                          { left: SLIDER_CONTAINER_WIDTH * sliderRatio - 1 },
                        ]}
                        {...panResponder.panHandlers}>
                        <View style={styles.sliderHandlePill}>
                          <Ionicons name="swap-horizontal" size={14} color="#052e16" />
                        </View>
                      </View>

                      {/* Label Overlays */}
                      <View style={styles.sliderLabelLeft}>
                        <Text style={styles.sliderLabelText}>ANTES</Text>
                      </View>
                      <View style={styles.sliderLabelRight}>
                        <Text style={styles.sliderLabelText}>DEPOIS</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Photo Selectors */}
                <View style={styles.selectorSection}>
                  <Text style={styles.selectorSectionTitle}>ESCOLHER FOTO ANTES:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
                    {sortedPhotos.map((p) => {
                      const isSelected = beforePhoto?.id === p.id;
                      return (
                        <TouchableOpacity
                          key={`before-${p.id}`}
                          style={[styles.thumbBtn, isSelected && styles.thumbBtnActive]}
                          onPress={() => setBeforePhotoId(p.id)}>
                          <Image source={{ uri: p.uri }} style={styles.thumbImage} />
                          <Text style={styles.thumbDate}>
                            {new Date(p.timestamp).toLocaleDateString('pt-PT', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={[styles.selectorSectionTitle, { marginTop: 14 }]}>
                    ESCOLHER FOTO DEPOIS:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
                    {sortedPhotos.map((p) => {
                      const isSelected = afterPhoto?.id === p.id;
                      return (
                        <TouchableOpacity
                          key={`after-${p.id}`}
                          style={[styles.thumbBtn, isSelected && styles.thumbBtnActiveAfter]}
                          onPress={() => setAfterPhotoId(p.id)}>
                          <Image source={{ uri: p.uri }} style={styles.thumbImage} />
                          <Text style={styles.thumbDate}>
                            {new Date(p.timestamp).toLocaleDateString('pt-PT', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: GymTheme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.cardBorder,
  },
  headerTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  modeSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: GymTheme.colors.surface,
    borderRadius: GymTheme.borderRadius.md,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: GymTheme.colors.primary,
  },
  modeBtnText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#052e16',
    fontWeight: '800',
  },
  scrollBody: {
    padding: 20,
    gap: 16,
  },
  emptyNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyNoticeTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyNoticeSub: {
    color: GymTheme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  deltaCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    padding: 14,
  },
  deltaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deltaTitle: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deltaDays: {
    color: GymTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  deltaStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deltaStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  deltaStatLabel: {
    color: GymTheme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  deltaStatValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  positiveDelta: {
    color: GymTheme.colors.primary,
  },
  neutralDelta: {
    color: GymTheme.colors.textPrimary,
  },
  sideBySideContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sidePhotoCard: {
    flex: 1,
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  sidePhotoBadgeBefore: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sidePhotoBadgeAfter: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sidePhotoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  sideImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#1e293b',
  },
  sidePhotoFooter: {
    padding: 8,
  },
  sidePhotoDate: {
    color: GymTheme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  sidePhotoMetrics: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  sliderWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  sliderInstruction: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  sliderViewport: {
    width: SLIDER_CONTAINER_WIDTH,
    height: SLIDER_CONTAINER_HEIGHT,
    borderRadius: GymTheme.borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  sliderImageFull: {
    width: SLIDER_CONTAINER_WIDTH,
    height: SLIDER_CONTAINER_HEIGHT,
  },
  sliderClippedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: SLIDER_CONTAINER_HEIGHT,
    overflow: 'hidden',
    zIndex: 2,
  },
  sliderDividerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ffffff',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderHandlePill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GymTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  sliderLabelLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sliderLabelRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sliderLabelText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  selectorSection: {
    marginTop: 10,
  },
  selectorSectionTitle: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  thumbScroll: {
    flexDirection: 'row',
  },
  thumbBtn: {
    marginRight: 10,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbBtnActive: {
    borderColor: '#3b82f6',
  },
  thumbBtnActiveAfter: {
    borderColor: GymTheme.colors.primary,
  },
  thumbImage: {
    width: 64,
    height: 80,
    backgroundColor: '#1e293b',
  },
  thumbDate: {
    color: GymTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 3,
    backgroundColor: GymTheme.colors.surface,
  },
});
