import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { BodyMetricLog } from '../types/gym';
import GymTheme from '../constants/theme';

interface BodyEvolutionChartProps {
  logs: BodyMetricLog[];
  metricKey: 'weightKg' | 'skeletalMuscleMassKg' | 'bodyFatPercentage';
  title: string;
  unit: string;
  color?: string;
}

export const BodyEvolutionChart: React.FC<BodyEvolutionChartProps> = ({
  logs,
  metricKey,
  title,
  unit,
  color = GymTheme.colors.primary,
}) => {
  // Sort oldest to newest for chronological line
  const sorted = [...logs]
    .filter((l) => l[metricKey] !== undefined && (l[metricKey] as number) > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sorted.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sem dados suficientes para gerar o gráfico.</Text>
      </View>
    );
  }

  const values = sorted.map((l) => l[metricKey] as number);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = Math.max(maxVal - minVal, 2);

  const chartWidth = 320;
  const chartHeight = 140;
  const paddingX = 26;
  const paddingTop = 25;
  const paddingBottom = 25;

  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const points = values.map((val, idx) => {
    const x =
      values.length === 1
        ? chartWidth / 2
        : paddingX + (idx / (values.length - 1)) * usableWidth;
    const y =
      paddingTop + usableHeight - ((val - minVal) / range) * usableHeight;

    const dateFormatted = new Date(sorted[idx].timestamp).toLocaleDateString('pt-PT', {
      month: '2-digit',
      year: '2-digit',
    });

    return { x, y, val, label: dateFormatted };
  });

  let pathD = '';
  if (points.length === 1) {
    pathD = `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y}`;
  } else {
    pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }

  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`
      : '';

  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const diff = Number((lastVal - firstVal).toFixed(1));
  const pctChange = firstVal > 0 ? Number((((lastVal - firstVal) / firstVal) * 100).toFixed(1)) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.currentVal}>
            {lastVal} {unit}
          </Text>
        </View>

        {sorted.length > 1 && (
          <View
            style={[
              styles.changeBadge,
              {
                backgroundColor:
                  metricKey === 'bodyFatPercentage'
                    ? diff <= 0
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)'
                    : diff >= 0
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
              },
            ]}>
            <Text
              style={[
                styles.changeText,
                {
                  color:
                    metricKey === 'bodyFatPercentage'
                      ? diff <= 0
                        ? GymTheme.colors.primary
                        : GymTheme.colors.danger
                      : diff >= 0
                      ? GymTheme.colors.primary
                      : GymTheme.colors.danger,
                },
              ]}>
              {diff >= 0 ? `+${diff}` : `${diff}`} {unit} ({pctChange >= 0 ? `+${pctChange}` : `${pctChange}`}%)
            </Text>
          </View>
        )}
      </View>

      <View style={styles.svgWrapper}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Defs>
            <LinearGradient id="bodyAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          <Line
            x1={paddingX}
            y1={paddingTop}
            x2={chartWidth - paddingX}
            y2={paddingTop}
            stroke={GymTheme.colors.border}
            strokeDasharray="4 4"
          />
          <Line
            x1={paddingX}
            y1={chartHeight - paddingBottom}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingBottom}
            stroke={GymTheme.colors.border}
            strokeDasharray="4 4"
          />

          {areaD ? <Path d={areaD} fill="url(#bodyAreaGradient)" /> : null}

          <Path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((pt, idx) => (
            <React.Fragment key={idx}>
              <Circle
                cx={pt.x}
                cy={pt.y}
                r={4}
                fill={GymTheme.colors.background}
                stroke={color}
                strokeWidth={2}
              />
              <SvgText
                x={pt.x}
                y={pt.y - 8}
                fill={GymTheme.colors.textPrimary}
                fontSize="10"
                fontWeight="700"
                textAnchor="middle">
                {pt.val}
              </SvgText>
              <SvgText
                x={pt.x}
                y={chartHeight - 8}
                fill={GymTheme.colors.textMuted}
                fontSize="9"
                textAnchor="middle">
                {pt.label}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  currentVal: {
    color: GymTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: GymTheme.borderRadius.md,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: GymTheme.colors.textMuted,
    fontSize: 13,
  },
});
