export type Position = { x: number; y: number };
export type Rotation = number; // in degrees for 2D
export type Scale = { x: number; y: number };

export interface LociData {
  title: string;
  description: string;
  notes: string;
}

export interface ItemDefinition {
  id: string;
  categoryId: string;
  name: string;
  imageSrc: string; // 2D image
  modelSrc?: string; // 3D model (GLB)
  defaultScale: Scale;
}

export interface PlacedItem {
  id: string;
  definitionId: string;
  floorId: string;
  position: Position;
  rotation: Rotation;
  scale: Scale;
  color: string; // hex
  lociData: LociData;
}

export interface Floor {
  id: string;
  name: string;
  order: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface AppState {
  floors: Floor[];
  activeFloorId: string;
  categories: Category[];
  itemDefinitions: ItemDefinition[];
  placedItems: PlacedItem[];
  mode: '2D' | '3D';
  selectedItemId: string | null;
  isLociModalOpen: boolean;
  
  // Actions
  setMode: (mode: '2D' | '3D') => void;
  setActiveFloor: (floorId: string) => void;
  addFloor: (name: string) => void;
  deleteFloor: (floorId: string) => void;
  
  addPlacedItem: (item: Omit<PlacedItem, 'id'>) => void;
  updatePlacedItem: (id: string, updates: Partial<PlacedItem>) => void;
  deletePlacedItem: (id: string) => void;
  
  selectItem: (id: string | null) => void;
  setLociModalOpen: (isOpen: boolean) => void;
  addItemDefinition: (def: ItemDefinition) => void;
}
