import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TicTacToe from './components/tictactoe/TicTacToe';
import Matchmaking from './components/Matchmaking';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

// Utility function for clearing session storage
function clearSessionAndNavigate(path) {
  sessionStorage.clear();
  return <Navigate to={path} />;
}

// Component to handle logout
function Logout() {
  return clearSessionAndNavigate('/login');
}

// Component to handle register (with logout)
function RegisterAndLogout() {
  sessionStorage.clear();
  return <Register />;
}

// Main App component
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Game routes */}
        <Route 
          path="/tictactoe" 
          element={
            <ProtectedRoute>
              <TicTacToe />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/matchmaking" 
          element={
            <ProtectedRoute>
              <Matchmaking />
            </ProtectedRoute>
          } 
        />
        
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<RegisterAndLogout />} />
        
        {/* Other routes */}
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;