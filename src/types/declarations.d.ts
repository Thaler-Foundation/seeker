declare module 'react-native-qrcode-styled' {
  import { ComponentType } from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  export interface QRCodeProps {
    data: string;
    style?: StyleProp<ViewStyle>;
    padding?: number;
    pieceSize?: number;
    pieceCornerType?: 'rounded' | 'square';
    pieceBorderRadius?: number;
    color?: string;
    backgroundColor?: string;
  }

  const QRCode: ComponentType<QRCodeProps>;
  export default QRCode;
}
