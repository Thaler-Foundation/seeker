import { dark } from '@/theme/tokens';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export type TabName = 'home' | 'portfolio' | 'create' | 'wallet' | 'analytics';

type AnimatedTabIconProps = {
  name: TabName;
  focused: boolean;
};

const TAB_ACCENTS: Record<TabName, { active: string; halo: string; gradient: [string, string] }> = {
  home: {
    active: '#FFFFFF',
    halo: 'rgba(255, 255, 255, 0.18)',
    gradient: ['#FFFFFF', '#D1D5DB'],
  },
  portfolio: {
    active: '#14F195',
    halo: 'rgba(20, 241, 149, 0.25)',
    gradient: ['#14F195', '#0EBD74'],
  },
  create: {
    active: '#3387FF',
    halo: 'rgba(51, 135, 255, 0.35)',
    gradient: ['#5B9DF9', '#0055FF'],
  },
  wallet: {
    active: '#9945FF',
    halo: 'rgba(153, 69, 255, 0.28)',
    gradient: ['#B77AFF', '#7A22E0'],
  },
  analytics: {
    active: '#38BDF8',
    halo: 'rgba(56, 189, 248, 0.22)',
    gradient: ['#38BDF8', '#0284C7'],
  },
};

export function AnimatedTabIcon({ name, focused }: AnimatedTabIconProps) {
  const scale = useSharedValue(focused ? 1.08 : 1);
  const activeProg = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, { damping: 14, stiffness: 220 });
    activeProg.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 200 });
  }, [focused, scale, activeProg]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: withTiming(activeProg.value, { duration: 180 }),
    transform: [{ scale: interpolate(activeProg.value, [0, 1], [0.85, 1.12]) }],
  }));

  const accent = TAB_ACCENTS[name];
  const outlineColor = focused ? accent.active : 'rgba(255, 255, 255, 0.42)';

  return (
    <Animated.View style={[s.iconContainer, animStyle]}>
      {name !== 'create' && (
        <Animated.View
          style={[
            s.glowHalo,
            { backgroundColor: accent.halo, shadowColor: accent.active },
            haloStyle,
          ]}
        />
      )}

      <MultiLayerTabGlyph
        name={name}
        focused={focused}
        accent={accent}
        outlineColor={outlineColor}
      />
    </Animated.View>
  );
}

function MultiLayerTabGlyph({
  name,
  focused,
  accent,
  outlineColor,
}: {
  name: TabName;
  focused: boolean;
  accent: (typeof TAB_ACCENTS)[TabName];
  outlineColor: string;
}) {
  const size = 28;

  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Defs>
            <LinearGradient id="homeGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={accent.gradient[0]} stopOpacity={focused ? 0.35 : 0} />
              <Stop offset="100%" stopColor={accent.gradient[1]} stopOpacity={focused ? 0.1 : 0} />
            </LinearGradient>
          </Defs>
          <Path
            d="M4.5 12.981C4.5 12.16 4.5 11.7495 4.60181 11.3687C4.69203 11.0313 4.84046 10.7122 5.04042 10.4259C5.2661 10.1028 5.58012 9.83833 6.20815 9.30946L10.9081 5.35156C12.0071 4.4261 12.5566 3.96338 13.1711 3.78672C13.7127 3.63099 14.2873 3.63099 14.8289 3.78672C15.4434 3.96338 15.9929 4.4261 17.0919 5.35156L21.7919 9.30946C22.4199 9.83833 22.7339 10.1028 22.9596 10.4259C23.1595 10.7122 23.308 11.0313 23.3982 11.3687C23.5 11.7495 23.5 12.16 23.5 12.981V18.9479C23.5 20.6281 23.5 21.4681 23.173 22.1099C22.8854 22.6744 22.4265 23.1333 21.862 23.4209C21.2202 23.7479 20.3802 23.7479 18.7 23.7479H9.3C7.61984 23.7479 6.77976 23.7479 6.13803 23.4209C5.57354 23.1333 5.1146 22.6744 4.82698 22.1099C4.5 21.4681 4.5 20.6281 4.5 18.9479V12.981Z"
            fill="url(#homeGrad)"
          />
          <Path
            d="M15.1745 2.58539C14.4071 2.36477 13.5931 2.36477 12.8258 2.58539C12.3258 2.72913 11.9018 2.97781 11.4904 3.27437C11.1004 3.55559 10.6577 3.92841 10.1373 4.36659L5.30442 8.43634C4.77279 8.88333 4.33774 9.24912 4.01573 9.7102C3.73245 10.1158 3.52217 10.5678 3.39436 11.0458C3.24909 11.5891 3.24953 12.1575 3.25006 12.8521L3.25013 18.9977C3.25011 19.7954 3.25009 20.4686 3.29515 21.0201C3.34234 21.5976 3.44511 22.1509 3.71335 22.6774C4.12081 23.477 4.77098 24.1272 5.57067 24.5347C6.09712 24.8029 6.65039 24.9057 7.22795 24.9529C7.77944 24.9979 8.45262 24.9979 9.25019 24.9979H18.75C19.5476 24.9979 20.2208 24.9979 20.7723 24.9529C21.3499 24.9057 21.9031 24.8029 22.4296 24.5347C23.2293 24.1272 23.8794 23.477 24.2869 22.6774C24.5551 22.1509 24.6579 21.5976 24.7051 21.0201C24.7502 20.4686 24.7501 19.7954 24.7501 18.9978L24.7502 12.8521C24.7507 12.1575 24.7512 11.5891 24.6059 11.0458C24.4781 10.5678 24.2678 10.1158 23.9845 9.7102C23.6625 9.24912 23.2275 8.88334 22.6959 8.43635L17.8629 4.3666C17.3426 3.92842 16.8999 3.55559 16.5098 3.27437C16.0985 2.97781 15.6744 2.72913 15.1745 2.58539ZM13.5166 4.98805C13.8325 4.89721 14.1677 4.89721 14.4837 4.98805C14.5981 5.02096 14.7561 5.09197 15.0478 5.30231C15.3523 5.52183 15.723 5.83291 16.2868 6.3077L20.9868 10.2656C21.6662 10.8377 21.8252 10.9846 21.9349 11.1416C22.0515 11.3086 22.1381 11.4948 22.1907 11.6916C22.2402 11.8766 22.2501 12.0928 22.2501 12.981V18.9479C22.2501 19.8086 22.2492 20.379 22.2134 20.8165C22.1789 21.2395 22.1181 21.4271 22.0594 21.5424C21.8916 21.8717 21.6239 22.1394 21.2946 22.3072C21.1793 22.3659 20.9917 22.4266 20.5687 22.4612C20.1312 22.4969 19.5608 22.4979 18.7001 22.4979H9.30013C8.43942 22.4979 7.86907 22.4969 7.43153 22.4612C7.00857 22.4266 6.82093 22.3659 6.70565 22.3072C6.37636 22.1394 6.10865 21.8717 5.94087 21.5424C5.88213 21.4271 5.82141 21.2395 5.78685 20.8165C5.7511 20.379 5.75013 19.8086 5.75013 18.9479V12.981C5.75013 12.0928 5.76006 11.8766 5.80952 11.6916C5.86214 11.4948 5.94873 11.3086 6.06538 11.1416C6.17502 10.9846 6.33403 10.8377 7.01345 10.2656L11.7134 6.3077C12.2773 5.83291 12.6479 5.52183 12.9524 5.30231C13.2442 5.09197 13.4021 5.02096 13.5166 4.98805Z"
            fill={outlineColor}
          />
          <Path
            d="M11 16.4C11 15.5599 11 15.1399 11.1635 14.819C11.3073 14.5368 11.5368 14.3073 11.819 14.1635C12.1399 14 12.5599 14 13.4 14H14.6C15.4401 14 15.8601 14 16.181 14.1635C16.4632 14.3073 16.6927 14.5368 16.8365 14.819C17 15.1399 17 15.5599 17 16.4V18.6C17 19.4401 17 19.8601 16.8365 20.181C16.6927 20.4632 16.4632 20.6927 16.181 20.8365C15.8601 21 15.4401 21 14.6 21H13.4C12.5599 21 12.1399 21 11.819 20.8365C11.5368 20.6927 11.3073 20.4632 11.1635 20.181C11 19.8601 11 19.4401 11 18.6V16.4Z"
            fill={focused ? accent.active : outlineColor}
          />
        </Svg>
      );

    case 'portfolio':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Defs>
            <LinearGradient id="activityGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={accent.gradient[0]} stopOpacity={focused ? 0.35 : 0} />
              <Stop offset="100%" stopColor={accent.gradient[1]} stopOpacity={focused ? 0.08 : 0} />
            </LinearGradient>
          </Defs>
          <Path
            d="M24 14C24 19.5228 19.5228 24 14 24C8.47715 24 4 19.5228 4 14C4 8.47715 8.47715 4 14 4C19.5228 4 24 8.47715 24 14Z"
            fill="url(#activityGrad)"
          />
          <Path
            d="M14 2.75C7.7868 2.75 2.75 7.7868 2.75 14C2.75 20.2132 7.7868 25.25 14 25.25C20.2132 25.25 25.25 20.2132 25.25 14C25.25 7.7868 20.2132 2.75 14 2.75ZM5.25 14C5.25 9.16751 9.16751 5.25 14 5.25C18.8325 5.25 22.75 9.16751 22.75 14C22.75 18.8325 18.8325 22.75 14 22.75C9.16751 22.75 5.25 18.8325 5.25 14Z"
            fill={outlineColor}
          />
          <Path
            d="M14 6.75C14.6904 6.75 15.25 7.30964 15.25 8V14C15.25 14.6904 14.6904 15.25 14 15.25H10C9.30964 15.25 8.75 14.6904 8.75 14C8.75 13.3096 9.30964 12.75 10 12.75H12.75V8C12.75 7.30964 13.3096 6.75 14 6.75Z"
            fill={focused ? accent.active : outlineColor}
          />
        </Svg>
      );

    case 'create':
      return (
        <View style={s.createCircle}>
          <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
            <Circle cx={14} cy={14} r={13} fill="#2563EB" />
            <Path
              d="M14 9v10M9 14h10"
              stroke="#FFFFFF"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      );

    case 'wallet':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Defs>
            <LinearGradient id="walletGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={accent.gradient[0]} stopOpacity={focused ? 0.35 : 0} />
              <Stop offset="100%" stopColor={accent.gradient[1]} stopOpacity={focused ? 0.08 : 0} />
            </LinearGradient>
          </Defs>
          <Path
            d="M5 9a3 3 0 0 1 3-3h12a2 2 0 0 1 2 2v2H6a2 2 0 0 0-1 1.73V19a3 3 0 0 1-1-2.2V9z"
            fill="url(#walletGrad)"
          />
          <Path
            d="M3 11a4 4 0 0 1 4-4h14a2 2 0 0 1 2 2v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V11zm4-2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2H7z"
            fill={outlineColor}
            fillRule="evenodd"
          />
          <Path
            d="M17 12h5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"
            fill={focused ? accent.active : outlineColor}
          />
          <Circle cx={18.5} cy={15} r={1.2} fill={dark.background} />
        </Svg>
      );

    case 'analytics':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Defs>
            <LinearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={accent.gradient[0]} stopOpacity={focused ? 0.4 : 0} />
              <Stop offset="100%" stopColor={accent.gradient[1]} stopOpacity={focused ? 0.08 : 0} />
            </LinearGradient>
          </Defs>
          <Path
            d="M13.49 25.75C19.37 25.75 23.284 21.826 23.284 15.926C23.284 6.307 14.963 2.25 9.34 2.25C8.001 2.25 7.085 2.827 7.085 3.867C7.085 4.268 7.27 4.691 7.548 5.03C8.949 6.73 9.937 8.14 9.979 9.912C9.237 8.46 8.424 8.027 7.651 8.027C6.961 8.027 6.508 8.46 6.508 9.232C6.508 9.706 6.58 10.087 6.58 10.756C6.58 13.279 4.716 14.072 4.716 18.129C4.716 22.702 8.228 25.75 13.49 25.75Z"
            fill="url(#starGrad)"
          />
          <Path
            d="M13.49 25.75C19.37 25.75 23.284 21.826 23.284 15.926C23.284 6.307 14.963 2.25 9.34 2.25C8.001 2.25 7.085 2.827 7.085 3.867C7.085 4.268 7.27 4.691 7.548 5.03C8.949 6.73 9.937 8.14 9.979 9.912C9.237 8.46 8.424 8.027 7.651 8.027C6.961 8.027 6.508 8.46 6.508 9.232C6.508 9.706 6.58 10.087 6.58 10.756C6.58 13.279 4.716 14.072 4.716 18.129C4.716 22.702 8.228 25.75 13.49 25.75ZM13.779 21.693C11.873 21.693 10.627 20.58 10.627 18.902C10.627 17.203 11.801 16.75 11.946 15.277C11.966 15.071 12.193 14.927 12.409 15.122C12.8 15.524 13.078 16.029 13.284 16.719C13.758 15.73 13.779 14.515 13.562 13.176C13.501 12.898 13.737 12.764 13.964 12.857C16.096 13.753 17.342 15.833 17.342 18.047C17.342 20.158 15.993 21.693 13.779 21.693Z"
            fill={outlineColor}
            fillRule="evenodd"
          />
        </Svg>
      );
  }
}

const s = StyleSheet.create({
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowHalo: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  createCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
