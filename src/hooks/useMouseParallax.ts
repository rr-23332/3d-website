import { useRef, useEffect } from 'react';

export interface MousePos {
  x: number; // Normalized -1 to 1
  y: number; // Normalized -1 to 1
}

export const useMouseParallax = () => {
  const mousePosRef = useRef<MousePos>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize pointer coordinates relative to window viewport (-1 to +1)
      mousePosRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePosRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return mousePosRef.current;
};
