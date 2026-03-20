import { memo } from 'react'

interface BurnoutGaugeProps {
  score: number
}

export const BurnoutGauge = memo(function BurnoutGauge({ score }: BurnoutGaugeProps) {
  const angle = (score / 100) * 180;
  const r = 28;
  const cx = 36;
  const cy = 36;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const endX = cx + r * Math.cos(toRad(180 - angle));
  const endY = cy - r * Math.sin(toRad(180 - angle));
  const largeArc = angle > 180 ? 1 : 0;
  return (
    <div className="relative">
      <svg width="72" height="44" viewBox="0 0 72 44">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`} fill="none" stroke="#4ECDC4" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[15px] font-bold" style={{ color: '#4ECDC4' }}>{score}</span>
    </div>
  );
})
