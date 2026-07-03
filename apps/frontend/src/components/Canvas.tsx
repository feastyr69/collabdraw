import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Line, Rect, Circle, Transformer } from 'react-konva';
import { useBoardStore, type DrawingElement, type Point } from '../store/useBoardStore';
import { v4 as uuidv4 } from 'uuid';

interface CanvasProps {
  onDrawEnd: (element: DrawingElement) => void;
  onElementUpdate: (id: string, updates: any) => void;
  elements: DrawingElement[];
}

export default function DrawingCanvas({ onDrawEnd, onElementUpdate, elements }: CanvasProps) {
  const { tool, color, strokeWidth, scale, position, zoom, setLastEditedArea, setPosition, selectedIds, setSelectedIds } = useBoardStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
  const [dragBox, setDragBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [dragOffset, setDragOffset] = useState({x: 0, y: 0});
  
  const layerRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const dragBoxRef = useRef<{x: number, y: number} | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (trRef.current && layerRef.current) {
      if (selectedIds.length > 0) {
        const nodes = selectedIds.map(id => layerRef.current.findOne(`#el-${id}`)).filter(Boolean);
        trRef.current.nodes(nodes);
        trRef.current.getLayer().batchDraw();
        
        // Calculate combined bounding box for drag overlay
        if (nodes.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          nodes.forEach(node => {
            const box = node.getClientRect({ skipTransform: false });
            const transform = layerRef.current.getAbsoluteTransform().copy();
            transform.invert();
            const topLeft = transform.point({ x: box.x, y: box.y });
            const bottomRight = transform.point({ x: box.x + box.width, y: box.y + box.height });
            
            minX = Math.min(minX, topLeft.x);
            minY = Math.min(minY, topLeft.y);
            maxX = Math.max(maxX, bottomRight.x);
            maxY = Math.max(maxY, bottomRight.y);
          });
          setDragBox({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
        }
      } else {
        trRef.current.nodes([]);
        setDragBox(null);
      }
    }
  }, [selectedIds, elements]);

  const getBoundingBox = (el: DrawingElement) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (el.points && el.points.length > 0) {
      const isRelative = el.points[0].x === 0 && el.points[0].y === 0;
      const startX = isRelative ? 0 : el.points[0].x;
      const startY = isRelative ? 0 : el.points[0].y;
      
      el.points.forEach(p => { 
        minX = Math.min(minX, p.x - startX); 
        minY = Math.min(minY, p.y - startY); 
        maxX = Math.max(maxX, p.x - startX); 
        maxY = Math.max(maxY, p.y - startY); 
      });
      
      minX += el.x || 0;
      minY += el.y || 0;
      maxX += el.x || 0;
      maxY += el.y || 0;
    } else if (el.tool === 'rectangle') {
      minX = Math.min(el.x || 0, (el.x || 0) + (el.width || 0));
      minY = Math.min(el.y || 0, (el.y || 0) + (el.height || 0));
      maxX = Math.max(el.x || 0, (el.x || 0) + (el.width || 0));
      maxY = Math.max(el.y || 0, (el.y || 0) + (el.height || 0));
    } else if (el.tool === 'circle') {
      minX = (el.x || 0) - (el.radius || 0);
      minY = (el.y || 0) - (el.radius || 0);
      maxX = (el.x || 0) + (el.radius || 0);
      maxY = (el.y || 0) + (el.radius || 0);
    }
    
    return { minX, minY, maxX, maxY };
  };

  const checkIntersectionRect = (el: DrawingElement, box: any) => {
    const elBox = getBoundingBox(el);
    const boxMinX = Math.min(box.x, box.x + box.width);
    const boxMinY = Math.min(box.y, box.y + box.height);
    const boxMaxX = Math.max(box.x, box.x + box.width);
    const boxMaxY = Math.max(box.y, box.y + box.height);
    return !(elBox.maxX < boxMinX || elBox.minX > boxMaxX || elBox.maxY < boxMinY || elBox.minY > boxMaxY);
  };

  const checkIntersectionLasso = (el: DrawingElement, loop: Point[]) => {
    const elBox = getBoundingBox(el);
    const pointsToCheck = [
      { x: elBox.minX, y: elBox.minY },
      { x: elBox.maxX, y: elBox.minY },
      { x: elBox.minX, y: elBox.maxY },
      { x: elBox.maxX, y: elBox.maxY },
      { x: (elBox.minX + elBox.maxX) / 2, y: (elBox.minY + elBox.maxY) / 2 }
    ];
    
    return pointsToCheck.some(p => {
      let inside = false;
      for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
        let xi = loop[i].x, yi = loop[i].y;
        let xj = loop[j].x, yj = loop[j].y;
        let intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    });
  };

  const getRelativePointerPosition = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    return {
      x: (pos.x - position.x) / scale,
      y: (pos.y - position.y) / scale
    };
  };

  const handleMouseDown = (e: any) => {
    if (isSpacePressed) {
      setIsPanning(true);
      setPanStart({
        x: (e.evt.clientX || (e.evt.touches && e.evt.touches[0].clientX) || 0) - position.x,
        y: (e.evt.clientY || (e.evt.touches && e.evt.touches[0].clientY) || 0) - position.y
      });
      return;
    }

    const pos = getRelativePointerPosition(e);

    if (tool === 'select-rect' || tool === 'select-lasso') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setIsDrawing(true);
        if (tool === 'select-rect') {
          setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
        } else {
          setLassoPoints([pos]);
        }
        setSelectedIds([]);
      } else {
        const id = e.target.id();
        if (id && id.startsWith('el-')) {
          const actualId = id.replace('el-', '');
          if (!selectedIds.includes(actualId)) {
            setSelectedIds([actualId]);
          }
        }
      }
      return;
    }

    setIsDrawing(true);
 
    const newElement: DrawingElement = {
      id: uuidv4(),
      tool,
      color: tool === 'eraser' ? '#f4f4f5' : color, 
      strokeWidth,
      points: [{ x: 0, y: 0 }],
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      radius: 0
    };
 
    setCurrentElement(newElement);
  };

  const handleMouseMove = (e: any) => {
    if (isPanning) {
      setPosition({
        x: (e.evt.clientX || (e.evt.touches && e.evt.touches[0].clientX) || 0) - panStart.x,
        y: (e.evt.clientY || (e.evt.touches && e.evt.touches[0].clientY) || 0) - panStart.y
      });
      return;
    }

    const pos = getRelativePointerPosition(e);

    if (isDrawing && tool === 'select-rect' && selectionBox) {
      setSelectionBox({ ...selectionBox, width: pos.x - selectionBox.x, height: pos.y - selectionBox.y });
      return;
    }

    if (isDrawing && tool === 'select-lasso' && lassoPoints.length > 0) {
      setLassoPoints([...lassoPoints, pos]);
      return;
    }

    if (!isDrawing || !currentElement) return;

    setCurrentElement(prev => {
      if (!prev) return null;
      
      if (tool === 'pen' || tool === 'eraser') {
        return { ...prev, points: [...prev.points, { x: pos.x - (prev.x || 0), y: pos.y - (prev.y || 0) }] };
      } else if (tool === 'line') {
        return { ...prev, points: [prev.points[0], { x: pos.x - (prev.x || 0), y: pos.y - (prev.y || 0) }] };
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
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing && tool === 'select-rect' && selectionBox) {
      setIsDrawing(false);
      const selected = elements.filter(el => checkIntersectionRect(el, selectionBox)).map(el => el.id);
      setSelectedIds(selected);
      setSelectionBox(null);
      return;
    }

    if (isDrawing && tool === 'select-lasso' && lassoPoints.length > 0) {
      setIsDrawing(false);
      const selected = elements.filter(el => checkIntersectionLasso(el, lassoPoints)).map(el => el.id);
      setSelectedIds(selected);
      setLassoPoints([]);
      return;
    }

    if (!isDrawing || !currentElement) return;
    setIsDrawing(false);

    let lastX = currentElement.x;
    let lastY = currentElement.y;
    if (currentElement.points && currentElement.points.length > 0) {
      lastX = currentElement.points[0].x;
      lastY = currentElement.points[0].y;
    }
    if (lastX !== undefined && lastY !== undefined) {
      setLastEditedArea({ x: lastX, y: lastY });
    }

    onDrawEnd(currentElement);
    setCurrentElement(null);
  };

  const handleTransformEnd = (e: any, id: string) => {
    const node = e.target;
    onElementUpdate(id, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation()
    });
  };

  const handleDragStartNode = (e: any) => {
    if (selectedIds.length <= 1) return;
    const layer = e.target.getLayer();
    selectedIds.forEach(id => {
      const node = layer.findOne(`#el-${id}`);
      if (node) {
        node.setAttr('startX', node.x());
        node.setAttr('startY', node.y());
      }
    });
  };

  const handleGroupDragStart = (e: any) => {
    if (dragBox) {
      dragBoxRef.current = { x: dragBox.x, y: dragBox.y };
    }
  };

  const handleGroupDragMove = (e: any) => {
    const rect = e.target;
    const startDragBox = dragBoxRef.current;
    
    const dx = startDragBox ? rect.x() - startDragBox.x : 0;
    const dy = startDragBox ? rect.y() - startDragBox.y : 0;

    setDragOffset({ x: dx, y: dy });
  };

  const handleGroupDragEnd = (e: any) => {
    const dx = dragOffset.x;
    const dy = dragOffset.y;
    
    selectedIds.forEach(selId => {
      const el = elements.find(e => e.id === selId);
      if (el) {
        onElementUpdate(selId, {
          x: (el.x || 0) + dx,
          y: (el.y || 0) + dy
        });
      }
    });
    
    setDragOffset({ x: 0, y: 0 });
    
    // reset rect position manually since state hasn't updated dragBox yet
    if (dragBox) {
      e.target.x(dragBox.x);
      e.target.y(dragBox.y);
    }
  };

  const handleDragEndNode = (e: any, id: string) => {
    const node = e.target;
    
    if (selectedIds.length > 1 && selectedIds.includes(id)) {
      const layer = node.getLayer();
      selectedIds.forEach(selId => {
        const otherNode = layer.findOne(`#el-${selId}`);
        if (otherNode) {
          onElementUpdate(selId, {
            x: otherNode.x(),
            y: otherNode.y()
          });
        }
      });
    } else {
      onElementUpdate(id, {
        x: node.x(),
        y: node.y()
      });
    }
  };

  const renderElement = (el: DrawingElement) => {
    const isEraser = el.tool === 'eraser';
    const isSelected = selectedIds.includes(el.id);
    
    const commonProps = {
      id: `el-${el.id}`,
      key: el.id,
      stroke: el.color,
      strokeWidth: el.strokeWidth,
      tension: 0.5,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
      globalCompositeOperation: isEraser ? 'destination-out' as const : 'source-over' as const,
      draggable: isSelected,
      onDragStart: isSelected ? handleDragStartNode : undefined,
      onDragMove: undefined, // Individual drag move disabled in favor of group box
      onDragEnd: (e: any) => handleDragEndNode(e, el.id),
      onTransformEnd: (e: any) => handleTransformEnd(e, el.id),
      x: (el.x || 0) + (isSelected ? dragOffset.x : 0),
      y: (el.y || 0) + (isSelected ? dragOffset.y : 0),
      scaleX: el.scaleX || 1,
      scaleY: el.scaleY || 1,
      rotation: el.rotation || 0,
    };

    if (el.tool === 'pen' || el.tool === 'eraser' || el.tool === 'line') {
      const isRelative = el.points[0] && el.points[0].x === 0 && el.points[0].y === 0;
      let flatPoints = [];
      if (!isRelative && el.x !== undefined && el.y !== undefined) {
        flatPoints = el.points.flatMap(p => [p.x - el.x!, p.y - el.y!]);
      } else {
        flatPoints = el.points.flatMap(p => [p.x, p.y]);
      }
      return <Line {...commonProps} points={flatPoints} stroke={isEraser ? 'black' : el.color} strokeWidth={isEraser ? el.strokeWidth * 2 : el.strokeWidth} />;
    } else if (el.tool === 'rectangle') {
      return <Rect {...commonProps} width={el.width} height={el.height} fillEnabled={false} />;
    } else if (el.tool === 'circle') {
      return <Circle {...commonProps} radius={el.radius} fillEnabled={false} />;
    }
    return null;
  };

  const getCursor = () => {
    if (isSpacePressed) return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    if (tool === 'select-rect' || tool === 'select-lasso') return 'cursor-crosshair';
    if (tool === 'eraser') return 'cursor-cell';
    return 'cursor-crosshair';
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const oldScale = scale;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    
    zoom(newScale, { x: pointer.x, y: pointer.y });
  };

  return (
    <Stage
      width={dimensions.width}
      height={dimensions.height}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      className={getCursor()}
    >
      <Layer ref={layerRef}>
        {elements.map(renderElement)}
        {currentElement && renderElement(currentElement)}
        {selectionBox && (
          <Rect x={selectionBox.x} y={selectionBox.y} width={selectionBox.width} height={selectionBox.height} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth={1} />
        )}
        {lassoPoints.length > 0 && (
          <Line points={lassoPoints.flatMap(p => [p.x, p.y])} closed fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth={1} />
        )}
        
        {dragBox && tool.startsWith('select') && (
          <Rect
            x={dragBox.x}
            y={dragBox.y}
            width={dragBox.width}
            height={dragBox.height}
            fill="transparent"
            draggable
            onDragStart={handleGroupDragStart}
            onDragMove={handleGroupDragMove}
            onDragEnd={handleGroupDragEnd}
          />
        )}
        
        <Transformer  
          ref={trRef} 
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }} 
        />
      </Layer>
    </Stage>
  );
}
