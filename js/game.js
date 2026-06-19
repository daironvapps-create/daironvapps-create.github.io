/**
 * Sudoku Game Controller
 */

const Game = (() => {

  // ── State ─────────────────────────────────────────────────────────────────

  let state = {
    puzzle: null,
    solution: null,
    board: null,          // tablero actual del jugador (números)
    notes: null,          // matriz 9×9 de Set()
    given: null,          // booleano 9×9 — pistas originales
    selected: null,       // {row, col}
    difficulty: 'medium',
    isDaily: false,
    hintsUsed: 0,
    maxHints: 3,
    mistakes: 0,
    maxMistakes: 3,
    notesMode: false,
    history: [],          // para deshacer: {board, notes, mistakes, hintsUsed}
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
    el.btnCheck    = document.getElementById('btn-check');
    el.btnRestart  = document.getElementById('btn-restart');
    el.btnUndo     = document.getElementById('btn-undo');
    el.btnNotes    = document.getElementById('btn-notes');
    el.btnErase    = document.getElementById('btn-erase');
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
    el.btnTheme    = document.getElementById('btn-theme');
  }

  // ── Worker (generación en segundo plano) ────────────────────────────────────

  let worker = null;
  let workerReqId = 0;
  const pendingRequests = new Map();

  function initWorker() {
    if (!('Worker' in window)) return; // navegador sin soporte: usaremos fallback síncrono
    try {
      worker = new Worker('js/sudoku-worker.js');
      worker.onmessage = (e) => {
        const { id, ok, result, error } = e.data;
        const cb = pendingRequests.get(id);
        if (!cb) return;
        pendingRequests.delete(id);
        if (ok) cb.resolve(result);
        else cb.reject(new Error(error));
      };
      worker.onerror = () => {
        // El worker falló por completo (p.ej. bloqueado por CSP en file://) — desactivarlo,
        // a partir de aquí usaremos el motor en el hilo principal.
        worker = null;
      };
    } catch (e) {
      worker = null;
    }
  }

  function generateInBackground(type, payload) {
    return new Promise((resolve, reject) => {
      if (worker) {
        const id = ++workerReqId;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ id, type, ...payload });
      } else {
        // Fallback: generar en el hilo principal (puede tardar un instante en Experto)
        try {
          const result = type === 'daily'
            ? SudokuEngine.generateDailyPuzzle(payload.dateStr)
            : SudokuEngine.generatePuzzle(payload.difficulty);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      }
    });
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
        cell.setAttribute('role', 'gridcell');
        cell.tabIndex = -1;

        const boxR = Math.floor(r / 3);
        const boxC = Math.floor(c / 3);
        if ((boxR + boxC) % 2 === 0) cell.classList.add('cell-box-alt');

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
    updateNumpadState();
  }

  // ── Numpad: deshabilitar números ya completados (9/9 en el tablero) ────────

  function updateNumpadState() {
    if (!el.numpad) return;
    const counts = new Array(10).fill(0);
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (state.board[r][c] !== 0) counts[state.board[r][c]]++;

    el.numpad.querySelectorAll('.num-btn').forEach(btn => {
      const n = parseInt(btn.dataset.num, 10);
      btn.classList.toggle('exhausted', counts[n] >= 9);
    });
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

        const selVal = state.board[sel.row][sel.col];
        if (selVal !== 0 && state.board[r][c] === selVal) {
          cell.classList.add('same-number');
        }
      }

      if (!state.given[r][c] && state.board[r][c] !== 0 &&
          state.board[r][c] !== state.solution[r][c]) {
        cell.classList.add('error');
      }
    });
  }

  // ── Limpiar un número de las notas relacionadas (fila/columna/caja) ────────

  function clearRelatedNotes(row, col, num) {
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

  // ── Input handling ────────────────────────────────────────────────────────

  function inputNumber(num) {
    if (!state.selected || state.finished) return;
    const { row, col } = state.selected;
    if (state.given[row][col]) return;
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
          refreshAllCells();
          endGame(false);
          return;
        }
      }

      if (num !== 0) {
        clearRelatedNotes(row, col, num);
      }
    }

    refreshAllCells();

    if (SudokuEngine.isSolved(state.board, state.solution)) {
      endGame(true);
    }
  }

  function erase() {
    if (!state.selected || state.finished) return;
    const { row, col } = state.selected;
    if (state.given[row][col]) return;
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
      mistakes: state.mistakes,
      hintsUsed: state.hintsUsed,
    });
    if (state.history.length > 50) state.history.shift();
  }

  function undo() {
    if (state.history.length === 0) {
      showToast(i18n.t('noUndo'), 'info');
      return;
    }
    const prev = state.history.pop();
    state.board = prev.board;
    state.notes = prev.notes;
    state.mistakes = prev.mistakes;
    state.hintsUsed = prev.hintsUsed;

    el.mistakes.textContent = state.mistakes;
    el.hintsLeft.textContent = state.maxHints - state.hintsUsed;
    el.btnHint.disabled = state.hintsUsed >= state.maxHints;

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
    clearRelatedNotes(h.row, h.col, h.value); // 🔧 también limpia notas de fila/col/caja
    state.selected = { row: h.row, col: h.col };

    refreshAllCells();

    const cellEl = el.board.querySelector(`.cell[data-row="${h.row}"][data-col="${h.col}"]`);
    if (cellEl) {
      cellEl.classList.add('hint-reveal');
      setTimeout(() => cellEl.classList.remove('hint-reveal'), 800);
    }

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
    el.btnNotes.setAttribute('aria-pressed', String(state.notesMode));
  }

  // ── End game ──────────────────────────────────────────────────────────────

  function endGame(won) {
    stopTimer();
    state.finished = true;

    if (state.isDaily && won) {
      const today = getTodayStr();
      i18n.safeSet('sudoku_daily_' + today, formatTime(state.elapsedSeconds));
      updateDailyButtonState();
    }

    setTimeout(() => {
      if (won) {
        el.modalTitle.textContent = i18n.t('congratulations');
        el.modalBody.innerHTML = `
          <p>${i18n.t('solved')}</p>
          <p class="modal-time">${i18n.t('solvedTime')} <strong>${formatTime(state.elapsedSeconds)}</strong></p>
          <button class="modal-btn" id="modal-play-again">${i18n.t('playAgain')}</button>
        `;
      } else {
        el.modalTitle.textContent = i18n.t('gameOver');
        el.modalBody.innerHTML = `
          <p>${i18n.t('tooManyMistakes')}</p>
          <button class="modal-btn" id="modal-play-again">${i18n.t('playAgain')}</button>
        `;
      }
      el.modal.classList.add('visible');
      document.getElementById('modal-play-again')
        .addEventListener('click', () => {
          closeModal();
          newGame(state.difficulty, false);
        });
    }, 400);
  }

  // ── New Level (con animación de flip) ──────────────────────────────────────

  function newLevel() {
    if (el.btnNewLevel.classList.contains('loading')) return;
    el.btnNewLevel.classList.add('loading');

    const wrapper = document.querySelector('.board-wrapper');
    wrapper.classList.add('flip-out');

    setTimeout(() => {
      wrapper.classList.remove('flip-out');
      newGame(state.difficulty, false).finally(() => {
        wrapper.classList.add('flip-in');
        setTimeout(() => wrapper.classList.remove('flip-in'), 300);
        el.btnNewLevel.classList.remove('loading');
      });
    }, 180);
  }

  // ── New game ──────────────────────────────────────────────────────────────

  function setControlsEnabled(enabled) {
    el.diffBtns.forEach(b => b.disabled = !enabled);
    el.btnDaily.disabled = !enabled;
    el.btnNewLevel.classList.toggle('loading', !enabled);
  }

  function newGame(difficulty = 'medium', isDaily = false, dateStr = null) {
    showLoading(true);
    setControlsEnabled(false);
    stopTimer();

    const genPromise = isDaily
      ? generateInBackground('daily', { dateStr: dateStr || getTodayStr() })
      : generateInBackground('puzzle', { difficulty });

    return genPromise
      .then(result => {
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
        el.btnNotes.setAttribute('aria-pressed', 'false');
        updateTimerDisplay();

        el.diffBtns.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.diff === difficulty);
        });

        el.dailyLabel.style.display = isDaily ? 'inline-flex' : 'none';
        el.diffLabel.textContent = isDaily ? i18n.t('daily') : i18n.t(difficulty);

        renderBoard();
        updateNumpadState();
      })
      .catch(() => {
        showToast(i18n.t('genericError'), 'error');
        // Reintenta una vez de forma síncrona en el hilo principal como último recurso
        const fallback = isDaily
          ? SudokuEngine.generateDailyPuzzle(dateStr || getTodayStr())
          : SudokuEngine.generatePuzzle(difficulty);
        state.puzzle = fallback.puzzle;
        state.solution = fallback.solution;
        state.board = fallback.puzzle.map(r => [...r]);
        state.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
        state.given = fallback.puzzle.map(r => r.map(v => v !== 0));
        state.difficulty = difficulty;
        state.isDaily = isDaily;
        renderBoard();
        updateNumpadState();
      })
      .finally(() => {
        showLoading(false);
        setControlsEnabled(true);
      });
  }

  // ── Daily ─────────────────────────────────────────────────────────────────

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function updateDailyButtonState() {
    const today = getTodayStr();
    const saved = i18n.safeGet('sudoku_daily_' + today);
    el.btnDaily.classList.toggle('solved', !!saved);
  }

  function playDaily() {
    const today = getTodayStr();
    const saved = i18n.safeGet('sudoku_daily_' + today);
    if (saved) {
      showToast(`${i18n.t('completedIn')} ${saved} ✓`, 'success');
      // Igual cargamos el tablero del día para que pueda repasarlo si quiere
    }
    newGame('medium', true, today);
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
      inputNumber(parseInt(key, 10));
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
      if (!state.started) { state.started = true; startTimer(); }
      highlightRelated();
    }
  }

  // ── Theme (claro / oscuro) ───────────────────────────────────────────────

  function getPreferredTheme() {
    const saved = i18n.safeGet('sudoku_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    // Si no hay preferencia guardada, respetar el sistema operativo del usuario
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (el.btnTheme) {
      el.btnTheme.textContent = theme === 'light' ? '☀️' : '🌙';
      el.btnTheme.setAttribute('aria-label', theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#F4F5FA' : '#0F1623');
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    i18n.safeSet('sudoku_theme', next);
  }

  // ── i18n refresh ──────────────────────────────────────────────────────────

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = i18n.t(node.dataset.i18n);
    });
    el.langBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === i18n.getLang());
    });
    document.documentElement.lang = i18n.getLang();
    el.board.setAttribute('aria-label', i18n.t('board'));
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    initRefs();
    initWorker();
    applyTheme(getPreferredTheme());
    applyTranslations();
    updateDailyButtonState();

    el.btnTheme.addEventListener('click', toggleTheme);

    el.diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        newGame(btn.dataset.diff, false);
      });
    });

    el.btnDaily.addEventListener('click', playDaily);

    el.btnHint.addEventListener('click', hint);
    el.btnCheck.addEventListener('click', check);
    el.btnRestart.addEventListener('click', () => newGame(state.difficulty, state.isDaily, state.isDaily ? getTodayStr() : null));
    el.btnUndo.addEventListener('click', undo);
    el.btnNotes.addEventListener('click', toggleNotes);
    el.btnErase.addEventListener('click', erase);
    el.btnNewLevel.addEventListener('click', newLevel);

    el.numpad.querySelectorAll('.num-btn').forEach(btn => {
      btn.addEventListener('click', () => inputNumber(parseInt(btn.dataset.num, 10)));
    });

    el.modalClose.addEventListener('click', closeModal);
    el.modal.addEventListener('click', e => {
      if (e.target === el.modal) closeModal();
    });

    document.addEventListener('keydown', onKeyDown);

    el.langBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        i18n.setLang(btn.dataset.lang);
        applyTranslations();
        el.diffLabel.textContent = state.isDaily ? i18n.t('daily') : i18n.t(state.difficulty);
      });
    });

    newGame('medium', false);
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', Game.init);
