import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Crown, Map } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Navbar } from '../../../shared/ui/Navbar'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { getProfilesFromMetadata } from '../../../services/profileService'
import { getRoadmapsForProfile } from '../../../services/roadmapService'
import { RoadmapCanvas } from '../components/RoadmapCanvas'
import { normalizeLayout } from '../utils/canvasLayout'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'

export function RoadmapWorkspacePage() {
  const navigate = useNavigate()
  const { user, isPremium, openPremiumModal } = useAuth()
  const [roadmaps, setRoadmaps] = useState([])
  const [selectedRoadmapId, setSelectedRoadmapId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const activeProfiles = useMemo(
    () => getProfilesFromMetadata(user?.user_metadata),
    [user?.user_metadata],
  )

  useEffect(() => {
    let mounted = true

    async function loadRoadmaps() {
      if (!user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      try {
        const primaryProfile = activeProfiles[0]
        const data = isPremium ? await getRoadmapsForProfile(primaryProfile) : []
        if (!mounted) return
        setRoadmaps(data)
        setSelectedRoadmapId(data[0]?.id ?? null)
      } catch (loadError) {
        if (!mounted) return
        setError(toUserFacingError(loadError, USER_MESSAGES.load))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadRoadmaps()
    return () => {
      mounted = false
    }
  }, [user?.id, activeProfiles, isPremium])

  const selectedRoadmap = useMemo(
    () => roadmaps.find((roadmap) => roadmap.id === selectedRoadmapId) || null,
    [roadmaps, selectedRoadmapId],
  )

  const canvasLayout = useMemo(
    () => normalizeLayout(selectedRoadmap?.canvas_layout),
    [selectedRoadmap],
  )

  if (!isPremium) {
    return (
      <div className="min-h-screen text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <main className="container py-20 relative">
          <div className="absolute inset-0 scholar-grid opacity-[0.02] dark:opacity-[0.04] pointer-events-none" />
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-2xl rounded-[2.5rem] border-2 border-border bg-white p-12 text-center shadow-2xl relative z-10 dark:bg-slate-900"
          >
            <div className="size-20 rounded-2xl bg-primary/5 text-primary flex items-center justify-center mx-auto mb-8 border-2 border-primary/10">
               <Crown className="size-10" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Arhivă Restricționată</h1>
            <p className="text-sm font-medium text-slate-500 leading-relaxed uppercase tracking-widest opacity-80 mb-10">
              Roadmap-urile de studiu sunt resurse Platinum exclusive. Activează accesul complet pentru a vizualiza traseul academic.
            </p>
            <Button onClick={openPremiumModal} className="rounded-xl px-12 h-16 bg-primary text-white shadow-xl shadow-primary/20">
              Deblochează Platinum Access
            </Button>
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 transition-colors duration-500 bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="container py-16">
        <div className="mb-14 border-b-2 border-border pb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-4" />
              Portal Dashboard
            </button>
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
                <Map className="size-7" />
              </div>
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">Cartografiere Academică</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Visual Study Roadmap / Programă {activeProfiles.map(p => getProfileMeta(p).shortLabel).join(' · ')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? <AlertMessage message={error} className="mb-10" /> : null}

        {loading ? (
          <div className="flex h-96 items-center justify-center rounded-[2.5rem] border-2 border-border bg-white dark:bg-slate-900">
            <div className="size-16 animate-spin rounded-full border-4 border-primary/10 border-t-primary" />
          </div>
        ) : roadmaps.length === 0 ? (
          <div className="rounded-[2.5rem] border-2 border-dashed border-border bg-white p-20 text-center dark:bg-slate-900/50">
            <p className="text-2xl font-black uppercase tracking-tighter mb-2">Arhivă în curs de publicare</p>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Revino după ce consultantul academic finalizează schema de studiu.</p>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex flex-wrap gap-3">
              {roadmaps.map((roadmap) => (
                <button
                  key={roadmap.id}
                  type="button"
                  onClick={() => setSelectedRoadmapId(roadmap.id)}
                  className={`rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-2 ${selectedRoadmapId === roadmap.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-950' : 'bg-white border-border text-slate-500 hover:border-primary dark:bg-slate-900'}`}
                >
                  {roadmap.title}
                </button>
              ))}
            </div>

            {selectedRoadmap?.description ? (
              <div className="p-6 rounded-2xl border-l-4 border-primary bg-primary/5 dark:bg-primary/10">
                 <p className="text-sm font-medium leading-relaxed italic text-slate-600 dark:text-slate-300">"{selectedRoadmap.description}"</p>
              </div>
            ) : null}

            <div className="rounded-[2.5rem] border-2 border-border bg-white p-2 dark:bg-slate-900 shadow-2xl overflow-hidden">
               <RoadmapCanvas
                 layout={canvasLayout}
                 onLayoutChange={() => {}}
                 readOnly
               />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
