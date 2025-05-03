import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/Matchmaking.module.scss';
import { useNavigate } from 'react-router-dom';

const Matchmaking = () => {
  const navigate = useNavigate();
  const [isMatchFound, setIsMatchFound] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const socket = useRef(null);
  
  // Get username from session storage
  const username = sessionStorage.getItem('username');

  useEffect(() => {
    if (!username) {
      setError('Username not found. Please log in again.');
      return;
    }

    // Connect to the WebSocket server
    const connectSocket = () => {
      console.log("Connecting to matchmaking with username:", username);
      
      // Create WebSocket connection
      socket.current = new WebSocket(`ws://localhost:8000/ws/matchmaking/${username}/`);

      // Connection opened
      socket.current.onopen = () => {
        console.log("Matchmaking WebSocket connected");
        setConnectionStatus('connected');
      };

      // Listen for messages
      socket.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received message:", data);
          
          if (data.type === 'match_found') {
            console.log("Match found! Room:", data.room);
            sessionStorage.setItem('room', data.room);
            setIsMatchFound(true);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      // Handle errors
      socket.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus('error');
        setError('Connection error. Please try again.');
      };

      // Connection closed
      socket.current.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Don't try to reconnect if we've found a match or there's an error
        if (!isMatchFound && !error) {
          setTimeout(() => {
            connectSocket();
          }, 3000); // Try to reconnect after 3 seconds
        }
      };
    };

    // Initial connection
    connectSocket();

    // Cleanup on unmount
    return () => {
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
    };
  }, [username, isMatchFound, error]);

  // Redirect to the game once a match is found
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

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to server...';
      case 'connected':
        return 'Looking for opponent...';
      case 'disconnected':
        return 'Disconnected. Trying to reconnect...';
      case 'error':
        return 'Connection error';
      default:
        return 'Waiting...';
    }
  };

  return (
    <div className={styles.container}>
      {error ? (
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/login')}
            className={styles.button}
          >
            Back to Login
          </button>
        </div>
      ) : (
        <>
          <h1 className={styles.title}>Matchmaking</h1>
          
          <div className={styles.playerInfo}>
            <span>Player: {username}</span>
          </div>
          
          <div className={styles.statusContainer}>
            <p className={`${styles.statusLabel} ${styles[connectionStatus]}`}>
              {getStatusLabel()}
            </p>
            
            {connectionStatus === 'connected' && !isMatchFound && (
              <div className={styles.loadingIndicator}>
                <div className={styles.spinner}></div>
              </div>
            )}
            
            {isMatchFound && (
              <div className={styles.matchFound}>
                Match found! Redirecting to game...
              </div>
            )}
          </div>
          
          <button 
            onClick={() => navigate('/')}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
};

export default Matchmaking;