import { motion } from 'framer-motion'
import {
  PlusCircle,
  Trash2,
  Edit3,
  Save,
  UploadCloud,
  PlayCircle,
  Layers,
} from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { getTrustedStorageUrl } from '../../../shared/utils/safeUrl'

export function LessonPartsTab({
  parts,
  newPart,
  setNewPart,
  newPartPreviewSrc,
  uploading,
  editingPartId,
  setEditingPartId,
  handlePartImageUpload,
  handleAddPart,
  handleUpdatePart,
  handleDeletePart,
  updatePartField,
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      {parts.length > 0 && parts.length < 3 ? (
        <AlertMessage
          message={`Lecția are doar ${parts.length} secțiuni. Adaugă cel puțin 3 secțiuni pentru o experiență completă.`}
        />
      ) : null}
      <div className="bg-primary/5 border border-primary/10 dark:border-primary/20 rounded-3xl p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <PlusCircle className="size-5 text-primary" />
          <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">Adaugă Secțiune Nouă</h3>
        </div>
        <div className="grid grid-cols-1 gap-5">
          <input
            type="text"
            className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
            placeholder="Titlul secțiunii (ex: Definiția funcției)..."
            value={newPart.title}
            onChange={(e) => setNewPart({ ...newPart, title: e.target.value })}
          />
          <textarea
            className="w-full min-h-[150px] bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm leading-relaxed text-slate-700 dark:text-slate-300 shadow-sm"
            placeholder="Conținutul secțiunii în format Markdown..."
            value={newPart.content}
            onChange={(e) => setNewPart({ ...newPart, content: e.target.value })}
          />
          <input
            type="text"
            className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium text-slate-600 dark:text-slate-400 shadow-sm"
            placeholder="Link Video specific (opțional)..."
            value={newPart.video_url}
            onChange={(e) => setNewPart({ ...newPart, video_url: e.target.value })}
          />
          <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Imagine secțiune (opțional)</p>
            {newPartPreviewSrc ? (
              <img src={newPartPreviewSrc} alt="Previzualizare secțiune" className="max-h-48 w-full rounded-2xl object-cover" />
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:border-white/10 dark:text-slate-300">
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

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Secțiuni Existente ({parts.length})</h3>
          <Layers className="size-4 text-slate-300 dark:text-slate-700" />
        </div>

        {parts.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-300 dark:border-white/5 rounded-3xl bg-slate-50 dark:bg-white/2">
            <p className="text-sm text-slate-500 font-medium italic">Această lecție nu are părți secvențiale.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {parts.map((part, idx) => {
              const partImageSrc = getTrustedStorageUrl(part.image_url)
              return (
                <li key={part.id} className="relative group/part">
                  <div className="bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl p-6 transition-all group-hover/part:border-primary/30 group-hover/part:bg-white dark:group-hover/part:bg-white/[0.07] overflow-hidden shadow-sm hover:shadow-md">
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
                          <button onClick={() => setEditingPartId(part.id)} className="p-2 rounded-lg bg-white/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 hover:text-primary dark:hover:text-white transition-all shadow-sm">
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
                          className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/50 shadow-sm"
                          value={part.title}
                          onChange={(e) => updatePartField(part.id, 'title', e.target.value)}
                        />
                        <textarea
                          className="w-full min-h-[120px] bg-white dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 custom-scrollbar text-slate-700 dark:text-slate-300 shadow-sm"
                          value={part.content}
                          onChange={(e) => updatePartField(part.id, 'content', e.target.value)}
                        />
                        <input
                          type="text"
                          className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-xs text-slate-500"
                          value={part.video_url || ''}
                          onChange={(e) => updatePartField(part.id, 'video_url', e.target.value)}
                          placeholder="URL Video"
                        />
                        <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Imagine secțiune</p>
                          {partImageSrc ? (
                            <img src={partImageSrc} alt={part.title} className="max-h-40 w-full rounded-xl object-cover" />
                          ) : null}
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:border-white/10 dark:text-slate-300">
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
              )
            })}
          </ul>
        )}
      </div>
    </motion.div>
  )
}
