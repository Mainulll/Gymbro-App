import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  G,
} from 'react-native-svg';

interface AppLogoProps {
  /** Outer dimension of the icon (it's square). Default: 60 */
  size?: number;
  /** Show rounded corners (app-icon style). Default: true */
  rounded?: boolean;
}

/**
 * GymBro brand icon — a barbell on a purple-to-teal gradient background.
 * Matches assets/icon.svg exactly.
 */
export function AppLogo({ size = 60, rounded = true }: AppLogoProps) {
  const rx = rounded ? (size * 230) / 1024 : 0;

  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="gbBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#7C6FFF" />
          <Stop offset="55%" stopColor="#5A4FD6" />
          <Stop offset="100%" stopColor="#00C9B4" />
        </LinearGradient>
        <LinearGradient id="gbPlate" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="rgba(255,255,255,1.00)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0.88)" />
        </LinearGradient>
      </Defs>

      {/* Background */}
      <Rect width="1024" height="1024" rx={rx} ry={rx} fill="url(#gbBg)" />

      {/* Barbell */}
      <G>
        {/* Left end collar */}
        <Rect x="116" y="448" width="44" height="128" rx="13" fill="rgba(255,255,255,0.65)" />
        {/* Left outer plate */}
        <Rect x="160" y="370" width="76" height="284" rx="18" fill="url(#gbPlate)" />
        {/* Left inner plate */}
        <Rect x="236" y="422" width="50" height="180" rx="13" fill="rgba(255,255,255,0.78)" />
        {/* Horizontal bar */}
        <Rect x="286" y="500" width="452" height="24" rx="12" fill="rgba(255,255,255,0.96)" />
        {/* Right inner plate */}
        <Rect x="738" y="422" width="50" height="180" rx="13" fill="rgba(255,255,255,0.78)" />
        {/* Right outer plate */}
        <Rect x="788" y="370" width="76" height="284" rx="18" fill="url(#gbPlate)" />
        {/* Right end collar */}
        <Rect x="864" y="448" width="44" height="128" rx="13" fill="rgba(255,255,255,0.65)" />
      </G>
    </Svg>
  );
}

/**
 * Horizontal wordmark: [icon] GymBro
 * Use on splash, onboarding, or settings about row.
 */
export { AppLogo as GymBroIcon };
