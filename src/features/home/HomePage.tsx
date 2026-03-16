import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import TaskCard from '@/components/TaskCard';
import MochiAvatar from '@/components/MochiAvatar';
import EnergyPicker from '@/components/EnergyPicker';
import Fab from '@/components/Fab';
import AddTaskModal from '@/components/AddTaskModal';
import { useStore } from '@/store';
import type { EnergyLevel } from '@/types';
import { getNowPoolMax, APP_MODE_CONFIG, ENERGY_EMOJI } from '@/shared/lib/constants';

export default function HomePage() {
  const {
    nowPool, nextPool,
    energyLevel, setEnergyLevel,
    appMode,
    seasonalMode,
    completedTotal, xpTotal,
    burnoutScore,
    weeklyStats,
  } = useStore();

  const [showAddTask, setShowAddTask] = useState(false);

  const nowTasks = useMemo(() => nowPool.filter(t => t.status === 'active'), [nowPool]);
  const nextTasks = useMemo(() => nextPool.filter(t => t.status === 'active'), [nextPool]);
  const nowMax = getNowPoolMax(appMode, seasonalMode);
  const { showNextOnHome, homeSubtitle } = APP_MODE_CONFIG[appMode];

  const { completeTask, snoozeTask } = useStore();

  const focusMinutes = weeklyStats?.totalFocusMinutes ?? null;

  return (
    <div className="min-h-screen px-5 pb-36 pt-10" style={{ backgroundColor: '#0F1120' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: '#E8E8F0' }}>Good evening 🌙</h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#8B8BA7' }}>{homeSubtitle}</p>
        </div>
        <MochiAvatar size={44} />
      </motion.div>

      <div className="space-y-5">
        {/* Empty State — prompt to add first task */}
        {nowTasks.length === 0 && nextTasks.length === 0 && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddTask(true)}
            className="w-full rounded-2xl p-5 border text-left"
            style={{ backgroundColor: '#1E2136', borderColor: 'rgba(123,114,255,0.25)', boxShadow: '0 0 20px rgba(123,114,255,0.08)' }}
          >
            <div className="flex items-center gap-3">
              <MochiAvatar size={36} />
              <div>
                <p className="text-[15px] font-semibold" style={{ color: '#E8E8F0' }}>What's on your mind?</p>
                <p className="text-[12px]" style={{ color: '#8B8BA7' }}>Tap to add your first task — just one is enough</p>
              </div>
            </div>
          </motion.button>
        )}

        {/* Energy Check-in */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-[15px] font-semibold mb-2" style={{ color: '#E8E8F0' }}>How's your energy right now?</p>
          <EnergyPicker
            selected={energyLevel - 1}
            onSelect={(i) => setEnergyLevel((i + 1) as EnergyLevel)}
          />
        </motion.div>

        {/* NOW Pool */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: '#7B72FF' }}>NOW</span>
            <span className="text-[11px]" style={{ color: '#8B8BA7' }}>{nowTasks.length}/{nowMax}</span>
          </div>
          <div className="space-y-2">
            {nowTasks.slice(0, 2).map((t, i) => (
              <TaskCard
                key={t.id}
                task={t}
                index={i}
                onDone={(id) => completeTask(id)}
                onPark={(id) => snoozeTask(id)}
              />
            ))}
          </div>
        </div>

        {/* Up Next Preview */}
        {showNextOnHome && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-3"
            style={{ backgroundColor: '#1E2136' }}
          >
            <p className="text-[15px] font-semibold mb-1" style={{ color: '#E8E8F0' }}>📋 Up next · {nextTasks.length} tasks queued</p>
            {nextTasks.slice(0, 2).map(t => (
              <p key={t.id} className="text-[13px] truncate" style={{ color: '#8B8BA7' }}>{t.title}</p>
            ))}
            <button className="text-[13px] font-medium mt-1" style={{ color: '#7B72FF' }}>See all →</button>
          </motion.div>
        )}

        {/* Bento Grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              content: (
                <>
                  <span className="text-[20px] font-bold" style={{ color: '#E8E8F0' }}>{completedTotal ?? 0}</span>
                  <span className="text-[11px] ml-1" style={{ color: '#8B8BA7' }}>done</span>
                  {focusMinutes !== null && (
                    <>
                      <span className="text-[11px] mx-1" style={{ color: '#8B8BA7' }}>·</span>
                      <span className="text-[20px] font-bold" style={{ color: '#E8E8F0' }}>{(focusMinutes / 60).toFixed(1)}h</span>
                    </>
                  )}
                </>
              ),
              sub: `⚡ ${(xpTotal ?? 0).toLocaleString()} XP`,
            },
            {
              content: <span className="text-[28px]">{ENERGY_EMOJI[energyLevel - 1]}</span>,
              sub: 'Tap to update',
            },
            {
              content: <span className="text-[20px] font-bold" style={{ color: '#E8E8F0' }}>✅ {completedTotal}</span>,
              sub: 'tasks completed',
            },
            {
              content: <BurnoutGauge score={isNaN(burnoutScore) ? 0 : (burnoutScore ?? 0)} />,
              sub: 'Burnout gauge',
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="rounded-2xl p-3 flex flex-col items-center justify-center min-h-[80px]"
              style={{ backgroundColor: '#1E2136' }}
            >
              <div className="flex items-baseline">{card.content}</div>
              <p className="text-[11px] mt-0.5" style={{ color: '#8B8BA7' }}>{card.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <Fab onClick={() => setShowAddTask(true)} />
      <AddTaskModal open={showAddTask} onClose={() => setShowAddTask(false)} />
    </div>
  );
}

function BurnoutGauge({ score }: { score: number }) {
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
}
