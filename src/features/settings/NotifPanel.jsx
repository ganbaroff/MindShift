/**
 * features/settings/NotifPanel.jsx
 * Bottom-sheet modal: morning/evening notification schedule.
 *
 * Exports: NotifPanel
 *
 * Bolt 1.6: extracted from mindflow.jsx lines 992–1128.
 */

import { useState }               from "react";
import { C }                      from "../../skeleton/design-system/tokens.js";
import { Toggle }                  from "../../shared/ui/primitives.jsx";
import {
  loadNotifPrefs, saveNotifPrefs,
  requestNotifPermission,
} from "../../shared/lib/notifications.js";
import { applyNotifSchedule }      from "../../shared/lib/notif-schedule.js";

export function NotifPanel({ lang, onClose }) {
  const [prefs, setPrefs] = useState(loadNotifPrefs);
  const [permission, setPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const [saved, setSaved] = useState(false);

  const requestPerm = async () => {
    const result = await requestNotifPermission();
    setPermission(result);
    if (result === "granted") {
      const next = { ...prefs, enabled: true };
      setPrefs(next);
    }
  };

  const save = () => {
    saveNotifPrefs(prefs);
    applyNotifSchedule(prefs, lang);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  const TL = {
    en: {
      title: "Ritual Reminders",
      permNeeded: "Allow notifications to get daily reminders.",
      allow: "Allow Notifications",
      denied: "Notifications blocked. Enable in browser settings.",
      unsupported: "Notifications not supported in this browser.",
      enableAll: "Enable daily reminders",
      morning: "Morning Ritual",
      evening: "Evening Review",
      saved: "✓ Saved!",
      save: "Save Schedule",
    },
    ru: {
      title: "Напоминания о ритуалах",
      permNeeded: "Разреши уведомления для ежедневных напоминаний.",
      allow: "Разрешить уведомления",
      denied: "Уведомления заблокированы. Включи в настройках браузера.",
      unsupported: "Уведомления не поддерживаются в этом браузере.",
      enableAll: "Включить ежедневные напоминания",
      morning: "Утренний ритуал",
      evening: "Вечерний обзор",
      saved: "✓ Сохранено!",
      save: "Сохранить расписание",
    },
    az: {
      title: "Ritual xatırlatmaları",
      permNeeded: "Gündəlik xatırlatmalar üçün bildirişlərə icazə ver.",
      allow: "Bildirişlərə icazə ver",
      denied: "Bildirişlər bloklanıb. Brauzer parametrlərindən aktiv et.",
      unsupported: "Bu brauzerdə bildirişlər dəstəklənmir.",
      enableAll: "Gündəlik xatırlatmaları aktiv et",
      morning: "Səhər ritualu",
      evening: "Axşam icmalı",
      saved: "✓ Saxlandı!",
      save: "Cədvəli saxla",
    },
  };
  const tl = TL[lang] || TL.en;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", padding: "24px 20px 44px", width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>🔔 {tl.title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSub, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {permission === "unsupported" && (
          <div style={{ background: `${C.textDim}18`, borderRadius: 12, padding: "12px 14px", color: C.textSub, fontSize: 14, marginBottom: 16 }}>{tl.unsupported}</div>
        )}

        {permission === "denied" && (
          <div style={{ background: `${C.high}15`, borderRadius: 12, padding: "12px 14px", color: C.high, fontSize: 14, marginBottom: 16 }}>{tl.denied}</div>
        )}

        {permission === "default" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.textSub, fontSize: 14, marginBottom: 12 }}>{tl.permNeeded}</div>
            <button onClick={requestPerm} style={{ width: "100%", height: 44, background: C.accent, color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {tl.allow}
            </button>
          </div>
        )}

        {(permission === "granted") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Master toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: C.surfaceHi, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{tl.enableAll}</span>
              <Toggle on={prefs.enabled} onChange={() => setPrefs(p => ({ ...p, enabled: !p.enabled }))} />
            </div>

            {prefs.enabled && (
              <>
                {/* Morning */}
                <div style={{ padding: "12px 14px", background: C.surfaceHi, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: prefs.morningOn ? 10 : 0 }}>
                    <span style={{ color: C.text, fontSize: 14 }}>☀️ {tl.morning}</span>
                    <Toggle on={prefs.morningOn} onChange={() => setPrefs(p => ({ ...p, morningOn: !p.morningOn }))} />
                  </div>
                  {prefs.morningOn && (
                    <input type="time" value={prefs.morningTime}
                      onChange={e => setPrefs(p => ({ ...p, morningTime: e.target.value }))}
                      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 22, fontWeight: 700, padding: "6px 10px", fontFamily: "inherit", outline: "none", width: "100%" }} />
                  )}
                </div>

                {/* Evening */}
                <div style={{ padding: "12px 14px", background: C.surfaceHi, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: prefs.eveningOn ? 10 : 0 }}>
                    <span style={{ color: C.text, fontSize: 14 }}>🌙 {tl.evening}</span>
                    <Toggle on={prefs.eveningOn} onChange={() => setPrefs(p => ({ ...p, eveningOn: !p.eveningOn }))} />
                  </div>
                  {prefs.eveningOn && (
                    <input type="time" value={prefs.eveningTime}
                      onChange={e => setPrefs(p => ({ ...p, eveningTime: e.target.value }))}
                      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 22, fontWeight: 700, padding: "6px 10px", fontFamily: "inherit", outline: "none", width: "100%" }} />
                  )}
                </div>
              </>
            )}

            <button onClick={save} style={{ height: 48, background: saved ? `${C.done}22` : C.accent, color: saved ? C.done : "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>
              {saved ? tl.saved : tl.save}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
