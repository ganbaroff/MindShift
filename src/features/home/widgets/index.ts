/**
 * Widget Registry — maps WidgetType strings → React components.
 * Adding a new widget = add it here. No changes to BentoGrid needed.
 */
import React from 'react'
import type { WidgetType } from '@/types'
import { EnergyWidget }     from './EnergyWidget'
import { QuickFocusWidget } from './QuickFocusWidget'
import { NowPoolWidget }    from './NowPoolWidget'
import { ProgressWidget }   from './ProgressWidget'
import { AudioWidget }      from './AudioWidget'

export const WIDGET_REGISTRY: Record<WidgetType, React.ComponentType> = {
  energy_check: EnergyWidget,
  quick_focus:  QuickFocusWidget,
  now_pool:     NowPoolWidget,
  progress:     ProgressWidget,
  audio_quick:  AudioWidget,
}

export const WIDGET_LABELS: Record<WidgetType, string> = {
  energy_check: 'Energy',
  quick_focus:  'Quick Focus',
  now_pool:     'Now Pool',
  progress:     'Progress',
  audio_quick:  'Audio',
}

export const WIDGET_ICONS: Record<WidgetType, string> = {
  energy_check: '⚡',
  quick_focus:  '🚀',
  now_pool:     '📋',
  progress:     '🏆',
  audio_quick:  '🎧',
}
