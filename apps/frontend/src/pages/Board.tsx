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
 elements, setElements, addElement, 
 undo, redo, clear, saveState 
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
 useBoardStore.getState().saveState();
 setElements([]);
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

 const handleDrawEnd = (element: DrawingElement) => {
 saveState();
 addElement(element);
 if (socketRef.current) {
 socketRef.current.emit('draw-element', { boardId: id, element });
 }
 };

 const handleUndo = () => {
 undo();
 // For a fully robust app, we'd sync undo/redo stacks or use CRDTs. 
 // For level 1, if we undo, we probably need to sync the entire state 
 // back to the server to rewrite the Redis state.
 // To keep it simple, we'll just emit a clear and re-emit all elements.
 if (socketRef.current) {
 syncFullState();
 }
 };

 const handleRedo = () => {
 redo();
 if (socketRef.current) {
 syncFullState();
 }
 };

 const handleClear = () => {
 clear();
 if (socketRef.current) {
 socketRef.current.emit('clear-board', id);
 }
 };

 const syncFullState = () => {
    // Send the entire board state in a single event for a seamless update
    const currentElements = useBoardStore.getState().elements;
    socketRef.current?.emit('sync-board-state', { boardId: id, elements: currentElements });
  };

 if (loading) {
 return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 ">Loading board...</div>;
 }

 return (
 <div className="relative w-screen h-screen overflow-hidden bg-gray-100 touch-none">
 <Toolbar onUndo={handleUndo} onRedo={handleRedo} onClear={handleClear} />
 <DrawingCanvas onDrawEnd={handleDrawEnd} elements={elements} />
 </div>
 );
}
