import React, { useState, useEffect, useRef } from 'react';
import styles from './TicTacToe.module.scss';

const TicTacToe = ({ room }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [board, setBoard] = useState(Array(9).fill(''));
  const [player, setPlayer] = useState('X');
  const [currentTurn, setCurrentTurn] = useState('X');
  const [opponent, setOpponent] = useState(null);
  const [winner, setWinner] = useState(null);
  const [highlightedCells, setHighlightedCells] = useState([]);

  const socket = useRef(null);
  const username = sessionStorage.getItem('username');

  useEffect(() => {
    setIsMounted(true);
    if (username && room) {
      socket.current = new WebSocket(`ws://localhost:8000/ws/tictactoe/${room}/`);

      socket.current.onopen = () => {
        console.log("TicTacToe WebSocket connected");
      };

      socket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);

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
      };

      socket.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socket.current.onclose = (event) => {
        console.log("WebSocket closed with code:", event.code);
      };

      return () => {
        if (socket.current.readyState === WebSocket.OPEN) {
          socket.current.close();
        }
      };
    }
  }, [username, room]);

  const sendMove = (index) => {
    if (board[index] || winner || currentTurn !== player) return;
  
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type: 'move', index }));
    }
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
    </div>
  );
};

export default TicTacToe;
