import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'

export function LessonContentTab({
  lessonContent,
  setLessonContent,
  videoUrl,
  setVideoUrl,
  handleUpdateLesson,
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Introducere Lecție (Legacy/Single-Part)</label>
          <span className="text-[10px] font-bold text-primary italic">Se va afișa înaintea tuturor părților</span>
        </div>
        <textarea
          className="w-full min-h-[350px] bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-3xl p-6 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-slate-700 dark:text-slate-200 leading-relaxed custom-scrollbar shadow-inner"
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
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-600 dark:text-slate-300 shadow-sm"
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
  )
}
