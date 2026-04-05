import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Group, Transformer } from 'react-konva';
import { usePalaceStore } from '../../store/usePalaceStore';
import useImage from 'use-image';

const GRID_SIZE = 1000;
const SNAP_SIZE = 10;

export function Editor2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const { placedItems, activeFloorId, itemDefinitions, selectItem, selectedItemId, updatePlacedItem, addPlacedItem } = usePalaceStore();
  
  const stageRef = useRef<any>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleCenter = () => {
      if (stageRef.current) {
        stageRef.current.position({ x: dimensions.width / 2, y: dimensions.height / 2 });
        stageRef.current.scale({ x: 1, y: 1 });
        stageRef.current.batchDraw();
      }
    };
    
    window.addEventListener('center-2d-view', handleCenter);
    // Center initially
    setTimeout(handleCenter, 100);
    return () => window.removeEventListener('center-2d-view', handleCenter);
  }, [dimensions]);

  const activeItems = placedItems.filter(i => i.floorId === activeFloorId);

  const checkDeselect = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'grid-bg';
    if (clickedOnEmpty) {
      selectItem(null);
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // Responsive zoom based on delta magnitude (better for touchpads and mobile emulation)
    const zoomSpeed = 0.001;
    const factor = Math.exp(-e.evt.deltaY * zoomSpeed);
    let newScale = oldScale * factor;
    
    // Limit zoom
if (newScale < 0.05) newScale = 0.05;
if (newScale > 2000) newScale = 2000;

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
  };

  const lastCenter = useRef<{x: number, y: number} | null>(null);
  const lastDist = useRef<number>(0);
  const isPinching = useRef<boolean>(false);

  const handleTouchStart = (e: any) => {
    const touches = e.evt.touches;
    
    if (touches.length === 2) {
      isPinching.current = true;
      e.evt.preventDefault();
      
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };
      
      lastDist.current = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      lastCenter.current = { 
        x: (p1.x + p2.x) / 2, 
        y: (p1.y + p2.y) / 2 
      };
    } else if (touches.length === 1) {
      isPinching.current = false;
      checkDeselect(e);
    }
  };

  const handleTouchMove = (e: any) => {
    const touches = e.evt.touches;
    
    if (touches.length === 2 && isPinching.current) {
      e.evt.preventDefault();
      
      const stage = stageRef.current;
      if (!stage) return;
      
      if (stage.isDragging()) {
        stage.stopDrag();
      }
      
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };
      
      const currentDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      const currentCenter = { 
        x: (p1.x + p2.x) / 2, 
        y: (p1.y + p2.y) / 2 
      };
      
      if (!lastDist.current || !lastCenter.current) {
        lastDist.current = currentDist;
        lastCenter.current = currentCenter;
        return;
      }
      
      const pointTo = {
  x: (currentCenter.x - stage.x()) / stage.scaleX(),
  y: (currentCenter.y - stage.y()) / stage.scaleX(),
};

const scale = stage.scaleX() * (currentDist / lastDist.current);

if (scale >= 0.05 && scale <= 2000) {
  stage.scaleX(scale);
  stage.scaleY(scale);

  const newPos = {
    x: currentCenter.x - pointTo.x * scale,
    y: currentCenter.y - pointTo.y * scale,
  };

  stage.position(newPos);
  stage.batchDraw();
}

lastDist.current = currentDist;
lastCenter.current = currentCenter;
    }
  };

  const handleTouchEnd = (e: any) => {
    if (e.evt.touches.length < 2) {
      isPinching.current = false;
      lastCenter.current = null;
      lastDist.current = 0;
    }
  };

  const [dragPreview, setDragPreview] = useState<{ x: number, y: number, defId: string } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const defId = e.dataTransfer.getData('defId') || localStorage.getItem('draggedDefId');
    if (!defId) return;

    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = transform.point({ x, y });

    const GRID_SNAP = 50;
    setDragPreview({
      x: Math.round(pos.x / GRID_SNAP) * GRID_SNAP,
      y: Math.round(pos.y / GRID_SNAP) * GRID_SNAP,
      defId
    });
  };

  const handleDragLeave = () => {
    setDragPreview(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragPreview(null);
    const defId = e.dataTransfer.getData('defId') || localStorage.getItem('draggedDefId');
    if (!defId) return;

    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Map to world coordinates
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = transform.point({ x, y });

    const def = itemDefinitions.find(d => d.id === defId);
    if (!def) return;

    // Grid snap to 50 units as requested
    const GRID_SNAP = 50;

    addPlacedItem({
      definitionId: def.id,
      floorId: activeFloorId,
      position: { 
        x: Math.round(pos.x / GRID_SNAP) * GRID_SNAP, 
        y: Math.round(pos.y / GRID_SNAP) * GRID_SNAP 
      },
      rotation: 0,
      scale: def.defaultScale,
      color: '#ffffff',
      lociData: { title: 'New Loci', description: '', notes: '' }
    });
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-gray-950 touch-none"
      onDrop={handleDrop}
      onDragEnter={(e) => e.preventDefault()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Stage 
        width={dimensions.width} 
        height={dimensions.height}
        onMouseDown={checkDeselect}
        onTouchStart={handleTouchStart}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        draggable={!isPinching.current}
        ref={stageRef}
      >
        <Layer>
          {/* Grid Background */}
          <Rect 
            x={-GRID_SIZE * 2} 
            y={-GRID_SIZE * 2} 
            width={GRID_SIZE * 4} 
            height={GRID_SIZE * 4} 
            fill="#111827" 
            name="grid-bg"
          />
          
          {/* Grid Lines (50 unit grid) */}
          {Array.from({ length: 80 }).map((_, i) => (
            <Rect
              key={`v-${i}`}
              x={(i - 40) * 50}
              y={-2000}
              width={1}
              height={4000}
              fill={i % 2 === 0 ? "#1f2937" : "#111827"}
              listening={false}
            />
          ))}
          {Array.from({ length: 80 }).map((_, i) => (
            <Rect
              key={`h-${i}`}
              x={-2000}
              y={(i - 40) * 50}
              width={4000}
              height={1}
              fill={i % 2 === 0 ? "#1f2937" : "#111827"}
              listening={false}
            />
          ))}

          {/* Items */}
          {activeItems
            .slice()
            .sort((a, b) => {
              // Selected item is always on top
              if (a.id === selectedItemId) return 1;
              if (b.id === selectedItemId) return -1;
              
              const defA = itemDefinitions.find(d => d.id === a.definitionId);
              const defB = itemDefinitions.find(d => d.id === b.definitionId);
              
              // Walls and Rooms at the bottom
              const isBottomA = defA?.categoryId === 'cat-walls' || defA?.name.toLowerCase() === 'room' ? -1 : 1;
              const isBottomB = defB?.categoryId === 'cat-walls' || defB?.name.toLowerCase() === 'room' ? -1 : 1;
              
              if (isBottomA !== isBottomB) return isBottomA - isBottomB;
              
              return 0; // Keep other items in their relative order
            })
            .map(item => {
            const def = itemDefinitions.find(d => d.id === item.definitionId);
            if (!def) return null;
            return (
              <PlacedItemNode 
                key={item.id} 
                item={item} 
                def={def} 
                isSelected={item.id === selectedItemId}
                onSelect={() => selectItem(item.id)}
                onChange={(newAttrs: any) => updatePlacedItem(item.id, newAttrs)}
              />
            );
          })}

          {/* Drag Preview */}
          {dragPreview && (() => {
            const def = itemDefinitions.find(d => d.id === dragPreview.defId);
            if (!def) return null;
            return (
              <Group x={dragPreview.x} y={dragPreview.y} opacity={0.5}>
                <Rect
                  x={-def.defaultScale.x / 2}
                  y={-def.defaultScale.y / 2}
                  width={def.defaultScale.x}
                  height={def.defaultScale.y}
                  fill="#3b82f6"
                  cornerRadius={8}
                />
              </Group>
            );
          })()}
        </Layer>
      </Stage>
    </div>
  );
}

function PlacedItemNode({ item, def, isSelected, onSelect, onChange }: any) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const [image] = useImage(def.imageSrc, 'anonymous');

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Group
        ref={shapeRef}
        x={item.position.x}
        y={item.position.y}
        rotation={item.rotation}
        draggable
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onTouchEnd={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onDragEnd={(e) => {
          const GRID_SNAP = 50;
          const x = Math.round(e.target.x() / GRID_SNAP) * GRID_SNAP;
          const y = Math.round(e.target.y() / GRID_SNAP) * GRID_SNAP;
          
          onChange({
            position: { x, y }
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale to 1 and apply to actual width/height
          node.scaleX(1);
          node.scaleY(1);

          const GRID_SNAP = 50;
          let newWidth = Math.max(GRID_SNAP, item.scale.x * scaleX);
          let newHeight = Math.max(GRID_SNAP, item.scale.y * scaleY);
          
          newWidth = Math.round(newWidth / GRID_SNAP) * GRID_SNAP;
          newHeight = Math.round(newHeight / GRID_SNAP) * GRID_SNAP;

          const newX = Math.round((node.attrs.x || 0) / GRID_SNAP) * GRID_SNAP;
          const newY = Math.round((node.attrs.y || 0) / GRID_SNAP) * GRID_SNAP;
          const newRot = Math.round((node.attrs.rotation || 0) / 90) * 90;

          onChange({
            position: { x: newX, y: newY },
            rotation: newRot,
            scale: {
              x: newWidth,
              y: newHeight
            }
          });
        }}
      >
        {/* Main Image */}
        {def.name.toLowerCase() === 'room' ? (
          <Rect
            x={-item.scale.x / 2}
            y={-item.scale.y / 2}
            width={item.scale.x}
            height={item.scale.y}
            fill={item.color ? `${item.color}33` : "rgba(75, 85, 99, 0.2)"}
            stroke={isSelected ? "#3b82f6" : (item.color || "#4b5563")}
            strokeWidth={10}
            cornerRadius={0}
          />
        ) : image ? (
          <KonvaImage
            image={image}
            x={-item.scale.x / 2}
            y={-item.scale.y / 2}
            width={item.scale.x}
            height={item.scale.y}
            cornerRadius={8}
            stroke={isSelected ? "#3b82f6" : "transparent"}
            strokeWidth={isSelected ? 4 : 0}
          />
        ) : (
          <Rect
            x={-item.scale.x / 2}
            y={-item.scale.y / 2}
            width={item.scale.x}
            height={item.scale.y}
            fill="#374151"
            cornerRadius={8}
            stroke={isSelected ? "#3b82f6" : "transparent"}
            strokeWidth={isSelected ? 4 : 0}
          />
        )}
        
        {/* Title Label */}
        {item.lociData.title && (
          <></>
        )}
      </Group>
      
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
          padding={5}
          anchorSize={12}
          anchorCornerRadius={6}
          borderStroke="#3b82f6"
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
        />
      )}
    </>
  );
}
