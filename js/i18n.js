/**
 * i18n — Traducciones: Español, English, Português
 */

const i18n = (() => {

  const translations = {
    es: {
      title: 'Sudoku',
      tagline: 'El clásico juego de lógica',
      newGame: 'Nueva partida',
      dailyPuzzle: 'Sudoku del día',
      difficulty: 'Dificultad',
      easy: 'Fácil',
      medium: 'Medio',
      hard: 'Difícil',
      expert: 'Experto',
      hint: 'Pista',
      check: 'Ver',
      restart: 'Reiniciar',
      undo: 'Deshacer',
      notes: 'Notas',
      erase: 'Borrar',
      time: 'Tiempo',
      hintsLeft: 'Pistas',
      mistakes: 'Errores',
      congratulations: '¡Felicidades!',
      solved: '¡Has completado el Sudoku!',
      solvedTime: 'Tiempo:',
      playAgain: 'Jugar otra vez',
      gameOver: 'Partida terminada',
      tooManyMistakes: 'Demasiados errores (3)',
      daily: 'Diario',
      todayPuzzle: 'Puzzle del día',
      alreadySolvedToday: 'Ya resolviste el puzzle de hoy',
      completedIn: 'Completado en',
      notesMode: 'Modo notas',
      selectDifficulty: 'Selecciona dificultad',
      loading: 'Generando puzzle...',
      errorFound: 'Hay errores en el tablero',
      noErrors: 'Sin errores por ahora',
      hintsExhausted: 'Sin pistas disponibles',
      lang: 'Idioma',
      newLevel: 'Nuevo nivel',
      board: 'Tablero de Sudoku',
      noUndo: 'Nada que deshacer',
      cellLocked: 'Esa celda no se puede editar',
      genericError: 'Algo salió mal generando el puzzle. Probando de nuevo...',
    },
    en: {
      title: 'Sudoku',
      tagline: 'The classic logic game',
      newGame: 'New Game',
      dailyPuzzle: 'Daily Sudoku',
      difficulty: 'Difficulty',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      expert: 'Expert',
      hint: 'Hint',
      check: 'Check',
      restart: 'Restart',
      undo: 'Undo',
      notes: 'Notes',
      erase: 'Erase',
      time: 'Time',
      hintsLeft: 'Hints',
      mistakes: 'Mistakes',
      congratulations: 'Congratulations!',
      solved: 'You solved the Sudoku!',
      solvedTime: 'Time:',
      playAgain: 'Play again',
      gameOver: 'Game Over',
      tooManyMistakes: 'Too many mistakes (3)',
      daily: 'Daily',
      todayPuzzle: "Today's Puzzle",
      alreadySolvedToday: "You've already solved today's puzzle",
      completedIn: 'Completed in',
      notesMode: 'Notes mode',
      selectDifficulty: 'Select difficulty',
      loading: 'Generating puzzle...',
      errorFound: 'There are errors on the board',
      noErrors: 'No errors so far',
      hintsExhausted: 'No hints available',
      lang: 'Language',
      newLevel: 'New Level',
      board: 'Sudoku board',
      noUndo: 'Nothing to undo',
      cellLocked: 'That cell cannot be edited',
      genericError: 'Something went wrong generating the puzzle. Retrying...',
    },
    pt: {
      title: 'Sudoku',
      tagline: 'O clássico jogo de lógica',
      newGame: 'Novo jogo',
      dailyPuzzle: 'Sudoku diário',
      difficulty: 'Dificuldade',
      easy: 'Fácil',
      medium: 'Médio',
      hard: 'Difícil',
      expert: 'Especialista',
      hint: 'Dica',
      check: 'Verificar',
      restart: 'Reiniciar',
      undo: 'Desfazer',
      notes: 'Notas',
      erase: 'Apagar',
      time: 'Tempo',
      hintsLeft: 'Dicas',
      mistakes: 'Erros',
      congratulations: 'Parabéns!',
      solved: 'Você resolveu o Sudoku!',
      solvedTime: 'Tempo:',
      playAgain: 'Jogar novamente',
      gameOver: 'Fim de jogo',
      tooManyMistakes: 'Muitos erros (3)',
      daily: 'Diário',
      todayPuzzle: 'Puzzle do dia',
      alreadySolvedToday: 'Você já resolveu o puzzle de hoje',
      completedIn: 'Concluído em',
      notesMode: 'Modo notas',
      selectDifficulty: 'Selecionar dificuldade',
      loading: 'Gerando puzzle...',
      errorFound: 'Há erros no tabuleiro',
      noErrors: 'Sem erros por enquanto',
      hintsExhausted: 'Sem dicas disponíveis',
      lang: 'Idioma',
      newLevel: 'Novo nível',
      board: 'Tabuleiro de Sudoku',
      noUndo: 'Nada para desfazer',
      cellLocked: 'Essa célula não pode ser editada',
      genericError: 'Algo deu errado ao gerar o puzzle. Tentando novamente...',
    }
  };

  // ── Acceso seguro a localStorage (Safari modo privado, cookies bloqueadas, etc.) ──
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* almacenamiento no disponible, seguimos sin persistir */ }
  }

  function detectBrowserLang() {
    const supported = ['es', 'en', 'pt'];
    const navLangs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || 'es'];

    for (const l of navLangs) {
      const code = l.slice(0, 2).toLowerCase();
      if (supported.includes(code)) return code;
    }
    return 'es';
  }

  let current = safeGet('sudoku_lang') || detectBrowserLang();
  if (!translations[current]) current = 'es';

  function t(key) {
    return (translations[current] && translations[current][key]) ||
           (translations['en'][key]) || key;
  }

  function setLang(lang) {
    if (translations[lang]) {
      current = lang;
      safeSet('sudoku_lang', lang);
    }
  }

  function getLang() { return current; }

  function getAvailableLangs() {
    return [
      { code: 'es', label: 'Español' },
      { code: 'en', label: 'English' },
      { code: 'pt', label: 'Português' },
    ];
  }

  return { t, setLang, getLang, getAvailableLangs, safeGet, safeSet };

})();
