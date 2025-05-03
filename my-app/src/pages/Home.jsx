import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.scss';
import { ACCESS_TOKEN } from '../constants';

function Home() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Check if user is logged in (has access token)
    const token = sessionStorage.getItem(ACCESS_TOKEN);
    const storedUsername = sessionStorage.getItem('username');


    if (token && storedUsername) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const handlePlay = () => {
    if (isLoggedIn) {
      navigate('/matchmaking');
    } else {
      navigate('/login');
    }
  };

    const handleLogout = () => {
      navigate('/logout');
    };
  
    return (
      <div className="home-container">
        <div className="scanlines"></div>
        <div className="home-content">
          <h1 className="game-title">TIC-TAC-TOE</h1>
          <div className="game-subtitle">DRARI M3ASBIN</div>
          
          {isLoggedIn ? (
            <div className="welcome-message">
              <p>WELCOME, {sessionStorage.getItem('username').toUpperCase()}</p>
            </div>
          ) : (
            <div className="welcome-message">
              <p>WELCOME, {sessionStorage.getItem('username').toUpperCase()}</p>
            </div>
          )}
          
          <div className="button-container">
            <button 
              className="retro-button play-button" 
              onClick={handlePlay}
            >
              PLAY GAME
            </button>
            
            {isLoggedIn ? (
              <button 
                className="retro-button logout-button" 
                onClick={handleLogout}
              >
                LOGOUT
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

export default Home;