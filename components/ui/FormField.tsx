import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  full?: boolean
  children: ReactNode
}

export function FormField({ label, full, children }: FormFieldProps) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="font-mono text-[8.5px] tracking-[1.8px] text-white/40 uppercase block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

export function FormSection({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[8.5px] tracking-[2.5px] text-gold uppercase pt-4 pb-2 border-t border-white/7 col-span-2">
      {children}
    </div>
  )
}

export function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {children}
    </div>
  )
}

export function NormasGrid({ value, onChange }: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const normas = [
    'IEC 61000-4-2', 'IEC 61000-4-4', 'IEC 61000-4-5', 'IEC 61000-4-6',
    'IEC 61000-4-11', 'IEC 61000-4-19', 'CISPR 15', 'IEC 61000-3-2',
  ]
  return (
    <div className="col-span-2 grid grid-cols-4 gap-2">
      {normas.map(n => (
        <label key={n} className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={value.includes(n)}
            onChange={e => {
              if (e.target.checked) onChange([...value, n])
              else onChange(value.filter(x => x !== n))
            }}
            className="accent-gold"
          />
          <span className="font-mono text-[10px] text-white/60 group-hover:text-white/90 transition-colors">
            {n}
          </span>
        </label>
      ))}
    </div>
  )
}

export function FileUpload({ label, accept, onChange }: {
  label: string
  accept?: string
  onChange?: (file: File) => void
}) {
  return (
    <div
      className="col-span-2 border border-dashed border-white/15 rounded-lg p-5 text-center
                 hover:border-gold/40 hover:bg-gold/5 transition-colors cursor-pointer"
      onClick={() => document.getElementById(`fu-${label}`)?.click()}
    >
      <p className="text-2xl mb-1">📂</p>
      <p className="text-[11px] text-white/40">Clique para anexar <span className="text-white/60 font-medium">{label}</span></p>
      <input
        id={`fu-${label}`}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { if (e.target.files?.[0] && onChange) onChange(e.target.files[0]) }}
      />
    </div>
  )
}
