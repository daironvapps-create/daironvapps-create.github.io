/**
 * i18n — Translations: Spanish, English, Portuguese
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
      check: 'Comprobar',
      restart: 'Reiniciar',
      undo: 'Deshacer',
      notes: 'Notas',
      erase: 'Borrar',
      time: 'Tiempo',
      hintsLeft: 'Pistas restantes',
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
      statistics: 'Estadísticas',
      myStats: 'Mis estadísticas',
      globalRanking: 'Ranking global',
      best: 'Mejor',
      avg: 'Media',
      enterNickname: '¿Quieres entrar al ranking global?',
      nickPlaceholder: 'Tu apodo (máx. 16 caracteres)',
      submitRanking: 'Enviar al ranking',
      skipRanking: 'No, gracias',
      noRankingYet: 'Sé el primero en el ranking',
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
      hintsLeft: 'Hints left',
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
      statistics: 'Statistics',
      myStats: 'My Stats',
      globalRanking: 'Global Ranking',
      best: 'Best',
      avg: 'Avg',
      enterNickname: 'Want to enter the global ranking?',
      nickPlaceholder: 'Your nickname (max 16 chars)',
      submitRanking: 'Submit to ranking',
      skipRanking: 'No thanks',
      noRankingYet: 'Be the first on the ranking',
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
      hintsLeft: 'Dicas restantes',
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
      statistics: 'Estatísticas',
      myStats: 'Minhas estatísticas',
      globalRanking: 'Ranking global',
      best: 'Melhor',
      avg: 'Média',
      enterNickname: 'Quer entrar no ranking global?',
      nickPlaceholder: 'Seu apelido (máx. 16 caracteres)',
      submitRanking: 'Enviar ao ranking',
      skipRanking: 'Não, obrigado',
      noRankingYet: 'Seja o primeiro no ranking',
    }
  };

  let current = localStorage.getItem('sudoku_lang') || 'es';

  function t(key) {
    return (translations[current] && translations[current][key]) ||
           (translations['en'][key]) || key;
  }

  function setLang(lang) {
    if (translations[lang]) {
      current = lang;
      localStorage.setItem('sudoku_lang', lang);
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

  return { t, setLang, getLang, getAvailableLangs };

})();
