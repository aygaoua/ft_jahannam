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
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  
  // Refs
  const socket = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Constants
  const username = sessionStorage.getItem('username');
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000; // 2 seconds

  // Store room in session storage if it exists
  useEffect(() => {
    if (room) {
      sessionStorage.setItem('room', room);
    }
  }, [room]);

  // Improved WebSocket reconnection logic and error handling
  useEffect(() => {
    if (!username || !room) {
        setErrorMessage("Missing username or room information");
        return;
    }

    connectWebSocket();

    return () => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        if (socket.current) {
            socket.current.close();
            socket.current = null;
        }
    };
  }, [username, room, connectionAttempts]);

  const connectWebSocket = useCallback(() => {
    if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setConnectionStatus('failed');
        setErrorMessage(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Please check if the server is running.`);
        return;
    }

    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        socket.current.close();
    }

    setConnectionStatus('connecting');
    console.log(`Connecting to TicTacToe room: ${room} (Attempt ${connectionAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

    try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws/tictactoe/${room}/`;

        socket.current = new WebSocket(wsUrl);

        socket.current.onopen = () => {
            console.log("TicTacToe WebSocket connected successfully");
            setIsSocketOpen(true);
            setConnectionStatus('connected');
            setErrorMessage('');
            setConnectionAttempts(0);
            if (socket.current && username) {
                socket.current.send(JSON.stringify({ type: 'join', username: username }));
                console.log("Sent join message with username:", username);
            }
        };

        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Received game message:", data);
            handleWebSocketMessage(data);
        };

        socket.current.onerror = (error) => {
            console.error("WebSocket error:", error);
            setConnectionStatus('error');
            setErrorMessage('A WebSocket error occurred. Please try reconnecting.');
        };

        socket.current.onclose = (event) => {
            console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason || 'No reason provided'}`);
            setIsSocketOpen(false);
            setConnectionStatus('disconnected');

            if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    setConnectionAttempts(prev => prev + 1);
                }, RECONNECT_DELAY);
            } else {
                setErrorMessage('Maximum reconnection attempts reached. Please check your connection.');
            }
        };
    } catch (error) {
        console.error("Error creating WebSocket:", error);
        setConnectionStatus('error');
        setErrorMessage(`Failed to create WebSocket connection: ${error.message}`);
        reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
        }, RECONNECT_DELAY);
    }
  }, [room, connectionAttempts, username]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'start':
        console.log("Game starting with data:", data);
        setPlayer(data.symbol);
        setOpponent(data.opponent || (data.symbol === 'X' ? 'Player 2' : 'Player 1'));
        setBoard(Array(9).fill(''));
        setWinner(null);
        setWinningCells([]);
        setCurrentTurn('X');
        setOpponentLeft(false);
        setWaitingForOpponent(false);
        setErrorMessage('');
        break;
        
      case 'move':
        console.log("Move received:", data);
        if (data.board) {
          setBoard(data.board);
        }
        if (data.currentTurn) {
          setCurrentTurn(data.currentTurn);
        }
        if (data.winner) {
          setWinner(data.winner);
          if (data.winner !== 'D') {
            const highlightedCells = getWinningCombination(data.board);
            setWinningCells(highlightedCells);
          }
        }
        break;
        
      case 'reset':
        resetGameState();
        break;
        
      case 'opponent_left':
        console.log("Opponent left the game");
        setOpponentLeft(true);
        setWaitingForOpponent(true);
        setErrorMessage('Your opponent has left the game. Waiting for them to reconnect...');

        const timeoutId = setTimeout(() => {
            if (socket.current && socket.current.readyState === WebSocket.OPEN) {
                setWaitingForOpponent(false);
                setErrorMessage('Your opponent didn\'t reconnect. You can leave or wait longer.');
            }
        }, 30000);

        reconnectTimeoutRef.current = timeoutId; // Store timeout ID for cleanup
        break;

      case 'opponent_rejoined':
        console.log("Opponent rejoined the game");
        setOpponentLeft(false);
        setWaitingForOpponent(false);
        setErrorMessage('');
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current); // Clear timeout on rejoin
            reconnectTimeoutRef.current = null;
        }
        break;
        
      case 'waiting_for_opponent':
        console.log("Waiting for opponent to join");
        setWaitingForOpponent(true);
        setErrorMessage('Waiting for opponent to join...');
        break;
        
      case 'end':
        setTimeout(() => {
          resetGameState();
        }, 2000);
        break;

      case 'error':
        setErrorMessage(data.message || "An error occurred in the game");
        break;

      default:
        console.log("Unknown message type:", data.type);
    }
  };

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
    
    // Update local state optimistically
    const newBoard = [...board];
    newBoard[index] = player;
    setBoard(newBoard);
    
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
    if (waitingForOpponent) {
      return opponentLeft 
        ? "Opponent left - waiting for reconnection..." 
        : "Waiting for opponent to join...";
    } else if (winner === 'D') {
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
    const cellValue = board[index];
    
    return (
      <div
        className={`${styles.cell} ${isHighlighted ? styles.winningCell : ''} ${cellValue ? styles.filled : ''}`}
        onClick={() => handleMove(index)}
      >
        {cellValue && <span>{cellValue}</span>}
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

  // Handle heartbeat pings to keep connection alive
  useEffect(() => {
    if (!isSocketOpen || !socket.current) return;
    
    const pingInterval = setInterval(() => {
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        socket.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
    
    return () => clearInterval(pingInterval);
  }, [isSocketOpen]);

  // Reconnect button handler specific for opponent left scenario
  const waitForOpponent = () => {
    setErrorMessage('Waiting for opponent to reconnect...');
    setWaitingForOpponent(true);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>TIC-TAC-TOE</h1>
      
      {connectionStatus === 'failed' ? (
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
          
          {errorMessage && opponentLeft && (
            <div className={styles.opponentLeftMessage}>
              <p>{errorMessage}</p>
              <div className={styles.buttonGroup}>
                <button 
                  onClick={waitForOpponent} 
                  className={styles.button}
                  disabled={waitingForOpponent}
                >
                  {waitingForOpponent ? "Waiting..." : "Wait for Opponent"}
                </button>
                <button onClick={goBack} className={styles.button}>
                  Leave Game
                </button>
              </div>
            </div>
          )}
          
          <div className={styles.board}>
            {board.map((_, i) => <Cell key={i} index={i} />)}
          </div>
          
          <div className={styles.controls}>
            <button 
              className={styles.resetButton} 
              onClick={requestReset}
              disabled={!isSocketOpen || !winner}
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