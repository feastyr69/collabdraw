import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [error, setError] = useState('');
 const { login } = useAuth();
 const navigate = useNavigate();
 const location = useLocation();

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email, password }),
 });
 const data = await response.json();
 
 if (response.ok) {
 login(data.token, data.user);
 const from = location.state?.from?.pathname || '/dashboard';
 navigate(from, { replace: true });
 } else {
 setError(data.error || 'Login failed');
 }
 } catch (err) {
 setError('An error occurred. Please try again.');
 }
 };

 return (
 <div className="min-h-screen flex items-center justify-center bg-gray-50 ">
 <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg border border-gray-100 ">
 <h2 className="text-3xl font-bold text-center mb-6 text-gray-900 ">Login to CollabDraw</h2>
 {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 ">Email</label>
 <input
 type="email"
 required
 className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-transparent text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 ">Password</label>
 <input
 type="password"
 required
 className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-transparent text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 />
 </div>
 <button
 type="submit"
 className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
 >
 Login
 </button>
 </form>
 <p className="mt-4 text-center text-sm text-gray-600 ">
 Don't have an account? <Link to="/register" className="text-indigo-600 hover:text-indigo-500 font-medium">Register</Link>
 </p>
 </div>
 </div>
 );
}
