import { isValidColor, NODE_COLORS } from '../../utils/graphMapping'

/** Paleta de culori a grafului + câmp hex pentru nuanțe personalizate. */
export function ColorSwatchPicker({ value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {NODE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`size-8 rounded-full border-2 transition-transform hover:scale-110 ${value === color ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
            style={{ backgroundColor: color }}
            aria-label={`Culoare ${color}`}
          />
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(event) => {
          const next = event.target.value
          if (isValidColor(next) || /^#[0-9a-fA-F]{0,6}$/.test(next)) {
            onChange(next)
          }
        }}
        onBlur={(event) => {
          if (!isValidColor(event.target.value)) {
            onChange(NODE_COLORS[0])
          }
        }}
        placeholder="#6366f1"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-white/5"
      />
    </div>
  )
}
