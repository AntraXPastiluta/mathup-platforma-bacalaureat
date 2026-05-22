import { useEffect, useMemo, useState } from 'react'
import {
  getAllLessonsAdmin,
  addLesson,
  deleteLesson,
  updateLesson,
  getQuizQuestions,
  addQuizQuestion,
  deleteQuizQuestion,
  getLessonFiles,
  addLessonFile,
  deleteLessonFile,
  getLessonParts,
  addLessonPart,
  updateLessonPart,
  deleteLessonPart,
  uploadFileToStorage,
} from '../../../services/adminService'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'
import { getTrustedStorageUrl } from '../../../shared/utils/safeUrl'
import { PROFILES } from '../../lessons/profiles'
import { normalizeProfilesList } from '../../../services/profileService'
import { ALLOWED_LESSON_FILE_EXTENSIONS } from '../constants'
import { cloneLessonToProfiles } from '../utils/lessonClone'

export function useAdminCurriculum() {
  const [lessons, setLessons] = useState([])
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('content')
  const [isCreating, setIsCreating] = useState(false)

  const [lessonContent, setLessonContent] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [questions, setQuestions] = useState([])
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correct: 0,
    placement: { type: 'end', partId: '' },
  })
  const [files, setFiles] = useState([])
  const regularFiles = useMemo(
    () => files.filter((file) => !file.is_solved_content),
    [files],
  )
  const [parts, setParts] = useState([])
  const [newPart, setNewPart] = useState({ title: '', content: '', video_url: '', image_url: '' })
  const [editingPartId, setEditingPartId] = useState(null)
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [newLessonData, setNewLessonData] = useState({
    title: '',
    profiles: ['mate_info'],
    subject_part: 1,
    difficulty: 'mediu',
    order_index: 1,
    is_premium: false,
    preview_part_count: 1,
  })

  const [editLessonData, setEditLessonData] = useState(null)

  const [selectedProgramKey, setSelectedProgramKey] = useState(null)
  const [sidebarQuery, setSidebarQuery] = useState('')

  const programsSidebarList = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase()
    return PROFILES.filter((p) => {
      if (!q) return true
      return (
        p.label.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        p.shortLabel.toLowerCase().includes(q)
      )
    })
  }, [sidebarQuery])

  const sidebarLessonsOrdered = useMemo(() => {
    if (!selectedProgramKey) return []
    const q = sidebarQuery.trim().toLowerCase()
    let list = lessons.filter((l) => l.profile === selectedProgramKey)
    if (q) list = list.filter((l) => (l.title || '').toLowerCase().includes(q))
    return [...list].sort((a, b) => {
      const sp = (a.subject_part ?? 1) - (b.subject_part ?? 1)
      if (sp !== 0) return sp
      return (a.order_index ?? 0) - (b.order_index ?? 0)
    })
  }, [lessons, selectedProgramKey, sidebarQuery])

  const newPartPreviewSrc = useMemo(
    () => getTrustedStorageUrl(newPart.image_url),
    [newPart.image_url],
  )

  useEffect(() => {
    loadLessons()
  }, [])

  async function loadLessons() {
    setLoading(true)
    try {
      const data = await getAllLessonsAdmin()
      setLessons(data)
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    } finally {
      setLoading(false)
    }
  }

  const handleSelectLesson = (lesson) => {
    setSelectedProgramKey(lesson.profile)
    setSidebarQuery('')
    setSelectedLesson(lesson)
    setIsCreating(false)
    setIsEditingMetadata(false)
    setLessonContent(lesson.content || '')
    setVideoUrl(lesson.video_url || '')
    setEditLessonData({
      title: lesson.title,
      profiles: [lesson.profile],
      subject_part: lesson.subject_part,
      difficulty: lesson.difficulty,
      order_index: lesson.order_index,
      is_premium: Boolean(lesson.is_premium),
      preview_part_count: lesson.preview_part_count ?? 1,
    })
    loadSubData(lesson.id)
  }

  async function loadSubData(lessonId) {
    try {
      const [qData, fData, pData] = await Promise.all([
        getQuizQuestions(lessonId),
        getLessonFiles(lessonId),
        getLessonParts(lessonId),
      ])
      setQuestions(qData)
      setFiles(fData)
      setParts(pData)
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.load))
    }
  }

  const toggleNewLessonProfile = (key) => {
    setNewLessonData((prev) => {
      const list = normalizeProfilesList(prev.profiles?.length ? prev.profiles : ['mate_info'])
      const has = list.includes(key)
      if (has && list.length <= 1) return prev
      if (has) return { ...prev, profiles: list.filter((k) => k !== key) }
      return { ...prev, profiles: [...list, key] }
    })
  }

  const toggleEditLessonProfile = (key) => {
    setEditLessonData((prev) => {
      if (!prev) return prev
      const list = normalizeProfilesList(prev.profiles?.length ? prev.profiles : ['mate_info'])
      const has = list.includes(key)
      if (has && list.length <= 1) return prev
      if (has) return { ...prev, profiles: list.filter((k) => k !== key) }
      return { ...prev, profiles: [...list, key] }
    })
  }

  const handleCreateLesson = async () => {
    if (!newLessonData.title) {
      setError('Titlul lecției este obligatoriu.')
      return
    }
    const profiles = normalizeProfilesList(newLessonData.profiles)
    try {
      setLoading(true)
      const base = {
        title: newLessonData.title.trim(),
        subject_part: newLessonData.subject_part,
        difficulty: newLessonData.difficulty,
        order_index: newLessonData.order_index,
        is_premium: Boolean(newLessonData.is_premium),
        preview_part_count: Number(newLessonData.preview_part_count) || 1,
        content: '',
      }
      const createdList = []
      for (const profile of profiles) {
        const created = await addLesson({ ...base, profile })
        createdList.push(created)
      }
      setLessons([...lessons, ...createdList])
      handleSelectLesson(createdList[createdList.length - 1])
      setIsCreating(false)
      setNewLessonData({
        title: '',
        profiles: ['mate_info'],
        subject_part: 1,
        difficulty: 'mediu',
        order_index: lessons.length + 1,
        is_premium: false,
        preview_part_count: 1,
      })
      setSuccess(
        profiles.length > 1
          ? `Au fost create ${profiles.length} lecții (câte una pentru fiecare program selectat).`
          : 'Lecție creată cu succes!',
      )
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMetadata = async () => {
    if (!editLessonData.title) {
      setError('Titlul lecției este obligatoriu.')
      return
    }
    const profiles = normalizeProfilesList(editLessonData.profiles || [])
    const [primary, ...extraProfiles] = profiles
    const payload = {
      title: editLessonData.title.trim(),
      profile: primary,
      subject_part: editLessonData.subject_part,
      difficulty: editLessonData.difficulty,
      order_index: editLessonData.order_index,
      is_premium: Boolean(editLessonData.is_premium),
      preview_part_count: Number(editLessonData.preview_part_count) || 1,
    }
    try {
      setLoading(true)
      const updated = await updateLesson(selectedLesson.id, payload)
      if (extraProfiles.length > 0) {
        await cloneLessonToProfiles({
          extraProfiles,
          editLessonData,
          lessonContent,
          videoUrl,
          parts,
          questions,
          files,
        })
      }
      setSuccess(
        extraProfiles.length > 0
          ? `Metadate actualizate. Au fost adăugate ${extraProfiles.length} lecții noi cu părți, quiz și fișiere copiate.`
          : 'Metadatele lecției au fost actualizate!',
      )
      setIsEditingMetadata(false)
      await loadLessons()
      handleSelectLesson(updated)
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('Ești sigur că vrei să ștergi această lecție? Toate datele asociate (părți, quiz, fișiere) vor fi pierdute.')) return
    try {
      await deleteLesson(id)
      setLessons(lessons.filter((l) => l.id !== id))
      setSelectedLesson(null)
      setSuccess('Lecție ștearsă!')
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    }
  }

  const handleUpdateLesson = async () => {
    try {
      setLoading(true)
      await updateLesson(selectedLesson.id, { content: lessonContent, video_url: videoUrl })
      setSuccess('Conținutul lecției a fost actualizat!')
      loadLessons()
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    } finally {
      setLoading(false)
    }
  }

  const handleAddQuestion = async () => {
    if (!newQuestion.text || newQuestion.options.some((o) => !o)) {
      setError('Toate câmpurile întrebării sunt obligatorii.')
      return
    }
    const placement = newQuestion.placement.type === 'after_part' && newQuestion.placement.partId
      ? newQuestion.placement
      : { type: 'end', partId: '' }
    try {
      const q = await addQuizQuestion({
        lesson_id: selectedLesson.id,
        question_text: newQuestion.text,
        options: { choices: newQuestion.options, placement },
        correct_option_index: newQuestion.correct,
      })
      setQuestions([...questions, q])
      setNewQuestion({ text: '', options: ['', '', '', ''], correct: 0, placement: { type: 'end', partId: '' } })
      setSuccess('Întrebare adăugată!')
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    }
  }

  const handleDeleteQuestion = async (id) => {
    try {
      await deleteQuizQuestion(id)
      setQuestions(questions.filter((q) => q.id !== id))
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !ALLOWED_LESSON_FILE_EXTENSIONS.has(extension)) {
      setError('Tipul de fișier nu este permis. Folosește PDF, imagini sau documente Word.')
      event.target.value = ''
      return
    }
    setUploading(true)
    try {
      const uploaded = await uploadFileToStorage(file)
      const savedFile = await addLessonFile({
        lesson_id: selectedLesson.id,
        file_name: uploaded.name,
        file_url: uploaded.url,
        file_type: uploaded.type,
        is_solved_content: false,
      })
      setFiles([...files, savedFile])
      setSuccess('Fișier încărcat cu succes!')
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleDeleteFile = async (id) => {
    try {
      await deleteLessonFile(id)
      setFiles(files.filter((f) => f.id !== id))
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    }
  }

  const handlePartImageUpload = async (event, target = 'new') => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Poți încărca doar imagini pentru secțiunile lecției.')
      return
    }

    setUploading(true)
    try {
      const uploaded = await uploadFileToStorage(file)
      if (target === 'new') {
        setNewPart((prev) => ({ ...prev, image_url: uploaded.url }))
      } else {
        updatePartField(target, 'image_url', uploaded.url)
      }
      setSuccess('Imagine încărcată pentru secțiune.')
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleAddPart = async () => {
    if (!newPart.title || !newPart.content) {
      setError('Titlul și conținutul părții sunt obligatorii.')
      return
    }
    try {
      const p = await addLessonPart({
        lesson_id: selectedLesson.id,
        title: newPart.title,
        content: newPart.content,
        video_url: newPart.video_url,
        image_url: newPart.image_url || null,
        order_index: parts.length + 1,
      })
      setParts([...parts, p])
      setNewPart({ title: '', content: '', video_url: '', image_url: '' })
      setSuccess('Parte adăugată cu succes!')
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    }
  }

  const handleUpdatePart = async (id) => {
    const partToUpdate = parts.find((p) => p.id === id)
    try {
      await updateLessonPart(id, partToUpdate)
      setEditingPartId(null)
      setSuccess('Parte actualizată!')
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    }
  }

  const handleDeletePart = async (id) => {
    if (!window.confirm('Sigur vrei să ștergi această parte?')) return
    try {
      await deleteLessonPart(id)
      setParts(parts.filter((p) => p.id !== id))
      setSuccess('Parte ștearsă!')
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    }
  }

  const updatePartField = (id, field, value) => {
    setParts(parts.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const getQuestionOptions = (question) => {
    return Array.isArray(question.options) ? question.options : question.options?.choices || []
  }

  const getQuestionPlacementLabel = (question) => {
    const placement = Array.isArray(question.options) ? null : question.options?.placement
    if (placement?.type === 'after_part') {
      const part = parts.find((p) => p.id === placement.partId)
      return part ? `După: ${part.title}` : 'După secțiune'
    }
    return 'La finalul lecției'
  }

  const startCreatingLesson = (profileKey = selectedProgramKey) => {
    setSelectedLesson(null)
    setIsCreating(true)
    setIsEditingMetadata(false)
    setActiveTab('content')
    if (profileKey) {
      const nextIndex = lessons.filter((lesson) => lesson.profile === profileKey).length + 1
      setNewLessonData((prev) => ({ ...prev, profiles: [profileKey], order_index: nextIndex }))
    }
  }

  const startEditingLesson = (lesson) => {
    handleSelectLesson(lesson)
    setIsEditingMetadata(true)
  }

  const startAddingPart = (lesson) => {
    handleSelectLesson(lesson)
    setActiveTab('parts')
    setIsEditingMetadata(false)
    setEditingPartId(null)
  }

  const clearProgramSelection = () => {
    setSelectedProgramKey(null)
    setSidebarQuery('')
    setSelectedLesson(null)
    setIsCreating(false)
  }

  const selectProgram = (key) => {
    setSelectedProgramKey(key)
    setSidebarQuery('')
    setSelectedLesson(null)
    setIsCreating(false)
  }

  return {
    lessons,
    setLessons,
    selectedLesson,
    setSelectedLesson,
    loading,
    error,
    setError,
    success,
    setSuccess,
    activeTab,
    setActiveTab,
    isCreating,
    setIsCreating,
    lessonContent,
    setLessonContent,
    videoUrl,
    setVideoUrl,
    questions,
    setQuestions,
    newQuestion,
    setNewQuestion,
    files,
    setFiles,
    regularFiles,
    parts,
    setParts,
    newPart,
    setNewPart,
    editingPartId,
    setEditingPartId,
    isEditingMetadata,
    setIsEditingMetadata,
    uploading,
    newLessonData,
    setNewLessonData,
    editLessonData,
    setEditLessonData,
    selectedProgramKey,
    setSelectedProgramKey,
    sidebarQuery,
    setSidebarQuery,
    programsSidebarList,
    sidebarLessonsOrdered,
    newPartPreviewSrc,
    loadLessons,
    handleSelectLesson,
    toggleNewLessonProfile,
    toggleEditLessonProfile,
    handleCreateLesson,
    handleUpdateMetadata,
    handleDeleteLesson,
    handleUpdateLesson,
    handleAddQuestion,
    handleDeleteQuestion,
    handleFileUpload,
    handleDeleteFile,
    handlePartImageUpload,
    handleAddPart,
    handleUpdatePart,
    handleDeletePart,
    updatePartField,
    getQuestionOptions,
    getQuestionPlacementLabel,
    startCreatingLesson,
    startEditingLesson,
    startAddingPart,
    clearProgramSelection,
    selectProgram,
  }
}
