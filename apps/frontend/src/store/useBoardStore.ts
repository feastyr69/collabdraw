import { create } from 'zustand';

export type Tool = 'pen' | 'line' | 'rectangle' | 'circle' | 'eraser';

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
}

interface BoardState {
  tool: Tool;
  color: string;
  strokeWidth: number;
  elements: DrawingElement[];
  undoStack: DrawingElement[][];
  redoStack: DrawingElement[][];
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setElements: (elements: DrawingElement[]) => void;
  addElement: (element: DrawingElement) => void;
  updateElement: (id: string, updates: Partial<DrawingElement>) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  saveState: () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tool: 'pen',
  color: '#000000',
  strokeWidth: 5,
  elements: [],
  undoStack: [],
  redoStack: [],
  
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  
  setElements: (elements) => set({ elements }),
  
  saveState: () => {
    const { elements, undoStack } = get();
    // Keep last 50 states for undo
    const newUndo = [...undoStack, [...elements]].slice(-50);
    set({ undoStack: newUndo, redoStack: [] });
  },

  addElement: (element) => set((state) => ({ 
    elements: [...state.elements, element]
  })),

  updateElement: (id, updates) => set((state) => ({
    elements: state.elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    )
  })),

  undo: () => set((state) => {
    if (state.undoStack.length === 0) return state;
    
    const previousElements = state.undoStack[state.undoStack.length - 1];
    const newUndoStack = state.undoStack.slice(0, -1);
    
    return {
      elements: previousElements,
      undoStack: newUndoStack,
      redoStack: [...state.redoStack, [...state.elements]]
    };
  }),

  redo: () => set((state) => {
    if (state.redoStack.length === 0) return state;
    
    const nextElements = state.redoStack[state.redoStack.length - 1];
    const newRedoStack = state.redoStack.slice(0, -1);
    
    return {
      elements: nextElements,
      undoStack: [...state.undoStack, [...state.elements]],
      redoStack: newRedoStack
    };
  }),

  clear: () => {
    const { saveState } = get();
    saveState();
    set({ elements: [] });
  }
}));
