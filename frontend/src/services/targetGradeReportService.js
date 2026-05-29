/**
 * Generează un raport (funcție pură) care estimează cât de realistă e nota-țintă
 * a elevului, pe baza performanței la quiz-uri. Verdictul poate fi: date
 * insuficiente, posibil, incert sau improbabil, fiecare cu titlu și mesaj proprii.
 */
import { normalizeTargetGrade } from './profileService'

function toTargetGradeNumber(value) {
  return Number.parseFloat(normalizeTargetGrade(value))
}

/**
 * Construiește raportul notei-țintă.
 *
 * @param {object} params
 * @param {string|number} params.targetGradeValue - Nota dorită de elev (0–10).
 * @param {number} params.averageQuizScore - Media procentuală la quiz-uri.
 * @param {number} params.wrongAnswerCount - Numărul de răspunsuri greșite.
 * @param {number} params.correctAnswerCount - Numărul de răspunsuri corecte.
 * @param {number} params.answeredQuizLessons - Câte lecții au quiz-uri rezolvate.
 */
export function buildTargetGradeReport({
  targetGradeValue,
  averageQuizScore,
  wrongAnswerCount,
  correctAnswerCount,
  answeredQuizLessons,
}) {
  const targetGrade = toTargetGradeNumber(targetGradeValue)
  const wrongAnswers = wrongAnswerCount ?? 0
  const correctAnswers = correctAnswerCount ?? 0
  const answeredLessons = answeredQuizLessons ?? 0
  const hasQuizData = answeredLessons > 0 || wrongAnswers > 0 || correctAnswers > 0

  if (!hasQuizData) {
    return {
      verdict: 'insufficient_data',
      title: 'Raport indisponibil',
      message: 'Rezolvă câteva quiz-uri ca să estimăm dacă nota țintă este realistă.',
      targetGrade: targetGrade,
      wrongAnswerCount: wrongAnswers,
      correctAnswerCount: correctAnswers,
    }
  }

  // Media procentuală minimă estimată pentru nota-țintă: mapăm liniar nota 0–10 pe
  // intervalul 10–100%, astfel încât chiar și notele mici să ceară un prag rezonabil.
  const requiredAverage = Math.min(100, Math.round((targetGrade / 10) * 90 + 10))
  const average = averageQuizScore ?? 0
  // Penalizăm fiecare greșeală cu 2 puncte procentuale, ca media ajustată să reflecte
  // și consistența, nu doar scorul brut.
  const adjustedAverage = Math.round(average - wrongAnswers * 2)

  // O marjă de 8 puncte sub prag e considerată „incert” (atins la limită).
  let verdict = 'unlikely'
  if (adjustedAverage >= requiredAverage) {
    verdict = 'possible'
  } else if (adjustedAverage >= requiredAverage - 8) {
    verdict = 'uncertain'
  }

  const targetLabel = targetGrade.toFixed(2)

  if (verdict === 'possible') {
    return {
      verdict,
      title: 'Nota țintă pare realizabilă',
      message: `Ai ${correctAnswers} răspunsuri corecte, ${wrongAnswers} răspunsuri greșite la chestionare și o medie de ${average}% la quiz-uri. Pentru nota ${targetLabel}, traiectoria actuală este suficientă dacă menții ritmul.`,
      targetGrade,
      wrongAnswerCount: wrongAnswers,
      correctAnswerCount: correctAnswers,
      requiredAverage,
      adjustedAverage,
      averageQuizScore: average,
    }
  }

  if (verdict === 'uncertain') {
    return {
      verdict,
      title: 'Nota țintă este la limită',
      message: `Ai ${correctAnswers} răspunsuri corecte, ${wrongAnswers} răspunsuri greșite și o medie de ${average}% la quiz-uri. Nota ${targetLabel} este posibilă, dar ai nevoie de mai puține greșeli și consolidare pe capitolele slabe.`,
      targetGrade,
      wrongAnswerCount: wrongAnswers,
      correctAnswerCount: correctAnswers,
      requiredAverage,
      adjustedAverage,
      averageQuizScore: average,
    }
  }

  return {
    verdict,
    title: 'Nota țintă este greu de atins acum',
    message: `Ai ${correctAnswers} răspunsuri corecte, ${wrongAnswers} răspunsuri greșite și o medie de ${average}% la quiz-uri. Pentru nota ${targetLabel}, recomandăm recapitulare și refacerea chestionarelor înainte de a crește obiectivul.`,
    targetGrade,
    wrongAnswerCount: wrongAnswers,
    correctAnswerCount: correctAnswers,
    requiredAverage,
    adjustedAverage,
    averageQuizScore: average,
  }
}
