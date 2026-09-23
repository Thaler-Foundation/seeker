import { dark } from '@/theme/tokens';
import { fontFamilies, fontWeights, typography } from '@/theme/typography';
import { Text as NativeText, TextProps as NativeTextProps, TextStyle } from 'react-native';

export type TypographyVariant = keyof typeof typography;
export type FontWeightVariant = keyof typeof fontWeights;

export interface AppTextProps extends NativeTextProps {
  variant?: TypographyVariant;
  weight?: FontWeightVariant;
  color?: string;
  tabular?: boolean;
  align?: 'left' | 'center' | 'right';
  style?: TextStyle | TextStyle[];
}

export function AppText({
  variant = 'body',
  weight,
  color = dark.foreground,
  tabular,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  const baseStyle = typography[variant];

  const weightOverride: TextStyle | undefined = weight
    ? {
        fontFamily: fontFamilies.rounded[weight],
        fontWeight: fontWeights[weight],
      }
    : undefined;

  const dynamicStyle: TextStyle = {
    color,
    ...(align ? { textAlign: align } : {}),
    ...(tabular ? { fontVariant: ['tabular-nums'] } : {}),
  };

  return (
    <NativeText style={[baseStyle, weightOverride, dynamicStyle, style]} {...rest}>
      {children}
    </NativeText>
  );
}

export { AppText as Text };
