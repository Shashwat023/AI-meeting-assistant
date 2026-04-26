'use client';

import { useState, useCallback, useEffect } from 'react';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  className?: string;
}

export function ResizeHandle({ direction, onResize, className = '' }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = direction === 'horizontal' ? e.movementX : e.movementY;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, direction, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        ${direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
        hover:bg-indigo-500/50 active:bg-indigo-500
        transition-colors duration-150
        flex items-center justify-center
        ${className}
      `}
    >
      <div
        className={`
          ${direction === 'horizontal' ? 'w-0.5 h-8' : 'w-8 h-0.5'}
          rounded-full
          ${isDragging ? 'bg-indigo-500' : 'bg-white/10 hover:bg-white/20'}
          transition-colors duration-150
        `}
      />
    </div>
  );
}
