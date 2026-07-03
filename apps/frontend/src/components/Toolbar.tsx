import React from 'react';
import { useBoardStore, type Tool, type BackgroundPattern, type DrawingElement } from '../store/useBoardStore';
import { Pen, Square, Circle, Minus, Eraser, Undo, Redo, Trash2, Sun, Moon, ZoomIn, ZoomOut, MousePointer2, Lasso, Copy } from 'lucide-react';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCopy: (elements: DrawingElement[]) => void;
  onDelete: (ids: string[]) => void;
}

export default function Toolbar({ onUndo, onRedo, onClear, onCopy, onDelete }: ToolbarProps) {
  const { 
    tool, setTool, 
    color, setColor, 
    strokeWidth, setStrokeWidth, 
    isDarkMode, toggleDarkMode, 
    backgroundPattern, setBackgroundPattern,
    scale, zoom,
    selectedIds, deleteSelected, copySelected
  } = useBoardStore();

  const drawingTools: { id: Tool; icon: React.ElementType; label: string }[] = [
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
        <div className="relative group flex items-center">
          <button
            className={`p-2 rounded-lg transition-colors ${
              tool.startsWith('select') ? 'bg-indigo-100 text-indigo-600 ' : 'text-gray-600 hover:bg-gray-100 '
            }`}
            title="Select Tools"
          >
            {tool === 'select-lasso' ? <Lasso size={20} /> : <MousePointer2 size={20} />}
          </button>
          
          <div className="absolute top-full left-0 pt-2 flex flex-col z-50 min-w-max opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-1 group-hover:translate-y-0">
            <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-1 flex flex-col">
              <button
                onClick={() => setTool('select-rect')}
                className={`p-2 rounded-lg flex items-center gap-2 transition-colors ${
                  tool === 'select-rect' ? 'bg-indigo-50 text-indigo-600 ' : 'text-gray-600 hover:bg-gray-50 '
                }`}
              >
                <MousePointer2 size={16} /> <span className="text-sm font-medium">Rectangle</span>
              </button>
              <button
                onClick={() => setTool('select-lasso')}
                className={`p-2 rounded-lg flex items-center gap-2 transition-colors ${
                  tool === 'select-lasso' ? 'bg-indigo-50 text-indigo-600 ' : 'text-gray-600 hover:bg-gray-50 '
                }`}
              >
                <Lasso size={16} /> <span className="text-sm font-medium">Lasso</span>
              </button>
            </div>
          </div>
        </div>

        {drawingTools.map((t) => {
          const Icon = t.icon;
          const isPen = t.id === 'pen';
          return (
            <div key={t.id} className="relative group flex items-center">
              <button
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

              {isPen && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 pt-2 flex flex-col items-center z-50 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                  <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-3 w-full flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-2 font-medium">Brush Thickness</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-full premium-slider"
                      title="Stroke Width"
                    />
                  </div>
                </div>
              )}
            </div>
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



  <div className="flex items-center gap-2 border-r border-gray-200 px-2 w-36">
    <ZoomOut size={16} className="text-gray-500" />
    <input
      type="range"
      min="0.1"
      max="5"
      step="0.05"
      value={scale}
      onChange={(e) => zoom(Number(e.target.value))}
      className="w-full premium-slider"
      title={`Zoom: ${Math.round(scale * 100)}%`}
    />
    <ZoomIn size={16} className="text-gray-500" />
  </div>

  <div className="flex items-center gap-1 pl-2">
    {selectedIds.length > 0 && (
      <>
        <button
          onClick={() => {
            const elements = copySelected();
            if (elements.length > 0) onCopy(elements);
          }}
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Copy Selected"
        >
          <Copy size={20} />
        </button>
        <button
          onClick={() => {
            const ids = deleteSelected();
            if (ids.length > 0) onDelete(ids);
          }}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mr-2"
          title="Delete Selected"
        >
          <Trash2 size={20} />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1"></div>
      </>
    )}
    
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
      className="p-2 ml-1 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold border border-red-200 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
      title="Clear Board"
    >
      <Trash2 size={18} />
      <span className="text-xs hidden sm:inline uppercase tracking-wider">Clear All</span>
    </button>
  </div>

  <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
    <select
      value={backgroundPattern}
      onChange={(e) => setBackgroundPattern(e.target.value as BackgroundPattern)}
      className="p-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 text-gray-700"
    >
      <option value="none">Blank</option>
      <option value="square">Grid</option>
      <option value="dots">Dots</option>
    </select>
    
    <button
      onClick={toggleDarkMode}
      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      title="Toggle Dark Mode"
    >
      {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  </div>
 </div>
 );
}
