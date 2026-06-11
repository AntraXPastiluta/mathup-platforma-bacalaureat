import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Navbar } from '../../../shared/ui/Navbar'
import { Button } from '../../../shared/ui/Button'
import { getProfilesFromMetadata } from '../../../services/profileService'
import { getRoadmapsWithGraphForProfile } from '../../../services/roadmapService'
import { getUserProgress } from '../../../services/progressService'
import { getProfileMeta } from '../../lessons/profiles'
import { RoadmapShell } from '../components/RoadmapShell'
import { RoadmapFlowCanvas } from '../components/RoadmapFlowCanvas'
import { ViewerLegend } from '../components/viewer/ViewerLegend'
import { toFlowGraph } from '../utils/graphMapping'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'

const EMPTY_LESSONS = new Map()

/**
 * Vizualizarea elevului de la /roadmap: graful roadmap-ului programului său, doar citire,
 * cu progresul suprapus (lecțiile finalizate primesc sigiliu verde) și navigare către
 * lecții printr-un click pe nod. Conținut Premium — fără abonament, pagina afișează doar
 * cardul de deblocare și nu interoghează deloc baza de date.
 */
export function RoadmapViewerPage() {
  const navigate = useNavigate()
  const { user, isPremium, openPremiumModal } = useAuth()
  const [roadmaps, setRoadmaps] = useState([])
  const [progressRows, setProgressRows] = useState([])
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
        // Nu interogăm deloc baza de date dacă utilizatorul nu e Premium; conținutul este
        // oricum blocat în UI, iar așa evităm cereri inutile.
        const primaryProfile = activeProfiles[0]
        // Progresul colorează nodurile cu lecții finalizate; dacă cererea eșuează, harta
        // se afișează în continuare, doar fără bife.
        const [data, progress] = isPremium
          ? await Promise.all([
            getRoadmapsWithGraphForProfile(primaryProfile),
            getUserProgress(user.id).catch(() => []),
          ])
          : [[], []]
        if (!mounted) return
        setRoadmaps(data)
        setProgressRows(progress)
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

  const graph = useMemo(() => toFlowGraph(selectedRoadmap), [selectedRoadmap])

  const completedLessonIds = useMemo(
    () => new Set(progressRows.filter((row) => row.completed).map((row) => row.lesson_id)),
    [progressRows],
  )

  const canvasMeta = useMemo(
    () => ({ lessonsById: EMPTY_LESSONS, completedLessonIds, readOnly: true }),
    [completedLessonIds],
  )

  // „X/Y lecții” pentru roadmap-ul curent; lecțiile legate de mai multe noduri se numără o
  // singură dată. Fără noduri cu lecții → fără indicator.
  const progressSummary = useMemo(() => {
    const lessonIds = new Set(
      graph.nodes.filter((node) => node.data.lessonId).map((node) => node.data.lessonId),
    )
    if (lessonIds.size === 0) return null
    let completed = 0
    for (const lessonId of lessonIds) {
      if (completedLessonIds.has(lessonId)) completed += 1
    }
    return { completed, total: lessonIds.size }
  }, [graph, completedLessonIds])

  const handleNodeClick = (event, node) => {
    if (node?.data?.lessonId) {
      navigate(`/lessons/${node.data.lessonId}`)
    }
  }

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

  const profileLabel = activeProfiles.map((p) => getProfileMeta(p).shortLabel).join(' · ')

  return (
    <RoadmapShell
      variant="student"
      title={selectedRoadmap?.title || 'Cartografiere Academică'}
      subtitle={profileLabel ? `Programă ${profileLabel}` : null}
      onBack={() => navigate('/dashboard')}
      roadmaps={roadmaps}
      selectedRoadmapId={selectedRoadmapId}
      onSelectRoadmap={setSelectedRoadmapId}
      description={selectedRoadmap?.description || ''}
      loading={loading}
      error={error || null}
      progressSummary={progressSummary}
      emptyMessage={
        !loading && roadmaps.length === 0
          ? {
            title: 'Arhivă în curs de publicare',
            subtitle: 'Revino după ce consultantul academic finalizează schema de studiu.',
          }
          : null
      }
    >
      {selectedRoadmap ? (
        <RoadmapFlowCanvas
          flowKey={selectedRoadmap.id}
          nodes={graph.nodes}
          edges={graph.edges}
          meta={canvasMeta}
          readOnly
          onNodeClick={handleNodeClick}
        >
          <ViewerLegend />
        </RoadmapFlowCanvas>
      ) : null}
    </RoadmapShell>
  )
}
