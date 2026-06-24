/**
 * Stats & Ranking System
 * - Estadísticas personales en localStorage
 * - Ranking global via JSONBin (gratuito, sin servidor)
 */

const StatsSystem = (() => {

  // ── JSONBin config ────────────────────────────────────────────────────────
  // JSONBin.io — servicio gratuito de almacenamiento JSON
  // El BIN_ID se crea automáticamente la primera vez
  const JSONBIN_API = 'https://api.jsonbin.io/v3';
  const JSONBIN_KEY = '$2a$10$mVvY0PawHA/ECNf5CU43yuGhqr1eBwQd2tgkQ2JwuHVUUagf.4Zci';
  let BIN_ID = localStorage.getItem('sudoku_bin_id') || null;

  // ── Estadísticas personales ───────────────────────────────────────────────

  function getPersonalStats() {
    const defaults = {
      easy:   { played: 0, won: 0, bestTime: null, totalTime: 0 },
      medium: { played: 0, won: 0, bestTime: null, totalTime: 0 },
      hard:   { played: 0, won: 0, bestTime: null, totalTime: 0 },
      expert: { played: 0, won: 0, bestTime: null, totalTime: 0 },
    };
    try {
      const saved = localStorage.getItem('sudoku_stats');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { return defaults; }
  }

  function savePersonalStats(stats) {
    localStorage.setItem('sudoku_stats', JSON.stringify(stats));
  }

  function recordGame(difficulty, won, seconds) {
    const stats = getPersonalStats();
    const d = stats[difficulty];
    d.played++;
    if (won) {
      d.won++;
      d.totalTime += seconds;
      if (d.bestTime === null || seconds < d.bestTime) {
        d.bestTime = seconds;
      }
    }
    savePersonalStats(stats);
  }

  function formatTime(secs) {
    if (!secs && secs !== 0) return '—';
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function getWinRate(d) {
    return d.played > 0 ? Math.round((d.won / d.played) * 100) : 0;
  }

  function getAvgTime(d) {
    return d.won > 0 ? formatTime(Math.round(d.totalTime / d.won)) : '—';
  }

  // ── Ranking global (JSONBin) ──────────────────────────────────────────────

  async function submitScore(nickname, difficulty, seconds) {
    const entry = {
      nickname: nickname.trim().substring(0, 16),
      difficulty,
      time: seconds,
      timeStr: formatTime(seconds),
      date: new Date().toISOString().split('T')[0],
    };

    try {
      if (!BIN_ID) {
        // Crear bin la primera vez
        const res = await fetch(`${JSONBIN_API}/b`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_KEY,
            'X-Bin-Name': 'sudoku-ranking',
            'X-Bin-Private': 'false',
          },
          body: JSON.stringify({ scores: [entry] }),
        });
        if (res.ok) {
          const data = await res.json();
          BIN_ID = data.metadata.id;
          localStorage.setItem('sudoku_bin_id', BIN_ID);
        }
        return true;
      }

      // Leer ranking actual
      const getRes = await fetch(`${JSONBIN_API}/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_KEY },
      });
      if (!getRes.ok) return false;
      const current = await getRes.json();
      const scores = current.record.scores || [];

      // Añadir nueva entrada
      scores.push(entry);

      // Guardar (máx 500 entradas para no pasarse del límite gratuito)
      const trimmed = scores.slice(-500);
      await fetch(`${JSONBIN_API}/b/${BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_KEY,
        },
        body: JSON.stringify({ scores: trimmed }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async function fetchRanking(difficulty, limit = 10) {
    if (!BIN_ID) return [];
    try {
      const res = await fetch(`${JSONBIN_API}/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_KEY },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const scores = (data.record.scores || [])
        .filter(s => s.difficulty === difficulty)
        .sort((a, b) => a.time - b.time)
        .slice(0, limit);
      return scores;
    } catch {
      return [];
    }
  }

  // ── Modal de estadísticas ─────────────────────────────────────────────────

  function buildStatsHTML(difficulty) {
    const stats = getPersonalStats();
    const diffs = ['easy', 'medium', 'hard', 'expert'];
    const labels = {
      easy: i18n.t('easy'), medium: i18n.t('medium'),
      hard: i18n.t('hard'), expert: i18n.t('expert'),
    };

    const rows = diffs.map(d => {
      const s = stats[d];
      const active = d === difficulty ? 'stats-row-active' : '';
      return `
        <tr class="${active}">
          <td>${labels[d]}</td>
          <td>${s.played}</td>
          <td>${s.won}</td>
          <td>${getWinRate(s)}%</td>
          <td>${formatTime(s.bestTime)}</td>
          <td>${getAvgTime(s)}</td>
        </tr>`;
    }).join('');

    return `
      <div class="stats-modal">
        <h3 class="stats-section-title">${i18n.t('myStats')}</h3>
        <div class="stats-table-wrap">
          <table class="stats-table">
            <thead>
              <tr>
                <th>${i18n.t('difficulty')}</th>
                <th>🎮</th>
                <th>✅</th>
                <th>%</th>
                <th>⚡ ${i18n.t('best')}</th>
                <th>∅ ${i18n.t('avg')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <h3 class="stats-section-title" style="margin-top:20px">${i18n.t('globalRanking')}</h3>
        <div class="ranking-tabs">
          ${diffs.map(d => `
            <button class="rank-tab ${d === difficulty ? 'active' : ''}" data-diff="${d}">${labels[d]}</button>
          `).join('')}
        </div>
        <div class="ranking-list" id="ranking-list">
          <div class="ranking-loading">⏳</div>
        </div>
      </div>`;
  }

  async function renderRanking(difficulty) {
    const list = document.getElementById('ranking-list');
    if (!list) return;
    list.innerHTML = '<div class="ranking-loading">⏳</div>';
    const scores = await fetchRanking(difficulty);
    if (scores.length === 0) {
      list.innerHTML = `<div class="ranking-empty">${i18n.t('noRankingYet')}</div>`;
      return;
    }
    list.innerHTML = scores.map((s, i) => `
      <div class="ranking-row ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">
        <span class="rank-pos">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
        <span class="rank-name">${escapeHtml(s.nickname)}</span>
        <span class="rank-time">${s.timeStr}</span>
        <span class="rank-date">${s.date}</span>
      </div>`).join('');
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function openStatsModal(difficulty) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const body  = document.getElementById('modal-body');

    title.textContent = i18n.t('statistics');
    body.innerHTML = buildStatsHTML(difficulty);
    modal.classList.add('visible');

    // Tab switching
    body.querySelectorAll('.rank-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        body.querySelectorAll('.rank-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderRanking(tab.dataset.diff);
      });
    });

    renderRanking(difficulty);
  }

  // ── Modal de envío al ranking ─────────────────────────────────────────────

  function openSubmitModal(difficulty, seconds, onSubmit) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const body  = document.getElementById('modal-body');
    const savedNick = localStorage.getItem('sudoku_nickname') || '';

    title.textContent = i18n.t('congratulations');
    body.innerHTML = `
      <p>${i18n.t('solved')}</p>
      <p class="modal-time">${i18n.t('solvedTime')} <strong>${formatTime(seconds)}</strong></p>
      <div class="submit-ranking">
        <p class="submit-label">${i18n.t('enterNickname')}</p>
        <input class="nick-input" id="nick-input" type="text"
          maxlength="16" placeholder="${i18n.t('nickPlaceholder')}"
          value="${escapeHtml(savedNick)}" />
        <button class="modal-btn" id="btn-submit-rank">${i18n.t('submitRanking')}</button>
        <button class="modal-btn-secondary" id="btn-skip-rank">${i18n.t('skipRanking')}</button>
      </div>`;

    modal.classList.add('visible');

    document.getElementById('btn-submit-rank').addEventListener('click', async () => {
      const nick = document.getElementById('nick-input').value.trim();
      if (!nick) { document.getElementById('nick-input').focus(); return; }
      localStorage.setItem('sudoku_nickname', nick);
      document.getElementById('btn-submit-rank').textContent = '⏳';
      document.getElementById('btn-submit-rank').disabled = true;
      await submitScore(nick, difficulty, seconds);
      modal.classList.remove('visible');
      if (onSubmit) onSubmit();
    });

    document.getElementById('btn-skip-rank').addEventListener('click', () => {
      modal.classList.remove('visible');
      if (onSubmit) onSubmit();
    });
  }

  return { recordGame, openStatsModal, openSubmitModal, formatTime };

})();
