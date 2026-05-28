import { useEffect, useMemo, useState } from 'react'
import { Map, PlusCircle, Trash2 } from 'lucide-react'
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
    loadRoadmapsAdmin()
    getAllLessonsAdmin()
      .then(setLessons)
      .catch(() => {})
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
            className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/20 hover:shadow-lg hover:shadow-primary/10 active:scale-95"
          >
            <PlusCircle className="size-4" />
            Nou Roadmap
          </button>
        </div>
        {error ? <AlertMessage message={error} variant="error" onClose={() => setError('')} /> : null}
        {success ? <AlertMessage message={success} variant="success" onClose={() => setSuccess('')} /> : null}
        <div className="space-y-2 rounded-3xl border border-slate-300 bg-white p-3 dark:border-white/10 dark:bg-white/5">
          {roadmaps.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">Nu există roadmaps configurate.</p>
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
      </div>

      <div className="lg:col-span-8 space-y-6">
        <div className="rounded-3xl border border-slate-300 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/5">
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
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descriere</label>
              <textarea
                rows={3}
                value={roadmapForm.description}
                onChange={(e) => setRoadmapForm({ ...roadmapForm, description: e.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Program</label>
              <select
                value={roadmapForm.profile}
                onChange={(e) => setRoadmapForm({ ...roadmapForm, profile: e.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
              >
                {PROFILES.map((profile) => (
                  <option key={profile.key} value={profile.key}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ordine</label>
              <input
                type="number"
                value={roadmapForm.order_index}
                onChange={(e) =>
                  setRoadmapForm({ ...roadmapForm, order_index: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={handleSaveRoadmap} className="rounded-2xl" disabled={loading}>
              Salvează roadmap
            </Button>
            {selectedRoadmapId ? (
              <Button
                variant="outline"
                onClick={() => handleDeleteRoadmap(selectedRoadmapId)}
                className="rounded-2xl border-destructive/20 text-destructive"
              >
                Șterge roadmap
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-300 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/5 space-y-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Canvas roadmap</h3>
            <p className="text-sm text-muted-foreground">
              Adaugă subiecte, note, culori și săgeți. Salvează roadmap-ul ca să publice layout-ul pentru elevii Premium.
            </p>
          </div>
          <RoadmapCanvas layout={roadmapCanvas} onLayoutChange={setRoadmapCanvas} />
        </div>

        {selectedRoadmapId ? (
          <div className="rounded-3xl border border-slate-300 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/5 space-y-6">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Pași recomandați</h3>
            <div className="space-y-2">
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 border-t border-slate-300 pt-6 dark:border-white/10">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Titlu pas</label>
                <input
                  type="text"
                  value={roadmapStepForm.title}
                  onChange={(e) => setRoadmapStepForm({ ...roadmapStepForm, title: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descriere pas</label>
                <input
                  type="text"
                  value={roadmapStepForm.description}
                  onChange={(e) => setRoadmapStepForm({ ...roadmapStepForm, description: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lecție asociată</label>
                <select
                  value={roadmapStepForm.lesson_id}
                  onChange={(e) => setRoadmapStepForm({ ...roadmapStepForm, lesson_id: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
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
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ordine pas</label>
                <input
                  type="number"
                  value={roadmapStepForm.order_index}
                  onChange={(e) =>
                    setRoadmapStepForm({
                      ...roadmapStepForm,
                      order_index: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
                />
              </div>
              <label className="flex items-center gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  checked={roadmapStepForm.requires_premium}
                  onChange={(e) =>
                    setRoadmapStepForm({ ...roadmapStepForm, requires_premium: e.target.checked })
                  }
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Pas disponibil doar pentru Premium
                </span>
              </label>
              <Button onClick={handleAddRoadmapStep} className="rounded-2xl md:col-span-2" disabled={loading}>
                Adaugă pas
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
