import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from '../../styles/TicTacToe.module.scss';

const TicTacToe = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const room = searchParams.get('room') || sessionStorage.getItem('room');

  // Game state
  const [board, setBoard] = useState(Array(9).fill(''));
  const [player, setPlayer] = useState('');
  const [currentTurn, setCurrentTurn] = useState('X');
  const [opponent, setOpponent] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  
  // Connection state
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Refs
  const socket = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Constants
  const username = sessionStorage.getItem('username');
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000; // 2 seconds

  // Connect to WebSocket server
  const connectWebSocket = useCallback(() => {
    if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionStatus('failed');
      setErrorMessage(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Please check if the server is running.`);
      return;
    }

    // Close existing socket if open
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.close();
    }

    setConnectionStatus('connecting');
    console.log(`Connecting to TicTacToe room: ${room} (Attempt ${connectionAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    try {
      socket.current = new WebSocket(`ws://localhost:8000/ws/tictactoe/${room}/`);

      // Connection opened
      socket.current.onopen = () => {
        console.log("TicTacToe WebSocket connected successfully");
        setIsSocketOpen(true);
        setConnectionStatus('connected');
        setErrorMessage('');
        setConnectionAttempts(0); // Reset attempts counter on successful connection
      };

      // Listen for messages
      socket.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received game message:", data);

          switch (data.type) {
            case 'start':
              setPlayer(data.symbol);
              setOpponent(data.opponent);
              setCurrentTurn('X'); // Game always starts with X
              break;
              
            case 'move':
              setBoard(data.board);
              setCurrentTurn(data.currentTurn);
              if (data.winner) {
                setWinner(data.winner);
                const highlightedCells = getWinningCombination(data.board);
                setWinningCells(highlightedCells);
              }
              break;
              
            case 'reset':
              resetGameState();
              break;
              
            case 'opponent_left':
              // Handle opponent disconnection
              setErrorMessage('Your opponent has left the game.');
              break;
              
            default:
              console.log("Unknown message type:", data.type);
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };

      // Handle errors
      socket.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus('error');
      };

      // Connection closed
      socket.current.onclose = (event) => {
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason || 'No reason provided'}`);
        setIsSocketOpen(false);
        setConnectionStatus('disconnected');

        // Attempt to reconnect if we haven't reached the limit
        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
          }, RECONNECT_DELAY);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setConnectionStatus('error');
      setErrorMessage(`Failed to create WebSocket connection: ${error.message}`);
    }
  }, [room, connectionAttempts]);

  // Initialize connection and handle reconnection
  useEffect(() => {
    if (!username || !room) {
      setErrorMessage("Missing username or room information");
      return;
    }
    
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
    };
  }, [username, room, connectWebSocket, connectionAttempts]);

  // Reset game state (local reset)
  const resetGameState = () => {
    setBoard(Array(9).fill(''));
    setWinner(null);
    setWinningCells([]);
    setCurrentTurn('X');
  };

  // Handle player move
  const handleMove = (index) => {
    // Validate move
    if (!isSocketOpen || winner || board[index] || currentTurn !== player) {
      return;
    }
    
    // Send move to server
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ 
        type: 'move', 
        index 
      }));
    }
  };

  // Request game reset
  const requestReset = () => {
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ 
        type: 'reset' 
      }));
    }
  };

  // Find winning combination
  const getWinningCombination = (currentBoard) => {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    
    for (const [a, b, c] of winPatterns) {
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return [a, b, c];
      }
    }
    return [];
  };

  // Game status message
  const getStatusMessage = () => {
    if (winner === 'D') {
      return "It's a draw!";
    } else if (winner) {
      return winner === player ? "You win!" : "Opponent wins!";
    } else {
      return currentTurn === player ? "Your turn" : "Opponent's turn";
    }
  };

  // Cell component
  const Cell = ({ index }) => {
    const isHighlighted = winningCells.includes(index);
    
    return (
      <div
        className={`${styles.cell} ${isHighlighted ? styles.winningCell : ''}`}
        onClick={() => handleMove(index)}
      >
        {board[index] && <span>{board[index]}</span>}
      </div>
    );
  };

  // Reconnect button handler
  const handleReconnect = () => {
    setConnectionAttempts(0);
    setErrorMessage('');
    connectWebSocket();
  };

  // Go back to home/matchmaking
  const goBack = () => {
    navigate('/matchmaking');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>TIC-TAC-TOE</h1>
      
      {connectionStatus === 'failed' || errorMessage ? (
        <div className={styles.error}>
          <p>{errorMessage || "Connection error"}</p>
          <div className={styles.buttonGroup}>
            <button onClick={handleReconnect} className={styles.button}>
              Try Again
            </button>
            <button onClick={goBack} className={styles.button}>
              Back to Matchmaking
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.gameInfo}>
            <div className={styles.connectionStatus}>
              <span className={styles[connectionStatus]}>
                {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
              </span>
            </div>
            
            {player && (
              <div className={styles.playerInfo}>
                <p>You: {player} (Player {player === 'X' ? '1' : '2'})</p>
                {opponent && <p>VS {opponent}</p>}
              </div>
            )}
          </div>
          
          <div className={styles.status}>
            {getStatusMessage()}
          </div>
          
          <div className={styles.board}>
            {board.map((_, i) => <Cell key={i} index={i} />)}
          </div>
          
          <div className={styles.controls}>
            <button 
              className={styles.resetButton} 
              onClick={requestReset}
              disabled={!isSocketOpen}
            >
              PLAY AGAIN
            </button>
            
            <button 
              className={styles.exitButton}
              onClick={goBack} 
            >
              EXIT GAME
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TicTacToe;