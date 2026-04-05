import { usePalaceStore } from '../../store/usePalaceStore';
import { Toolbar } from './Toolbar';
import { InventoryPanel } from './InventoryPanel';
import { Box, Map, Plus, X, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function UIOverlay() {
  const { mode, setMode, isNight, toggleNight } = usePalaceStore() as any;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 sm:p-6 pb-12 sm:pb-6 z-10">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto gap-2">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-1.5 sm:p-2 shadow-2xl flex gap-1 sm:gap-2">
          <button
            onClick={() => setMode('2D')}
            className={`relative flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-2xl transition-all text-xs sm:text-sm overflow-hidden ${
              mode === '2D' ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {mode === '2D' && (
              <motion.div 
                layoutId="mode-bg"
                className="absolute inset-0 bg-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Map size={18} className="relative z-10" />
            <span className="relative z-10 font-bold tracking-tight">2D</span>
          </button>
          <button
            onClick={() => setMode('3D')}
            className={`relative flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-2xl transition-all text-xs sm:text-sm overflow-hidden ${
              mode === '3D' ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {mode === '3D' && (
              <motion.div 
                layoutId="mode-bg"
                className="absolute inset-0 bg-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Box size={18} className="relative z-10" />
            <span className="relative z-10 font-bold tracking-tight">3D</span>
          </button>
        </div>
        
        <div className="flex flex-col gap-2 items-end">
          {/* Day/Night Toggle (Only in 3D) */}
          {mode === '3D' && (
            <button
              onClick={toggleNight}
              className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl p-3 shadow-2xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              {isNight ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          )}

          {/* Floor Selector (Only in 2D) */}
          {mode === '2D' && (
            <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[2rem] p-4 shadow-2xl flex flex-col gap-3 min-w-[140px] sm:min-w-[180px]">
              <FloorSelector />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Area */}
      <div className="flex justify-between items-end pointer-events-auto gap-2">
        {mode === '2D' && <Toolbar />}
        {mode === '2D' && <InventoryPanel />}
      </div>
    </div>
  );
}

function FloorSelector() {
  const { floors, activeFloorId, setActiveFloor, addFloor, deleteFloor } = usePalaceStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  
  const handleAdd = () => {
    if (newFloorName.trim()) {
      addFloor(newFloorName.trim());
      setNewFloorName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] sm:text-xs text-white/40 px-1 uppercase tracking-[0.2em] font-black flex justify-between items-center">
        <span>Floors</span>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="hover:text-white p-1.5 rounded-xl bg-white/5 hover:bg-white/15 transition-all ml-2"
        >
          {isAdding ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>
      
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 overflow-hidden"
          >
            <input 
              type="text" 
              value={newFloorName}
              onChange={(e) => setNewFloorName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Name..."
              className="bg-white/5 text-white text-xs px-3 py-2 rounded-xl border border-white/10 w-full outline-none focus:border-white/30 transition-all"
              autoFocus
            />
            <button 
              onClick={handleAdd}
              className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-xl font-bold transition-all"
            >
              Add
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {floors.map(floor => (
          <motion.div 
            key={floor.id} 
            layout
            className="flex gap-1.5 group"
          >
            <button
              onClick={() => setActiveFloor(floor.id)}
              className={`flex-1 px-4 py-2.5 rounded-2xl text-xs sm:text-sm text-left transition-all truncate relative overflow-hidden ${
                activeFloorId === floor.id 
                  ? 'text-white font-bold' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {activeFloorId === floor.id && (
                <motion.div 
                  layoutId="active-floor"
                  className="absolute inset-0 bg-white/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{floor.name}</span>
            </button>
            {floors.length > 1 && (
              <button 
                onClick={() => deleteFloor(floor.id)}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-2xl hover:bg-red-500/20 text-red-400/50 hover:text-red-400 transition-all"
              >
                <X size={16} />
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
