import { usePalaceStore } from '../../store/usePalaceStore';
import { Trash2, Edit3, Crosshair, RotateCw, RefreshCw } from 'lucide-react';
import { clear } from 'idb-keyval';

export function Toolbar() {
  const { selectedItemId, deletePlacedItem, setLociModalOpen, updatePlacedItem, placedItems } = usePalaceStore();

  const handleRotate = () => {
    if (!selectedItemId) return;
    const item = placedItems.find(i => i.id === selectedItemId);
    if (item) {
      updatePlacedItem(selectedItemId, { rotation: (item.rotation + 90) % 360 });
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset everything? This will delete all your rooms, items, and imported models.')) {
      localStorage.clear();
      await clear();
      window.location.reload();
    }
  };

  return (
    <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[2rem] p-2 sm:p-3 shadow-2xl flex flex-row sm:flex-col gap-2 sm:gap-3 pointer-events-auto">
      <button 
        className="p-3 sm:p-4 rounded-2xl hover:bg-white/10 text-white/50 hover:text-white transition-all"
        title="Center View"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('center-2d-view'));
        }}
      >
        <Crosshair size={20} className="sm:w-6 sm:h-6" />
      </button>
      
      <button 
        className="p-3 sm:p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/30 text-red-400 transition-all shadow-lg border border-red-500/20"
        title="Reset App"
        onClick={handleReset}
      >
        <RefreshCw size={20} className="sm:w-6 sm:h-6" />
      </button>
      
      {selectedItemId && (
        <>
          <div className="w-px h-full sm:w-full sm:h-px bg-white/10 mx-1 sm:my-1" />
          <button 
            className="p-3 sm:p-4 rounded-2xl hover:bg-white/10 text-white/50 hover:text-white transition-all"
            title="Rotate 90°"
            onClick={handleRotate}
          >
            <RotateCw size={20} className="sm:w-6 sm:h-6" />
          </button>
          <button 
            className="p-3 sm:p-4 rounded-2xl hover:bg-white/10 text-white/50 hover:text-white transition-all"
            title="Edit Loci Data"
            onClick={() => setLociModalOpen(true)}
          >
            <Edit3 size={20} className="sm:w-6 sm:h-6" />
          </button>
          <button 
            className="p-3 sm:p-4 rounded-2xl hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-all"
            title="Delete Item"
            onClick={() => deletePlacedItem(selectedItemId)}
          >
            <Trash2 size={20} className="sm:w-6 sm:h-6" />
          </button>
        </>
      )}
    </div>
  );
}
