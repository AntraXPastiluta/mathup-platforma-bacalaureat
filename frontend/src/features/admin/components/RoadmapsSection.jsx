import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Map, PanelLeft, PanelRight, PlusCircle, Trash2 } from 'lucide-react'
import {
  addRoadmap,
  addRoadmapStep,
  deleteRoadmap,
  deleteRoadmapStep,
  getAllRoadmapsAdmin,
  updateRoadmap,
} from '../../../services/roadmapService'
import { getAllLessonsAdmin } from '../../../services/adminService'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'
import { PROFILES, getProfileMeta } from '../../lessons/profiles'
import { RoadmapCanvas } from '../../roadmap/components/RoadmapCanvas'
import { createEmptyLayout, normalizeLayout } from '../../roadmap/utils/canvasLayout'

export function RoadmapsSection() {
  const [lessons, setLessons] = useState([])
  const [roadmaps, setRoadmaps] = useState([])
  const [selectedRoadmapId, setSelectedRoadmapId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [stepsOpen, setStepsOpen] = useState(false)
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

  const selectedRoadmap = useMemo(
    () => roadmaps.find((roadmap) => roadmap.id === selectedRoadmapId) || null,
    [roadmaps, selectedRoadmapId],
  )

  async function loadRoadmapsAdmin() {
    setLoading(true)
    try {
      const data = await getAllRoadmapsAdmin()
      setRoadmaps(data)
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      await loadRoadmapsAdmin()
    })()

    getAllLessonsAdmin()
      .then((data) => {
        if (!cancelled) setLessons(data)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

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
      profile: 'mate_info',
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
      setError(toUserFacingError(err, USER_MESSAGES.save))
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
      setError(toUserFacingError(err, USER_MESSAGES.save))
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
      setError(toUserFacingError(err, USER_MESSAGES.save))
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
      setError(toUserFacingError(err, USER_MESSAGES.save))
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[560px] overflow-hidden rounded-3xl border border-slate-300 bg-slate-100 dark:border-white/10 dark:bg-slate-950">
      {sidebarOpen ? (
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-300 bg-white dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Map className="size-5 text-primary" />
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">Roadmaps</h2>
            </div>
            <button
              type="button"
              onClick={startNewRoadmap}
              className="rounded-xl border border-primary/30 bg-primary/10 p-2 text-primary"
              aria-label="Roadmap nou"
            >
              <PlusCircle className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {roadmaps.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">Nu există roadmaps configurate.</p>
            ) : (
              roadmaps.map((roadmap) => (
                <button
                  key={roadmap.id}
                  type="button"
                  onClick={() => selectRoadmap(roadmap)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    selectedRoadmapId === roadmap.id
                      ? 'border-primary bg-primary/15 shadow-md ring-1 ring-primary/20'
                      : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                    {getProfileMeta(roadmap.profile).shortLabel}
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{roadmap.title}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {(roadmap.study_roadmap_steps ?? []).length} pași
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="space-y-3 border-t border-slate-200 p-4 dark:border-white/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {selectedRoadmapId ? 'Editează metadata' : 'Roadmap nou'}
            </p>
            <input
              type="text"
              value={roadmapForm.title}
              onChange={(e) => setRoadmapForm({ ...roadmapForm, title: e.target.value })}
              placeholder="Titlu"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/5"
            />
            <textarea
              rows={2}
              value={roadmapForm.description}
              onChange={(e) => setRoadmapForm({ ...roadmapForm, description: e.target.value })}
              placeholder="Descriere"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
            />
            <select
              value={roadmapForm.profile}
              onChange={(e) => setRoadmapForm({ ...roadmapForm, profile: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/5"
            >
              {PROFILES.map((profile) => (
                <option key={profile.key} value={profile.key}>
                  {profile.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={roadmapForm.order_index}
              onChange={(e) =>
                setRoadmapForm({ ...roadmapForm, order_index: parseInt(e.target.value, 10) || 0 })
              }
              placeholder="Ordine"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/5"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveRoadmap} size="sm" className="rounded-xl" disabled={loading}>
                Salvează
              </Button>
              {selectedRoadmapId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteRoadmap(selectedRoadmapId)}
                  className="rounded-xl border-destructive/20 text-destructive"
                >
                  Șterge
                </Button>
              ) : null}
            </div>
          </div>
        </aside>
      ) : null}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-300 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setSidebarOpen((current) => !current)}
            className="rounded-xl"
          >
            <PanelLeft className="size-4" />
            {sidebarOpen ? <ChevronLeft className="size-3" /> : null}
          </Button>
          <p className="min-w-0 flex-1 truncate text-xs font-black uppercase tracking-widest text-slate-500">
            {roadmapForm.title || 'Canvas roadmap'}
          </p>
          {selectedRoadmapId ? (
            <Button
              type="button"
              size="sm"
              variant={stepsOpen ? 'default' : 'outline'}
              onClick={() => setStepsOpen((current) => !current)}
              className="rounded-xl"
            >
              <PanelRight className="size-4" />
              Pași
            </Button>
          ) : null}
        </div>

        {(error || success) ? (
          <div className="absolute inset-x-3 top-14 z-30 space-y-2">
            {error ? <AlertMessage message={error} variant="error" onClose={() => setError('')} /> : null}
            {success ? <AlertMessage message={success} variant="success" onClose={() => setSuccess('')} /> : null}
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          <RoadmapCanvas
            layout={roadmapCanvas}
            onLayoutChange={setRoadmapCanvas}
            fillHeight
            fitOnLoad={Boolean(selectedRoadmapId)}
            persistKey={selectedRoadmapId ? `admin-${selectedRoadmapId}` : null}
          />
        </div>
      </div>

      {stepsOpen && selectedRoadmapId ? (
        <aside className="flex w-80 shrink-0 flex-col border-l border-slate-300 bg-white dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">Pași recomandați</h3>
            <button
              type="button"
              onClick={() => setStepsOpen(false)}
              className="text-slate-400 hover:text-primary"
              aria-label="Închide panel pași"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {(selectedRoadmap?.study_roadmap_steps ?? []).map((step, index) => (
              <div
                key={step.id}
                className="flex items-center justify-between rounded-2xl border border-slate-300 px-4 py-3 dark:border-white/10"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Pasul {index + 1}
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{step.title}</p>
                  {step.requires_premium ? (
                    <p className="text-[10px] font-black uppercase text-primary">Premium</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteRoadmapStep(step.id)}
                  className="rounded-xl bg-destructive/10 p-2 text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-slate-200 p-4 dark:border-white/10">
            <input
              type="text"
              value={roadmapStepForm.title}
              onChange={(e) => setRoadmapStepForm({ ...roadmapStepForm, title: e.target.value })}
              placeholder="Titlu pas"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/5"
            />
            <input
              type="text"
              value={roadmapStepForm.description}
              onChange={(e) => setRoadmapStepForm({ ...roadmapStepForm, description: e.target.value })}
              placeholder="Descriere pas"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
            />
            <select
              value={roadmapStepForm.lesson_id}
              onChange={(e) => setRoadmapStepForm({ ...roadmapStepForm, lesson_id: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/5"
            >
              <option value="">Fără lecție</option>
              {lessons
                .filter((lesson) => lesson.profile === roadmapForm.profile)
                .map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
            </select>
            <input
              type="number"
              value={roadmapStepForm.order_index}
              onChange={(e) =>
                setRoadmapStepForm({
                  ...roadmapStepForm,
                  order_index: parseInt(e.target.value, 10) || 1,
                })
              }
              placeholder="Ordine pas"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/5"
            />
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={roadmapStepForm.requires_premium}
                onChange={(e) =>
                  setRoadmapStepForm({ ...roadmapStepForm, requires_premium: e.target.checked })
                }
              />
              Doar Premium
            </label>
            <Button onClick={handleAddRoadmapStep} size="sm" className="w-full rounded-xl" disabled={loading}>
              Adaugă pas
            </Button>
          </div>
        </aside>
      ) : null}
    </div>
  )
}
