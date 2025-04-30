import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import TicTacToe from './components/tictactoe/TicTacToe';
import Matchmaking from './components/Matchmaking';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

function Logout() {
  sessionStorage.clear();
  return <Navigate to="/login" />;
}

function RegisterAndLogout() {
  sessionStorage.clear();
  return <Register />;
}

// ✅ Correct hook usage inside functional component
function AppRoutes() {
  const navigate = useNavigate();
  const navigateToGame = (room) => {
    navigate(`/tictactoe?room=${room}`);
  };

  return (
    <Routes>
      <Route path="/tictactoe" element={<ProtectedRoute><TicTacToe /></ProtectedRoute>} />
      <Route path="/login" element={<Login />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/register" element={<RegisterAndLogout />} />
      <Route path="/matchmaking" element={<Matchmaking onMatchFound={navigateToGame} />} />
      
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
