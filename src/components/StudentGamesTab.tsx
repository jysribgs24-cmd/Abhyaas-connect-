import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Gamepad2,
  Timer,
  Trophy,
  RotateCcw,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  SkipForward,
  Award,
} from 'lucide-react';
import { GameScores, SubjectItem } from '../types';
import { updateGameHighScore, updateTicTacToeScore, resetTicTacToeScore } from '../lib/dataService';
import { useTheme } from '../context/ThemeContext';

interface StudentGamesTabProps {
  studentId: string;
  gameScores: GameScores;
  subjects: SubjectItem[];
}

type ActiveGame = 'menu' | 'math' | 'word' | 'snake' | 'ttt';

export const StudentGamesTab: React.FC<StudentGamesTabProps> = ({
  studentId,
  gameScores,
  subjects,
}) => {
  const [activeGame, setActiveGame] = useState<ActiveGame>('menu');
  const { theme } = useTheme();

  // ==========================================
  // GAME 1: MATH SPRINT
  // ==========================================
  const [mathTime, setMathTime] = useState(60);
  const [mathScore, setMathScore] = useState(0);
  const [mathStreak, setMathStreak] = useState(0);
  const [mathQuestion, setMathQuestion] = useState<{
    prompt: string;
    answer: number;
    options: number[];
  } | null>(null);
  const [mathFlashFeedback, setMathFlashFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [mathGameOver, setMathGameOver] = useState(false);

  const generateMathQuestion = (streak: number) => {
    let a = 0, b = 0, op = '+', ans = 0;
    // Level ramps with streak
    if (streak < 4) {
      // Level 1: Add/sub to 20
      op = Math.random() > 0.5 ? '+' : '-';
      if (op === '+') {
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
        ans = a + b;
      } else {
        a = Math.floor(Math.random() * 15) + 5;
        b = Math.floor(Math.random() * a) + 1;
        ans = a - b;
      }
    } else if (streak < 8) {
      // Level 2: Bigger add/sub + multiplication
      const type = Math.floor(Math.random() * 3);
      if (type === 0) {
        a = Math.floor(Math.random() * 30) + 10;
        b = Math.floor(Math.random() * 30) + 10;
        op = '+';
        ans = a + b;
      } else if (type === 1) {
        a = Math.floor(Math.random() * 40) + 20;
        b = Math.floor(Math.random() * 20) + 5;
        op = '-';
        ans = a - b;
      } else {
        a = Math.floor(Math.random() * 9) + 2;
        b = Math.floor(Math.random() * 9) + 2;
        op = '×';
        ans = a * b;
      }
    } else {
      // Level 3: Exact division + harder mix
      const type = Math.floor(Math.random() * 3);
      if (type === 0) {
        // Exact division
        const divisor = Math.floor(Math.random() * 9) + 2;
        const quotient = Math.floor(Math.random() * 12) + 2;
        a = divisor * quotient;
        b = divisor;
        op = '÷';
        ans = quotient;
      } else if (type === 1) {
        a = Math.floor(Math.random() * 12) + 3;
        b = Math.floor(Math.random() * 12) + 3;
        op = '×';
        ans = a * b;
      } else {
        a = Math.floor(Math.random() * 70) + 30;
        b = Math.floor(Math.random() * 50) + 20;
        op = '-';
        ans = a - b;
      }
    }

    // Generate 4 distinct options
    const optionsSet = new Set<number>([ans]);
    while (optionsSet.size < 4) {
      const delta = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const wrong = ans + delta;
      if (wrong >= 0) optionsSet.add(wrong);
    }
    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    return { prompt: `${a} ${op} ${b}`, answer: ans, options };
  };

  const startMathGame = () => {
    setMathTime(60);
    setMathScore(0);
    setMathStreak(0);
    setMathGameOver(false);
    setMathFlashFeedback(null);
    setMathQuestion(generateMathQuestion(0));
  };

  useEffect(() => {
    if (activeGame !== 'math' || mathGameOver) return;
    const interval = setInterval(() => {
      setMathTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setMathGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeGame, mathGameOver]);

  const handleMathAnswer = (chosen: number) => {
    if (!mathQuestion || mathGameOver) return;
    if (chosen === mathQuestion.answer) {
      const newScore = mathScore + 1;
      const newStreak = mathStreak + 1;
      setMathScore(newScore);
      setMathStreak(newStreak);
      setMathFlashFeedback('correct');
      updateGameHighScore(studentId, 'ms', newScore);
      setTimeout(() => {
        setMathFlashFeedback(null);
        setMathQuestion(generateMathQuestion(newStreak));
      }, 200);
    } else {
      setMathStreak(0);
      setMathFlashFeedback('wrong');
      setTimeout(() => {
        setMathFlashFeedback(null);
        setMathQuestion(generateMathQuestion(0));
      }, 500);
    }
  };

  // ==========================================
  // GAME 2: WORD SCRAMBLE
  // ==========================================
  const wordsList = useMemo(() => {
    const words = new Set<string>();
    subjects.forEach((s) => {
      s.name.split(/\s+/).forEach((w) => {
        const clean = w.replace(/[^A-Za-z]/g, '').toUpperCase();
        if (clean.length >= 4 && clean.length <= 10) words.add(clean);
      });
      s.lessons.forEach((l) => {
        l.name.split(/\s+/).forEach((w) => {
          const clean = w.replace(/[^A-Za-z]/g, '').toUpperCase();
          if (clean.length >= 4 && clean.length <= 10) words.add(clean);
        });
      });
    });
    // Add default subject keywords
    ['SCIENCE', 'FRACTION', 'GRAVITY', 'ALGEBRA', 'PYTHAGORAS', 'HISTORY', 'DEMOCRACY', 'COMPUTER', 'PHOTOSYNTHESIS', 'TRIANGLE', 'PRESSURE', 'CIRCUIT', 'OXYGEN', 'PLANET', 'NUTRITION'].forEach(
      (w) => words.add(w)
    );
    return Array.from(words);
  }, [subjects]);

  const [wordTime, setWordTime] = useState(90);
  const [wordScore, setWordScore] = useState(0);
  const [wordsSkipped, setWordsSkipped] = useState(0);
  const [wordGameOver, setWordGameOver] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [scrambledTiles, setScrambledTiles] = useState<Array<{ id: number; char: string; used: boolean }>>([]);
  const [userSlots, setUserSlots] = useState<Array<{ tileId: number; char: string } | null>>([]);
  const [wordFlashRed, setWordFlashRed] = useState(false);

  const scrambleWord = (word: string) => {
    const chars = word.split('');
    // Scramble letters until different from original
    let shuffled = [...chars].sort(() => Math.random() - 0.5);
    if (shuffled.join('') === word && word.length > 2) {
      shuffled.reverse();
    }
    return shuffled.map((char, id) => ({ id, char, used: false }));
  };

  const nextWord = () => {
    const randomW = wordsList[Math.floor(Math.random() * wordsList.length)] || 'SCIENCE';
    setCurrentWord(randomW);
    setScrambledTiles(scrambleWord(randomW));
    setUserSlots(new Array(randomW.length).fill(null));
  };

  const startWordGame = () => {
    setWordTime(90);
    setWordScore(0);
    setWordsSkipped(0);
    setWordGameOver(false);
    nextWord();
  };

  useEffect(() => {
    if (activeGame !== 'word' || wordGameOver) return;
    const interval = setInterval(() => {
      setWordTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setWordGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeGame, wordGameOver]);

  const handleTapTile = (tile: { id: number; char: string; used: boolean }) => {
    if (tile.used) return;
    // Find first empty slot
    const firstEmptyIndex = userSlots.findIndex((s) => s === null);
    if (firstEmptyIndex === -1) return;

    const newSlots = [...userSlots];
    newSlots[firstEmptyIndex] = { tileId: tile.id, char: tile.char };
    setUserSlots(newSlots);

    setScrambledTiles((prev) =>
      prev.map((t) => (t.id === tile.id ? { ...t, used: true } : t))
    );

    // Auto-check when all slots filled
    if (firstEmptyIndex === currentWord.length - 1) {
      const guessed = newSlots.map((s) => s?.char).join('');
      if (guessed === currentWord) {
        const newScore = wordScore + 1;
        setWordScore(newScore);
        updateGameHighScore(studentId, 'ws', newScore);
        setTimeout(nextWord, 200);
      } else {
        setWordFlashRed(true);
        setTimeout(() => {
          setWordFlashRed(false);
          // Clear slots and return tiles
          setUserSlots(new Array(currentWord.length).fill(null));
          setScrambledTiles((prev) => prev.map((t) => ({ ...t, used: false })));
        }, 500);
      }
    }
  };

  const handleRemoveSlot = (slotIndex: number) => {
    const slot = userSlots[slotIndex];
    if (!slot) return;

    // Free the tile
    setScrambledTiles((prev) =>
      prev.map((t) => (t.id === slot.tileId ? { ...t, used: false } : t))
    );

    const newSlots = [...userSlots];
    newSlots[slotIndex] = null;
    setUserSlots(newSlots);
  };

  // ==========================================
  // GAME 3: MONOCHROME SNAKE (14x14 Canvas)
  // ==========================================
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snakeScore, setSnakeScore] = useState(0);
  const [snakeGameOver, setSnakeGameOver] = useState(false);
  const [snakePaused, setSnakePaused] = useState(false);
  const snakeDirRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 });
  const snakeBodyRef = useRef<Array<{ x: number; y: number }>>([
    { x: 5, y: 7 },
    { x: 4, y: 7 },
    { x: 3, y: 7 },
  ]);
  const foodRef = useRef<{ x: number; y: number }>({ x: 10, y: 7 });

  const spawnFood = () => {
    let fx = Math.floor(Math.random() * 14);
    let fy = Math.floor(Math.random() * 14);
    foodRef.current = { x: fx, y: fy };
  };

  const startSnakeGame = () => {
    snakeDirRef.current = { x: 1, y: 0 };
    snakeBodyRef.current = [
      { x: 5, y: 7 },
      { x: 4, y: 7 },
      { x: 3, y: 7 },
    ];
    spawnFood();
    setSnakeScore(0);
    setSnakeGameOver(false);
    setSnakePaused(false);
  };

  useEffect(() => {
    if (activeGame !== 'snake' || snakeGameOver || snakePaused) return;

    const interval = setInterval(() => {
      const head = { ...snakeBodyRef.current[0] };
      head.x += snakeDirRef.current.x;
      head.y += snakeDirRef.current.y;

      // Wall collision (14x14 grid)
      if (head.x < 0 || head.x >= 14 || head.y < 0 || head.y >= 14) {
        setSnakeGameOver(true);
        return;
      }

      // Self collision
      if (snakeBodyRef.current.some((segment) => segment.x === head.x && segment.y === head.y)) {
        setSnakeGameOver(true);
        return;
      }

      const newBody = [head, ...snakeBodyRef.current];

      // Eat food
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setSnakeScore((prev) => {
          const next = prev + 1;
          updateGameHighScore(studentId, 'sn', next);
          return next;
        });
        spawnFood();
      } else {
        newBody.pop();
      }

      snakeBodyRef.current = newBody;

      // Draw onto canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cellSize = canvas.width / 14;
          // Clear background
          ctx.fillStyle = theme === 'dark' ? '#0B1220' : '#EEF2F8';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw grid lines subtly
          ctx.strokeStyle = theme === 'dark' ? '#1B2438' : '#CBD5E1';
          ctx.lineWidth = 0.5;
          for (let i = 0; i <= 14; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(canvas.width, i * cellSize);
            ctx.stroke();
          }

          // Draw outlined square food
          ctx.fillStyle = theme === 'dark' ? '#FFFFFF' : '#0B1220';
          ctx.strokeStyle = theme === 'dark' ? '#FFFFFF' : '#0B1220';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            foodRef.current.x * cellSize + 3,
            foodRef.current.y * cellSize + 3,
            cellSize - 6,
            cellSize - 6
          );

          // Draw monochrome snake
          newBody.forEach((seg, i) => {
            ctx.fillStyle = theme === 'dark' ? '#FFFFFF' : '#0B1220';
            ctx.fillRect(
              seg.x * cellSize + 1.5,
              seg.y * cellSize + 1.5,
              cellSize - 3,
              cellSize - 3
            );
          });
        }
      }
    }, Math.max(90, 160 - snakeScore * 4));

    return () => clearInterval(interval);
  }, [activeGame, snakeGameOver, snakePaused, snakeScore, theme]);

  // Keyboard controls for snake
  useEffect(() => {
    if (activeGame !== 'snake') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const cur = snakeDirRef.current;
      if ((e.key === 'ArrowUp' || e.key === 'w') && cur.y === 0) {
        snakeDirRef.current = { x: 0, y: -1 };
      } else if ((e.key === 'ArrowDown' || e.key === 's') && cur.y === 0) {
        snakeDirRef.current = { x: 0, y: 1 };
      } else if ((e.key === 'ArrowLeft' || e.key === 'a') && cur.x === 0) {
        snakeDirRef.current = { x: -1, y: 0 };
      } else if ((e.key === 'ArrowRight' || e.key === 'd') && cur.x === 0) {
        snakeDirRef.current = { x: 1, y: 0 };
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGame]);

  // ==========================================
  // GAME 4: TIC-TAC-TOE VS PHONE (with 25% random mistake chance)
  // ==========================================
  const [board, setBoard] = useState<Array<'X' | 'O' | null>>(new Array(9).fill(null));
  const [tttWinner, setTttWinner] = useState<'X' | 'O' | 'draw' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  const winningCombos = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const checkWinner = (b: Array<'X' | 'O' | null>) => {
    for (const combo of winningCombos) {
      const [a, bIdx, c] = combo;
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) {
        return { winner: b[a], line: combo };
      }
    }
    if (b.every((cell) => cell !== null)) {
      return { winner: 'draw', line: null };
    }
    return null;
  };

  const handlePlayerMove = (idx: number) => {
    if (board[idx] || tttWinner) return;

    const newBoard = [...board];
    newBoard[idx] = 'X';
    setBoard(newBoard);

    const winCheck = checkWinner(newBoard);
    if (winCheck) {
      setTttWinner(winCheck.winner as any);
      setWinningLine(winCheck.line);
      if (winCheck.winner === 'X') updateTicTacToeScore(studentId, 'win');
      else if (winCheck.winner === 'draw') updateTicTacToeScore(studentId, 'draw');
      return;
    }

    // Phone AI Turn (Minimax with 25% chance of random mistake)
    setTimeout(() => {
      const emptyIndices = newBoard
        .map((val, i) => (val === null ? i : -1))
        .filter((i) => i !== -1);

      if (emptyIndices.length === 0) return;

      let move = -1;
      const makeMistake = Math.random() < 0.25;

      if (makeMistake) {
        move = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      } else {
        // Can AI win immediately?
        for (const i of emptyIndices) {
          const test = [...newBoard];
          test[i] = 'O';
          if (checkWinner(test)?.winner === 'O') {
            move = i;
            break;
          }
        }
        // Block player immediate win
        if (move === -1) {
          for (const i of emptyIndices) {
            const test = [...newBoard];
            test[i] = 'X';
            if (checkWinner(test)?.winner === 'X') {
              move = i;
              break;
            }
          }
        }
        // Center or corner or random
        if (move === -1) {
          if (emptyIndices.includes(4)) move = 4;
          else {
            const corners = [0, 2, 6, 8].filter((c) => emptyIndices.includes(c));
            if (corners.length > 0) move = corners[Math.floor(Math.random() * corners.length)];
            else move = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          }
        }
      }

      if (move !== -1) {
        newBoard[move] = 'O';
        setBoard(newBoard);
        const aiWinCheck = checkWinner(newBoard);
        if (aiWinCheck) {
          setTttWinner(aiWinCheck.winner as any);
          setWinningLine(aiWinCheck.line);
          if (aiWinCheck.winner === 'O') updateTicTacToeScore(studentId, 'loss');
          else if (aiWinCheck.winner === 'draw') updateTicTacToeScore(studentId, 'draw');
        }
      }
    }, 300);
  };

  const startTttGame = () => {
    setBoard(new Array(9).fill(null));
    setTttWinner(null);
    setWinningLine(null);
  };

  // ==========================================
  // RENDER: GAMES MENU (2x2 GRID)
  // ==========================================
  if (activeGame === 'menu') {
    return (
      <div className="space-y-6 pb-24 animate-in fade-in duration-300">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Brain Games</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            100% browser games • High scores saved to your profile
          </p>
        </div>

        {/* 2x2 Game Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Math Sprint */}
          <div
            onClick={() => {
              setActiveGame('math');
              startMathGame();
            }}
            className="p-5 rounded-[26px] border cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-[var(--card-main)] border-[var(--border-main)] space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500/25 transition-colors">
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--raised-main)] text-indigo-300 border border-[var(--border-main)]">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Best: {gameScores.ms}</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base">Math Sprint</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                60-second rapid calculation race with streak multiplier
              </p>
            </div>
          </div>

          {/* Card 2: Word Scramble */}
          <div
            onClick={() => {
              setActiveGame('word');
              startWordGame();
            }}
            className="p-5 rounded-[26px] border cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-[var(--card-main)] border-[var(--border-main)] space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25 transition-colors">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--raised-main)] text-emerald-300 border border-[var(--border-main)]">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Best: {gameScores.ws}</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base">Word Scramble</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Unscramble words from school chapters in 90 seconds
              </p>
            </div>
          </div>

          {/* Card 3: Snake */}
          <div
            onClick={() => {
              setActiveGame('snake');
              startSnakeGame();
            }}
            className="p-5 rounded-[26px] border cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-[var(--card-main)] border-[var(--border-main)] space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25 transition-colors">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--raised-main)] text-amber-300 border border-[var(--border-main)]">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Best: {gameScores.sn}</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base">Monochrome Snake</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Classic 14×14 grid arcade with smooth touch D-Pad
              </p>
            </div>
          </div>

          {/* Card 4: Tic-Tac-Toe */}
          <div
            onClick={() => {
              setActiveGame('ttt');
              startTttGame();
            }}
            className="p-5 rounded-[26px] border cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-[var(--card-main)] border-[var(--border-main)] space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-500/15 text-purple-400 group-hover:bg-purple-500/25 transition-colors">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
                <span>W: {gameScores.ttt[0]}</span>
                <span>D: {gameScores.ttt[1]}</span>
                <span>L: {gameScores.ttt[2]}</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base">Tic-Tac-Toe vs Phone</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Play against phone AI with a 25% chance of random moves
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: ACTIVE GAME VIEW
  // ==========================================
  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Back button header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveGame('menu')}
          className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)] hover:bg-[var(--raised-main)] transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Games Menu</span>
        </button>
      </div>

      {/* GAME 1: MATH SPRINT SCREEN */}
      {activeGame === 'math' && (
        <div className="p-6 rounded-[28px] border shadow-xl bg-[var(--card-main)] border-[var(--border-main)] space-y-6 text-center">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Math Sprint
            </span>
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-amber-400">🔥 Streak: {mathStreak}</span>
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[var(--raised-main)] border border-[var(--border-main)]">
                ⏱ {mathTime}s
              </span>
            </div>
          </div>

          {!mathGameOver ? (
            <div className="space-y-6">
              <div
                className={`py-8 rounded-2xl border transition-colors ${
                  mathFlashFeedback === 'correct'
                    ? 'bg-emerald-500/20 border-emerald-500'
                    : mathFlashFeedback === 'wrong'
                    ? 'bg-red-500/20 border-red-500'
                    : 'bg-[var(--raised-main)] border-[var(--border-main)]'
                }`}
              >
                <span className="text-4xl sm:text-5xl font-extrabold tracking-wider font-mono">
                  {mathQuestion?.prompt} = ?
                </span>
              </div>

              {/* 4 Option Buttons */}
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                {mathQuestion?.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleMathAnswer(opt)}
                    className="p-5 rounded-2xl border text-xl font-bold font-mono transition-all bg-[var(--raised-main)] border-[var(--border-main)] hover:bg-[var(--accent-pill-bg)] hover:text-[var(--accent-pill-text)] active:scale-95"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
              <h3 className="text-2xl font-bold">Game Over!</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Final Score: <strong className="text-[var(--text-main)]">{mathScore}</strong> •
                Best Score: <strong className="text-[var(--text-main)]">{gameScores.ms}</strong>
              </p>
              <button
                type="button"
                onClick={startMathGame}
                className="px-6 py-3 rounded-full text-xs font-bold transition-all shadow-md bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 active:scale-95"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* GAME 2: WORD SCRAMBLE SCREEN */}
      {activeGame === 'word' && (
        <div className="p-6 rounded-[28px] border shadow-xl bg-[var(--card-main)] border-[var(--border-main)] space-y-6 text-center">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Word Scramble
            </span>
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-emerald-400">Score: {wordScore}</span>
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[var(--raised-main)] border border-[var(--border-main)]">
                ⏱ {wordTime}s
              </span>
            </div>
          </div>

          {!wordGameOver ? (
            <div className="space-y-6">
              {/* Answer slots */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {userSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleRemoveSlot(idx)}
                    className={`w-11 h-12 rounded-xl border flex items-center justify-center text-lg font-bold transition-all select-none ${
                      wordFlashRed
                        ? 'border-red-500 bg-red-500/20 text-red-300'
                        : slot
                        ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] border-transparent shadow-sm'
                        : 'bg-[var(--raised-main)] border-[var(--border-main)]'
                    }`}
                  >
                    {slot ? slot.char : ''}
                  </button>
                ))}
              </div>

              {/* Scrambled letter tiles to tap */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {scrambledTiles.map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={tile.used}
                    onClick={() => handleTapTile(tile)}
                    className={`w-11 h-12 rounded-xl border flex items-center justify-center text-lg font-bold transition-all select-none ${
                      tile.used
                        ? 'opacity-20 cursor-default bg-transparent border-[var(--border-main)]'
                        : 'bg-[var(--raised-main)] border-[var(--border-main)] hover:border-white/50 active:scale-95'
                    }`}
                  >
                    {tile.char}
                  </button>
                ))}
              </div>

              {/* Skip button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setWordsSkipped((p) => p + 1);
                    nextWord();
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)] hover:bg-[var(--raised-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors inline-flex items-center gap-1.5"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Skip Word</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
              <h3 className="text-2xl font-bold">Time Expired!</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Words Solved: <strong className="text-[var(--text-main)]">{wordScore}</strong> •
                Skipped: {wordsSkipped} • Best: {gameScores.ws}
              </p>
              <button
                type="button"
                onClick={startWordGame}
                className="px-6 py-3 rounded-full text-xs font-bold transition-all shadow-md bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 active:scale-95"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* GAME 3: MONOCHROME SNAKE SCREEN */}
      {activeGame === 'snake' && (
        <div className="p-6 rounded-[28px] border shadow-xl bg-[var(--card-main)] border-[var(--border-main)] space-y-4 text-center">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Snake (14×14 Grid)
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold">Food: {snakeScore}</span>
              <button
                type="button"
                onClick={() => setSnakePaused((p) => !p)}
                className="p-1.5 rounded-lg border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white"
              >
                {snakePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              className="rounded-2xl border border-[var(--border-main)] shadow-inner"
            />
          </div>

          {snakeGameOver && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs space-y-2">
              <p className="font-bold text-red-300">Game Over! Score: {snakeScore}</p>
              <button
                type="button"
                onClick={startSnakeGame}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]"
              >
                Play Again
              </button>
            </div>
          )}

          {/* On-Screen D-Pad for Mobile */}
          <div className="flex flex-col items-center gap-1.5 pt-2">
            <button
              type="button"
              onClick={() => {
                if (snakeDirRef.current.y === 0) snakeDirRef.current = { x: 0, y: -1 };
              }}
              className="w-12 h-12 rounded-2xl border border-[var(--border-main)] bg-[var(--raised-main)] flex items-center justify-center active:scale-90 transition-transform"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => {
                  if (snakeDirRef.current.x === 0) snakeDirRef.current = { x: -1, y: 0 };
                }}
                className="w-12 h-12 rounded-2xl border border-[var(--border-main)] bg-[var(--raised-main)] flex items-center justify-center active:scale-90 transition-transform"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (snakeDirRef.current.x === 0) snakeDirRef.current = { x: 1, y: 0 };
                }}
                className="w-12 h-12 rounded-2xl border border-[var(--border-main)] bg-[var(--raised-main)] flex items-center justify-center active:scale-90 transition-transform"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (snakeDirRef.current.y === 0) snakeDirRef.current = { x: 0, y: 1 };
              }}
              className="w-12 h-12 rounded-2xl border border-[var(--border-main)] bg-[var(--raised-main)] flex items-center justify-center active:scale-90 transition-transform"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* GAME 4: TIC-TAC-TOE VS PHONE */}
      {activeGame === 'ttt' && (
        <div className="p-6 rounded-[28px] border shadow-xl bg-[var(--card-main)] border-[var(--border-main)] space-y-6 text-center">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Tic-Tac-Toe (You: X, Phone: O)
            </span>
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className="text-emerald-400">You: {gameScores.ttt[0]}</span>
              <span>D: {gameScores.ttt[1]}</span>
              <span className="text-rose-400">Phone: {gameScores.ttt[2]}</span>
            </div>
          </div>

          {/* 3x3 Grid */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
            {board.map((cell, idx) => {
              const isWinCell = winningLine?.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePlayerMove(idx)}
                  className={`w-20 h-20 rounded-2xl border text-3xl font-extrabold flex items-center justify-center transition-all select-none ${
                    isWinCell
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400'
                      : 'bg-[var(--raised-main)] border-[var(--border-main)] hover:border-white/40'
                  }`}
                >
                  {cell}
                </button>
              );
            })}
          </div>

          {/* Winner status & Play Again */}
          {tttWinner && (
            <div className="space-y-3">
              <p className="text-sm font-bold">
                {tttWinner === 'X'
                  ? '🎉 You Won!'
                  : tttWinner === 'O'
                  ? 'Phone Won! Try again!'
                  : '🤝 It is a Draw!'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={startTttGame}
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] shadow-sm active:scale-95"
                >
                  Play Again
                </button>
                <button
                  type="button"
                  onClick={() => resetTicTacToeScore(studentId)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white"
                >
                  Reset Score
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
