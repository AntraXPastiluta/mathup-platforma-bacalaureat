import { Copy, Map, PanelLeftClose, PlusCircle, Trash2 } from 'lucide-react'
import { Button } from '../../../../shared/ui/Button'
import { Select } from '../../../../shared/ui/Select'
import { PROFILES, getProfileMeta } from '../../../lessons/profiles'

const FIELD_LABEL = 'text-[9px] font-black uppercase tracking-[0.18em] text-slate-400'
const FIELD_INPUT =
  'w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/5'

/**
 * Panoul lateral al editorului: lista roadmap-urilor, formularul de metadate pentru cel
 * selectat (sau pentru unul nou) și acțiunile Duplică / Șterge. Salvarea e o singură
 * acțiune, în antetul paginii (metadate + graf împreună, atomic).
 */
export function StudioSidebar({
  roadmaps,
  selectedRoadmapId,
  onSelectRoadmap,
  onStartNew,
  form,
  onFormChange,
  onDuplicate,
  onDelete,
  busy = false,
  onCollapse,
}) {
  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Map className="size-5 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">Roadmaps</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onStartNew}
            className="rounded-xl border border-primary/30 bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
            aria-label="Roadmap nou"
            title="Roadmap nou"
          >
            <PlusCircle className="size-4" />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:text-primary"
            aria-label="Ascunde lista"
            title="Ascunde lista"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {roadmaps.length === 0 ? (
          <p className="p-4 text-center text-sm text-slate-400">
            Niciun roadmap încă. Completează formularul de mai jos și salvează primul.
          </p>
        ) : (
          roadmaps.map((roadmap) => (
            <button
              key={roadmap.id}
              type="button"
              onClick={() => onSelectRoadmap(roadmap)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                selectedRoadmapId === roadmap.id
                  ? 'border-primary bg-primary/15 shadow-md ring-1 ring-primary/20'
                  : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                {getProfileMeta(roadmap.profile).shortLabel}
              </p>
              <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{roadmap.title}</p>
              <p className="text-[10px] font-bold text-muted-foreground">
                {(roadmap.roadmap_nodes?.length ?? 0)} noduri
              </p>
            </button>
          ))
        )}
      </div>

      <div className="space-y-3 border-t border-slate-200 p-4 dark:border-white/10">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {selectedRoadmapId ? 'Detalii roadmap' : 'Roadmap nou'}
        </p>
        <div className="space-y-1.5">
          <label className={FIELD_LABEL}>Titlu</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => onFormChange({ ...form, title: e.target.value })}
            placeholder="ex. Traseu Algebră"
            className={FIELD_INPUT}
          />
        </div>
        <div className="space-y-1.5">
          <label className={FIELD_LABEL}>Descriere</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            placeholder="Vizibilă elevilor în panoul Info"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          />
        </div>
        <div className="space-y-1.5">
          <label className={FIELD_LABEL}>Programă</label>
          <Select
            value={form.profile}
            onChange={(value) => onFormChange({ ...form, profile: value })}
            options={PROFILES.map((profile) => ({
              value: profile.key,
              label: `${profile.shortLabel} · ${profile.label}`,
            }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className={FIELD_LABEL}>Ordine afișare</label>
          <input
            type="number"
            value={form.order_index}
            onChange={(e) => onFormChange({ ...form, order_index: parseInt(e.target.value, 10) || 0 })}
            className={FIELD_INPUT}
          />
        </div>
        {selectedRoadmapId ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDuplicate}
              disabled={busy}
              className="rounded-xl"
              title="Creează o copie a versiunii salvate"
            >
              <Copy className="size-4" />
              Duplică
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={busy}
              className="rounded-xl border-destructive/20 text-destructive"
            >
              <Trash2 className="size-4" />
              Șterge
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
