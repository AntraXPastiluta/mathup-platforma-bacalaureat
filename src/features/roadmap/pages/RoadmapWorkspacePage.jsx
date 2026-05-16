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
      <div className="min-h-screen text-slate-900 dark:text-slate-50">
        <Navbar />
        <main className="container py-10">
          <div className="mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center">
            <Crown className="mx-auto mb-4 size-10 text-primary" />
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">Roadmap-urile sunt disponibile pentru Premium</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Administratorul publică roadmap-urile de studiu, iar elevii Premium le pot vizualiza aici.
            </p>
            <Button onClick={openPremiumModal} className="mt-6 rounded-2xl">
              Activează Premium
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 transition-colors duration-500">
      <Navbar />

      <main className="container py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-3.5" />
              Înapoi la dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Map className="size-5" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">Roadmap de studiu</h1>
                <p className="text-sm text-muted-foreground">
                  Vizualizează roadmap-ul publicat de administrator pentru programul tău.
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? <AlertMessage message={error} className="mb-6" /> : null}

        {loading ? (
          <div className="flex h-80 items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
            <div className="size-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : roadmaps.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-lg font-black text-slate-800 dark:text-white">Nu există roadmap publicat încă</p>
            <p className="mt-2 text-sm text-muted-foreground">Revino după ce administratorul configurează roadmap-ul pentru programul tău.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {roadmaps.map((roadmap) => (
                <button
                  key={roadmap.id}
                  type="button"
                  onClick={() => setSelectedRoadmapId(roadmap.id)}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${selectedRoadmapId === roadmap.id ? 'bg-primary text-white' : 'border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900/50'}`}
                >
                  {roadmap.title}
                </button>
              ))}
            </div>

            {selectedRoadmap?.description ? (
              <p className="text-sm text-muted-foreground">{selectedRoadmap.description}</p>
            ) : null}

            <RoadmapCanvas
              layout={canvasLayout}
              onLayoutChange={() => {}}
              readOnly
            />
          </div>
        )}
      </main>
    </div>
  )
}
