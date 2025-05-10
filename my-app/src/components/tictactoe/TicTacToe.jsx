import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from '../../styles/TicTacToe.module.scss';
import axios from 'axios';
import { ACCESS_TOKEN } from '@/constants';


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

  const params = new URLSearchParams(location.search);
  const roomId = params.get('room');
  const username = sessionStorage.getItem('username');

  useEffect(() => {
    if (!roomId || !username) {
      navigate('/matchmaking');
      return;
    }

    socket.current = new WebSocket(`ws://localhost:8000/ws/tictactoe/${roomId}/${username}/`);

    socket.current.onopen = () => {
      setStatusMessage('CONNECTED! WAITING FOR OPPONENT...');
    };

    socket.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'game_ready') {
        setStatusMessage('GAME READY! GET SET...');
        setPlayers(data.players);
      }

      if (data.type === 'game_state') {
        setBoard(data.board);
        setCurrentTurn(data.current_turn);
        setGameOver(data.game_over);
        setWinner(data.winner);
        if (data.players) setPlayers(data.players);

        if (data.game_over && data.winner) {
          const winPositions = checkWinningCells(data.board);
          if (winPositions.length > 0) setWinningCells(winPositions);
        }

        if (data.game_over) {
          if (data.winner === username) {
            await sendGameResult('win');
            setStatusMessage('🎉 CONGRATULATIONS! YOU WIN! 🎉');
          } else if (data.winner) {
            await sendGameResult('lose');
            setStatusMessage(`GAME OVER - ${data.winner.toUpperCase()} WINS!`);
          } else {
            await sendGameResult('draw');
            setStatusMessage("IT'S A DRAW! GOOD GAME!");
          }
        } else {
          setStatusMessage(
            data.current_turn === username
              ? '🎮 YOUR TURN - MAKE A MOVE!'
              : `⏳ WAITING FOR ${data.current_turn.toUpperCase()}'S MOVE...`
          );
        }
      }

      if (data.type === 'player_left') {
        setStatusMessage(`${data.username.toUpperCase()} LEFT THE GAME`);
        setGameOver(true);
      }
    };

    socket.current.onclose = () => {
      setStatusMessage('CONNECTION LOST!');
    };

    socket.current.onerror = () => {
      setStatusMessage('CONNECTION ERROR!');
    };

    return () => {
      socket.current.close();
    };
  }, [roomId, username, navigate]);

  const checkWinningCells = (boardState) => {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    return winPatterns.find(([a, b, c]) =>
      boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]
    ) || [];
  };

  const handleCellClick = (index) => {
    if (currentTurn !== username || gameOver || board[index]) return;
    socket.current.send(JSON.stringify({ type: 'make_move', position: index }));
    console.log('Move sent:', index);
  };

  const sendGameResult = async (result) => {
    try {
      socket.current.send(JSON.stringify({ type: 'game_over', result: result}));
      // console.log('Game result sent:', result);
      // ('number of wins:', );
    } catch (error) {
      console.error('Failed to send game result:', error);
      // Optionally show an error message to the user
      setStatusMessage('Error saving game result');
    }
  };

  const exitGame = () => navigate('/');

  const playerSymbol = players.find(p => p.username === username)?.symbol;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>TIC TAC TOE</h1>

      <div className={styles.status}>
        {players.length > 0 && (
          <div>
            {players.map((p, i) => (
              <span key={i}>
                {p.username.toUpperCase()} ({p.symbol})
                {p.username === username && ' (YOU)'}
                {i === 0 && players.length > 1 && ' VS '}
              </span>
            ))}
          </div>
        )}
        <div>{statusMessage}</div>
      </div>

      <div className={styles.board}>
        {board.map((cell, i) => (
          <button
            key={i}
            className={`${styles.cell} ${winningCells.includes(i) ? styles.winningCell : ''}`}
            onClick={() => handleCellClick(i)}
            disabled={currentTurn !== username || gameOver || cell}
          >
            <span className={styles.span}>{cell}</span>
          </button>
        ))}
      </div>

      {gameOver && (
        <button className={styles.resetButton} onClick={exitGame}>
          EXIT GAME
        </button>
      )}
    </div>
  );
};

export default TicTacToe;
