/**
 * skeleton/BottomNav.jsx
 * Fixed bottom navigation bar — 4 tabs with active glow + badge.
 *
 * Exports: BottomNav
 *
 * Bolt 1.7: extracted from mindflow.jsx lines 449–526.
 */

import { C }    from "./design-system/tokens.js";
import { T }    from "../shared/i18n/translations.js";
import { Icon } from "../shared/ui/icons.jsx";

export function BottomNav({ active, onChange, badge, lang }) {
  const tx = T[lang] || T.en;
  const items = [
    { id: "dump",     icon: Icon.dump,     label: tx.dump },
    { id: "today",    icon: Icon.today,    label: tx.todayShort, badge },
    { id: "evening",  icon: Icon.evening,  label: tx.eveningShort },
    { id: "settings", icon: Icon.settings, label: tx.settingsShort },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: `${C.surface}F0`,
      backdropFilter: "blur(20px)",
      borderTop: `1px solid ${C.border}`,
      display: "flex", zIndex: 100,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {items.map(it => {
        const isActive = active === it.id;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} onKeyDown={e => (e.key==="Enter"||e.key===" ") && onChange(it.id)} aria-label={it.label} aria-current={isActive ? "page" : undefined} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            padding: "11px 0 13px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            position: "relative",
          }}>
            {/* Active glow pill */}
            {isActive && (
              <div style={{
                position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                width: 36, height: 36, borderRadius: 12,
                background: C.accentDim,
                animation: "navPop .2s ease",
              }} />
            )}

            <div style={{
              position: "relative", zIndex: 1,
              transform: isActive ? "translateY(-1px)" : "none",
              transition: "transform .2s",
            }}>
              {it.icon(isActive ? C.accentLit : C.textSub, 22)}
            </div>

            <span style={{
              fontSize: 10, fontWeight: isActive ? 700 : 500,
              fontFamily: "inherit",
              color: isActive ? C.accentLit : C.textSub,
              letterSpacing: 0.2,
              position: "relative", zIndex: 1,
              transition: "color .15s",
            }}>
              {it.label}
            </span>

            {it.badge > 0 && (
              <span style={{
                position: "absolute", top: 7, right: "calc(50% - 22px)",
                background: C.accent, color: "white",
                fontSize: 9, fontWeight: 800,
                minWidth: 16, height: 16, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px",
                boxShadow: `0 0 8px ${C.accentGlow}`,
                animation: "badgePop .3s cubic-bezier(.34,1.56,.64,1)",
              }}>
                {it.badge > 9 ? "9+" : it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
