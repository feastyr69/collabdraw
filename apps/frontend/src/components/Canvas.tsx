import { useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
import { useBoardStore, type DrawingElement } from '../store/useBoardStore';
import { v4 as uuidv4 } from 'uuid';

interface CanvasProps {
 onDrawEnd: (element: DrawingElement) => void;
 elements: DrawingElement[];
}

export default function DrawingCanvas({ onDrawEnd, elements }: CanvasProps) {
 const { tool, color, strokeWidth } = useBoardStore();
 const [isDrawing, setIsDrawing] = useState(false);
 const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
 const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

 useEffect(() => {
 const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
 window.addEventListener('resize', handleResize);
 return () => window.removeEventListener('resize', handleResize);
 }, []);

 const handleMouseDown = (e: any) => {
 setIsDrawing(true);
 const pos = e.target.getStage().getPointerPosition();
 
 const newElement: DrawingElement = {
 id: uuidv4(),
 tool,
 color: tool === 'eraser' ? '#f4f4f5' : color, // Erasing effectively paints over with background color for Level 1, or we can use globalCompositeOperation
 strokeWidth,
 points: [pos],
 x: pos.x,
 y: pos.y,
 width: 0,
 height: 0,
 radius: 0
 };
 
 setCurrentElement(newElement);
 };

 const handleMouseMove = (e: any) => {
 if (!isDrawing || !currentElement) return;

 const pos = e.target.getStage().getPointerPosition();
 
 setCurrentElement(prev => {
 if (!prev) return null;
 
 if (tool === 'pen' || tool === 'eraser') {
 return { ...prev, points: [...prev.points, pos] };
 } else if (tool === 'line') {
 return { ...prev, points: [prev.points[0], pos] };
 } else if (tool === 'rectangle') {
 return { ...prev, width: pos.x - prev.x!, height: pos.y - prev.y! };
 } else if (tool === 'circle') {
 const radius = Math.sqrt(Math.pow(pos.x - prev.x!, 2) + Math.pow(pos.y - prev.y!, 2));
 return { ...prev, radius };
 }
 return prev;
 });
 };

 const handleMouseUp = () => {
 if (!isDrawing || !currentElement) return;
 setIsDrawing(false);
 onDrawEnd(currentElement);
 setCurrentElement(null);
 };

 const renderElement = (el: DrawingElement) => {
 const isEraser = el.tool === 'eraser';
 // Using gray-100 to match background, though dark mode needs handling. 
 // For a real eraser in Konva, we'd use globalCompositeOperation = 'destination-out'.
 
 const commonProps = {
 key: el.id,
 stroke: el.color,
 strokeWidth: el.strokeWidth,
 tension: 0.5,
 lineCap: 'round' as const,
 lineJoin: 'round' as const,
 globalCompositeOperation: isEraser ? 'destination-out' as const : 'source-over' as const,
 };

 if (el.tool === 'pen' || el.tool === 'eraser' || el.tool === 'line') {
 const flatPoints = el.points.flatMap(p => [p.x, p.y]);
 return <Line {...commonProps} points={flatPoints} stroke={isEraser ? 'black' : el.color} strokeWidth={isEraser ? el.strokeWidth * 2 : el.strokeWidth} />;
 } else if (el.tool === 'rectangle') {
 return <Rect {...commonProps} x={el.x} y={el.y} width={el.width} height={el.height} fillEnabled={false} />;
 } else if (el.tool === 'circle') {
 return <Circle {...commonProps} x={el.x} y={el.y} radius={el.radius} fillEnabled={false} />;
 }
 return null;
 };

  const getCursor = () => {
    if (tool === 'eraser') return 'cursor-cell';
    return 'cursor-crosshair';
  };

  return (
    <Stage
      width={dimensions.width}
      height={dimensions.height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      className={getCursor()}
    >
 <Layer>
 {elements.map(renderElement)}
 {currentElement && renderElement(currentElement)}
 </Layer>
 </Stage>
 );
}
