import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/Matchmaking.module.scss'; // Adjust the path as necessary
import { useNavigate } from 'react-router-dom';

const Matchmaking = ({ username }) => {
  const navigate = useNavigate();
  const [isMatchFound, setIsMatchFound] = useState(false);
  const socket = useRef(null);

  useEffect(() => {
    if (!socket.current) {
      socket.current = new WebSocket(`ws://localhost:8000/ws/matchmaking/${sessionStorage.getItem('username')}/`);

      socket.current.onopen = () => {
        console.log("Matchmaking WebSocket connected");
      };

      socket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received data:", data);

        if (data.type === 'match_found' && !isMatchFound) {
          setIsMatchFound(true);
          sessionStorage.setItem('room', data.room);
        }
      };

      socket.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socket.current.onclose = (event) => {
        console.log("WebSocket closed with code:", event.code);
      };
    }

    return () => {
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        console.log("Closing WebSocket connection...");
      }
    };
  }, [username, isMatchFound]);

  useEffect(() => {
    if (isMatchFound) {
      navigate(`/tictactoe?room=${sessionStorage.getItem('room')}`);
    }
  }, [isMatchFound, navigate]);

  return (
    <div className={styles.container}>
      {isMatchFound ? (
        <div className={styles.matchFound}>
          <h2>Match Found!</h2>
          <p>Redirecting to the game...</p>
        </div>
      ) : (
        <div className={styles.waiting}>
          <h2>Waiting for a match...</h2>
          <p>Room: {sessionStorage.getItem('room')}</p>
          <p>Username: {sessionStorage.getItem('username')}</p>
          <p>Waiting for the other player...</p>
          <p>Click <a href="/tictactoe">here</a> if not redirected.</p>
          <p>Click <a href="/logout">here</a> to logout.</p>
          <p>Click <a href="/register">here</a> to register.</p>
          <p>Click <a href="/">here</a> to go to the home page.</p>
          <p>Click <a href="/matchmaking">here</a> to go back to matchmaking.</p>
        </div>
      )}
    </div>
  );
};

export default Matchmaking;