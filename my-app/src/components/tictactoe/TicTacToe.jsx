import React, { useState, useEffect, useRef } from 'react';
import styles from './TicTacToe.module.scss';

const TicTacToe = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [board, setBoard] = useState(Array(9).fill(''));
  const [player, setPlayer] = useState('X');
  const [winner, setWinner] = useState(null);
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [currentTurn, setCurrentTurn] = useState('X');

  const socket = useRef(null);
  
  const winningCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  
  const username = localStorage.getItem('username');
  useEffect(() => {
    setIsMounted(true);
    
    // Connect to WebSocket server
    // const username = localStorage.getItem('username');
    socket.current = new WebSocket(`ws://localhost:8000/ws/tictactoe/${username}/`);

    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'start') {
        setPlayer(data.symbol); // X or O assigned by server
        setOpponent(data.opponent);
      } else if (data.type === 'move') {
        setBoard(board);
        setWinner(winner);
        setHighlightedCells(getWinningCells(board));
        setCurrentTurn(currentTurn);
      }
      if (type === 'reset') {
        resetBoard(true); // true = remote reset
      }
    };

    return () => socket.current && socket.current.close();
  }, []);

  const handleCellClick = (index) => {
    if (board[index] || winner || currentTurn !== player) return;

    const updatedBoard = [...board];
    updatedBoard[index] = player;

    const newWinner = getWinner(updatedBoard);
    const newTurn = player === 'X' ? 'O' : 'X';

    // Update local
    setBoard(updatedBoard);
    setWinner(newWinner);
    setHighlightedCells(getWinningCells(updatedBoard));
    setCurrentTurn(newTurn);

    // Send move
    socket.current.send(JSON.stringify({
      type: 'move',
      index,
      board,
      winner,
      currentTurn,
    }));
  };

  const resetBoard = (remote = false) => {
    setBoard(Array(9).fill(''));
    setWinner(null);
    setHighlightedCells([]);
    setCurrentTurn('X');
    if (!remote) {
      socket.current.send(JSON.stringify({ type: 'reset' }));
    }
  };

  const getWinner = (currentBoard) => {
    for (const [a, b, c] of winningCombos) {
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return currentBoard[a];
      }
    }
    return currentBoard.includes('') ? null : 'D'; // Draw if no empty cells
  };

  const getWinningCells = (currentBoard) => {
    for (const [a, b, c] of winningCombos) {
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
        onClick={() => handleCellClick(index)}
      >
        {board[index] && <span>{board[index]}</span>}
      </div>
    );
  };

  if (!isMounted) {
    return <div className={styles.container} />;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>TIC-TAC-TOE M3ASSBA</h1>

      <div className={styles.status}>
        {winner
          ? (winner === 'D'
            ? "It's a draw!"
            : `Player ${winner === 'O' ? 'O' : username} wins!`)
          : `Player ${currentTurn === 'O' ? 'O' : username}'s turn`}
      </div>

      <div className={styles.board}>
        {board.map((_, i) => (
          <Cell key={i} index={i} />
        ))}
      </div>

      <button className={styles.resetButton} onClick={() => resetBoard()}>
        REMATCH
      </button>
    </div>
  );
};

export default TicTacToe;
