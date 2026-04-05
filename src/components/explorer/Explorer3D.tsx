import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Html, useGLTF } from '@react-three/drei';
import { usePalaceStore } from '../../store/usePalaceStore';
import { Suspense, useState, useEffect, useRef } from 'react';
import { Joystick } from 'react-joystick-component';
import * as THREE from 'three';

export function Explorer3D() {
  const { placedItems, activeFloorId, itemDefinitions, setLociModalOpen, selectItem, floors } = usePalaceStore();
  const [movement, setMovement] = useState({ x: 0, y: 0 });
  const playerPosRef = useRef({ x: 0, z: 0 });
  
  const FLOOR_HEIGHT = 400;
  const { isLociModalOpen, isNight } = usePalaceStore() as any;

  return (
    <div className="w-full h-full bg-black relative">
      <Canvas shadows camera={{ position: [0, 50, 0], fov: 75, far: 20000 }}>
        <Suspense fallback={null}>
          <Sky sunPosition={isNight ? [0, -100, 0] : [100, 20, 100]} turbidity={isNight ? 0.1 : 0.1} rayleigh={isNight ? 0.1 : 0.5} />
          <ambientLight intensity={isNight ? 0.05 : 0.5} />
          <directionalLight 
            castShadow 
            position={[1000, 1000, 500]} 
            intensity={isNight ? 0.1 : 1.5} 
            shadow-mapSize={[2048, 2048]}
          />
          
          {/* Grounds for each floor */}
          {floors.map(floor => {
            // Only render floor mesh for the ground floor (order 0)
            if (floor.order !== 0) return null;

            return (
              <group key={`floor-base-${floor.id}`} position={[0, floor.order * FLOOR_HEIGHT, 0]}>
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[10000, 10000]} />
                  <meshStandardMaterial 
                    color="#1f2937" 
                  />
                </mesh>
                <gridHelper args={[10000, 100]} position={[0, 0.1, 0]} material-opacity={0.1} material-transparent />
              </group>
            );
          })}

          {/* Items for all floors */}
          {placedItems.map(item => {
            const def = itemDefinitions.find(d => d.id === item.definitionId);
            const floor = floors.find(f => f.id === item.floorId);
            if (!def || !floor) return null;
            
            const isWall = def.categoryId === 'cat-walls';
            const x3D = item.position.x;
            const z3D = item.position.y;
            const height = isWall ? 200 : (item.scale.x + item.scale.y) / 4;
            // Y position is floor offset + item half height
            const y3D = (floor.order * FLOOR_HEIGHT) + (height / 2);

            return (
              <InteractiveObject 
                key={item.id}
                item={item}
                def={def}
                position={[x3D, y3D, z3D]}
                rotation={[0, -item.rotation * (Math.PI / 180), 0]}
                scale={[item.scale.x, height, item.scale.y]}
                hideLabel={isLociModalOpen}
                onClick={() => {
                  selectItem(item.id);
                  setLociModalOpen(true);
                }}
              />
            );
          })}

          <FPPController movement={movement} playerPosRef={playerPosRef} floorHeight={FLOOR_HEIGHT} />
        </Suspense>
      </Canvas>

      {/* UI Overlay for 3D */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <Joystick 
          size={100} 
          baseColor="rgba(255,255,255,0.2)" 
          stickColor="rgba(255,255,255,0.5)" 
          move={(e) => setMovement({ x: e.x || 0, y: e.y || 0 })} 
          stop={() => setMovement({ x: 0, y: 0 })} 
        />
      </div>

      {/* Minimap */}
      <Minimap items={placedItems.filter(i => i.floorId === activeFloorId)} playerPosRef={playerPosRef} />
    </div>
  );
}

function FPPController({ movement, playerPosRef, floorHeight }: { movement: { x: number, y: number }, playerPosRef: React.MutableRefObject<{x: number, z: number}>, floorHeight: number }) {
  const { camera, gl } = useThree();
  const { activeFloorId, floors, placedItems, itemDefinitions } = usePalaceStore();
  const speed = 3; // 40% slower than 5

  // Update camera Y when floor changes
  useEffect(() => {
    const floor = floors.find(f => f.id === activeFloorId);
    if (floor) {
      camera.position.y = (floor.order * floorHeight) + 50;
      camera.rotation.set(0, 0, 0); // Reset rotation to look straight ahead
    }
  }, [activeFloorId, floors, camera]);

  useEffect(() => {
    let isDragging = false;
    let previous = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      previous = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previous.x;
      const deltaY = e.clientY - previous.y;
      
      camera.rotation.order = 'YXZ';
      camera.rotation.y -= deltaX * 0.005;
      camera.rotation.x -= deltaY * 0.005;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
      
      previous = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const canvas = gl.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [camera, gl]);

  useFrame(() => {
    if (movement.y !== 0 || movement.x !== 0) {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      
      const right = new THREE.Vector3();
      right.crossVectors(camera.up, direction).normalize();

      const nextPos = camera.position.clone();
      nextPos.addScaledVector(direction, movement.y * speed);
      nextPos.addScaledVector(right, -movement.x * speed);

      // Simple collision detection
      let canMove = true;
      const playerRadius = 20;
      const floor = floors.find(f => f.id === activeFloorId);
      const currentFloorOrder = floor?.order || 0;

      // Only check items on the current floor
      const currentFloorItems = placedItems.filter(i => i.floorId === activeFloorId);

      for (const item of currentFloorItems) {
        const def = itemDefinitions.find(d => d.id === item.definitionId);
        const isWall = def?.categoryId === 'cat-walls' && def.name.toLowerCase() !== 'room';
        const isRoom = def?.name.toLowerCase() === 'room';
        
        if (isWall) {
          // Box collision for walls
          // Walls are rotated, so we need to account for that
          // For simplicity, let's assume axis-aligned or 90-deg rotations
          const rad = item.rotation * (Math.PI / 180);
          const cos = Math.abs(Math.cos(rad));
          const sin = Math.abs(Math.sin(rad));
          
          const width = item.scale.x * cos + item.scale.y * sin;
          const depth = item.scale.x * sin + item.scale.y * cos;
          
          const halfW = width / 2 + playerRadius;
          const halfD = depth / 2 + playerRadius;
          
          if (Math.abs(nextPos.x - item.position.x) < halfW && 
              Math.abs(nextPos.z - item.position.y) < halfD) {
            canMove = false;
            break;
          }
        } else if (isRoom) {
          // Collision for 4 walls of a room
          const rad = item.rotation * (Math.PI / 180);
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);

          const walls = [
            { pos: [0, -item.scale.y/2 + 5], size: [item.scale.x, 10] }, // North
            { pos: [0, item.scale.y/2 - 5], size: [item.scale.x, 10] },  // South
            { pos: [item.scale.x/2 - 5, 0], size: [10, item.scale.y - 20] }, // East
            { pos: [-item.scale.x/2 + 5, 0], size: [10, item.scale.y - 20] }  // West
          ];

          for (const wall of walls) {
            // Rotate wall position
            const wx = wall.pos[0] * cos - wall.pos[1] * sin;
            const wz = wall.pos[0] * sin + wall.pos[1] * cos;
            
            const wallX = item.position.x + wx;
            const wallZ = item.position.y + wz;

            const halfW = wall.size[0] / 2 + playerRadius;
            const halfD = wall.size[1] / 2 + playerRadius;

            if (Math.abs(nextPos.x - wallX) < halfW && 
                Math.abs(nextPos.z - wallZ) < halfD) {
              canMove = false;
              break;
            }
          }
          if (!canMove) break;
        } else {
          // Circle collision for other items
          const dx = nextPos.x - item.position.x;
          const dz = nextPos.z - item.position.y;
          const distance = Math.sqrt(dx * dx + dz * dz);
          const itemRadius = Math.max(item.scale.x, item.scale.y) / 2.5; // Slightly tighter
          if (distance < (itemRadius + playerRadius)) {
            canMove = false;
            break;
          }
        }
      }

      if (canMove) {
        camera.position.copy(nextPos);
      }
      
      const targetY = (currentFloorOrder * floorHeight) + 50;
      camera.position.y = targetY;
    }
    
    playerPosRef.current = { x: camera.position.x, z: camera.position.z, rot: camera.rotation.y };
  });

  return null;
}

function Minimap({ items, playerPosRef }: { items: any[], playerPosRef: React.MutableRefObject<{x: number, z: number, rot: number}> }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const mapScale = 0.05; // 1 unit = 0.05px

  useEffect(() => {
    const interval = setInterval(() => {
      if (mapRef.current && playerRef.current) {
        const x = -playerPosRef.current.x * mapScale;
        const y = -playerPosRef.current.z * mapScale;
        const rot = playerPosRef.current.rot; // Camera rotation
        
        // Rotate the map container around the player
        mapRef.current.style.transform = `rotate(${rot}rad) translate(${x}px, ${y}px)`;
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-20 right-4 sm:right-6 w-32 h-32 sm:w-48 sm:h-48 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden pointer-events-none shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent z-20" />
      
      {/* Player (Fixed in center, always points up) */}
      <div 
        ref={playerRef}
        className="absolute left-1/2 top-1/2 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_20px_rgba(59,130,246,1)] z-30"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <div className="absolute inset-0 animate-ping bg-blue-400 rounded-full opacity-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-1 h-3 bg-white rounded-full" />
      </div>

      {/* Map Container (Moves and rotates) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div ref={mapRef} className="absolute">
          {/* Grid lines for minimap */}
          <div className="absolute inset-[-200%] opacity-10" 
            style={{ 
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', 
              backgroundSize: '20px 20px',
              backgroundPosition: 'center center'
            }} 
          />
          
          {/* Items */}
          {items.map(item => {
            const def = usePalaceStore.getState().itemDefinitions.find(d => d.id === item.definitionId);
            const isWall = def?.categoryId === 'cat-walls';
            const x = item.position.x * mapScale;
            const y = item.position.y * mapScale;
            
            if (isWall) {
              const w = item.scale.x * mapScale;
              const h = item.scale.y * mapScale;
              return (
                <div 
                  key={item.id}
                  className="absolute bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: `${w}px`,
                    height: `${h}px`,
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${item.rotation}deg)`,
                    backgroundColor: item.color || 'white'
                  }}
                />
              );
            }
            
            return (
              <div 
                key={item.id}
                className="absolute bg-white/30 rounded-sm border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                style={{
                  left: '50%',
                  top: '50%',
                  width: Math.max(4, item.scale.x * mapScale),
                  height: Math.max(4, item.scale.y * mapScale),
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${item.rotation}deg)`,
                  backgroundColor: item.color ? `${item.color}66` : 'rgba(255,255,255,0.2)'
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InteractiveObject({ item, def, position, rotation, scale, hideLabel, onClick }: any) {
  const [hovered, setHovered] = useState(false);

  // If there's a custom GLB model
  if (def.modelSrc) {
    return (
      <group position={position} rotation={rotation} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <Model url={def.modelSrc} scale={scale} color={item.color} />
        {item.lociData.title && !hideLabel && (
          <Html position={[0, scale[1] / 2 + 20, 0]} center zIndexRange={[0, 0]} className="pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md text-white px-3 py-1 rounded-lg text-sm font-medium border border-white/20 whitespace-nowrap shadow-xl">
              {item.lociData.title}
            </div>
          </Html>
        )}
      </group>
    );
  }

  // Procedural models for default items based on name or category
  const isWall = def.categoryId === 'cat-walls' && def.name.toLowerCase() !== 'room';
  const isRoom = def.name.toLowerCase() === 'room';
  const isTable = def.name.toLowerCase().includes('table');
  const isChair = def.name.toLowerCase().includes('chair');
  const isPlant = def.name.toLowerCase().includes('plant');
  const isTorch = def.name.toLowerCase().includes('torch');
  const isLamp = def.name.toLowerCase().includes('lamp');

  return (
    <group position={position} rotation={rotation} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {isTorch && (
        <pointLight color={item.color || "#fb923c"} intensity={800} distance={1500} decay={2} position={[0, scale[1]/4 + 10, 0]} castShadow />
      )}
      {isLamp && (
        <pointLight color={item.color || "#fef08a"} intensity={1200} distance={2000} decay={2} position={[0, scale[1] + 10, 0]} castShadow />
      )}
      <group 
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
      >
        {isRoom ? (
          <>
            {/* North Wall */}
            <mesh castShadow receiveShadow position={[0, 0, -scale[2]/2 + 5]}>
              <boxGeometry args={[scale[0], scale[1], 10]} />
              <meshStandardMaterial color={hovered ? "#60a5fa" : (item.color || "#4b5563")} />
            </mesh>
            {/* South Wall */}
            <mesh castShadow receiveShadow position={[0, 0, scale[2]/2 - 5]}>
              <boxGeometry args={[scale[0], scale[1], 10]} />
              <meshStandardMaterial color={hovered ? "#60a5fa" : (item.color || "#4b5563")} />
            </mesh>
            {/* East Wall */}
            <mesh castShadow receiveShadow position={[scale[0]/2 - 5, 0, 0]}>
              <boxGeometry args={[10, scale[1], scale[2] - 20]} />
              <meshStandardMaterial color={hovered ? "#60a5fa" : (item.color || "#4b5563")} />
            </mesh>
            {/* West Wall */}
            <mesh castShadow receiveShadow position={[-scale[0]/2 + 5, 0, 0]}>
              <boxGeometry args={[10, scale[1], scale[2] - 20]} />
              <meshStandardMaterial color={hovered ? "#60a5fa" : (item.color || "#4b5563")} />
            </mesh>
          </>
        ) : isWall ? (
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[scale[0], scale[1], scale[2]]} />
            <meshStandardMaterial color={hovered ? "#60a5fa" : (item.color || "#4b5563")} />
          </mesh>
        ) : isTable ? (
          <>
            {/* Table Top */}
            <mesh castShadow receiveShadow position={[0, scale[1]/2 - 5, 0]}>
              <boxGeometry args={[scale[0], 10, scale[2]]} />
              <meshStandardMaterial color={hovered ? "#60a5fa" : (item.color || "#8B4513")} />
            </mesh>
            {/* Legs */}
            <mesh castShadow receiveShadow position={[-scale[0]/2 + 5, 0, -scale[2]/2 + 5]}>
              <cylinderGeometry args={[3, 3, scale[1]]} />
              <meshStandardMaterial color="#5c2e0b" />
            </mesh>
            <mesh castShadow receiveShadow position={[scale[0]/2 - 5, 0, -scale[2]/2 + 5]}>
              <cylinderGeometry args={[3, 3, scale[1]]} />
              <meshStandardMaterial color="#5c2e0b" />
            </mesh>
            <mesh castShadow receiveShadow position={[-scale[0]/2 + 5, 0, scale[2]/2 - 5]}>
              <cylinderGeometry args={[3, 3, scale[1]]} />
              <meshStandardMaterial color="#5c2e0b" />
            </mesh>
            <mesh castShadow receiveShadow position={[scale[0]/2 - 5, 0, scale[2]/2 - 5]}>
              <cylinderGeometry args={[3, 3, scale[1]]} />
              <meshStandardMaterial color="#5c2e0b" />
            </mesh>
          </>
        ) : isChair ? (
          <>
            {/* Seat */}
            <mesh castShadow receiveShadow position={[0, scale[1]/2 - 10, 0]}>
              <boxGeometry args={[scale[0], 5, scale[2]]} />
              <meshStandardMaterial color={hovered ? "#60a5fa" : (item.color || "#374151")} />
            </mesh>
            {/* Backrest */}
            <mesh castShadow receiveShadow position={[0, scale[1]/2 + 10, -scale[2]/2 + 2.5]}>
              <boxGeometry args={[scale[0], 20, 5]} />
              <meshStandardMaterial color={hovered ? "#60a5fa" : (item.color || "#374151")} />
            </mesh>
            {/* Base */}
            <mesh castShadow receiveShadow position={[0, 0, 0]}>
              <cylinderGeometry args={[2, 2, scale[1] - 10]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
            <mesh castShadow receiveShadow position={[0, -scale[1]/2 + 5, 0]}>
              <cylinderGeometry args={[15, 15, 2]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
          </>
        ) : isPlant ? (
          <>
            {/* Pot */}
            <mesh castShadow receiveShadow position={[0, -scale[1]/4, 0]}>
              <cylinderGeometry args={[scale[0]/3, scale[0]/4, scale[1]/2]} />
              <meshStandardMaterial color={hovered ? "#60a5fa" : "#d97706"} />
            </mesh>
            {/* Leaves */}
            <mesh castShadow receiveShadow position={[0, scale[1]/4, 0]}>
              <sphereGeometry args={[scale[0]/2, 16, 16]} />
              <meshStandardMaterial color={hovered ? "#60a5fa" : (item.color || "#10b981")} />
            </mesh>
          </>
        ) : isTorch ? (
          <>
            {/* Stick */}
            <mesh castShadow receiveShadow position={[0, -scale[1]/4, 0]}>
              <cylinderGeometry args={[2, 2, scale[1]/2]} />
              <meshStandardMaterial color="#5c2e0b" />
            </mesh>
            {/* Fire/Head */}
            <mesh position={[0, scale[1]/4, 0]}>
              <sphereGeometry args={[scale[0]/2, 8, 8]} />
              <meshBasicMaterial color={item.color || "#fb923c"} />
            </mesh>
          </>
        ) : isLamp ? (
          <>
            {/* Base */}
            <mesh castShadow receiveShadow position={[0, -scale[1]/2 + 2, 0]}>
              <cylinderGeometry args={[scale[0]/2, scale[0]/2, 4]} />
              <meshStandardMaterial color="#374151" />
            </mesh>
            {/* Pole */}
            <mesh castShadow receiveShadow position={[0, 0, 0]}>
              <cylinderGeometry args={[2, 2, scale[1]]} />
              <meshStandardMaterial color="#374151" />
            </mesh>
            {/* Shade */}
            <mesh castShadow receiveShadow position={[0, scale[1]/2, 0]}>
              <cylinderGeometry args={[scale[0]/1.5, scale[0]/3, scale[1]/4]} />
              <meshStandardMaterial color={item.color || "#fef08a"} transparent opacity={0.8} />
            </mesh>
            {/* Bulb */}
            <mesh position={[0, scale[1]/2 - 5, 0]}>
              <sphereGeometry args={[5, 8, 8]} />
              <meshBasicMaterial color={item.color || "#ffffff"} />
            </mesh>
          </>
        ) : (
          <mesh castShadow receiveShadow>
            <boxGeometry args={scale} />
            <meshStandardMaterial color={hovered ? "#60a5fa" : item.color || "#9ca3af"} />
          </mesh>
        )}
      </group>
      
      {/* Floating Label */}
      {item.lociData.title && !hideLabel && (
        <Html position={[0, scale[1] / 2 + 20, 0]} center zIndexRange={[0, 0]} className="pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md text-white px-3 py-1 rounded-lg text-sm font-medium border border-white/20 whitespace-nowrap shadow-xl">
            {item.lociData.title}
          </div>
        </Html>
      )}
    </group>
  );
}

function Model({ url, scale, color }: { url: string, scale: [number, number, number], color?: string }) {
  const { scene } = useGLTF(url);
  // Clone to allow multiple instances of the same model
  const clone = scene.clone();
  
  // Apply color to all materials if specified
  if (color) {
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          // Clone material to avoid affecting other instances
          mesh.material = (mesh.material as THREE.Material).clone();
          (mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(color);
        }
      }
    });
  }

  // The scale passed is the bounding box we want to fit into
  // We need to calculate the model's original bounding box and scale it to fit our desired scale
  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  
  const scaleX = scale[0] / size.x;
  const scaleY = scale[1] / size.y;
  const scaleZ = scale[2] / size.z;

  return <primitive object={clone} scale={[scaleX, scaleY, scaleZ]} />;
}
