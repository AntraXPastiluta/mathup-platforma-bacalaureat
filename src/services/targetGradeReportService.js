import { normalizeTargetGrade } from './profileService'

function toTargetGradeNumber(value) {
  return Number.parseFloat(normalizeTargetGrade(value))
}

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

  const requiredAverage = Math.min(100, Math.round((targetGrade / 10) * 90 + 10))
  const average = averageQuizScore ?? 0
  const adjustedAverage = Math.round(average - wrongAnswers * 2)

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
