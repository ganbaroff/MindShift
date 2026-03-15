import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CheckSquare, Timer, BarChart3, Settings } from 'lucide-react';
const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/focus', icon: Timer, label: 'Focus' },
  { path: '/progress', icon: BarChart3, label: 'Progress' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];
export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-ms-primary/15 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(tab => {
          const active = location.pathname === tab.path;
          return (
            <motion.button
              key={tab.path}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-1 relative px-3 py-1"
            >
              {active && (
                <motion.div
                  layoutId="navPill"
                  className="absolute inset-0 rounded-xl bg-ms-primary/12"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon size={20} className={active ? 'text-ms-primary' : 'text-ms-muted'} />
              <span className={`text-caption ${active ? 'text-ms-primary' : 'text-ms-muted'}`}>{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
