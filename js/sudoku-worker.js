/**
 * sudoku-worker.js
 * Genera los puzzles en un hilo aparte para que el hilo principal
 * (animaciones, clics, temporizador) nunca se bloquee, incluso en Experto.
 */

importScripts('sudoku-engine.js');

self.onmessage = function (e) {
  const { type, difficulty, dateStr, id } = e.data;

  try {
    let result;
    if (type === 'daily') {
      result = SudokuEngine.generateDailyPuzzle(dateStr);
    } else {
      result = SudokuEngine.generatePuzzle(difficulty);
    }
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
};
