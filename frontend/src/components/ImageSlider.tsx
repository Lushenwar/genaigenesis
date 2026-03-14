"use client";

import React, { useState } from 'react';

interface ImageSliderProps {
  beforeUrl: string;
  afterUrl: string;
}

export default function ImageSlider({ beforeUrl, afterUrl }: ImageSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(Math.max(position, 0), 100));
  };

  return (
    <div 
      className="relative w-full h-64 rounded-lg overflow-hidden cursor-ew-resize select-none border border-zinc-800"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      {/* After Image (Background) */}
      <img 
        src={afterUrl} 
        alt="After transformation"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Before Image (Overlay) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden transition-all duration-75"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={beforeUrl} 
          alt="Before transformation"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: `${100 / (sliderPosition / 100)}%` }} // Prevent stretching
        />
      </div>

      {/* Slider Line */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white shadow-xl flex items-center justify-center transition-all duration-75"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-4 h-4 bg-white rounded-full shadow-lg border-2 border-zinc-400"></div>
      </div>

      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-xs font-bold text-white uppercase tracking-widest pointer-events-none">
        Before
      </div>
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-xs font-bold text-white uppercase tracking-widest pointer-events-none">
        After (AI)
      </div>
    </div>
  );
}
