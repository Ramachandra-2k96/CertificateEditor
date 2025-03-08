"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { ZoomIn, ZoomOut, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import Draggable from "react-draggable";
import { TextStyles } from "@/components/TextStyler";

interface PDFViewerProps {
  file: File;
  fields: Array<{ 
    id: string; 
    name: string; 
    x: number; 
    y: number;
    styles?: TextStyles;
  }>;
  onFieldPositionUpdate: (id: string, x: number, y: number) => void;
  onFieldStyleUpdate?: (id: string, styles: TextStyles) => void;
}

export default function PDFViewer({ 
  file, 
  fields, 
  onFieldPositionUpdate,
  onFieldStyleUpdate 
}: PDFViewerProps) {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'EMBED') {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDragStop = (id: string, e: any, data: { x: number; y: number }) => {
    onFieldPositionUpdate(id, data.x, data.y);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale((prev) => Math.min(Math.max(0.5, prev + delta), 2));
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute top-4 right-4 space-x-2 z-10">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setScale((prev) => Math.min(prev + 0.1, 2))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon">
          <Move className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full cursor-grab relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center",
            transition: isDragging ? "none" : "transform 0.2s",
          }}
          className="relative"
        >
          {pdfUrl && (
            <>
              <embed
                src={pdfUrl}
                type="application/pdf"
                className="w-full h-full border-0"
                style={{ minWidth: "800px", minHeight: "1000px" }}
              />
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {fields.map((field) => (
                  <Draggable
                    key={field.id}
                    defaultPosition={{ x: field.x, y: field.y }}
                    onStop={(e, data) => handleDragStop(field.id, e, data)}
                    bounds="parent"
                  >
                    <div
                      className="absolute cursor-move bg-white/90 border border-primary p-2 rounded shadow-lg pointer-events-auto"
                      style={{ 
                        width: "auto", 
                        minWidth: "100px",
                        fontFamily: field.styles?.fontFamily || 'Arial',
                        fontSize: `${field.styles?.fontSize || 16}px`,
                        fontWeight: field.styles?.fontWeight || 'normal',
                        fontStyle: field.styles?.fontStyle || 'normal',
                        textDecoration: field.styles?.textDecoration || 'none',
                        textAlign: field.styles?.textAlign || 'left',
                        color: field.styles?.color || '#000000'
                      }}
                    >
                      {field.name}
                    </div>
                  </Draggable>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}