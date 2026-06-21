/**
 * Sudoku Engine — Infinite board generation & validation
 * Supports: Easy, Medium, Hard, Expert
 */

const SudokuEngine = (() => {

  // ── Helpers ──────────────────────────────────────────────────────────────

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function emptyGrid() {
    return Array.from({ length: 9 }, () => new Array(9).fill(0));
  }

  function cloneGrid(g) {
    return g.map(r => [...r]);
  }

  // ── Validity check ────────────────────────────────────────────────────────

  function isValid(grid, row, col, num) {
    // Row
    if (grid[row].includes(num)) return false;
    // Col
    for (let r = 0; r < 9; r++) if (grid[r][col] === num) return false;
    // Box
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        if (grid[r][c] === num) return false;
    return true;
  }

  // ── Backtracking solver ───────────────────────────────────────────────────

  function solve(grid, limit = 2) {
    let solutions = 0;

    function bt() {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (grid[r][c] === 0) {
            const nums = shuffle([1,2,3,4,5,6,7,8,9]);
            for (const n of nums) {
              if (isValid(grid, r, c, n)) {
                grid[r][c] = n;
                bt();
                if (solutions >= limit) return;
                grid[r][c] = 0;
              }
            }
            return;
          }
        }
      }
      solutions++;
    }

    bt();
    return solutions;
  }

  // Count solutions without shuffling (faster)
  function countSolutions(grid, limit = 2) {
    const g = cloneGrid(grid);
    let count = 0;

    function bt() {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (g[r][c] === 0) {
            for (let n = 1; n <= 9; n++) {
              if (isValid(g, r, c, n)) {
                g[r][c] = n;
                bt();
                if (count >= limit) return;
                g[r][c] = 0;
              }
            }
            return;
          }
        }
      }
      count++;
    }

    bt();
    return count;
  }

  // ── Full board generator ──────────────────────────────────────────────────

  function generateFullBoard() {
    const grid = emptyGrid();

    function fill(pos = 0) {
      if (pos === 81) return true;
      const r = Math.floor(pos / 9);
      const c = pos % 9;
      const nums = shuffle([1,2,3,4,5,6,7,8,9]);
      for (const n of nums) {
        if (isValid(grid, r, c, n)) {
          grid[r][c] = n;
          if (fill(pos + 1)) return true;
          grid[r][c] = 0;
        }
      }
      return false;
    }

    fill();
    return grid;
  }

  // ── Difficulty settings ───────────────────────────────────────────────────

  const DIFFICULTY = {
    easy:   { clues: 46 },   // 81-46 = 35 holes
    medium: { clues: 36 },   // 45 holes
    hard:   { clues: 28 },   // 53 holes
    expert: { clues: 22 },   // 59 holes
  };

  // ── Puzzle generator ──────────────────────────────────────────────────────

  function generatePuzzle(difficulty = 'medium') {
    const solution = generateFullBoard();
    const puzzle = cloneGrid(solution);

    const holes = 81 - DIFFICULTY[difficulty].clues;
    const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));
    let removed = 0;

    for (const idx of cells) {
      if (removed >= holes) break;
      const r = Math.floor(idx / 9);
      const c = idx % 9;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;

      if (countSolutions(puzzle) === 1) {
        removed++;
      } else {
        puzzle[r][c] = backup;
      }
    }

    return { puzzle, solution };
  }

  // ── Daily puzzle (seeded by date) ─────────────────────────────────────────

  function seededRandom(seed) {
    let s = seed;
    return function () {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  function generateDailyPuzzle(dateStr) {
    // dateStr: "YYYY-MM-DD"
    const seed = dateStr.split('-').reduce((a, b) => a * 100 + parseInt(b), 0);
    const rng = seededRandom(seed);

    const grid = emptyGrid();

    function shuffleWithRng(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function fill(pos = 0) {
      if (pos === 81) return true;
      const r = Math.floor(pos / 9);
      const c = pos % 9;
      const nums = shuffleWithRng([1,2,3,4,5,6,7,8,9]);
      for (const n of nums) {
        if (isValid(grid, r, c, n)) {
          grid[r][c] = n;
          if (fill(pos + 1)) return true;
          grid[r][c] = 0;
        }
      }
      return false;
    }

    fill();
    const solution = cloneGrid(grid);

    // Remove cells with seeded positions
    const holes = 81 - DIFFICULTY['medium'].clues;
    const cells = shuffleWithRng(Array.from({ length: 81 }, (_, i) => i));
    let removed = 0;

    for (const idx of cells) {
      if (removed >= holes) break;
      const row = Math.floor(idx / 9);
      const col = idx % 9;
      const backup = grid[row][col];
      grid[row][col] = 0;
      if (countSolutions(grid) === 1) {
        removed++;
      } else {
        grid[row][col] = backup;
      }
    }

    return { puzzle: grid, solution };
  }

  // ── Hint system ───────────────────────────────────────────────────────────

  function getHint(currentGrid, solution) {
    const empties = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (currentGrid[r][c] === 0) empties.push([r, c]);

    if (empties.length === 0) return null;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    return { row: r, col: c, value: solution[r][c] };
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function getErrors(grid, solution) {
    const errors = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (grid[r][c] !== 0 && grid[r][c] !== solution[r][c])
          errors.push([r, c]);
    return errors;
  }

  function isSolved(grid, solution) {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (grid[r][c] !== solution[r][c]) return false;
    return true;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return { generatePuzzle, generateDailyPuzzle, getHint, getErrors, isSolved, isValid };

})();
