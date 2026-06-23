/**
 * Sudoku Game Controller
 */

const Game = (() => {

  // ── State ─────────────────────────────────────────────────────────────────

  let state = {
    puzzle: null,
    solution: null,
    board: null,          // current player board (numbers)
    notes: null,          // 9×9 array of Set()
    given: null,          // boolean 9×9 — original clues
    selected: null,       // {row, col}
    difficulty: 'medium',
    isDaily: false,
    hintsUsed: 0,
    maxHints: 3,
    mistakes: 0,
    maxMistakes: 3,
    notesMode: false,
    history: [],          // for undo
    timerInterval: null,
    elapsedSeconds: 0,
    started: false,
    finished: false,
  };

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const el = {};

  function initRefs() {
    el.board       = document.getElementById('sudoku-board');
    el.timer       = document.getElementById('timer');
    el.hintsLeft   = document.getElementById('hints-left');
    el.mistakes    = document.getElementById('mistakes-count');
    el.btnHint     = document.getElementById('btn-hint');
    el.btnRestart  = document.getElementById('btn-restart');
    el.btnUndo     = document.getElementById('btn-undo');
    el.btnNotes    = document.getElementById('btn-notes');
    el.diffBtns    = document.querySelectorAll('.diff-btn');
    el.btnDaily    = document.getElementById('btn-daily');
    el.modal       = document.getElementById('modal');
    el.modalTitle  = document.getElementById('modal-title');
    el.modalBody   = document.getElementById('modal-body');
    el.modalClose  = document.getElementById('modal-close');
    el.toast       = document.getElementById('toast');
    el.numpad      = document.getElementById('numpad');
    el.loadingOverlay = document.getElementById('loading-overlay');
    el.langBtns    = document.querySelectorAll('.lang-btn');
    el.dailyLabel  = document.getElementById('daily-label');
    el.diffLabel   = document.getElementById('diff-label');
    el.btnNewLevel = document.getElementById('btn-new-level');
    el.btnStats    = document.getElementById('btn-stats');
  }

  // ── Timer ─────────────────────────────────────────────────────────────────

  function startTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      if (!state.finished) {
        state.elapsedSeconds++;
        updateTimerDisplay();
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(state.timerInterval);
  }

  function updateTimerDisplay() {
    const m = String(Math.floor(state.elapsedSeconds / 60)).padStart(2, '0');
    const s = String(state.elapsedSeconds % 60).padStart(2, '0');
    el.timer.textContent = `${m}:${s}`;
  }

  function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  // ── Board rendering ───────────────────────────────────────────────────────

  function renderBoard() {
    el.board.innerHTML = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Box shading
        const boxR = Math.floor(r / 3);
        const boxC = Math.floor(c / 3);
        if ((boxR + boxC) % 2 === 0) cell.classList.add('cell-box-alt');

        // Given cell
        if (state.given[r][c]) {
          cell.classList.add('given');
          cell.textContent = state.board[r][c];
        } else {
          updateCell(cell, r, c);
        }

        cell.addEventListener('click', () => onCellClick(r, c));
        el.board.appendChild(cell);
      }
    }
  }

  function updateCell(cell, r, c) {
    const val = state.board[r][c];
    cell.innerHTML = '';
    cell.classList.remove('error', 'filled');

    if (val !== 0) {
      cell.textContent = val;
      cell.classList.add('filled');
    } else {
      const noteSet = state.notes[r][c];
      if (noteSet.size > 0) {
        const noteGrid = document.createElement('div');
        noteGrid.className = 'note-grid';
        for (let n = 1; n <= 9; n++) {
          const noteCell = document.createElement('span');
          noteCell.textContent = noteSet.has(n) ? n : '';
          noteGrid.appendChild(noteCell);
        }
        cell.appendChild(noteGrid);
      }
    }
  }

  function refreshAllCells() {
    const cells = el.board.querySelectorAll('.cell');
    cells.forEach(cell => {
      const r = +cell.dataset.row;
      const c = +cell.dataset.col;
      if (!state.given[r][c]) {
        updateCell(cell, r, c);
      }
    });
    highlightRelated();
  }

  // ── Selection & highlighting ──────────────────────────────────────────────

  function onCellClick(row, col) {
    if (state.finished) return;
    if (!state.started) {
      state.started = true;
      startTimer();
    }
    state.selected = { row, col };
    highlightRelated();
  }

  function highlightRelated() {
    const cells = el.board.querySelectorAll('.cell');
    const sel = state.selected;

    cells.forEach(cell => {
      cell.classList.remove('selected', 'related', 'same-number', 'error');
      const r = +cell.dataset.row;
      const c = +cell.dataset.col;

      if (sel) {
        const isSelected = r === sel.row && c === sel.col;
        const isSameRow = r === sel.row;
        const isSameCol = c === sel.col;
        const isSameBox =
          Math.floor(r / 3) === Math.floor(sel.row / 3) &&
          Math.floor(c / 3) === Math.floor(sel.col / 3);

        if (isSelected) cell.classList.add('selected');
        else if (isSameRow || isSameCol || isSameBox) cell.classList.add('related');

        // Highlight same numbers
        const selVal = state.board[sel.row][sel.col];
        if (selVal !== 0 && state.board[r][c] === selVal) {
          cell.classList.add('same-number');
        }
      }

      // Show errors
      if (!state.given[r][c] && state.board[r][c] !== 0 &&
          state.board[r][c] !== state.solution[r][c]) {
        cell.classList.add('error');
      }
    });
  }

  // ── Locked cells (correct numbers that can't be changed) ─────────────────

  function isLocked(row, col) {
    return state.given[row][col] ||
      (state.board[row][col] !== 0 && state.board[row][col] === state.solution[row][col]);
  }

  // ── Autocomplete (when ≤6 cells remain empty) ─────────────────────────────

  function countEmpty() {
    let count = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (state.board[r][c] === 0) count++;
    return count;
  }

  function tryAutocomplete() {
    const empty = countEmpty();
    if (empty > 0 && empty <= 6) {
      // Animate autocomplete
      let delay = 0;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (state.board[r][c] === 0) {
            const row = r, col = c;
            setTimeout(() => {
              state.board[row][col] = state.solution[row][col];
              state.notes[row][col].clear();
              refreshAllCells();
              if (SudokuEngine.isSolved(state.board, state.solution)) {
                endGame(true);
              }
            }, delay);
            delay += 120;
          }
        }
      }
    }
  }

  // ── Input handling ────────────────────────────────────────────────────────

  function inputNumber(num) {
    if (!state.selected || state.finished) return;
    const { row, col } = state.selected;
    // Block if given OR already correctly filled
    if (isLocked(row, col)) return;
    if (!state.started) { state.started = true; startTimer(); }

    if (state.notesMode && num !== 0) {
      pushHistory();
      const noteSet = state.notes[row][col];
      if (noteSet.has(num)) noteSet.delete(num);
      else noteSet.add(num);
      state.board[row][col] = 0;
    } else {
      pushHistory();
      state.notes[row][col].clear();
      state.board[row][col] = num;

      if (num !== 0 && num !== state.solution[row][col]) {
        state.mistakes++;
        el.mistakes.textContent = state.mistakes;
        if (state.mistakes >= state.maxMistakes) {
          endGame(false);
          return;
        }
      }

      if (num !== 0 && num === state.solution[row][col]) {
        // Remove from notes in same row/col/box
        for (let i = 0; i < 9; i++) {
          state.notes[row][i].delete(num);
          state.notes[i][col].delete(num);
        }
        const br = Math.floor(row / 3) * 3;
        const bc = Math.floor(col / 3) * 3;
        for (let r = br; r < br + 3; r++)
          for (let c = bc; c < bc + 3; c++)
            state.notes[r][c].delete(num);
      }
    }

    refreshAllCells();

    if (SudokuEngine.isSolved(state.board, state.solution)) {
      endGame(true);
      return;
    }

    // Autocomplete if ≤6 empty cells remain
    tryAutocomplete();
  }

  function erase() {
    if (!state.selected || state.finished) return;
    const { row, col } = state.selected;
    // Can't erase given cells or correctly placed numbers
    if (isLocked(row, col)) return;
    pushHistory();
    state.board[row][col] = 0;
    state.notes[row][col].clear();
    refreshAllCells();
  }

  // ── History / Undo ────────────────────────────────────────────────────────

  function pushHistory() {
    state.history.push({
      board: state.board.map(r => [...r]),
      notes: state.notes.map(r => r.map(s => new Set(s))),
    });
    if (state.history.length > 50) state.history.shift();
  }

  function undo() {
    if (state.history.length === 0) return;
    const prev = state.history.pop();
    state.board = prev.board;
    state.notes = prev.notes;
    refreshAllCells();
  }

  // ── Hint ──────────────────────────────────────────────────────────────────

  function hint() {
    if (state.hintsUsed >= state.maxHints || state.finished) return;
    const h = SudokuEngine.getHint(state.board, state.solution);
    if (!h) return;
    pushHistory();
    state.hintsUsed++;
    el.hintsLeft.textContent = state.maxHints - state.hintsUsed;
    state.board[h.row][h.col] = h.value;
    state.notes[h.row][h.col].clear();
    state.selected = { row: h.row, col: h.col };
    refreshAllCells();

    if (state.hintsUsed >= state.maxHints) {
      el.btnHint.disabled = true;
    }

    if (SudokuEngine.isSolved(state.board, state.solution)) {
      endGame(true);
    }
  }

  // ── Check ─────────────────────────────────────────────────────────────────

  function check() {
    const errors = SudokuEngine.getErrors(state.board, state.solution);
    if (errors.length > 0) {
      showToast(i18n.t('errorFound'), 'error');
    } else {
      showToast(i18n.t('noErrors'), 'success');
    }
    refreshAllCells();
  }

  // ── Notes toggle ──────────────────────────────────────────────────────────

  function toggleNotes() {
    state.notesMode = !state.notesMode;
    el.btnNotes.classList.toggle('active', state.notesMode);
  }

  // ── End game ──────────────────────────────────────────────────────────────

  function endGame(won) {
    stopTimer();
    state.finished = true;

    if (state.isDaily) {
      const today = getTodayStr();
      if (won) {
        localStorage.setItem('sudoku_daily_' + today, formatTime(state.elapsedSeconds));
      }
    }

    // Record stats
    StatsSystem.recordGame(state.difficulty, won, state.elapsedSeconds);

    setTimeout(() => {
      if (won) {
        // Show ranking submit modal, then play again option
        StatsSystem.openSubmitModal(state.difficulty, state.elapsedSeconds, () => {
          showPlayAgainModal();
        });
      } else {
        el.modalTitle.textContent = i18n.t('gameOver');
        el.modalBody.innerHTML = `
          <p>${i18n.t('tooManyMistakes')}</p>
          <button class="modal-btn" id="modal-play-again">${i18n.t('playAgain')}</button>
        `;
        el.modal.classList.add('visible');
        document.getElementById('modal-play-again')
          .addEventListener('click', () => {
            closeModal();
            newGame(state.difficulty, false);
          });
      }
    }, 400);
  }

  // ── Play again modal ─────────────────────────────────────────────────────

  function showPlayAgainModal() {
    el.modalTitle.textContent = i18n.t('congratulations');
    el.modalBody.innerHTML = `
      <p>${i18n.t('solved')}</p>
      <p class="modal-time">${i18n.t('solvedTime')} <strong>${StatsSystem.formatTime(state.elapsedSeconds)}</strong></p>
      <button class="modal-btn" id="modal-play-again">${i18n.t('playAgain')}</button>
      <button class="modal-btn-secondary" id="modal-see-stats">${i18n.t('statistics')}</button>
    `;
    el.modal.classList.add('visible');
    document.getElementById('modal-play-again').addEventListener('click', () => {
      closeModal();
      newGame(state.difficulty, false);
    });
    document.getElementById('modal-see-stats').addEventListener('click', () => {
      StatsSystem.openStatsModal(state.difficulty);
    });
  }

  // ── New Level (with flip animation) ──────────────────────────────────────

  function newLevel() {
    if (el.btnNewLevel.classList.contains('loading')) return;
    el.btnNewLevel.classList.add('loading');

    const wrapper = document.querySelector('.board-wrapper');
    wrapper.classList.add('flip-out');

    setTimeout(() => {
      wrapper.classList.remove('flip-out');
      newGame(state.difficulty, false);
      // flip-in triggers after newGame renders
      setTimeout(() => {
        wrapper.classList.add('flip-in');
        setTimeout(() => wrapper.classList.remove('flip-in'), 300);
        el.btnNewLevel.classList.remove('loading');
      }, 80);
    }, 180);
  }

  // ── New game ──────────────────────────────────────────────────────────────

  function newGame(difficulty = 'medium', isDaily = false) {
    showLoading(true);

    // Defer to next tick so loading overlay renders
    setTimeout(() => {
      stopTimer();

      const result = isDaily
        ? SudokuEngine.generateDailyPuzzle(getTodayStr())
        : SudokuEngine.generatePuzzle(difficulty);

      state.puzzle     = result.puzzle;
      state.solution   = result.solution;
      state.board      = result.puzzle.map(r => [...r]);
      state.notes      = Array.from({ length: 9 }, () =>
                           Array.from({ length: 9 }, () => new Set()));
      state.given      = result.puzzle.map(r => r.map(v => v !== 0));
      state.selected   = null;
      state.difficulty = difficulty;
      state.isDaily    = isDaily;
      state.hintsUsed  = 0;
      state.mistakes   = 0;
      state.notesMode  = false;
      state.history    = [];
      state.elapsedSeconds = 0;
      state.started    = false;
      state.finished   = false;

      el.hintsLeft.textContent = state.maxHints;
      el.mistakes.textContent  = 0;
      el.btnHint.disabled      = false;
      el.btnNotes.classList.remove('active');
      updateTimerDisplay();

      // Update difficulty buttons
      el.diffBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.diff === difficulty);
      });

      el.dailyLabel.style.display = isDaily ? 'inline-flex' : 'none';
      el.diffLabel.textContent = isDaily ? i18n.t('daily') : i18n.t(difficulty);

      renderBoard();
      showLoading(false);
    }, 50);
  }

  // ── Daily ─────────────────────────────────────────────────────────────────

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function playDaily() {
    const today = getTodayStr();
    const saved = localStorage.getItem('sudoku_daily_' + today);
    if (saved) {
      showToast(`${i18n.t('completedIn')} ${saved} ✓`, 'success');
      return;
    }
    newGame('medium', true);
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  let toastTimeout;
  function showToast(msg, type = 'info') {
    clearTimeout(toastTimeout);
    el.toast.textContent = msg;
    el.toast.className = `toast toast-${type} visible`;
    toastTimeout = setTimeout(() => el.toast.classList.remove('visible'), 2500);
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function closeModal() {
    el.modal.classList.remove('visible');
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  function showLoading(show) {
    el.loadingOverlay.classList.toggle('visible', show);
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  function onKeyDown(e) {
    if (state.finished) return;

    const key = e.key;

    if (/^[1-9]$/.test(key)) {
      inputNumber(parseInt(key));
      return;
    }

    if (key === '0' || key === 'Backspace' || key === 'Delete') {
      erase();
      return;
    }

    if (!state.selected) return;
    const { row, col } = state.selected;

    const dirs = {
      ArrowUp:    [-1,  0],
      ArrowDown:  [ 1,  0],
      ArrowLeft:  [ 0, -1],
      ArrowRight: [ 0,  1],
    };

    if (dirs[key]) {
      e.preventDefault();
      const [dr, dc] = dirs[key];
      const nr = Math.min(8, Math.max(0, row + dr));
      const nc = Math.min(8, Math.max(0, col + dc));
      state.selected = { row: nr, col: nc };
      highlightRelated();
    }
  }

  // ── i18n refresh ──────────────────────────────────────────────────────────

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = i18n.t(node.dataset.i18n);
    });
    el.langBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === i18n.getLang());
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    initRefs();
    applyTranslations();

    // Difficulty buttons
    el.diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        newGame(btn.dataset.diff, false);
      });
    });

    // Daily button
    el.btnDaily.addEventListener('click', playDaily);

    // Action buttons
    el.btnHint.addEventListener('click', hint);
    el.btnRestart.addEventListener('click', () => newGame(state.difficulty, state.isDaily));
    el.btnUndo.addEventListener('click', undo);
    el.btnNotes.addEventListener('click', toggleNotes);
    el.btnNewLevel.addEventListener('click', newLevel);
    el.btnStats.addEventListener('click', () => StatsSystem.openStatsModal(state.difficulty));

    // Numpad
    el.numpad.querySelectorAll('.num-btn').forEach(btn => {
      btn.addEventListener('click', () => inputNumber(parseInt(btn.dataset.num)));
    });

    // Modal close
    el.modalClose.addEventListener('click', closeModal);
    el.modal.addEventListener('click', e => {
      if (e.target === el.modal) closeModal();
    });

    // Keyboard
    document.addEventListener('keydown', onKeyDown);

    // Language buttons
    el.langBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        i18n.setLang(btn.dataset.lang);
        applyTranslations();
        // Re-render diff label
        el.diffLabel.textContent = state.isDaily ? i18n.t('daily') : i18n.t(state.difficulty);
      });
    });

    // Start first game
    newGame('medium', false);
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', Game.init);
