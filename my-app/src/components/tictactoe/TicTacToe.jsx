import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from '../../styles/TicTacToe.module.scss';

const TicTacToe = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [players, setPlayers] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [statusMessage, setStatusMessage] = useState('CONNECTING...');
  const [winningCells, setWinningCells] = useState([]);
  const socket = useRef(null);

  // Get room ID from URL query parameters
  const params = new URLSearchParams(location.search);
  const roomId = params.get('room');
  const username = sessionStorage.getItem('username');

  useEffect(() => {
    if (!roomId || !username) {
      navigate('/matchmaking');
      return;
    }

    // Connect to WebSocket
    socket.current = new WebSocket(`ws://localhost:8000/ws/tictactoe/${roomId}/${username}/`);

    socket.current.onopen = () => {
      setStatusMessage('CONNECTED! WAITING FOR OPPONENT...');
    };

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received game data:', data);

      switch (data.type) {
        case 'game_ready':
          setStatusMessage('GAME READY! GET SET...');
          setPlayers(data.players);
          break;

        case 'game_state':
          setBoard(data.board);
          setCurrentTurn(data.current_turn);
          setGameOver(data.game_over);
          setWinner(data.winner);
          
          if (data.players) {
            setPlayers(data.players);
          }
          
          // Check for winning cells
          if (data.game_over && data.winner) {
            const winPositions = checkWinningCells(data.board);
            if (winPositions.length > 0) {
              setWinningCells(winPositions);
            }
          }
          
          if (data.game_over) {
            if (data.winner) {
              setStatusMessage(data.winner === username ? 'YOU WIN!' : `${data.winner} WINS!`);
            } else {
              setStatusMessage('DRAW GAME!');
            }
          } else if (data.current_turn === username) {
            setStatusMessage('YOUR TURN');
          } else {
            setStatusMessage(`WAITING FOR ${data.current_turn.toUpperCase()}`);
          }
          break;

        case 'player_left':
          setStatusMessage(`${data.username.toUpperCase()} LEFT THE GAME`);
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    };

    socket.current.onclose = () => {
      setStatusMessage('CONNECTION LOST! RECONNECTING...');
      // You might want to implement reconnection logic here
    };

    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatusMessage('CONNECTION ERROR! TRY AGAIN');
    };

    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [roomId, username, navigate]);

  // Helper function to check for winning cells
  const checkWinningCells = (boardState) => {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
        return pattern;
      }
    }
    
    return [];
  };

  const handleCellClick = (index) => {
    // Prevent moves if not player's turn or game is over
    if (currentTurn !== username || gameOver || board[index] !== null) {
      return;
    }

    // Send move to server
    socket.current.send(JSON.stringify({
      type: 'make_move',
      position: index
    }));
  };

  const restartGame = () => {
    setWinningCells([]);
    socket.current.send(JSON.stringify({
      type: 'restart_game'
    }));
  };

  const exitGame = () => {
    navigate('/matchmaking');
  };

  // Find current player's symbol
  const playerSymbol = players.find(player => player.username === username)?.symbol;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>TIC TAC TOE</h1>
      <div className={styles.status}>
        {players.length > 0 && (
          <div>
            {players.map((player, index) => (
              <span key={index}>
                {player.username.toUpperCase()} ({player.symbol})
                {player.username === username ? ' (YOU)' : ''}
                {index === 0 && players.length > 1 ? ' VS ' : ''}
              </span>
            ))}
          </div>
        )}
        <div>ROOM: {roomId}</div>
        <div>{statusMessage}</div>
      </div>

      
      <div className={styles.board}>
        {board.map((cell, index) => (
          <button
            key={index}
            className={`${styles.cell} ${winningCells.includes(index) ? styles.winningCell : ''}`}
            onClick={() => handleCellClick(index)}
            disabled={currentTurn !== username || gameOver || cell !== null}
          >
            {/* {cell && <span>{cell}</span>} */}
            {<span className={styles.status}>{cell}</span>}
          </button>
        ))}
      </div>

      <div>
        {gameOver && (
          <button className={styles.resetButton} onClick={restartGame}>
            PLAY AGAIN
          </button>
        )}
        <button className={styles.resetButton} onClick={exitGame}>
          EXIT GAME
        </button>
      </div>
    </div>
  );
};

export default TicTacToe;