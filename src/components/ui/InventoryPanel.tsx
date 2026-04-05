import { useState, useRef } from 'react';
import { usePalaceStore } from '../../store/usePalaceStore';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, PackagePlus, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

export function InventoryPanel() {
  const [isOpen, setIsOpen] = useState(false); // Start closed on mobile to save space
  const { categories, itemDefinitions, addPlacedItem, activeFloorId, addItemDefinition, addCategory } = usePalaceStore();
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddItem = (defId: string) => {
    const def = itemDefinitions.find(d => d.id === defId);
    if (!def) return;

    // Spawn at center of screen (0,0 in world coords if centered)
    addPlacedItem({
      definitionId: def.id,
      floorId: activeFloorId,
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: def.defaultScale,
      color: '#ffffff',
      lociData: {
        title: 'New Loci',
        description: '',
        notes: ''
      }
    });
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;

        const loader = new GLTFLoader();
        loader.load(dataUrl, (gltf) => {
          // Create a temporary renderer to generate a thumbnail
          const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
          renderer.setSize(256, 256);
          const scene = new THREE.Scene();
          
          const ambient = new THREE.AmbientLight(0xffffff, 1);
          const dir = new THREE.DirectionalLight(0xffffff, 2);
          dir.position.set(10, 20, 10);
          scene.add(ambient, dir);
          
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          
          gltf.scene.position.sub(center);
          scene.add(gltf.scene);
          
          // Angled view camera
          const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
          camera.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.5);
          camera.lookAt(0, 0, 0);
          
          renderer.render(scene, camera);
          const thumbDataUrl = renderer.domElement.toDataURL('image/png');
          
          // Cleanup
          renderer.dispose();
          
          addItemDefinition({
            id: uuidv4(),
            categoryId: 'cat-added',
            name: file.name.replace(/\.[^/.]+$/, ""),
            imageSrc: thumbDataUrl,
            modelSrc: dataUrl, // Persistent Data URL
            defaultScale: { x: size.x * 100, y: size.z * 100 }
          });
        });
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-end pointer-events-auto">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-full p-2 shadow-xl hover:bg-white/20 transition-colors"
      >
        {isOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl w-[calc(100vw-5rem)] sm:w-96 h-64 sm:h-80 shadow-2xl flex overflow-hidden"
          >
            {/* Categories Sidebar */}
            <div className="w-1/3 bg-black/20 border-r border-white/10 overflow-y-auto p-1 sm:p-2 flex flex-col gap-1 custom-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2 sm:px-3 py-2 sm:py-3 rounded-xl text-xs sm:text-sm text-left transition-all truncate ${
                    activeCategory === cat.id ? 'bg-white/20 text-white font-medium shadow-inner' : 'hover:bg-white/5 text-white/60'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              
              {isAddingCategory ? (
                <div className="flex flex-col gap-1 mt-2">
                  <input 
                    type="text" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Name..."
                    className="bg-white/5 text-white text-xs px-2 py-2 rounded-xl border border-white/10 w-full outline-none focus:border-white/30 transition-all"
                    autoFocus
                  />
                  <button 
                    onClick={handleAddCategory}
                    className="bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1.5 rounded-xl font-bold transition-all"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingCategory(true)}
                  className="mt-2 flex items-center justify-center gap-1 px-2 py-2 rounded-xl border border-white/10 border-dashed text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-xs"
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>

            {/* Items Grid */}
            <div className="w-2/3 p-2 sm:p-4 overflow-y-auto grid grid-cols-2 gap-2 sm:gap-3 content-start custom-scrollbar">
              {itemDefinitions.filter(d => d.categoryId === activeCategory).map(def => (
                <div
                  key={def.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('defId', def.id);
                    localStorage.setItem('draggedDefId', def.id);
                  }}
                  onDragEnd={() => {
                    localStorage.removeItem('draggedDefId');
                  }}
                  onClick={() => handleAddItem(def.id)}
                  className="aspect-square rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all flex flex-col items-center justify-center p-1 sm:p-2 group cursor-grab active:cursor-grabbing"
                >
                  <img 
                    src={def.imageSrc} 
                    alt={def.name} 
                    className="w-8 h-8 sm:w-12 sm:h-12 object-cover rounded-lg mb-1 sm:mb-2 group-hover:scale-110 transition-transform pointer-events-none"
                    draggable={false}
                  />
                  <span className="text-[10px] sm:text-xs text-white/70 text-center line-clamp-2 leading-tight pointer-events-none">{def.name}</span>
                </div>
              ))}
              
              {/* Import Button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl sm:rounded-2xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex flex-col items-center justify-center p-1 sm:p-2 text-blue-400"
              >
                <PackagePlus size={24} className="mb-1 sm:mb-2" />
                <span className="text-[10px] sm:text-xs text-center leading-tight">Import GLB</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".glb,.gltf" 
                onChange={handleImport}
                multiple
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
