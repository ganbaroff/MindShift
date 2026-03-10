// Type stubs for optional analytics packages.
// These are declared here so tsc passes before `npm install` is run.
// Real types are provided by @vercel/analytics and web-vitals once installed.

declare module '@vercel/analytics' {
  export function inject(options?: { mode?: 'production' | 'development' }): void
  export function track(name: string, properties?: Record<string, string | number | boolean>): void
}

declare module 'web-vitals' {
  export type Metric = { name: string; value: number; id: string; delta: number }
  export type ReportCallback = (metric: Metric) => void
  export function onCLS(callback: ReportCallback, options?: { reportAllChanges?: boolean }): void
  export function onFCP(callback: ReportCallback): void
  export function onINP(callback: ReportCallback, options?: { reportAllChanges?: boolean }): void
  export function onLCP(callback: ReportCallback, options?: { reportAllChanges?: boolean }): void
  export function onTTFB(callback: ReportCallback): void
}
