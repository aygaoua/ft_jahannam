import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/Matchmaking.module.scss';
import { useNavigate } from 'react-router-dom';

const Matchmaking = ({ username }) => {
  const navigate = useNavigate();
  const [isMatchFound, setIsMatchFound] = useState(false);
  const [error, setError] = useState('');
  const socket = useRef(null);
  
  // Use the passed username prop or fall back to sessionStorage if necessary
  const actualUsername = username || sessionStorage.getItem('username');

  useEffect(() => {
    if (!actualUsername) {
      setError('Username not found. Please log in again.');
      return;
    }

    if (!socket.current) {
      console.log("Connecting to matchmaking with username:", actualUsername);
      
      socket.current = new WebSocket(`ws://localhost:8000/ws/matchmaking/${actualUsername}/`);

      socket.current.onopen = () => {
        console.log("Matchmaking WebSocket connected");
      };

      socket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'match_found') {
          console.log("Match found! Room:", data.room);
          sessionStorage.setItem('room', data.room);
          setIsMatchFound(true);
        }
      };

      socket.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError('Connection error. Please try again.');
      };

      socket.current.onclose = () => {
        console.log("WebSocket closed");
      };
    }

    return () => {
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
    };
  }, [actualUsername]);

  useEffect(() => {
    if (isMatchFound) {
      const room = sessionStorage.getItem('room');
      if (room) {
        navigate(`/tictactoe?room=${room}`);
      } else {
        setError('Room information is missing. Please try again.');
      }
    }
  }, [isMatchFound, navigate]);

  return (
    <div className={styles.container}>
      {error ? (
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/login')}>Back to Login</button>
        </div>
      ) : (
        <>
          <h2>{isMatchFound ? "Match Found!" : "Waiting for a match..."}</h2>
          {!isMatchFound && (
            <>
              <p>Username: {actualUsername}</p>
              <div className={styles.loadingIndicator}>
                <div className={styles.spinner}></div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Matchmaking;