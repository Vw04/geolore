import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<Size, { r: number; fontSize: number; gap: number }> = {
  sm: { r: 14, fontSize: 24, gap: 8 },
  md: { r: 18, fontSize: 30, gap: 10 },
  lg: { r: 24, fontSize: 40, gap: 12 },
  xl: { r: 32, fontSize: 52, gap: 14 },
};

function GlobeIcon({ r }: { r: number }) {
  const cx = r + 2;
  const cy = r + 2;
  const size = (r + 2) * 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer circle */}
      <Circle cx={cx} cy={cy} r={r} stroke="#FFFFF0" strokeWidth={1.5} fill="none" />
      {/* Latitude lines */}
      <Ellipse cx={cx} cy={cy - r * 0.3} rx={r * 0.95} ry={r * 0.25} stroke="#FFFFF0" strokeWidth={1} fill="none" />
      <Ellipse cx={cx} cy={cy + r * 0.3} rx={r * 0.95} ry={r * 0.25} stroke="#FFFFF0" strokeWidth={1} fill="none" />
      {/* Longitude arc */}
      <Ellipse cx={cx} cy={cy} rx={r * 0.42} ry={r} stroke="#FFFFF0" strokeWidth={1} fill="none" />
      {/* Teal accent at lower-left */}
      <Ellipse cx={cx - r * 0.35} cy={cy + r * 0.45} rx={r * 0.28} ry={r * 0.18} fill="#2A9D8F" />
    </Svg>
  );
}

export default function BrandLogo({ size = 'md' }: { size?: Size }) {
  const { r, fontSize, gap } = SIZES[size];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      <GlobeIcon r={r} />
      <Text style={{ fontFamily: 'Helvetica', fontSize, fontWeight: '700', color: '#FFFFF0', letterSpacing: -0.5 }}>
        Geolore
      </Text>
    </View>
  );
}
