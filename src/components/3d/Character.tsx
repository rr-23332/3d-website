import React from 'react';

export interface CharacterProps {
  modelUrl?: string;
  mousePos?: { x: number; y: number };
  onTargetChange?: (pos: [number, number, number]) => void;
}

// Stub character component while focusing on room interior aesthetics
export const Character: React.FC<CharacterProps> = () => {
  return null;
};
