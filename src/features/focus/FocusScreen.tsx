// Phase 6 — Focus Session (coming in next phase)
// This screen will include: ArcTimer SVG, phase detection, interrupt protection

export default function FocusScreen() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ background: '#0F1117' }}
    >
      <div className="text-5xl mb-4">⏱️</div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#E8E8F0' }}>
        Focus Session
      </h1>
      <p className="text-sm leading-relaxed" style={{ color: '#8B8BA7' }}>
        Deep focus with arc timer, phase detection, and audio engine — coming next.
      </p>
      <div
        className="mt-8 px-6 py-4 rounded-2xl text-sm"
        style={{ background: '#1A1D2E', border: '1.5px solid #2D3150', color: '#8B8BA7' }}
      >
        5 · 25 · 52 min presets · Struggle → Flow phases
      </div>
    </div>
  )
}
