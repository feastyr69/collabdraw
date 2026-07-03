import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useBoardStore, type DrawingElement } from '../store/useBoardStore';
import Toolbar from '../components/Toolbar';
import DrawingCanvas from '../components/Canvas';

export default function Board() {
 const { id } = useParams<{ id: string }>();
 const { token } = useAuth();
 const navigate = useNavigate();
 const socketRef = useRef<Socket | null>(null);
 const [loading, setLoading] = useState(true);
 const { 
 elements, setElements, addElement, updateElement,
 undo, redo, clear, isDarkMode, backgroundPattern, scale, position
 } = useBoardStore();

 useEffect(() => {
 // Reset store on mount
 useBoardStore.setState({ elements: [], undoStack: [], redoStack: [] });

 const initBoard = async () => {
 try {
 const response = await fetch(`${import.meta.env.VITE_API_URL}/api/boards/${id}`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 if (!response.ok) {
 navigate('/dashboard');
 return;
 }
 
 // Setup Socket
 const socket = io(import.meta.env.VITE_API_URL);
 socketRef.current = socket;

 socket.on('connect', () => {
 socket.emit('join-board', id);
 });

 socket.on('board-state', (initialElements: DrawingElement[]) => {
 setElements(initialElements);
 setLoading(false);
 });

 socket.on('element-added', (element: DrawingElement) => {
 addElement(element);
 });

  socket.on('board-cleared', () => {
    setElements([]);
  });

  socket.on('element-removed', (elementId: string) => {
    const currentElements = useBoardStore.getState().elements;
    useBoardStore.getState().setElements(currentElements.filter(e => e.id !== elementId));
  });

  socket.on('element-updated', ({ id: elId, updates }: { id: string, updates: any }) => {
    const currentElements = useBoardStore.getState().elements;
    useBoardStore.getState().setElements(currentElements.map(e => e.id === elId ? { ...e, ...updates } : e));
  });

 } catch (err) {
 console.error('Error connecting to board:', err);
 navigate('/dashboard');
 }
 };

 initBoard();

 return () => {
 if (socketRef.current) {
 socketRef.current.disconnect();
 }
 };
 }, [id, token, navigate, setElements, addElement]);

 useEffect(() => {
   const handleKeyDown = (e: KeyboardEvent) => {
     if (e.ctrlKey || e.metaKey) {
       if (e.key.toLowerCase() === 'z') {
         e.preventDefault();
         if (e.shiftKey) {
           redo();
         } else {
           undo();
         }
       } else if (e.key.toLowerCase() === 'y') {
         e.preventDefault();
         redo();
       }
     }
   };

   window.addEventListener('keydown', handleKeyDown);
   return () => window.removeEventListener('keydown', handleKeyDown);
 }, [undo, redo]);

  const handleDrawEnd = (element: DrawingElement) => {
    addElement(element);
    if (socketRef.current) {
      socketRef.current.emit('draw-element', { boardId: id, element });
    }
  };

  const handleUndo = () => {
    const el = undo();
    if (el && socketRef.current) {
      socketRef.current.emit('remove-element', { boardId: id, elementId: el.id });
    }
  };

  const handleRedo = () => {
    const el = redo();
    if (el && socketRef.current) {
      socketRef.current.emit('draw-element', { boardId: id, element: el });
    }
  };

 const handleClear = () => {
 clear();
 if (socketRef.current) {
 socketRef.current.emit('clear-board', id);
 }
 };



 if (loading) {
 return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 ">Loading board...</div>;
 }

  const getThemeClass = () => {
    let classes = isDarkMode ? 'bg-gray-900 text-white dark-mode' : 'bg-gray-100 text-gray-900';
    if (backgroundPattern === 'square') classes += isDarkMode ? ' bg-graph-dark' : ' bg-graph-light';
    else if (backgroundPattern === 'dots') classes += isDarkMode ? ' bg-dots-dark' : ' bg-dots-light';
    return classes;
  };

  const handleCopy = (copiedElements: DrawingElement[]) => {
    if (socketRef.current) {
      copiedElements.forEach(el => socketRef.current!.emit('draw-element', { boardId: id, element: el }));
    }
  };

  const handleDelete = (deletedIds: string[]) => {
    if (socketRef.current) {
      deletedIds.forEach(elId => socketRef.current!.emit('remove-element', { boardId: id, elementId: elId }));
    }
  };

  const backgroundStyle = backgroundPattern !== 'none' 
    ? { 
        backgroundSize: `${20 * scale}px ${20 * scale}px`,
        backgroundPosition: `${position.x}px ${position.y}px`
      } 
    : {};

 return (
 <div className={`relative w-screen h-screen overflow-hidden touch-none ${getThemeClass()}`} style={backgroundStyle}>
 <Toolbar onUndo={handleUndo} onRedo={handleRedo} onClear={handleClear} onCopy={handleCopy} onDelete={handleDelete} />
 <DrawingCanvas 
  onDrawEnd={handleDrawEnd} 
  elements={elements} 
  onElementUpdate={(elementId, updates) => {
    updateElement(elementId, updates);
    if (socketRef.current) socketRef.current.emit('update-element', { boardId: id, id: elementId, updates });
  }}
 />
 </div>
 );
}
