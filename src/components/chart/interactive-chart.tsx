import { AppText } from '@/components/ui/text';
import { brand, dark, flow, radius } from '@/theme/tokens';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export interface ChartDataPoint {
  timestamp: number;
  value: number;
}

export interface OverlaySeries {
  data: ChartDataPoint[];
  color?: string;
}

export interface InteractiveChartProps {
  data?: ChartDataPoint[];
  seriesOverlay?: OverlaySeries[];
  color?: string;
  gradientColor?: string;
  height?: number;
  timeframes?: string[];
  initialTimeframe?: string;
  activeTimeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  formatValue?: (val: number) => string;
  formatChange?: (pct: number) => string;
  title?: string;
  showTimeframes?: boolean;
  showHeader?: boolean;
  emptyMessage?: string;
  isSyncing?: boolean;
}

// Monotone cubic spline curve generator (Fritsch-Carlson algorithm)
function buildCubicSplinePath(
  points: { x: number; y: number }[]
): { linePath: string; areaPath: string; height: number; width: number } {
  const n = points.length;
  if (n === 0) return { linePath: '', areaPath: '', height: 0, width: 0 };
  if (n === 1) {
    const p = points[0];
    return {
      linePath: `M ${p.x} ${p.y}`,
      areaPath: `M ${p.x} ${p.y} Z`,
      height: p.y,
      width: p.x,
    };
  }

  const dx: number[] = [];
  const dy: number[] = [];
  const slopes: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dX = points[i + 1].x - points[i].x;
    const dY = points[i + 1].y - points[i].y;
    dx.push(dX);
    dy.push(dY);
    slopes.push(dX === 0 ? 0 : dY / dX);
  }

  const tangents: number[] = new Array(n).fill(0);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const alpha = tangents[i] / slopes[i];
      const beta = tangents[i + 1] / slopes[i];
      const s = alpha * alpha + beta * beta;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        tangents[i] = tau * alpha * slopes[i];
        tangents[i + 1] = tau * beta * slopes[i];
      }
    }
  }

  let linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dX = dx[i];
    const cp1x = (p0.x + dX / 3).toFixed(1);
    const cp1y = (p0.y + (tangents[i] * dX) / 3).toFixed(1);
    const cp2x = (p1.x - dX / 3).toFixed(1);
    const cp2y = (p1.y - (tangents[i + 1] * dX) / 3).toFixed(1);
    linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const first = points[0];
  const last = points[n - 1];
  const bottomY = Math.max(...points.map((p) => p.y)) + 30;
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${bottomY.toFixed(1)} L ${first.x.toFixed(1)} ${bottomY.toFixed(1)} Z`;

  return {
    linePath,
    areaPath,
    height: bottomY,
    width: last.x,
  };
}

export function InteractiveChart({
  data: propData,
  seriesOverlay,
  color = flow.jitoGreen,
  gradientColor,
  height = 190,
  timeframes = ['1D', '1W', '1M', '1Y', 'ALL'],
  initialTimeframe = '1M',
  activeTimeframe: propActiveTimeframe,
  onTimeframeChange,
  formatValue = (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  formatChange = (pct) => `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
  showTimeframes = true,
  showHeader = false,
  emptyMessage,
  isSyncing = false,
}: InteractiveChartProps) {
  const [internalTimeframe, setInternalTimeframe] = useState(initialTimeframe);
  const activeTimeframe = propActiveTimeframe ?? internalTimeframe;

  useEffect(() => {
    if (initialTimeframe) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInternalTimeframe(initialTimeframe);
    }
  }, [initialTimeframe]);

  const [chartWidth, setChartWidth] = useState(340);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);

  const hasValidData = Boolean(propData && propData.length >= 2);
  const hasOverlays = Boolean(seriesOverlay?.some((s) => s.data.length >= 2));
  const hasAnyData = hasValidData || hasOverlays;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = hasValidData
    ? propData!
    // eslint-disable-next-line react-hooks/purity
    : [{ timestamp: Date.now() - 3600, value: 0 }, { timestamp: Date.now(), value: 0 }];

  const paddingY = 24;
  const paddingX = 8;
  const innerHeight = height - paddingY * 2;
  const innerWidth = Math.max(100, chartWidth - paddingX * 2);

  const { points, minValue, maxValue } = useMemo(() => {
    const allData = [
      ...data,
      ...(seriesOverlay?.flatMap((s) => s.data) ?? []),
    ];
    let min = Infinity;
    let max = -Infinity;
    allData.forEach((d) => {
      if (d.value < min) min = d.value;
      if (d.value > max) max = d.value;
    });
    if (min === max) {
      min -= 1;
      max += 1;
    }

    const pts = data.map((d, i) => {
      const x = paddingX + (i / (data.length - 1)) * innerWidth;
      const normalizedY = (d.value - min) / (max - min);
      const y = paddingY + innerHeight - normalizedY * innerHeight;
      return { x, y, data: d };
    });

    return { points: pts, minValue: min, maxValue: max };
  }, [data, seriesOverlay, innerWidth, innerHeight, paddingX, paddingY]);

  const overlayPaths = useMemo(() => {
    if (!seriesOverlay || seriesOverlay.length === 0) return [];
    return seriesOverlay
      .filter((s) => s.data.length >= 2)
      .map((s) => {
        const sorted = [...s.data].sort((a, b) => a.timestamp - b.timestamp);
        const pts = sorted.map((d, i) => {
          const x = paddingX + (i / (sorted.length - 1)) * innerWidth;
          const normalizedY = (d.value - minValue) / (maxValue - minValue);
          const y = paddingY + innerHeight - normalizedY * innerHeight;
          return { x, y };
        });
        const { linePath } = buildCubicSplinePath(pts);
        return { linePath, color: s.color ?? 'rgba(255,255,255,0.18)' };
      });
  }, [seriesOverlay, innerWidth, innerHeight, paddingX, paddingY, minValue, maxValue]);


  const paths = useMemo(() => {
    return buildCubicSplinePath(points.map((p) => ({ x: p.x, y: p.y })));
  }, [points]);

  const isScrubbing = useSharedValue(false);
  const scrubX = useSharedValue(0);
  const scrubY = useSharedValue(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setChartWidth(w);
  }, []);

  const handleScrubUpdate = (xPos: number) => {
    if (points.length < 2) return;
    const clampedX = Math.max(paddingX, Math.min(xPos, paddingX + innerWidth));
    const ratio = (clampedX - paddingX) / innerWidth;
    const index = Math.round(ratio * (points.length - 1));
    const clampedIndex = Math.max(0, Math.min(index, points.length - 1));
    const pt = points[clampedIndex];

    scrubX.value = pt.x;
    scrubY.value = pt.y;
    setScrubIndex(clampedIndex);
  };

  const handleScrubEnd = () => {
    isScrubbing.value = false;
    setScrubIndex(null);
  };

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      isScrubbing.value = true;
      runOnJS(handleScrubUpdate)(e.x);
    })
    .onUpdate((e) => {
      runOnJS(handleScrubUpdate)(e.x);
    })
    .onFinalize(() => {
      runOnJS(handleScrubEnd)();
    });

  const currentPoint = scrubIndex !== null ? points[scrubIndex] : points[points.length - 1];
  const startPoint = points[0];
  const currentValue = currentPoint?.data.value ?? 0;
  const startValue = startPoint?.data.value ?? 1;
  const changePct = ((currentValue - startValue) / (startValue || 1)) * 100;
  const isPositive = changePct >= 0;
  const activeColor = color;
  const areaGradientColor = gradientColor || activeColor;

  const lastPoint = points[points.length - 1] ?? { x: innerWidth, y: height / 2 };

  const scrubberDotStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isScrubbing.value ? 1 : 0, { duration: 150 }),
      transform: [
        { translateX: scrubX.value - 6 },
        { translateY: scrubY.value - 6 },
        { scale: withSpring(isScrubbing.value ? 1 : 0.4) },
      ],
    };
  });

  const scrubberLineStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isScrubbing.value ? 0.75 : 0, { duration: 150 }),
      transform: [{ translateX: scrubX.value }],
    };
  });

  const syncPulse = useSharedValue(0);
  useEffect(() => {
    if (isSyncing) {
      syncPulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 700 }), withTiming(0.25, { duration: 700 })),
        -1,
        true
      );
    } else {
      syncPulse.value = withTiming(0, { duration: 200 });
    }
  }, [isSyncing, syncPulse]);

  const syncDotStyle = useAnimatedStyle(() => ({ opacity: syncPulse.value }));

  if (!hasAnyData) {
    return (
      <View style={[styles.container, styles.emptyContainer, { height }]}>
        <AppText variant="caption" color={dark.mutedForeground} style={styles.emptyText}>
          {emptyMessage ?? 'No data yet.'}
        </AppText>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.valueRow}>
            <AppText variant="monoLg" color={dark.foreground} tabular>
              {formatValue(currentValue)}
            </AppText>
            <View style={[styles.badge, { backgroundColor: isPositive ? 'rgba(20,241,149,0.12)' : 'rgba(239,68,68,0.12)' }]}>
              <AppText
                variant="captionBold"
                color={isPositive ? flow.jitoGreen : brand.error}
                tabular
              >
                {formatChange(changePct)}
              </AppText>
            </View>
          </View>
          <View style={styles.captionRow}>
            <AppText variant="caption" color={dark.mutedForeground}>
              {scrubIndex !== null && currentPoint
                ? new Date(currentPoint.data.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : `${activeTimeframe} Performance`}
            </AppText>
            {isSyncing ? <Animated.View style={[styles.syncDot, syncDotStyle]} /> : null}
          </View>
        </View>
      )}

      <GestureDetector gesture={panGesture}>
        <View onLayout={onLayout} style={[styles.chartWrapper, { height }]}>
          <Svg width={chartWidth} height={height}>
            <Defs>
              <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={areaGradientColor} stopOpacity="0.32" />
                <Stop offset="55%" stopColor={areaGradientColor} stopOpacity="0.08" />
                <Stop offset="100%" stopColor={areaGradientColor} stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {hasValidData && paths.areaPath ? (
              <Path d={paths.areaPath} fill="url(#chartGradient)" />
            ) : null}

            {overlayPaths.map((op, idx) =>
              op.linePath ? (
                <Path
                  key={`overlay-${idx}`}
                  d={op.linePath}
                  fill="none"
                  stroke={op.color}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.35}
                />
              ) : null
            )}

            {hasValidData && paths.linePath ? (
              <Path
                d={paths.linePath}
                fill="none"
                stroke={activeColor}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {hasValidData && scrubIndex === null ? (
              <>
                <Circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r={7}
                  fill={activeColor}
                  opacity={0.25}
                />
                <Circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r={3.5}
                  fill={activeColor}
                />
              </>
            ) : null}
          </Svg>

          <Animated.View
            pointerEvents="none"
            style={[styles.scrubberLine, scrubberLineStyle, { height }]}
          />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.scrubberDot,
              scrubberDotStyle,
              { borderColor: activeColor, shadowColor: activeColor },
            ]}
          >
            <View style={[styles.scrubberInnerDot, { backgroundColor: activeColor }]} />
          </Animated.View>
        </View>
      </GestureDetector>

      {showTimeframes && (
        <View style={styles.timeframeRow}>
          {timeframes.map((tf) => {
            const active = tf === activeTimeframe;
            return (
              <Pressable
                key={tf}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                onPress={() => {
                  setInternalTimeframe(tf);
                  onTimeframeChange?.(tf);
                }}
                style={[
                  styles.tfPill,
                  active && [
                    styles.tfPillActive,
                    color ? { backgroundColor: `${color}22` } : null,
                  ],
                ]}
              >
                <AppText
                  variant="caption"
                  color={active ? dark.foreground : dark.mutedForeground}
                  weight={active ? 'bold' : 'medium'}
                >
                  {tf}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
  },
  header: {
    paddingHorizontal: 4,
    gap: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: brand.success,
  },
  chartWrapper: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  scrubberLine: {
    position: 'absolute',
    top: 0,
    width: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
  },
  scrubberDot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: dark.background,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  scrubberInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  timeframeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.full,
    padding: 3,
    marginTop: 6,
  },
  tfPill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: radius.full,
  },
  tfPillActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    textAlign: 'center',
  },
});
