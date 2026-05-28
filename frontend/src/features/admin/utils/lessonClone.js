import {
  addLesson,
  addLessonFile,
  addLessonPart,
  addQuizQuestion,
} from '../../../services/adminService'

export function cloneQuestionOptionsForLesson(options, partIdMap) {
  const clonedOptions = JSON.parse(JSON.stringify(options))
  if (Array.isArray(clonedOptions)) return clonedOptions
  if (clonedOptions?.placement?.type === 'after_part') {
    clonedOptions.placement = {
      ...clonedOptions.placement,
      partId: partIdMap.get(clonedOptions.placement.partId) || '',
    }
  }
  return clonedOptions
}

export async function cloneLessonDetails({
  targetLessonId,
  parts,
  questions,
  files,
}) {
  const partIdMap = new Map()

  for (const part of parts) {
    const clonedPart = await addLessonPart({
      lesson_id: targetLessonId,
      title: part.title,
      content: part.content,
      video_url: part.video_url,
      image_url: part.image_url,
      order_index: part.order_index,
    })
    partIdMap.set(part.id, clonedPart.id)
  }

  for (const question of questions) {
    const options = cloneQuestionOptionsForLesson(question.options, partIdMap)
    await addQuizQuestion({
      lesson_id: targetLessonId,
      question_text: question.question_text,
      options,
      correct_option_index: question.correct_option_index,
    })
  }

  for (const file of files) {
    await addLessonFile({
      lesson_id: targetLessonId,
      file_name: file.file_name,
      file_url: file.file_url,
      file_type: file.file_type,
      is_solved_content: Boolean(file.is_solved_content),
    })
  }
}

export async function cloneLessonToProfiles({
  extraProfiles,
  editLessonData,
  lessonContent,
  videoUrl,
  parts,
  questions,
  files,
}) {
  const created = []
  for (const profile of extraProfiles) {
    const clonedLesson = await addLesson({
      title: editLessonData.title.trim(),
      profile,
      subject_part: editLessonData.subject_part,
      difficulty: editLessonData.difficulty,
      order_index: editLessonData.order_index,
      is_premium: Boolean(editLessonData.is_premium),
      preview_part_count: Number(editLessonData.preview_part_count) || 1,
      content: lessonContent,
      video_url: videoUrl,
    })
    await cloneLessonDetails({
      targetLessonId: clonedLesson.id,
      parts,
      questions,
      files,
    })
    created.push(clonedLesson)
  }
  return created
}
