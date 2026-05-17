import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Line, G, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const VP_X = width / 2;
const VP_Y = height * 0.28;
const GRID_COLS = 9;
const GRID_ROWS = 8;

export function DepthGrid() {
  // Vertical lines radiating from vanishing point
  const verticals: React.ReactNode[] = [];
  for (let i = 0; i <= GRID_COLS; i++) {
    const t = i / GRID_COLS;
    const bx = width * t;
    const opacity = 0.12 + Math.abs(t - 0.5) * 0.06;
    verticals.push(
      <Line
        key={`v${i}`}
        x1={VP_X} y1={VP_Y}
        x2={bx} y2={height}
        stroke="#BF00FF"
        strokeWidth={0.8}
        opacity={opacity}
      />
    );
  }

  // Horizontal lines as trapezoids
  const horizontals: React.ReactNode[] = [];
  for (let j = 1; j <= GRID_ROWS; j++) {
    const t = Math.pow(j / GRID_ROWS, 2.2);
    const y = VP_Y + (height - VP_Y) * t;
    const x0 = VP_X + (0 - VP_X) * t;
    const x1 = VP_X + (width - VP_X) * t;
    const lineOpacity = t * 0.2;
    horizontals.push(
      <Line
        key={`h${j}`}
        x1={x0} y1={y}
        x2={x1} y2={y}
        stroke="#BF00FF"
        strokeWidth={0.7}
        opacity={lineOpacity}
      />
    );
  }

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, opacity: 0.9 }}
      pointerEvents="none"
    >
      {verticals}
      {horizontals}
    </Svg>
  );
}
