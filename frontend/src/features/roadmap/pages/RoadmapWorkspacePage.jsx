import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Navbar } from '../../../shared/ui/Navbar'
import { Button } from '../../../shared/ui/Button'
import { getProfilesFromMetadata } from '../../../services/profileService'
import { getRoadmapsForProfile } from '../../../services/roadmapService'
import { getProfileMeta } from '../../lessons/profiles'
import { RoadmapCanvas } from '../components/RoadmapCanvas'
import { RoadmapWorkspaceShell } from '../components/RoadmapWorkspaceShell'
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
        // Nu mai interogăm deloc baza de date dacă utilizatorul nu e Premium; conținutul
        // este oricum blocat în UI, iar așa evităm cereri inutile (și un eventual 403).
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

  const profileLabel = activeProfiles.map((p) => getProfileMeta(p).shortLabel).join(' · ')

  return (
    <RoadmapWorkspaceShell
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
        <RoadmapCanvas
          key={selectedRoadmap.id}
          layout={canvasLayout}
          onLayoutChange={() => {}}
          readOnly
          fillHeight
          persistKey={selectedRoadmap.id}
          fitOnLoad
        />
      ) : null}
    </RoadmapWorkspaceShell>
  )
}
