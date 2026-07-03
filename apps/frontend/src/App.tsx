import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Board from './pages/Board';
import PrivateRoute from './components/PrivateRoute';

function App() {
 return (
 <AuthProvider>
 <BrowserRouter>
 <Routes>
 <Route path="/" element={<Navigate to="/dashboard" replace />} />
 <Route path="/login" element={<Login />} />
 <Route path="/register" element={<Register />} />
 
 <Route element={<PrivateRoute />}>
 <Route path="/dashboard" element={<Dashboard />} />
 <Route path="/board/:id" element={<Board />} />
 </Route>
 </Routes>
 </BrowserRouter>
 </AuthProvider>
 );
}

export default App;
