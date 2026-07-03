import { create } from 'zustand';

export type Tool = 'pen' | 'line' | 'rectangle' | 'circle' | 'eraser' | 'select-rect' | 'select-lasso';
export type BackgroundPattern = 'none' | 'square' | 'dots';


export interface Point {
  x: number;
  y: number;
}

export interface DrawingElement {
  id: string;
  tool: Tool;
  points: Point[]; // For pen, line, eraser
  x?: number; // For rect, circle
  y?: number;
  width?: number; // For rect
  height?: number;
  radius?: number; // For circle
  color: string;
  strokeWidth: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

interface BoardState {
  tool: Tool;
  color: string;
  strokeWidth: number;
  elements: DrawingElement[];
  undoStack: DrawingElement[];
  redoStack: DrawingElement[];
  isDarkMode: boolean;
  backgroundPattern: BackgroundPattern;
  scale: number;
  position: { x: number, y: number };
  lastEditedArea: { x: number, y: number } | null;
  selectedIds: string[];
  toggleDarkMode: () => void;
  setBackgroundPattern: (pattern: BackgroundPattern) => void;
  setScale: (scale: number) => void;
  zoom: (newScale: number, focusPoint?: { x: number, y: number }) => void;
  setPosition: (pos: { x: number, y: number }) => void;
  setLastEditedArea: (pos: { x: number, y: number }) => void;
  setSelectedIds: (ids: string[]) => void;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setElements: (elements: DrawingElement[]) => void;
  addElement: (element: DrawingElement) => void;
  updateElement: (id: string, updates: Partial<DrawingElement>) => void;
  undo: () => DrawingElement | null;
  redo: () => DrawingElement | null;
  clear: () => void;
  saveState: () => void;
  deleteSelected: () => string[];
  copySelected: () => DrawingElement[];
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tool: 'pen',
  color: '#000000',
  strokeWidth: 5,
  elements: [],
  undoStack: [],
  redoStack: [],
  isDarkMode: false,
  backgroundPattern: 'none',
  scale: 1,
  position: { x: 0, y: 0 },
  lastEditedArea: null,
  selectedIds: [],
  
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setBackgroundPattern: (pattern) => set({ backgroundPattern: pattern }),
  setScale: (scale) => set({ scale }),
  
  setPosition: (position) => set({ position }),
  setLastEditedArea: (lastEditedArea) => set({ lastEditedArea }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),

  zoom: (newScale, focusPoint) => set((state) => {
    const clampedScale = Math.min(Math.max(newScale, 0.1), 5);
    const oldScale = state.scale;
    
    let currentFocus = focusPoint;
    if (!currentFocus) {
      if (state.lastEditedArea) {
        currentFocus = {
          x: state.position.x + state.lastEditedArea.x * oldScale,
          y: state.position.y + state.lastEditedArea.y * oldScale
        };
      } else {
        currentFocus = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      }
    }

    const canvasPoint = {
      x: (currentFocus.x - state.position.x) / oldScale,
      y: (currentFocus.y - state.position.y) / oldScale,
    };

    const newPosition = {
      x: currentFocus.x - canvasPoint.x * clampedScale,
      y: currentFocus.y - canvasPoint.y * clampedScale,
    };

    return { scale: clampedScale, position: newPosition };
  }),

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  
  setElements: (elements) => set({ elements }),
  
  saveState: () => {
    // No longer needed as we track individual elements
  },

  addElement: (element) => set((state) => ({ 
    elements: [...state.elements, element],
    undoStack: [...state.undoStack, element],
    redoStack: []
  })),

  updateElement: (id, updates) => set((state) => ({
    elements: state.elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    )
  })),

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;
    
    const el = state.undoStack[state.undoStack.length - 1];
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, el],
      elements: state.elements.filter(e => e.id !== el.id)
    });
    return el;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;
    
    const el = state.redoStack[state.redoStack.length - 1];
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, el],
      elements: [...state.elements, el]
    });
    return el;
  },

  clear: () => {
    set({ elements: [], undoStack: [], redoStack: [], selectedIds: [] });
  },

  deleteSelected: () => {
    const { elements, selectedIds } = get();
    if (selectedIds.length === 0) return [];
    
    set({ 
      elements: elements.filter(el => !selectedIds.includes(el.id)),
      selectedIds: []
    });
    return selectedIds;
  },

  copySelected: () => {
    const { elements, selectedIds } = get();
    if (selectedIds.length === 0) return [];
    
    const newElements = elements
      .filter(el => selectedIds.includes(el.id))
      .map(el => {
        // Offset by a small amount
        const offset = 20;
        return {
          ...el,
          id: crypto.randomUUID(),
          x: el.x !== undefined ? el.x + offset : undefined,
          y: el.y !== undefined ? el.y + offset : undefined,
          points: el.points ? el.points.map(p => ({ x: p.x + offset, y: p.y + offset })) : []
        };
      });
      
    set({
      elements: [...elements, ...newElements],
      selectedIds: newElements.map(el => el.id)
    });
    
    return newElements;
  }
}));
