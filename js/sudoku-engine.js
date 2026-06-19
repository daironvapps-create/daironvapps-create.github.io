/**
 * Sudoku Engine — Generación y validación de tableros
 * Soporta: Fácil, Medio, Difícil, Experto
 * Este archivo es puro (sin DOM) para poder cargarse también dentro de un Web Worker.
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
    if (grid[row].includes(num)) return false;
    for (let r = 0; r < 9; r++) if (grid[r][col] === num) return false;
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        if (grid[r][c] === num) return false;
    return true;
  }

  // Devuelve los candidatos válidos (1-9) para una celda
  function candidatesFor(grid, row, col) {
    const used = new Set();
    for (let i = 0; i < 9; i++) {
      used.add(grid[row][i]);
      used.add(grid[i][col]);
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        used.add(grid[r][c]);

    const out = [];
    for (let n = 1; n <= 9; n++) if (!used.has(n)) out.push(n);
    return out;
  }

  // Encuentra la celda vacía con MENOS candidatos posibles (heurística MRV).
  // Reduce drásticamente el factor de ramificación del backtracking —
  // es la diferencia entre generar en milisegundos o en varios segundos.
  function findMostConstrainedCell(grid) {
    let best = null;
    let bestCandidates = null;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const cands = candidatesFor(grid, r, c);
          if (cands.length === 0) return { row: r, col: c, candidates: cands }; // callejón sin salida
          if (!best || cands.length < bestCandidates.length) {
            best = { row: r, col: c };
            bestCandidates = cands;
            if (cands.length === 1) return { ...best, candidates: bestCandidates };
          }
        }
      }
    }
    return best ? { ...best, candidates: bestCandidates } : null;
  }

  // Cuenta soluciones usando MRV — mucho más rápido que recorrer en orden fijo,
  // especialmente en tableros casi vacíos (dificultad experto).
  function countSolutions(grid, limit = 2) {
    const g = cloneGrid(grid);
    let count = 0;

    function bt() {
      if (count >= limit) return;
      const cell = findMostConstrainedCell(g);
      if (!cell) { count++; return; }

      for (const n of cell.candidates) {
        g[cell.row][cell.col] = n;
        bt();
        if (count >= limit) { g[cell.row][cell.col] = 0; return; }
        g[cell.row][cell.col] = 0;
      }
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
    easy:   { clues: 46 },
    medium: { clues: 36 },
    hard:   { clues: 28 },
    expert: { clues: 24 }, // 22 era demasiado lento sin heurísticas; 24 sigue siendo un buen reto
  };

  // ── Puzzle generator ──────────────────────────────────────────────────────

  function generatePuzzle(difficulty = 'medium') {
    const solution = generateFullBoard();
    const puzzle = cloneGrid(solution);

    const holes = 81 - (DIFFICULTY[difficulty] || DIFFICULTY.medium).clues;
    const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));
    let removed = 0;

    // Presupuesto de tiempo de seguridad: si por mala suerte el azar nos lleva
    // a un camino lento, cortamos y devolvemos el puzzle tal cual esté
    // (sigue teniendo solución única, solo con algunas pistas de más).
    const deadline = Date.now() + 4000;

    for (const idx of cells) {
      if (removed >= holes) break;
      if (Date.now() > deadline) break;

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

    const holes = 81 - DIFFICULTY['medium'].clues;
    const cells = shuffleWithRng(Array.from({ length: 81 }, (_, i) => i));
    let removed = 0;
    const deadline = Date.now() + 4000;

    for (const idx of cells) {
      if (removed >= holes) break;
      if (Date.now() > deadline) break;
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

  return {
    generatePuzzle, generateDailyPuzzle, getHint, getErrors, isSolved, isValid, DIFFICULTY
  };

})();

// Si se carga dentro de un Web Worker, exponer SudokuEngine globalmente
// (en un worker `self` es el ámbito global, no `window`)
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.SudokuEngine = SudokuEngine;
}
