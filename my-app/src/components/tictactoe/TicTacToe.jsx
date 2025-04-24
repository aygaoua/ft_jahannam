import React, { useState, useEffect } from 'react';
import styles from './TicTacToe.module.scss';
import Form from '../Form';

const TicTacToe = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [board, setBoard] = useState(Array(9).fill(''));
  const [player, setPlayer] = useState('X');
  const [winner, setWinner] = useState(null);
  const [highlightedCells, setHighlightedCells] = useState([]);
  const username = localStorage.getItem('username') || player;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const winningCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  if (!isMounted) return <div className={styles.container} />;

  const handleCellClick = (index) => {
    if (board[index] || winner)
      return;
    const updatedBoard = [...board];
    updatedBoard[index] = player;
    setBoard(updatedBoard);
    checkForWinner(updatedBoard);
    setPlayer(player === 'X' ? 'O' : 'X');
  };

  const checkForWinner = (currentBoard) => {
    for (const combo of winningCombos) {
      const [a, b, c] = combo;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        setWinner(currentBoard[a]);
        setHighlightedCells(combo);
        return;
      }
    }
    if (!currentBoard.includes(''))
      setWinner('D');
  };

  const resetBoard = () => {
    setBoard(Array(9).fill(''));
    setPlayer('X');
    setWinner(null);
    setHighlightedCells([]);
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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>TIC-TAC-TOE M3ASSBA</h1>
      <div className={styles.status}>
        {winner
          ? winner === 'D' ? 'It\'s a draw!' : ` Player ${winner} wins!`
          : `Player ${username}'s turn`}
      </div>

      <div className={styles.board}>
        {board.map((_, i) => <Cell key={i} index={i} />)}
      </div>

      <button className={styles.resetButton} onClick={resetBoard}>
        REMATCH
      </button>
    </div>
  );
};

export default TicTacToe;
