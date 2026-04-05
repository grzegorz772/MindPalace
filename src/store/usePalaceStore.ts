import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { AppState, Floor, Category, ItemDefinition, PlacedItem } from '../types';
import { get, set } from 'idb-keyval';

// Default mock data
const DEFAULT_FLOORS: Floor[] = [
  { id: 'floor-1', name: 'Ground Floor', order: 0 }
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-furniture', name: 'Furniture' },
  { id: 'cat-decor', name: 'Decor' },
  { id: 'cat-structure', name: 'Structure' },
  { id: 'cat-walls', name: 'Walls' },
  { id: 'cat-added', name: 'Added' }
];

const DEFAULT_ITEM_DEFS: ItemDefinition[] = [
  {
    id: 'def-room',
    categoryId: 'cat-walls',
    name: 'Room',
    imageSrc: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=100&h=100&fit=crop',
    defaultScale: { x: 200, y: 200 }
  },
  {
    id: 'def-table-1',
    categoryId: 'cat-furniture',
    name: 'Wooden Table',
    imageSrc: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=100&h=100&fit=crop',
    defaultScale: { x: 100, y: 100 }
  },
  {
    id: 'def-chair-1',
    categoryId: 'cat-furniture',
    name: 'Office Chair',
    imageSrc: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=100&h=100&fit=crop',
    defaultScale: { x: 60, y: 60 }
  },
  {
    id: 'def-plant-1',
    categoryId: 'cat-decor',
    name: 'Potted Plant',
    imageSrc: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=100&h=100&fit=crop',
    defaultScale: { x: 50, y: 50 }
  },
  {
    id: 'def-torch-1',
    categoryId: 'cat-decor',
    name: 'Torch',
    imageSrc: 'https://images.unsplash.com/photo-1580658325979-515d1e04b4f1?w=100&h=100&fit=crop',
    defaultScale: { x: 20, y: 20 }
  },
  {
    id: 'def-lamp-1',
    categoryId: 'cat-decor',
    name: 'Floor Lamp',
    imageSrc: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=100&h=100&fit=crop',
    defaultScale: { x: 30, y: 30 }
  },
  {
    id: 'def-wall-h',
    categoryId: 'cat-walls',
    name: 'Wall (H)',
    imageSrc: 'https://picsum.photos/seed/wallh/200',
    defaultScale: { x: 100, y: 10 }
  },
  {
    id: 'def-wall-v',
    categoryId: 'cat-walls',
    name: 'Wall (V)',
    imageSrc: 'https://picsum.photos/seed/wallv/200',
    defaultScale: { x: 10, y: 100 }
  }
];

const STORAGE_KEY = 'palace-data';

export const usePalaceStore = create<AppState & { isNight: boolean; toggleNight: () => void; addCategory: (name: string) => void }>((set_, get_) => {
  // Wrapper to save state after every update
  const setStore = (partial: any) => {
    set_(partial);
    const state = get_();
    // Save to IndexedDB
    set(STORAGE_KEY, {
      floors: state.floors,
      categories: state.categories,
      itemDefinitions: state.itemDefinitions,
      placedItems: state.placedItems
    }).catch(console.error);
  };

  // Load initial state
  get(STORAGE_KEY).then((data) => {
    if (data) {
      // Filter out old blob URLs that can't be loaded across sessions
      const validItemDefs = (data.itemDefinitions || DEFAULT_ITEM_DEFS).filter(
        (def: ItemDefinition) => !def.modelSrc || !def.modelSrc.startsWith('blob:')
      );
      
      // Merge with defaults
      const mergedCategories = [
        ...DEFAULT_CATEGORIES,
        ...(data.categories || []).filter((c: Category) => !DEFAULT_CATEGORIES.find(dc => dc.id === c.id))
      ];
      const mergedItemDefs = [
        ...DEFAULT_ITEM_DEFS,
        ...validItemDefs.filter((d: ItemDefinition) => !DEFAULT_ITEM_DEFS.find(dd => dd.id === d.id))
      ];
      
      const validDefIds = new Set(mergedItemDefs.map((d: ItemDefinition) => d.id));
      const validPlacedItems = (data.placedItems || []).filter(
        (item: PlacedItem) => validDefIds.has(item.definitionId)
      );
      
      set_({
        floors: data.floors || DEFAULT_FLOORS,
        categories: mergedCategories,
        itemDefinitions: mergedItemDefs,
        placedItems: validPlacedItems,
        activeFloorId: data.floors?.[0]?.id || DEFAULT_FLOORS[0].id
      });
    }
  }).catch(console.error);

  return {
    floors: DEFAULT_FLOORS,
    activeFloorId: DEFAULT_FLOORS[0].id,
    categories: DEFAULT_CATEGORIES,
    itemDefinitions: DEFAULT_ITEM_DEFS,
    placedItems: [],
    mode: '2D',
    selectedItemId: null,
    isLociModalOpen: false,
    isNight: false,

    setMode: (mode) => setStore({ mode, selectedItemId: null, isLociModalOpen: false }),
    
    toggleNight: () => set_((state) => ({ isNight: !state.isNight })),

    setActiveFloor: (floorId) => setStore({ activeFloorId: floorId, selectedItemId: null }),
    
    addFloor: (name) => setStore((state: any) => {
      const newFloor: Floor = {
        id: uuidv4(),
        name,
        order: state.floors.length
      };
      return { 
        floors: [...state.floors, newFloor],
        activeFloorId: newFloor.id
      };
    }),
    
    deleteFloor: (floorId) => setStore((state: any) => ({
      floors: state.floors.filter((f: Floor) => f.id !== floorId),
      placedItems: state.placedItems.filter((i: PlacedItem) => i.floorId !== floorId),
      activeFloorId: state.activeFloorId === floorId 
        ? (state.floors.find((f: Floor) => f.id !== floorId)?.id || '') 
        : state.activeFloorId
    })),

    addCategory: (name) => setStore((state: any) => ({
      categories: [...state.categories, { id: uuidv4(), name }]
    })),

    addPlacedItem: (item) => setStore((state: any) => ({
      placedItems: [...state.placedItems, { ...item, id: uuidv4() }]
    })),

    updatePlacedItem: (id, updates) => setStore((state: any) => ({
      placedItems: state.placedItems.map((item: PlacedItem) => 
        item.id === id ? { ...item, ...updates } : item
      )
    })),

    deletePlacedItem: (id) => setStore((state: any) => ({
      placedItems: state.placedItems.filter((item: PlacedItem) => item.id !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId
    })),

    selectItem: (id) => setStore({ selectedItemId: id }),
    
    setLociModalOpen: (isOpen) => setStore({ isLociModalOpen: isOpen }),

    addItemDefinition: (def) => setStore((state: any) => ({
      itemDefinitions: [...state.itemDefinitions, def]
    }))
  };
});

