/**
 * Z-index reference constants for MindShift layering.
 *
 * Not yet imported across all files — serves as a single source of truth
 * for future refactors and new components.
 */
export const Z = {
  bottomNav: 30,
  fab: 30,
  mochiFab: 30,
  nudge: 40,
  cookieBanner: 50,
  modalBackdrop: 50,
  modalContent: 55,
  overlay: 60, // Recovery, Shutdown, Weekly, Monthly, Breathwork
} as const
