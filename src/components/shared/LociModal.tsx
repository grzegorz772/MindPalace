import { usePalaceStore } from '../../store/usePalaceStore';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export function LociModal() {
  const { isLociModalOpen, setLociModalOpen, selectedItemId, placedItems, updatePlacedItem } = usePalaceStore();
  
  const selectedItem = placedItems.find(i => i.id === selectedItemId);

  if (!selectedItem) return null;

  return (
    <AnimatePresence>
      {isLociModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLociModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-gray-900 border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">Loci Palace</h2>
                <button 
                  onClick={() => setLociModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1">Title (Keyword)</label>
                  <input 
                    type="text"
                    value={selectedItem.lociData.title}
                    onChange={(e) => updatePlacedItem(selectedItem.id, { lociData: { ...selectedItem.lociData, title: e.target.value } })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    placeholder="Enter main concept..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1">Description</label>
                  <textarea 
                    value={selectedItem.lociData.description}
                    onChange={(e) => updatePlacedItem(selectedItem.id, { lociData: { ...selectedItem.lociData, description: e.target.value } })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none h-24"
                    placeholder="Describe the visual association..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1">Notes / Data</label>
                  <textarea 
                    value={selectedItem.lociData.notes}
                    onChange={(e) => updatePlacedItem(selectedItem.id, { lociData: { ...selectedItem.lociData, notes: e.target.value } })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none h-32 font-mono text-sm"
                    placeholder="Additional details, lists, or facts..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1">Item Color</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['#ffffff', '#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#4b5563', '#000000'].map(color => (
                      <button
                        key={color}
                        onClick={() => updatePlacedItem(selectedItem.id, { color })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${selectedItem.color === color ? 'border-white scale-110 shadow-lg shadow-white/20' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input 
                      type="color" 
                      value={selectedItem.color || '#ffffff'}
                      onChange={(e) => updatePlacedItem(selectedItem.id, { color: e.target.value })}
                      className="w-8 h-8 rounded-full bg-transparent border-none cursor-pointer p-0 overflow-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setLociModalOpen(false)}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
