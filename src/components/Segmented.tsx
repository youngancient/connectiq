import { useId } from 'react'

interface Props<T extends string | number> {
  legend: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** A row of pill-shaped radio buttons. Native radios, so arrow keys work. */
export function Segmented<T extends string | number>({ legend, options, value, onChange }: Props<T>) {
  const name = useId()
  return (
    <fieldset className="segmented">
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={String(o.value)}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
