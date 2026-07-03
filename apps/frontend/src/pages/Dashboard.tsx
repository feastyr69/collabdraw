import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Board {
 id: string;
 name: string;
 created_at: string;
}

export default function Dashboard() {
 const [boards, setBoards] = useState<Board[]>([]);
 const [newBoardName, setNewBoardName] = useState('');
 const { user, token, logout } = useAuth();
 const navigate = useNavigate();

 useEffect(() => {
 fetchBoards();
 }, []);

 const fetchBoards = async () => {
 try {
 const response = await fetch(`${import.meta.env.VITE_API_URL}/api/boards`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 if (response.ok) {
 const data = await response.json();
 setBoards(data);
 }
 } catch (err) {
 console.error('Failed to fetch boards:', err);
 }
 };

 const createBoard = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newBoardName.trim()) return;
 
 try {
 const response = await fetch(`${import.meta.env.VITE_API_URL}/api/boards`, {
 method: 'POST',
 headers: { 
 'Content-Type': 'application/json',
 Authorization: `Bearer ${token}`
 },
 body: JSON.stringify({ name: newBoardName }),
 });
 
 if (response.ok) {
 const newBoard = await response.json();
 navigate(`/board/${newBoard.id}`);
 }
 } catch (err) {
 console.error('Failed to create board:', err);
 }
 };

 return (
 <div className="min-h-screen bg-gray-50 p-8">
 <div className="max-w-4xl mx-auto">
 <div className="flex justify-between items-center mb-8">
 <h1 className="text-3xl font-bold text-gray-900 ">Welcome, {user?.email}</h1>
 <button onClick={logout} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200">Logout</button>
 </div>

 <div className="bg-white rounded-xl shadow p-6 mb-8">
 <h2 className="text-xl font-semibold mb-4 text-gray-800 ">Create New Board</h2>
 <form onSubmit={createBoard} className="flex gap-4">
 <input
 type="text"
 placeholder="Board Name"
 value={newBoardName}
 onChange={(e) => setNewBoardName(e.target.value)}
 className="flex-1 rounded-lg border border-gray-300 px-4 py-2 bg-transparent text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
 />
 <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
 Create
 </button>
 </form>
 </div>

 <div>
 <h2 className="text-2xl font-semibold mb-4 text-gray-800 ">Your Boards</h2>
 {boards.length === 0 ? (
 <p className="text-gray-500 ">You haven't created any boards yet.</p>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {boards.map(board => (
 <div key={board.id} className="bg-white rounded-xl shadow p-6 flex flex-col justify-between hover:shadow-lg transition-shadow border border-gray-100 ">
 <div>
 <h3 className="text-xl font-medium text-gray-900 mb-2 truncate">{board.name}</h3>
 <p className="text-xs text-gray-500 mb-6">Created {new Date(board.created_at).toLocaleDateString()}</p>
 </div>
 <button 
 onClick={() => navigate(`/board/${board.id}`)}
 className="w-full py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 font-medium transition-colors"
 >
 Open Board
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
