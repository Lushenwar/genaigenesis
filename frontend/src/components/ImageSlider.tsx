import { useState, useRef, useCallback } from "react";

interface ImageSliderProps {
  before: string;
  after: string;
}

export function ImageSlider({ before, after }: ImageSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current || !dragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-sm overflow-hidden cursor-col-resize select-none border border-border"
      onMouseDown={() => { dragging.current = true; }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onMouseMove={(e) => handleMove(e.clientX)}
    >
      <img src={after} alt="After" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img src={before} alt="Before" className="absolute inset-0 w-full h-full object-cover" style={{ minWidth: `${100 / (position / 100)}%` }} />
      </div>
      <div className="absolute top-0 bottom-0 w-px bg-primary" style={{ left: `${position}%` }}>
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <span className="text-[8px] text-primary-foreground">⟷</span>
        </div>
      </div>
      <span className="absolute top-1.5 left-1.5 text-[10px] font-medium bg-background/80 px-1.5 py-0.5 rounded-sm text-muted-foreground">Before</span>
      <span className="absolute top-1.5 right-1.5 text-[10px] font-medium bg-background/80 px-1.5 py-0.5 rounded-sm text-primary">After</span>
    </div>
  );
}
