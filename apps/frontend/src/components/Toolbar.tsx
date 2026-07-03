import React from 'react';
import { useBoardStore, type Tool } from '../store/useBoardStore';
import { Pen, Square, Circle, Minus, Eraser, Undo, Redo, Trash2 } from 'lucide-react';

interface ToolbarProps {
 onUndo: () => void;
 onRedo: () => void;
 onClear: () => void;
}

export default function Toolbar({ onUndo, onRedo, onClear }: ToolbarProps) {
 const { tool, setTool, color, setColor, strokeWidth, setStrokeWidth } = useBoardStore();

 const tools: { id: Tool; icon: React.ElementType; label: string }[] = [
 { id: 'pen', icon: Pen, label: 'Freehand' },
 { id: 'line', icon: Minus, label: 'Line' },
 { id: 'rectangle', icon: Square, label: 'Rectangle' },
 { id: 'circle', icon: Circle, label: 'Circle' },
 { id: 'eraser', icon: Eraser, label: 'Eraser' },
 ];

 const colors = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

 return (
 <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-100 p-2 flex items-center gap-2 z-10">
 <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
 {tools.map((t) => {
 const Icon = t.icon;
 return (
 <button
 key={t.id}
 onClick={() => setTool(t.id)}
 className={`p-2 rounded-lg transition-colors ${
 tool === t.id
 ? 'bg-indigo-100 text-indigo-600 '
 : 'text-gray-600 hover:bg-gray-100 '
 }`}
 title={t.label}
 >
 <Icon size={20} />
 </button>
 );
 })}
 </div>

 <div className="flex items-center gap-1 border-r border-gray-200 px-2">
 {colors.map((c) => (
 <button
 key={c}
 onClick={() => setColor(c)}
 className={`w-6 h-6 rounded-full border-2 transition-transform ${
 color === c ? 'scale-110 border-gray-400 ' : 'border-transparent hover:scale-110'
 }`}
 style={{ backgroundColor: c }}
 title={c}
 />
 ))}
 <input
 type="color"
 value={color}
 onChange={(e) => setColor(e.target.value)}
 className="w-6 h-6 p-0 border-0 rounded cursor-pointer ml-1"
 />
 </div>

 <div className="flex items-center gap-2 border-r border-gray-200 px-2 w-32">
 <input
 type="range"
 min="1"
 max="20"
 value={strokeWidth}
 onChange={(e) => setStrokeWidth(Number(e.target.value))}
 className="w-full"
 title="Stroke Width"
 />
 </div>

 <div className="flex items-center gap-1 pl-2">
 <button
 onClick={onUndo}
 className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
 title="Undo"
 >
 <Undo size={20} />
 </button>
 <button
 onClick={onRedo}
 className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
 title="Redo"
 >
 <Redo size={20} />
 </button>
 <button
 onClick={onClear}
 className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
 title="Clear Board"
 >
 <Trash2 size={20} />
 </button>
 </div>
 </div>
 );
}
