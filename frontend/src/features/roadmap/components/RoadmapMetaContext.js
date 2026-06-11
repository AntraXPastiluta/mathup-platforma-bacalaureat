import { createContext, useContext } from 'react'

/**
 * Metadate partajate cu nodurile/muchiile React Flow fără prop-drilling prin bibliotecă:
 * titlurile lecțiilor (editor), lecțiile finalizate (elev) și modul read-only. Nodurile
 * stochează doar `lessonId`; titlul și starea de finalizare se rezolvă din context.
 */
export const RoadmapMetaContext = createContext({
  lessonsById: new Map(),
  completedLessonIds: new Set(),
  readOnly: false,
})

export function useRoadmapMeta() {
  return useContext(RoadmapMetaContext)
}
