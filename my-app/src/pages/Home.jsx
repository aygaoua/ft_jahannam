import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Home.scss';

function Home() {
    const navigate = useNavigate();
    const username = sessionStorage.getItem('username');
    const isLoggedIn = !!sessionStorage.getItem('ACCESS_TOKEN');

    const handlePlayNow = () => {
        if (isLoggedIn) {
            navigate('/matchmaking');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="home-container">
            <div className="glitch-container">
                <h1 className="glitch" data-text="DRARI M3ASBIN">DRARI M3ASBIN</h1>
            </div>
            
            <div className="game-description">
                <h2>ULTIMATE TIC-TAC-TOE BATTLE</h2>
                <p>Challenge opponents online in this retro-themed game.</p>
            </div>

            {isLoggedIn ? (
                <div className="welcome-back">
                    <p>Welcome back, <span className="username">{username}</span>!</p>
                </div>
            ) : (
                <div className="auth-options">
                    <p>Login or register to start playing</p>
                </div>
            )}

            <div className="button-container">
                <button className="neon-button play-button" onClick={handlePlayNow}>
                    {isLoggedIn ? 'FIND MATCH' : 'PLAY NOW'}
                </button>
                
                {!isLoggedIn && (
                    <>
                        <Link to="/login" className="neon-button login-button">LOGIN</Link>
                        <Link to="/register" className="neon-button register-button">REGISTER</Link>
                    </>
                )}
                
                {isLoggedIn && (
                    <Link to="/logout" className="neon-button logout-button">LOGOUT</Link>
                )}
            </div>
        </div>
    );
}

export default Home;