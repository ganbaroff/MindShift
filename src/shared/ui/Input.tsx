/**
 * Input — shared form field primitive
 *
 * Replaces per-screen reimplementations of the same input style in:
 *   AuthScreen, AddTaskModal, CalendarScreen, SettingsScreen.
 *
 * All colors are CSS variables — calm mode desaturation is automatic.
 * Placeholder color is handled via a global CSS rule in index.css
 * (added alongside this component).
 *
 * Props: all standard <input> props + optional label / hint / error / icon.
 *
 * Usage:
 *   <Input label="Task name" placeholder="What do you want to do?" value={v} onChange={...} />
 *   <Input icon={<Search size={16} />} placeholder="Search..." />
 */

import {
  type InputHTMLAttributes,
  type ReactNode,
  type CSSProperties,
  forwardRef,
  useId,
} from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?:  string
  error?: string
  icon?:  ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, icon, className = '', style, id: idProp, ...rest }, ref) => {
    const generatedId = useId()
    const id = idProp ?? generatedId

    const inputStyle: CSSProperties = {
      width:           '100%',
      background:      'var(--color-elevated)',
      border:          `1.5px solid ${error ? 'var(--color-gold)' : 'var(--color-border-subtle)'}`,
      borderRadius:    '0.75rem',   // rounded-xl
      color:           'var(--color-text)',
      padding:         icon ? '0.75rem 0.75rem 0.75rem 2.5rem' : '0.75rem',
      fontSize:        '1rem',
      outline:         'none',
      transition:      'border-color 150ms ease',
      ...style,
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {label && (
          <label
            htmlFor={id}
            style={{ fontSize: '0.875rem', color: 'var(--color-muted)', fontWeight: 500 }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          {icon && (
            <span
              style={{
                position: 'absolute',
                left:    '0.75rem',
                top:     '50%',
                transform: 'translateY(-50%)',
                color:   'var(--color-muted)',
                pointerEvents: 'none',
                display: 'flex',
              }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={`ms-input ${className}`}
            style={inputStyle}
            {...rest}
          />
        </div>
        {(hint || error) && (
          <span
            style={{
              fontSize: '0.75rem',
              color:    error ? 'var(--color-gold)' : 'var(--color-muted)',
            }}
          >
            {error ?? hint}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
