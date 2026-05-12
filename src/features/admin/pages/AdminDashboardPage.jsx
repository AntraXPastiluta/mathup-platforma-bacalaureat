import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  BookOpen, 
  Layers, 
  FileText, 
  HelpCircle, 
  ChevronRight,
  Save,
  UploadCloud,
  ExternalLink,
  ChevronLeft,
  GraduationCap,
  PlayCircle,
  Check,
  BarChart3,
  Map,
} from 'lucide-react'
import {
  getAllRoadmapsAdmin,
  addRoadmap,
  updateRoadmap,
  deleteRoadmap,
  addRoadmapStep,
  deleteRoadmapStep,
} from '../../../services/roadmapService'
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
  uploadFileToStorage
} from '../../../services/adminService'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Navbar } from '../../../shared/ui/Navbar'
import { PROFILES, SUBJECT_PARTS, getProfileMeta } from '../../lessons/profiles'
import { normalizeProfilesList } from '../../../services/profileService'
import { RoadmapCanvas } from '../../roadmap/components/RoadmapCanvas'
import { AdminSolvedVariantsSection } from '../components/AdminSolvedVariantsSection'
import { AdminAccessSection } from '../components/AdminAccessSection'
import { createEmptyLayout, normalizeLayout } from '../../roadmap/utils/canvasLayout'

export function AdminDashboardPage() {
  const [lessons, setLessons] = useState([])
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('content') // content, parts, quiz, files, variants
  const [isCreating, setIsCreating] = useState(false)

  // Form states for existing lesson
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
  const [adminSection, setAdminSection] = useState('curriculum')
  const [roadmaps, setRoadmaps] = useState([])
  const [selectedRoadmapId, setSelectedRoadmapId] = useState(null)
  const [roadmapForm, setRoadmapForm] = useState({
    title: '',
    description: '',
    profile: 'mate_info',
    order_index: 0,
  })
  const [roadmapStepForm, setRoadmapStepForm] = useState({
    title: '',
    description: '',
    lesson_id: '',
    order_index: 1,
    requires_premium: false,
  })
  const [roadmapCanvas, setRoadmapCanvas] = useState(createEmptyLayout)

  // Form state for new lesson
  const [newLessonData, setNewLessonData] = useState({
    title: '',
    profiles: ['mate_info'],
    subject_part: 1,
    difficulty: 'mediu',
    order_index: 1,
    is_premium: false,
    preview_part_count: 1,
  })

  // Form state for editing existing lesson metadata
  const [editLessonData, setEditLessonData] = useState(null)

  /** Sidebar: null = listă programe; altfel = lecții pentru acel `profile` */
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

  useEffect(() => {
    loadLessons()
  }, [])

  useEffect(() => {
    if (adminSection === 'roadmaps') {
      loadRoadmapsAdmin()
    }
  }, [adminSection])

  const selectedRoadmap = useMemo(
    () => roadmaps.find((roadmap) => roadmap.id === selectedRoadmapId) || null,
    [roadmaps, selectedRoadmapId],
  )

  async function loadLessons() {
    setLoading(true)
    try {
      const data = await getAllLessonsAdmin()
      setLessons(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadRoadmapsAdmin() {
    setLoading(true)
    try {
      const data = await getAllRoadmapsAdmin()
      setRoadmaps(data)
    } catch (err) {
      setError(err.message)
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
        getLessonParts(lessonId)
      ])
      setQuestions(qData)
      setFiles(fData)
      setParts(pData)
    } catch (err) {
      console.error('Error loading sub-data:', err)
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
          : 'Lecție creată cu succes!'
      )
    } catch (err) {
      setError(err.message)
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
        await cloneLessonDetails(clonedLesson.id)
      }
      setSuccess(
        extraProfiles.length > 0
          ? `Metadate actualizate. Au fost adăugate ${extraProfiles.length} lecții noi cu părți, quiz și fișiere copiate.`
          : 'Metadatele lecției au fost actualizate!'
      )
      setIsEditingMetadata(false)
      await loadLessons()
      handleSelectLesson(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const cloneLessonDetails = async (targetLessonId) => {
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

  const cloneQuestionOptionsForLesson = (options, partIdMap) => {
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

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('Ești sigur că vrei să ștergi această lecție? Toate datele asociate (părți, quiz, fișiere) vor fi pierdute.')) return
    try {
      await deleteLesson(id)
      setLessons(lessons.filter(l => l.id !== id))
      setSelectedLesson(null)
      setSuccess('Lecție ștearsă!')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateLesson = async () => {
    try {
      setLoading(true)
      await updateLesson(selectedLesson.id, { content: lessonContent, video_url: videoUrl })
      setSuccess('Conținutul lecției a fost actualizat!')
      loadLessons()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddQuestion = async () => {
    if (!newQuestion.text || newQuestion.options.some(o => !o)) {
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
        correct_option_index: newQuestion.correct
      })
      setQuestions([...questions, q])
      setNewQuestion({ text: '', options: ['', '', '', ''], correct: 0, placement: { type: 'end', partId: '' } })
      setSuccess('Întrebare adăugată!')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteQuestion = async (id) => {
    try {
      await deleteQuizQuestion(id)
      setQuestions(questions.filter(q => q.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
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
      setError(err.message)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleDeleteFile = async (id) => {
    try {
      await deleteLessonFile(id)
      setFiles(files.filter(f => f.id !== id))
    } catch (err) {
      setError(err.message)
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
      setError(err.message)
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
        order_index: parts.length + 1
      })
      setParts([...parts, p])
      setNewPart({ title: '', content: '', video_url: '', image_url: '' })
      setSuccess('Parte adăugată cu succes!')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdatePart = async (id) => {
    const partToUpdate = parts.find(p => p.id === id)
    try {
      await updateLessonPart(id, partToUpdate)
      setEditingPartId(null)
      setSuccess('Parte actualizată!')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeletePart = async (id) => {
    if (!window.confirm('Sigur vrei să ștergi această parte?')) return
    try {
      await deleteLessonPart(id)
      setParts(parts.filter(p => p.id !== id))
      setSuccess('Parte ștearsă!')
    } catch (err) {
      setError(err.message)
    }
  }

  const updatePartField = (id, field, value) => {
    setParts(parts.map(p => p.id === id ? { ...p, [field]: value } : p))
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

  const selectRoadmap = (roadmap) => {
    setSelectedRoadmapId(roadmap.id)
    setRoadmapForm({
      title: roadmap.title,
      description: roadmap.description || '',
      profile: roadmap.profile,
      order_index: roadmap.order_index ?? 0,
    })
    const nextStepIndex = (roadmap.study_roadmap_steps?.length ?? 0) + 1
    setRoadmapStepForm({
      title: '',
      description: '',
      lesson_id: '',
      order_index: nextStepIndex,
      requires_premium: false,
    })
    setRoadmapCanvas(normalizeLayout(roadmap.canvas_layout))
  }

  const startNewRoadmap = () => {
    setSelectedRoadmapId(null)
    setRoadmapForm({
      title: '',
      description: '',
      profile: selectedProgramKey || 'mate_info',
      order_index: roadmaps.length,
    })
    setRoadmapStepForm({
      title: '',
      description: '',
      lesson_id: '',
      order_index: 1,
      requires_premium: false,
    })
    setRoadmapCanvas(createEmptyLayout())
  }

  const handleSaveRoadmap = async () => {
    if (!roadmapForm.title.trim()) {
      setError('Titlul roadmap-ului este obligatoriu.')
      return
    }
    try {
      setLoading(true)
      const payload = {
        title: roadmapForm.title.trim(),
        description: roadmapForm.description.trim(),
        profile: roadmapForm.profile,
        order_index: Number(roadmapForm.order_index) || 0,
        canvas_layout: roadmapCanvas,
      }
      if (selectedRoadmapId) {
        await updateRoadmap(selectedRoadmapId, payload)
        setSuccess('Roadmap actualizat.')
      } else {
        const created = await addRoadmap(payload)
        setSelectedRoadmapId(created.id)
        setSuccess('Roadmap creat.')
      }
      await loadRoadmapsAdmin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRoadmap = async (id) => {
    if (!window.confirm('Ștergi acest roadmap și toți pașii lui?')) return
    try {
      await deleteRoadmap(id)
      if (selectedRoadmapId === id) {
        setSelectedRoadmapId(null)
        startNewRoadmap()
      }
      await loadRoadmapsAdmin()
      setSuccess('Roadmap șters.')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddRoadmapStep = async () => {
    if (!selectedRoadmapId || !roadmapStepForm.title.trim()) {
      setError('Selectează un roadmap și completează titlul pasului.')
      return
    }
    try {
      setLoading(true)
      await addRoadmapStep({
        roadmap_id: selectedRoadmapId,
        title: roadmapStepForm.title.trim(),
        description: roadmapStepForm.description.trim(),
        lesson_id: roadmapStepForm.lesson_id || null,
        order_index: Number(roadmapStepForm.order_index) || 1,
        requires_premium: Boolean(roadmapStepForm.requires_premium),
      })
      setRoadmapStepForm({
        title: '',
        description: '',
        lesson_id: '',
        order_index: (selectedRoadmap?.study_roadmap_steps?.length ?? 0) + 2,
        requires_premium: false,
      })
      await loadRoadmapsAdmin()
      setSuccess('Pas adăugat în roadmap.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRoadmapStep = async (stepId) => {
    try {
      await deleteRoadmapStep(stepId)
      await loadRoadmapsAdmin()
      setSuccess('Pas șters.')
    } catch (err) {
      setError(err.message)
    }
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

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 selection:bg-primary/30 transition-colors duration-500">
      <Navbar />

      <main className="container py-10 relative z-10">
        <motion.div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setAdminSection('curriculum')}
            className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${adminSection === 'curriculum' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'}`}
          >
            Curriculum
          </button>
          <button
            type="button"
            onClick={() => setAdminSection('roadmaps')}
            className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${adminSection === 'roadmaps' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'}`}
          >
            Roadmaps de studiu
          </button>
          <button
            type="button"
            onClick={() => setAdminSection('variants')}
            className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${adminSection === 'variants' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'}`}
          >
            Variante rezolvate
          </button>
          <button
            type="button"
            onClick={() => setAdminSection('admins')}
            className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${adminSection === 'admins' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'}`}
          >
            Administratori
          </button>
        </motion.div>

        {adminSection === 'roadmaps' ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Map className="size-5 text-primary" />
                  <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-white">Roadmaps</h2>
                </div>
                <button
                  type="button"
                  onClick={startNewRoadmap}
                  className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/20"
                >
                  <PlusCircle className="size-3.5" />
                  Nou
                </button>
              </div>
              {error && <AlertMessage message={error} variant="error" onClose={() => setError('')} />}
              {success && <AlertMessage message={success} variant="success" onClose={() => setSuccess('')} />}
              <motion.div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                {roadmaps.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-400">Nu există roadmaps configurate.</p>
                ) : (
                  roadmaps.map((roadmap) => (
                    <button
                      key={roadmap.id}
                      type="button"
                      onClick={() => selectRoadmap(roadmap)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${selectedRoadmapId === roadmap.id ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">{getProfileMeta(roadmap.profile).shortLabel}</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{roadmap.title}</p>
                      <p className="text-[10px] font-bold text-muted-foreground">{(roadmap.study_roadmap_steps ?? []).length} pași</p>
                    </button>
                  ))
                )}
              </motion.div>
            </div>
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/5">
                <h3 className="mb-6 text-lg font-black text-slate-800 dark:text-white">
                  {selectedRoadmapId ? 'Editează roadmap' : 'Roadmap nou'}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Titlu</label>
                    <input
                      type="text"
                      value={roadmapForm.title}
                      onChange={(e) => setRoadmapForm({ ...roadmapForm, title: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descriere</label>
                    <textarea
                      rows={3}
                      value={roadmapForm.description}
                      onChange={(e) => setRoadmapForm({ ...roadmapForm, description: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Program</label>
                    <select
                      value={roadmapForm.profile}
                      onChange={(e) => setRoadmapForm({ ...roadmapForm, profile: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
                    >
                      {PROFILES.map((profile) => (
                        <option key={profile.key} value={profile.key}>{profile.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ordine</label>
                    <input
                      type="number"
                      value={roadmapForm.order_index}
                      onChange={(e) => setRoadmapForm({ ...roadmapForm, order_index: parseInt(e.target.value, 10) || 0 })}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
                    />
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={handleSaveRoadmap} className="rounded-2xl">Salvează roadmap</Button>
                  {selectedRoadmapId ? (
                    <Button variant="outline" onClick={() => handleDeleteRoadmap(selectedRoadmapId)} className="rounded-2xl border-destructive/20 text-destructive">
                      Șterge roadmap
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/5 space-y-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">Canvas roadmap</h3>
                  <p className="text-sm text-muted-foreground">
                    Adaugă subiecte, note, culori și săgeți. Salvează roadmap-ul ca să publice layout-ul pentru elevii Premium.
                  </p>
                </div>
                <RoadmapCanvas
                  layout={roadmapCanvas}
                  onLayoutChange={setRoadmapCanvas}
                />
              </div>

              {selectedRoadmapId ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/5 space-y-6">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">Pași recomandați</h3>
                  <div className="space-y-2">
                    {(selectedRoadmap?.study_roadmap_steps ?? []).map((step, index) => (
                      <div key={step.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pasul {index + 1}</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{step.title}</p>
                          {step.requires_premium ? <p className="text-[10px] font-black uppercase text-primary">Premium</p> : null}
                        </div>
                        <button type="button" onClick={() => handleDeleteRoadmapStep(step.id)} className="rounded-xl bg-destructive/10 p-2 text-destructive">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 border-t border-slate-200 pt-6 dark:border-white/10">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Titlu pas</label>
                      <input
                        type="text"
                        value={roadmapStepForm.title}
                        onChange={(e) => setRoadmapStepForm({ ...roadmapStepForm, title: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descriere pas</label>
                      <input
                        type="text"
                        value={roadmapStepForm.description}
                        onChange={(e) => setRoadmapStepForm({ ...roadmapStepForm, description: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lecție asociată</label>
                      <select
                        value={roadmapStepForm.lesson_id}
                        onChange={(e) => setRoadmapStepForm({ ...roadmapStepForm, lesson_id: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
                      >
                        <option value="">Fără lecție</option>
                        {lessons
                          .filter((lesson) => lesson.profile === roadmapForm.profile)
                          .map((lesson) => (
                            <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ordine pas</label>
                      <input
                        type="number"
                        value={roadmapStepForm.order_index}
                        onChange={(e) => setRoadmapStepForm({ ...roadmapStepForm, order_index: parseInt(e.target.value, 10) || 1 })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
                      />
                    </div>
                    <label className="flex items-center gap-3 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={roadmapStepForm.requires_premium}
                        onChange={(e) => setRoadmapStepForm({ ...roadmapStepForm, requires_premium: e.target.checked })}
                      />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Pas disponibil doar pentru Premium</span>
                    </label>
                    <Button onClick={handleAddRoadmapStep} className="rounded-2xl md:col-span-2">Adaugă pas</Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : adminSection === 'variants' ? (
          <AdminSolvedVariantsSection />
        ) : adminSection === 'admins' ? (
          <AdminAccessSection />
        ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Sidebar - Lessons List */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="size-5 text-primary" />
                <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-white">Curriculum</h2>
              </div>
              <button 
                type="button"
                onClick={() => startCreatingLesson()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all text-xs font-bold border border-primary/20"
              >
                <PlusCircle className="size-3.5" />
                Lecție Nouă
              </button>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-b from-primary/20 to-transparent rounded-3xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
              <div className="relative bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded-3xl overflow-hidden max-h-[75vh] flex flex-col shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="p-4 border-b border-slate-200/50 dark:border-white/5 bg-slate-50 dark:bg-white/5 space-y-3">
                  {selectedProgramKey ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProgramKey(null)
                        setSidebarQuery('')
                        setSelectedLesson(null)
                        setIsCreating(false)
                      }}
                      className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                    >
                      <ChevronLeft className="size-4" />
                      Programe
                    </button>
                  ) : null}
                  <div className="relative">
                    <input
                      type="text"
                      value={sidebarQuery}
                      onChange={(e) => setSidebarQuery(e.target.value)}
                      placeholder={selectedProgramKey ? 'Caută lecție...' : 'Caută program...'}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                  {selectedProgramKey ? (
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                      {getProfileMeta(selectedProgramKey).label}
                      <span className="ml-2 font-black text-primary">{sidebarLessonsOrdered.length} lecții</span>
                    </p>
                  ) : null}
                  {selectedProgramKey ? (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => startCreatingLesson(selectedProgramKey)}
                        className="flex items-center justify-center gap-1 rounded-xl border border-primary/20 bg-primary/10 px-2 py-2 text-[10px] font-black uppercase tracking-tighter text-primary transition-all hover:bg-primary/20"
                      >
                        <PlusCircle className="size-3.5" />
                        Adaugă
                      </button>
                      <button
                        type="button"
                        disabled={!selectedLesson}
                        onClick={() => selectedLesson && startEditingLesson(selectedLesson)}
                        className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[10px] font-black uppercase tracking-tighter text-slate-600 transition-all hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
                      >
                        <Edit3 className="size-3.5" />
                        Editează
                      </button>
                      <button
                        type="button"
                        disabled={!selectedLesson}
                        onClick={() => selectedLesson && handleDeleteLesson(selectedLesson.id)}
                        className="flex items-center justify-center gap-1 rounded-xl border border-destructive/10 bg-destructive/10 px-2 py-2 text-[10px] font-black uppercase tracking-tighter text-destructive transition-all hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="size-3.5" />
                        Șterge
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1">
                  {loading && lessons.length === 0 ? (
                    <div className="p-10 text-center space-y-4">
                      <div className="size-8 border-2 border-primary/30 border-t-primary animate-spin rounded-full mx-auto" />
                      <p className="text-sm text-slate-400 font-medium italic">Se încarcă materia...</p>
                    </div>
                  ) : !selectedProgramKey ? (
                    <div className="p-2 space-y-1">
                      {programsSidebarList.length === 0 ? (
                        <p className="p-6 text-center text-sm text-slate-400">Niciun program nu se potrivește căutării.</p>
                      ) : (
                        programsSidebarList.map((p) => {
                          const count = lessons.filter((l) => l.profile === p.key).length
                          return (
                            <button
                              key={p.key}
                              type="button"
                              className="w-full text-left p-4 rounded-2xl transition-all group/item border border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-200/80 dark:hover:border-white/10"
                              onClick={() => {
                                setSelectedProgramKey(p.key)
                                setSidebarQuery('')
                                setSelectedLesson(null)
                                setIsCreating(false)
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-[9px] font-black text-primary uppercase tracking-tighter border border-primary/20">
                                      {p.shortLabel}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                      {count} lecții
                                    </span>
                                  </div>
                                  <div className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover/item:text-primary dark:group-hover/item:text-white transition-colors">
                                    {p.label}
                                  </div>
                                </div>
                                <ChevronRight className="size-4 mt-1 text-slate-400 opacity-0 transition-all group-hover/item:opacity-100 group-hover/item:translate-x-1" />
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {sidebarLessonsOrdered.length === 0 ? (
                        <p className="p-6 text-center text-sm text-slate-400">
                          {lessons.some((l) => l.profile === selectedProgramKey)
                            ? 'Nicio lecție nu se potrivește căutării.'
                            : 'Nu există lecții pentru acest program.'}
                        </p>
                      ) : (
                        sidebarLessonsOrdered.map((lesson) => (
                          <div
                            key={lesson.id}
                            className={`w-full text-left p-4 rounded-2xl transition-all group/item ${selectedLesson?.id === lesson.id ? 'bg-gradient-to-r from-primary/20 to-indigo-600/10 border border-primary/30 shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                className="flex-1 min-w-0 text-left"
                                onClick={() => handleSelectLesson(lesson)}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    Subiect {lesson.subject_part}
                                  </span>
                                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 tabular-nums">
                                    #{lesson.order_index ?? 0}
                                  </span>
                                </div>
                                <div className={`text-sm font-bold truncate transition-colors ${selectedLesson?.id === lesson.id ? 'text-primary dark:text-white' : 'text-slate-700 dark:text-slate-300 group-hover/item:text-primary dark:group-hover/item:text-white'}`}>
                                  {lesson.title}
                                </div>
                              </button>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  title="Adaugă parte"
                                  onClick={() => startAddingPart(lesson)}
                                  className="rounded-lg border border-primary/15 bg-primary/10 p-2 text-primary opacity-80 transition-all hover:bg-primary/20 hover:opacity-100"
                                >
                                  <PlusCircle className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Editează lecția"
                                  onClick={() => startEditingLesson(lesson)}
                                  className="rounded-lg border border-slate-200 bg-white/70 p-2 text-slate-500 opacity-80 transition-all hover:text-primary hover:opacity-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
                                >
                                  <Edit3 className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Șterge lecția"
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="rounded-lg border border-destructive/10 bg-destructive/10 p-2 text-destructive opacity-80 transition-all hover:bg-destructive/20 hover:opacity-100"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Editor Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {!selectedLesson && !isCreating ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col h-[75vh] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm text-slate-400 gap-4 shadow-sm"
                >
                  <div className="size-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10">
                    <BookOpen className="size-10 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg text-slate-600 dark:text-slate-300">Nicio lecție selectată</p>
                    <p className="text-sm">Alege un program în stânga, apoi o lecție din listă, sau creează o lecție nouă.</p>
                  </div>
                  <Button variant="outline" onClick={() => setIsCreating(true)} className="mt-2 rounded-full border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm text-slate-600 dark:text-slate-300">
                    + Creează prima lecție
                  </Button>
                </motion.div>
              ) : isCreating ? (
                <motion.div
                  key="creating"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-8"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                      <PlusCircle className="size-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Creează Lecție Nouă</h2>
                      <p className="text-sm text-slate-500 font-medium">Definește parametrii de bază ai noii lecții.</p>
                    </div>
                  </div>
                  
                  {error && <AlertMessage message={error} variant="error" onClose={() => setError('')} />}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Titlu Lecție</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-lg text-slate-800 dark:text-white placeholder:text-slate-400 shadow-sm"
                        value={newLessonData.title}
                        onChange={(e) => setNewLessonData({ ...newLessonData, title: e.target.value })}
                        placeholder="Ex: Teorema lui Thales"
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Specializare (programe liceale)</label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Bifează unul sau mai multe programe — se creează câte o lecție pentru fiecare (același titlu și parametri).
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PROFILES.map((p) => {
                          const active = normalizeProfilesList(newLessonData.profiles).includes(p.key)
                          return (
                            <button
                              key={p.key}
                              type="button"
                              onClick={() => toggleNewLessonProfile(p.key)}
                              className={`relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${active ? 'border-primary bg-primary/10 shadow-md shadow-primary/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'}`}
                            >
                              {active && (
                                <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-white shadow">
                                  <Check className="size-3.5" strokeWidth={3} />
                                </span>
                              )}
                              <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                                <BarChart3 className="size-4" />
                              </div>
                              <div className="min-w-0 pr-7">
                                <p className={`text-xs font-black ${active ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>{p.label}</p>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground opacity-70">Programă {p.shortLabel}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Subiect BAC</label>
                      <select
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold appearance-none cursor-pointer text-slate-800 dark:text-white shadow-sm"
                        value={newLessonData.subject_part}
                        onChange={(e) => setNewLessonData({ ...newLessonData, subject_part: parseInt(e.target.value) })}
                      >
                        {SUBJECT_PARTS.map(s => <option key={s.value} value={s.value} className="bg-white dark:bg-[#020617]">{s.label}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Dificultate</label>
                      <div className="flex gap-2 p-1 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        {['usor', 'mediu', 'greu'].map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => setNewLessonData({...newLessonData, difficulty: lvl})}
                            className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${newLessonData.difficulty === lvl ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Index Ordine</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
                        value={newLessonData.order_index}
                        onChange={(e) => setNewLessonData({ ...newLessonData, order_index: parseInt(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-white/5">
                        <input
                          type="checkbox"
                          checked={Boolean(newLessonData.is_premium)}
                          onChange={(e) => setNewLessonData({ ...newLessonData, is_premium: e.target.checked })}
                        />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Lecție Premium</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Părți preview (gratuit)</label>
                      <input
                        type="number"
                        min={1}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
                        value={newLessonData.preview_part_count}
                        onChange={(e) => setNewLessonData({ ...newLessonData, preview_part_count: parseInt(e.target.value, 10) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button variant="outline" onClick={() => setIsCreating(false)} className="flex-1 rounded-2xl border-slate-200 dark:border-white/10 h-14 shadow-sm text-slate-600 dark:text-slate-300">Anulează</Button>
                    <Button onClick={handleCreateLesson} className="flex-1 rounded-2xl h-14 bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20">
                      Creează Lecția
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={selectedLesson.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Lesson Header Card */}
                  <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-6 shadow-2xl shadow-slate-200/50 dark:shadow-none">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                         <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/10 shadow-sm">
                            <Layers className="size-7 text-indigo-500 dark:text-indigo-400" />
                         </div>
                         <div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{selectedLesson.title}</h2>
                            <div className="flex items-center gap-3 mt-1">
                               <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/10 rounded border border-primary/10">{selectedLesson.profile}</span>
                               <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Subiect {selectedLesson.subject_part}</span>
                            </div>
                         </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm ${isEditingMetadata ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'}`}
                        >
                          {isEditingMetadata ? <Save className="size-3.5" /> : <Edit3 className="size-3.5" />}
                          {isEditingMetadata ? 'Confirmă Detalii' : 'Editează Detalii'}
                        </button>
                        <button 
                          onClick={() => handleDeleteLesson(selectedLesson.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border border-destructive/10 hover:bg-destructive/20 transition-all shadow-sm"
                        >
                          <Trash2 className="size-3.5" />
                          Șterge
                        </button>
                      </div>
                    </div>

                    {/* Tab Navigation (only if not editing metadata) */}
                    {!isEditingMetadata && (
                      <div className="flex items-center gap-1 mt-8 p-1.5 bg-slate-100 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5 w-fit shadow-inner">
                        {[
                          { id: 'content', label: 'Conținut', icon: FileText },
                          { id: 'parts', label: 'Părți', icon: Layers },
                          { id: 'quiz', label: 'Quiz', icon: HelpCircle },
                          { id: 'files', label: 'Fișiere', icon: UploadCloud },
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${activeTab === tab.id ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5'}`}
                          >
                            <tab.icon className={`size-3.5 ${activeTab === tab.id ? 'text-primary' : 'text-slate-400 dark:text-slate-600'}`} />
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && <AlertMessage message={error} variant="error" onClose={() => setError('')} />}
                  {success && <AlertMessage message={success} variant="success" onClose={() => setSuccess('')} />}

                  {/* Main Work Area */}
                  <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl pointer-events-none -mr-32 -mt-32 rounded-full" />
                    
                    {isEditingMetadata ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 relative z-10">
                        <div className="flex items-center gap-2">
                           <div className="h-4 w-1 bg-primary rounded-full" />
                           <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Modifică Metadatele</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Titlu Nou</label>
                            <input
                              type="text"
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-lg text-slate-800 dark:text-white shadow-sm"
                              value={editLessonData?.title || ''}
                              onChange={(e) => setEditLessonData({ ...editLessonData, title: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Specializare (programe liceale)</label>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              Primul program din selecția ta devine programul lecției curente; pentru fiecare program suplimentar se creează o copie cu aceleași părți, quiz și fișiere.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {PROFILES.map((p) => {
                                const active = normalizeProfilesList(editLessonData?.profiles || []).includes(p.key)
                                return (
                                  <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => toggleEditLessonProfile(p.key)}
                                    className={`relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${active ? 'border-primary bg-primary/10 shadow-md shadow-primary/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'}`}
                                  >
                                    {active && (
                                      <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-white shadow">
                                        <Check className="size-3.5" strokeWidth={3} />
                                      </span>
                                    )}
                                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                                      <BarChart3 className="size-4" />
                                    </div>
                                    <div className="min-w-0 pr-7">
                                      <p className={`text-xs font-black ${active ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>{p.label}</p>
                                      <p className="text-[10px] font-bold uppercase text-muted-foreground opacity-70">Programă {p.shortLabel}</p>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subiect BAC</label>
                            <select
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold appearance-none cursor-pointer text-slate-800 dark:text-white shadow-sm"
                              value={editLessonData?.subject_part || 1}
                              onChange={(e) => setEditLessonData({ ...editLessonData, subject_part: parseInt(e.target.value) })}
                            >
                              {SUBJECT_PARTS.map(s => <option key={s.value} value={s.value} className="bg-white dark:bg-[#020617]">{s.label}</option>)}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dificultate</label>
                            <div className="flex gap-2 p-1 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                              {['usor', 'mediu', 'greu'].map(lvl => (
                                <button
                                  key={lvl}
                                  onClick={() => setEditLessonData({...editLessonData, difficulty: lvl})}
                                  className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${editLessonData?.difficulty === lvl ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                  {lvl}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Index Ordine</label>
                            <input
                              type="number"
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
                              value={editLessonData?.order_index || 0}
                              onChange={(e) => setEditLessonData({ ...editLessonData, order_index: parseInt(e.target.value) })}
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-white/5">
                              <input
                                type="checkbox"
                                checked={Boolean(editLessonData?.is_premium)}
                                onChange={(e) => setEditLessonData({ ...editLessonData, is_premium: e.target.checked })}
                              />
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Lecție Premium</span>
                            </label>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Părți preview (gratuit)</label>
                            <input
                              type="number"
                              min={1}
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
                              value={editLessonData?.preview_part_count ?? 1}
                              onChange={(e) => setEditLessonData({ ...editLessonData, preview_part_count: parseInt(e.target.value, 10) || 1 })}
                            />
                          </div>
                        </div>
                        <Button onClick={handleUpdateMetadata} className="w-full rounded-2xl h-14 bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20 mt-4">
                          Salvează Toate Modificările
                        </Button>
                      </motion.div>
                    ) : (
                      <div className="relative z-10">
                        {activeTab === 'content' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Introducere Lecție (Legacy/Single-Part)</label>
                                <span className="text-[10px] font-bold text-primary italic">Se va afișa înaintea tuturor părților</span>
                              </div>
                              <textarea
                                className="w-full min-h-[350px] bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-3xl p-6 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-slate-700 dark:text-slate-200 leading-relaxed custom-scrollbar shadow-inner"
                                value={lessonContent}
                                onChange={(e) => setLessonContent(e.target.value)}
                                placeholder="Scrie textul introductiv folosind Markdown..."
                              />
                            </div>
                            <div className="space-y-4">
                              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">URL Video Principal</label>
                              <div className="relative group">
                                <input
                                  type="text"
                                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-600 dark:text-slate-300 shadow-sm"
                                  value={videoUrl}
                                  onChange={(e) => setVideoUrl(e.target.value)}
                                  placeholder="https://youtube.com/watch?v=..."
                                />
                                <ExternalLink className="absolute right-5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                              </div>
                            </div>
                            <Button onClick={handleUpdateLesson} className="w-full rounded-2xl h-14 bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20 font-black uppercase tracking-widest">
                               Salvează Conținutul
                            </Button>
                          </motion.div>
                        )}

                        {activeTab === 'parts' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                              {parts.length > 0 && parts.length < 3 ? (
                                <AlertMessage
                                  message={`Lecția are doar ${parts.length} secțiuni. Adaugă cel puțin 3 secțiuni pentru o experiență completă.`}
                                />
                              ) : null}
                            {/* Add Part Card */}
                            <div className="bg-primary/5 border border-primary/10 dark:border-primary/20 rounded-3xl p-8 space-y-6 shadow-sm">
                              <div className="flex items-center gap-3">
                                 <PlusCircle className="size-5 text-primary" />
                                 <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">Adaugă Secțiune Nouă</h3>
                              </div>
                              <div className="grid grid-cols-1 gap-5">
                                <input
                                  type="text"
                                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
                                  placeholder="Titlul secțiunii (ex: Definiția funcției)..."
                                  value={newPart.title}
                                  onChange={(e) => setNewPart({ ...newPart, title: e.target.value })}
                                />
                                <textarea
                                  className="w-full min-h-[150px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm leading-relaxed text-slate-700 dark:text-slate-300 shadow-sm"
                                  placeholder="Conținutul secțiunii în format Markdown..."
                                  value={newPart.content}
                                  onChange={(e) => setNewPart({ ...newPart, content: e.target.value })}
                                />
                                <input
                                  type="text"
                                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium text-slate-600 dark:text-slate-400 shadow-sm"
                                  placeholder="Link Video specific (opțional)..."
                                  value={newPart.video_url}
                                  onChange={(e) => setNewPart({ ...newPart, video_url: e.target.value })}
                                />
                                <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Imagine secțiune (opțional)</p>
                                  {newPart.image_url ? (
                                    <img src={newPart.image_url} alt="Previzualizare secțiune" className="max-h-48 w-full rounded-2xl object-cover" />
                                  ) : null}
                                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:border-white/10 dark:text-slate-300">
                                    <UploadCloud className="size-4" />
                                    Încarcă imagine
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePartImageUpload(e, 'new')} disabled={uploading} />
                                  </label>
                                </div>
                              </div>
                              <Button onClick={handleAddPart} className="w-full rounded-2xl h-12 bg-primary text-white hover:bg-primary/90 transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                                Adaugă Această Parte
                              </Button>
                            </div>

                            {/* Parts List */}
                            <div className="space-y-6">
                              <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Secțiuni Existente ({parts.length})</h3>
                                <Layers className="size-4 text-slate-300 dark:text-slate-700" />
                              </div>
                              
                              {parts.length === 0 ? (
                                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl bg-slate-50 dark:bg-white/2">
                                  <p className="text-sm text-slate-500 font-medium italic">Această lecție nu are părți secvențiale.</p>
                                </div>
                              ) : (
                                <ul className="space-y-4">
                                  {parts.map((part, idx) => (
                                    <li key={part.id} className="relative group/part">
                                      <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 transition-all group-hover/part:border-primary/30 group-hover/part:bg-white dark:group-hover/part:bg-white/[0.07] overflow-hidden shadow-sm hover:shadow-md">
                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                          <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs border border-primary/10">
                                              {idx + 1}
                                            </div>
                                            <h4 className="font-black text-slate-800 dark:text-slate-100">{part.title}</h4>
                                          </div>
                                          <div className="flex gap-2">
                                            {editingPartId === part.id ? (
                                              <button onClick={() => handleUpdatePart(part.id)} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30 transition-all">
                                                <Save className="size-3.5" />
                                              </button>
                                            ) : (
                                              <button onClick={() => setEditingPartId(part.id)} className="p-2 rounded-lg bg-white/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 hover:text-primary dark:hover:text-white transition-all shadow-sm">
                                                <Edit3 className="size-3.5" />
                                              </button>
                                            )}
                                            <button onClick={() => handleDeletePart(part.id)} className="p-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all">
                                              <Trash2 className="size-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                        
                                        {editingPartId === part.id ? (
                                          <div className="space-y-4 relative z-10">
                                            <input
                                              type="text"
                                              className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/50 shadow-sm"
                                              value={part.title}
                                              onChange={(e) => updatePartField(part.id, 'title', e.target.value)}
                                            />
                                            <textarea
                                              className="w-full min-h-[120px] bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 custom-scrollbar text-slate-700 dark:text-slate-300 shadow-sm"
                                              value={part.content}
                                              onChange={(e) => updatePartField(part.id, 'content', e.target.value)}
                                            />
                                            <input
                                              type="text"
                                              className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-xs text-slate-500"
                                              value={part.video_url || ''}
                                              onChange={(e) => updatePartField(part.id, 'video_url', e.target.value)}
                                              placeholder="URL Video"
                                            />
                                            <div className="space-y-3 rounded-xl border border-dashed border-slate-200 p-4 dark:border-white/10">
                                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Imagine secțiune</p>
                                              {part.image_url ? (
                                                <img src={part.image_url} alt={part.title} className="max-h-40 w-full rounded-xl object-cover" />
                                              ) : null}
                                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:border-white/10 dark:text-slate-300">
                                                <UploadCloud className="size-3.5" />
                                                Încarcă imagine
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePartImageUpload(e, part.id)} disabled={uploading} />
                                              </label>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="relative z-10">
                                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 font-medium">{part.content}</p>
                                            {part.video_url && (
                                              <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/10 w-fit">
                                                <PlayCircle className="size-2.5" />
                                                Video atașat
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {activeTab === 'quiz' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                            {/* Add Question Form */}
                            <div className="bg-indigo-600/5 border border-indigo-600/10 dark:border-indigo-600/20 rounded-3xl p-8 space-y-6 shadow-sm">
                              <div className="flex items-center gap-3">
                                 <HelpCircle className="size-5 text-indigo-500 dark:text-indigo-400" />
                                 <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">Creează Întrebare</h3>
                              </div>
                              
                              <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Textul Întrebării</label>
                                <input
                                  type="text"
                                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
                                  placeholder="Ex: Care este derivata funcției f(x)=x^2?..."
                                  value={newQuestion.text}
                                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                />
                              </div>

                              <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Unde apare chestionarul?</label>
                                <select
                                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
                                  value={newQuestion.placement.type === 'after_part' ? newQuestion.placement.partId : 'end'}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setNewQuestion({
                                      ...newQuestion,
                                      placement: value === 'end'
                                        ? { type: 'end', partId: '' }
                                        : { type: 'after_part', partId: value },
                                    })
                                  }}
                                >
                                  <option value="end" className="bg-white dark:bg-[#020617]">La finalul lecției</option>
                                  {parts.map((part, idx) => (
                                    <option key={part.id} value={part.id} className="bg-white dark:bg-[#020617]">
                                      După secțiunea {idx + 1}: {part.title}
                                    </option>
                                  ))}
                                </select>
                                {parts.length === 0 && (
                                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    Adaugă părți lecției ca să poți pune întrebări între secțiuni.
                                  </p>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {newQuestion.options.map((opt, idx) => (
                                  <div key={idx} className={`relative flex items-center gap-3 p-3 rounded-2xl border transition-all ${newQuestion.correct === idx ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-sm'}`}>
                                    <div className="flex items-center justify-center size-6 rounded-lg bg-slate-100 dark:bg-black/20">
                                      <input 
                                        type="radio" 
                                        name="correct" 
                                        className="accent-emerald-500"
                                        checked={newQuestion.correct === idx}
                                        onChange={() => setNewQuestion({ ...newQuestion, correct: idx })}
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      className="flex-1 bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder:text-slate-400 text-slate-700 dark:text-white"
                                      placeholder={`Opțiunea ${idx + 1}`}
                                      value={opt}
                                      onChange={(e) => {
                                        const next = [...newQuestion.options]
                                        next[idx] = e.target.value
                                        setNewQuestion({ ...newQuestion, options: next })
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                              <Button onClick={handleAddQuestion} className="w-full rounded-2xl h-12 bg-indigo-600 text-white hover:bg-indigo-700 transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20">
                                Adaugă în Chestionar
                              </Button>
                            </div>

                            {/* Questions List */}
                            <div className="space-y-6">
                              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2">Întrebări înregistrate ({questions.length})</h3>
                              {questions.length === 0 ? (
                                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl bg-slate-50 dark:bg-transparent">
                                  <p className="text-sm text-slate-500 font-medium italic">Nu ai adăugat încă nicio întrebare.</p>
                                </div>
                              ) : (
                                <ul className="space-y-4">
                                  {questions.map((q, idx) => (
                                    <li key={q.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex justify-between items-start gap-4 shadow-sm">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-3">
                                           <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Întrebarea {idx + 1}</span>
                                        </div>
                                        <p className="font-bold text-slate-800 dark:text-slate-100 text-base mb-4 leading-snug">{q.question_text}</p>
                                        <p className="mb-4 w-fit rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-500 border border-indigo-500/10">
                                          {getQuestionPlacementLabel(q)}
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                                          {getQuestionOptions(q).map((opt, oIdx) => (
                                            <div key={oIdx} className={`flex items-center gap-2 text-xs font-bold ${oIdx === q.correct_option_index ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                                              <div className={`size-1.5 rounded-full ${oIdx === q.correct_option_index ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                              {opt}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <button onClick={() => handleDeleteQuestion(q.id)} className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/10 hover:bg-destructive/20 transition-all mt-1 shadow-sm">
                                        <Trash2 className="size-4" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {activeTab === 'files' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                            <div className="relative group">
                              <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-indigo-600/10 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition-opacity" />
                              <div className="relative p-10 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] bg-slate-50/50 dark:bg-white/2 text-center group-hover:bg-white dark:group-hover:bg-white/5 transition-all shadow-inner">
                                <input 
                                  type="file" 
                                  id="file-upload" 
                                  className="hidden" 
                                  onChange={handleFileUpload} 
                                  disabled={uploading}
                                />
                                <label 
                                  htmlFor="file-upload" 
                                  className="cursor-pointer flex flex-col items-center gap-6"
                                >
                                  <div className="size-20 rounded-[2rem] bg-gradient-to-br from-primary/10 to-indigo-600/10 flex items-center justify-center text-primary border border-white/20 shadow-lg">
                                    {uploading ? (
                                      <div className="size-8 border-4 border-primary/30 border-t-primary animate-spin rounded-full" />
                                    ) : (
                                      <UploadCloud className="size-10" />
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                                      {uploading ? 'Se încarcă fișierul...' : 'Încarcă materiale suport'}
                                    </h4>
                                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                                      PDF, Documente sau Imagini pe care elevii le pot descărca direct din pagină.
                                    </p>
                                  </div>
                                  {!uploading && (
                                    <div className="px-6 py-2.5 bg-white dark:bg-white/5 rounded-full text-xs font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-white/5 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                      Selectează Fișier
                                    </div>
                                  )}
                                </label>
                              </div>
                            </div>

                            {/* Files Table */}
                            <div className="space-y-6">
                              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2">Materiale suport ({regularFiles.length})</h3>
                              {regularFiles.length === 0 ? (
                                <div className="p-12 text-center border border-slate-200 dark:border-white/5 rounded-3xl bg-slate-50 dark:bg-white/2 shadow-sm">
                                  <p className="text-sm text-slate-500 font-medium italic">Nu există fișiere pentru această lecție.</p>
                                </div>
                              ) : (
                                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">
                                  <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                      <tr>
                                        <th className="px-6 py-4">Nume Fișier</th>
                                        <th className="px-6 py-4">Tip</th>
                                        <th className="px-6 py-4 text-right">Acțiuni</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                      {regularFiles.map(file => (
                                        <tr key={file.id} className="group/row hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                                          <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                               <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 shadow-sm">
                                                  <FileText className="size-4" />
                                               </div>
                                               <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{file.file_name}</span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-5">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10 shadow-sm">
                                              {file.file_type?.split('/')[1] || 'DOC'}
                                            </span>
                                          </td>
                                          <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                              <a href={file.file_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white dark:bg-white/5 text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-primary dark:hover:text-white transition-all shadow-sm">
                                                <ExternalLink className="size-4" />
                                              </a>
                                              <button onClick={() => handleDeleteFile(file.id)} className="p-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all shadow-sm">
                                                <Trash2 className="size-4" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}

                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        )}
      </main>

      <footer className="container py-20 mt-10 border-t border-slate-200/50 dark:border-white/5 opacity-30 text-center">
         <div className="flex items-center justify-center gap-3 grayscale group hover:grayscale-0 transition-all">
            <GraduationCap className="size-6 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 dark:text-slate-400">ScholarBAC Engineering</span>
         </div>
      </footer>

      {/* Global CSS for scrollbars */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100,100,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100,100,255,0.2); }
      `}} />
    </div>
  )
}
