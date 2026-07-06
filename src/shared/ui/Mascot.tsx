/**
 * Mochi — MindShift's mascot. Now the REAL capybara: this delegates to the ported
 * `Capy` rig (from the approved `Capy v5` design-system character). The legacy
 * purple-blob SVG is retired. API unchanged — every existing call-site keeps working.
 */
import { Capy } from './Capy'
import type { MascotState } from './Capy'

export type { MascotState } from './Capy'

interface MascotProps {
  state?: MascotState
  size?: number
  label?: string
  className?: string
}

export function Mascot({ state = 'idle', size = 80, label, className }: MascotProps) {
  return <Capy state={state} size={size} label={label ?? `Mochi is ${state}`} className={className} />
}
