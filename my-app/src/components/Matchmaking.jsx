import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/Matchmaking.module.scss';
import { useNavigate } from 'react-router-dom';

const Matchmaking = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('connecting'); // connecting, searching, matched, error, cancelled
  const [error, setError] = useState('');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  const socketRef = useRef(null);
  const timeoutRef = useRef(null);
  const heartbeatRef = useRef(null);
  
  const username = sessionStorage.getItem('username');
  const MAX_RECONNECT_ATTEMPTS = 5;
  
  // CLEAN, SIMPLE WEBSOCKET SETUP
  useEffect(() => {
    if (!username) {
      setError('Username not found. Please log in again.');
      setStatus('error');
      return;
    }
    
    clearAllTimeouts();
    
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      setError(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts.`);
      setStatus('error');
      return;
    }
    
    setStatus('connecting');
    console.log(`[MATCHMAKING] Connecting... (Attempt ${reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
      const wsUrl = `${protocol}//${host}/ws/matchmaking/${username}/`;
      
      socketRef.current = new WebSocket(wsUrl);
      
      socketRef.current.onopen = handleSocketOpen;
      socketRef.current.onmessage = handleSocketMessage;
      socketRef.current.onclose = handleSocketClose;
      socketRef.current.onerror = handleSocketError;
      
      timeoutRef.current = setTimeout(() => {
        if (status === 'connecting') {
          console.log('[MATCHMAKING] Connection timeout');
          if (socketRef.current) {
            socketRef.current.close();
          }
        }
      }, 10000);
      
      return () => {
        clearAllTimeouts();
        if (socketRef.current) {
          console.log('[MATCHMAKING] Cleaning up WebSocket');
          socketRef.current.close();
          socketRef.current = null;
        }
      };
    } catch (err) {
      console.error('[MATCHMAKING] Setup error:', err);
      setError(`Connection setup failed: ${err.message}`);
      setStatus('error');
      
      timeoutRef.current = setTimeout(() => {
        setReconnectAttempt(prev => prev + 1);
      }, 2000);
    }
  }, [username, reconnectAttempt]);
  
  // SOCKET EVENT HANDLERS - Clean and focused
  const handleSocketOpen = () => {
    console.log('[MATCHMAKING] WebSocket connected');
    clearTimeout(timeoutRef.current);
    setReconnectAttempt(0);
    
    startHeartbeat();
    
    joinMatchmaking();
  };
  
  const handleSocketMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[MATCHMAKING] Received:', data);
      
      switch (data.type) {
        case 'match_found':
          handleMatchFound(data);
          break;
        case 'in_queue':
          setStatus('searching');
          break;
        case 'error':
          setError(data.message || 'Server error');
          setStatus('error');
          break;
        case 'pong':
          break;
        default:
          console.log('[MATCHMAKING] Unhandled message type:', data.type);
      }
    } catch (err) {
      console.error('[MATCHMAKING] Message parsing error:', err);
      setError('Failed to process server message');
    }
  };
  
  const handleSocketClose = (event) => {
    console.log(`[MATCHMAKING] WebSocket closed: Code ${event.code}, Reason: ${event.reason || 'None'}`);
    
    if (status !== 'cancelled' && status !== 'matched' && reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
      timeoutRef.current = setTimeout(() => {
        setReconnectAttempt(prev => prev + 1);
      }, 2000);
    }
  };
  
  const handleSocketError = (error) => {
    console.error('[MATCHMAKING] WebSocket error:', error);
    setError('Connection error occurred');
    setStatus('error');
  };
  
  // MATCHMAKING CORE FUNCTIONS
  const joinMatchmaking = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    
    console.log('[MATCHMAKING] Joining matchmaking queue');
    setStatus('searching');
    
    socketRef.current.send(JSON.stringify({
      type: 'join_matchmaking',
      username: username
    }));
    
    timeoutRef.current = setTimeout(() => {
      if (status === 'searching') {
        setError('Matchmaking is taking longer than expected. Would you like to retry?');
        setStatus('error');
      }
    }, 120000);
  };
  
  const cancelMatchmaking = () => {
    console.log('[MATCHMAKING] Cancelling matchmaking');
    setStatus('cancelled');
    
    clearAllTimeouts();
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'cancel_matchmaking',
        username: username
      }));
      
      socketRef.current.close(1000, 'User cancelled matchmaking');
      socketRef.current = null;
    }
    
    navigate('/');
  };
  
  const handleMatchFound = (data) => {
    console.log('[MATCHMAKING] Match found!', data);
    setStatus('matched');
    clearAllTimeouts();
    
    if (!data.room) {
      setError('Invalid room information received');
      setStatus('error');
      return;
    }
    
    const roomId = data.room;
    localStorage.setItem('room', roomId);
    sessionStorage.setItem('room', roomId);
    
    if (data.players && data.players.length === 2) {
      const opponent = data.players.find(player => player !== username);
      if (opponent) {
        sessionStorage.setItem('opponent', opponent);
      }
    }
    
    try {
      const baseUrl = window.location.origin;
      window.location.href = `${baseUrl}/tictactoe?room=${roomId}`;
    } catch (err) {
      console.error('[MATCHMAKING] Navigation error:', err);
      navigate(`/tictactoe?room=${roomId}`);
    }
  };
  
  // UTILITY FUNCTIONS
  const clearAllTimeouts = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };
  
  const startHeartbeat = () => {
    heartbeatRef.current = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  };
  
  const handleRetry = () => {
    setError('');
    setReconnectAttempt(0);
  };
  
  // RENDER UI
  return (
    <div className={styles.container}>
      {status === 'error' && (
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <div>
            <button onClick={handleRetry}>Try Again</button>
            <button onClick={() => navigate('/login')}>Back to Login</button>
          </div>
        </div>
      )}
      
      {status === 'connecting' && (
        <>
          <h2>Connecting to server...</h2>
          <div className={styles.loadingIndicator}>
            <div className={styles.spinner}></div>
          </div>
          <button onClick={() => navigate('/')}>Back to Home</button>
        </>
      )}
      
      {status === 'searching' && (
        <>
          <h2>Finding an opponent</h2>
          <p>Player: {username}</p>
          <div className={styles.loadingIndicator}>
            <div className={styles.spinner}></div>
          </div>
          <p>Searching for a worthy challenger...</p>
          <button 
            className={styles.cancelButton}
            onClick={cancelMatchmaking}
          >
            Cancel Matchmaking
          </button>
        </>
      )}
      
      {status === 'matched' && (
        <>
          <h2>Match Found!</h2>
          <p>Redirecting to game...</p>
          <div className={styles.loadingIndicator}>
            <div className={styles.spinner}></div>
          </div>
        </>
      )}
    </div>
  );
};

export default Matchmaking;