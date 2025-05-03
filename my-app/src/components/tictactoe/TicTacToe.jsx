import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import styles from '../../styles/TicTacToe.module.scss';

const TicTacToe = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const room = searchParams.get('room') || sessionStorage.getItem('room');

  const [isMounted, setIsMounted] = useState(false);
  const [board, setBoard] = useState(Array(9).fill(''));
  const [player, setPlayer] = useState('X');
  const [currentTurn, setCurrentTurn] = useState('X');
  const [opponent, setOpponent] = useState(null);
  const [winner, setWinner] = useState(null);
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [connectionError, setConnectionError] = useState('');

  const socket = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const username = sessionStorage.getItem('username');
  const MAX_RECONNECT_ATTEMPTS = 3;

  const connectWebSocket = useCallback(() => {
    if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionError(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Please check if the server is running.`);
      return;
    }

    console.log(`Attempting to connect to room: ${room} (Attempt ${connectionAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    // Close existing socket if it exists
    if (socket.current) {
      socket.current.close();
    }

    try {
      socket.current = new WebSocket(`ws://localhost:8000/ws/tictactoe/${room}/`);

      socket.current.onopen = () => {
        console.log("TicTacToe WebSocket connected successfully");
        setIsSocketOpen(true);
        setConnectionError('');
        // Reset connection attempts on successful connection
        setConnectionAttempts(0);
      };

      socket.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received message:", data);

          if (data.type === 'start') {
            setPlayer(data.symbol);
            setOpponent(data.opponent);
            setCurrentTurn('X');
          }

          if (data.type === 'move') {
            setBoard(data.board);
            setCurrentTurn(data.currentTurn);
            setWinner(data.winner);
            setHighlightedCells(getWinningCells(data.board));
          }

          if (data.type === 'reset') {
            resetBoard(true);
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };

      socket.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socket.current.onclose = (event) => {
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason || 'No reason provided'}`);
        setIsSocketOpen(false);

        // Only attempt to reconnect if we haven't reached the maximum attempts
        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          console.log("Attempting to reconnect...");
          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          // Set a new timeout for reconnection
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
          }, 2000); // Wait 2 seconds before reconnecting
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setConnectionError(`Failed to create WebSocket connection: ${error.message}`);
    }
  }, [room, connectionAttempts]);

  useEffect(() => {
    setIsMounted(true);
    
    if (username && room) {
      connectWebSocket();
    } else {
      setConnectionError("Missing username or room information");
    }

    return () => {
      // Clean up connection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [username, room, connectWebSocket, connectionAttempts]);

  const sendMove = (index) => {
    if (!isSocketOpen || !socket.current || socket.current.readyState !== WebSocket.OPEN) return;
    if (board[index] || winner || currentTurn !== player) return;

    socket.current.send(JSON.stringify({ type: 'move', index }));
  };

  const resetBoard = (remote = false) => {
    setBoard(Array(9).fill(''));
    setWinner(null);
    setHighlightedCells([]);
    setCurrentTurn('X');
    if (!remote && socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type: 'reset' }));
    }
  };

  const getWinningCells = (currentBoard) => {
    const combos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of combos) {
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return [a, b, c];
      }
    }
    return [];
  };

  const Cell = ({ index }) => {
    const isHighlighted = highlightedCells.includes(index);
    return (
      <div
        className={`${styles.cell} ${isHighlighted ? styles.winningCell : ''}`}
        onClick={() => sendMove(index)}
      >
        {board[index] && <span>{board[index]}</span>}
      </div>
    );
  };

  if (!isMounted) return <div className={styles.container} />;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>TIC-TAC-TOE</h1>
      
      {connectionError ? (
        <div className={styles.error}>
          <p>{connectionError}</p>
          <button onClick={() => {
            setConnectionAttempts(0); 
            setConnectionError('');
            connectWebSocket();
          }}>
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className={styles.connectionStatus}>
            {isSocketOpen ? (
              <span className={styles.connected}>Connected</span>
            ) : (
              <span className={styles.disconnected}>Disconnected</span>
            )}
          </div>
          
          <div className={styles.status}>
            {winner
              ? (winner === 'D'
                  ? "It's a draw!"
                  : `Player ${winner === player ? username : 'Opponent'} wins!`)
              : `Player ${currentTurn === player ? username : 'Opponent'}'s turn`}
          </div>
          
          <div className={styles.board}>
            {board.map((_, i) => <Cell key={i} index={i} />)}
          </div>
          
          <button className={styles.resetButton} onClick={() => resetBoard()}>
            REMATCH
          </button>
        </>
      )}
    </div>
  );
};

export default TicTacToe;