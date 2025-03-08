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
}

export default function PDFViewer({ file, fields, onFieldPositionUpdate }: PDFViewerProps) {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  const [embedRect, setEmbedRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<HTMLEmbedElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const fieldsContainerRef = useRef<HTMLDivElement>(null);

  // Load the PDF and get its dimensions
  useEffect(() => {
    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const page = pdfDoc.getPage(0);
        const { width, height } = page.getSize();
        
        setPdfDimensions({ width, height });
        
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
      } catch (error) {
        console.error("Error loading PDF:", error);
      }
    };
    
    loadPdf();
    
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [file]);

  // Update measurements after PDF loads and on resize
  useEffect(() => {
    if (!pdfUrl) return;

    const updateMeasurements = () => {
      if (embedRef.current && fieldsContainerRef.current) {
        const eRect = embedRef.current.getBoundingClientRect();
        const fRect = fieldsContainerRef.current.getBoundingClientRect();
        
        setEmbedRect({
          left: eRect.left - fRect.left,
          top: eRect.top - fRect.top,
          width: eRect.width,
          height: eRect.height
        });
      }
    };

    // Use MutationObserver to detect when PDF is fully loaded in the embed
    const observer = new MutationObserver((mutations) => {
      updateMeasurements();
    });
    
    if (embedRef.current) {
      observer.observe(embedRef.current, { attributes: true, childList: true, subtree: true });
    }
    
    // Initial update with delay to allow PDF to render
    const timeout = setTimeout(updateMeasurements, 1000);
    
    // Update on window resize
    window.addEventListener('resize', updateMeasurements);
    
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
      window.removeEventListener('resize', updateMeasurements);
    };
  }, [pdfUrl]);

  // Calculate the scaling ratio between display and actual PDF
  const getScalingRatio = () => {
    if (embedRect.width === 0 || pdfDimensions.width === 0) return 1;
    return embedRect.width / pdfDimensions.width;
  };


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

  const pdfToDisplayCoords = (x: number, y: number) => {
    const ratio = getScalingRatio();
    
    // PDF coordinates: origin at bottom-left, Y axis goes up
    // Display coordinates: origin at top-left, Y axis goes down
    return {
      x: x * ratio,
      y: (pdfDimensions.height - y) * ratio // Invert Y axis
    };
  };
  
  // Convert display coordinates to PDF coordinates
  const displayToPdfCoords = (x: number, y: number) => {
    const ratio = getScalingRatio();
    
    return {
      x: x / ratio,
      y: pdfDimensions.height - (y / ratio) // Invert Y axis back
    };
  };
  
  // And update the handleDragStop function:
  const handleDragStop = (id: string, e: any, data: { x: number; y: number }) => {
    // Convert display coordinates to PDF coordinates before updating
    const pdfCoords = displayToPdfCoords(data.x, data.y);
    onFieldPositionUpdate(id, pdfCoords.x, pdfCoords.y);
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

  // Log for debugging
  useEffect(() => {
    if (pdfDimensions.width > 0) {
      console.log("PDF Dimensions:", pdfDimensions);
      console.log("Embed Rect:", embedRect);
      console.log("Scaling Ratio:", getScalingRatio());
    }
  }, [pdfDimensions, embedRect]);

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
            height: "100%",
            width: "100%",
            position: "relative"
          }}
        >
          {pdfUrl && (
            <>
              <embed
                ref={embedRef}
                src={pdfUrl}
                type="application/pdf"
                className="w-full h-full border-0"
                style={{ 
                  width: "100%", 
                  height: "100%",
                  minHeight: "600px"
                }}
              />
              
              <div 
                ref={fieldsContainerRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: embedRect.width > 0 ? embedRect.width : "100%",
                  height: embedRect.height > 0 ? embedRect.height : "100%"
                }}
              >
                {fields.map((field) => {
                  // Convert PDF coordinates to display coordinates
                  const displayCoords = pdfToDisplayCoords(field.x, field.y);
                  
                  return (
                    <Draggable
                      key={field.id}
                      defaultPosition={{ x: displayCoords.x, y: displayCoords.y }}
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
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}