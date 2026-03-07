/**
 * features/settings/index.jsx
 * Settings screen — account, sync, language, stats, export, reminders, about.
 *
 * Exports: SettingsScreen
 *
 * Bolt 1.6: extracted from mindflow.jsx lines 704–898.
 * Bolt 2.6: Reminders card replaced with inline NotifInline component.
 *           Accepts notifSettings, notifPermission, onUpdateNotifSettings,
 *           onRequestNotifPermission props from useNotifications hook.
 */

import { useState } from "react";
import { C }             from "../../skeleton/design-system/tokens.js";
import { T, LANGS }      from "../../shared/i18n/translations.js";
import { Icon }          from "../../shared/ui/icons.jsx";
import { Card, Toggle }  from "../../shared/ui/primitives.jsx";
import { FREE_LIMITS, getDumpCount } from "../../shared/lib/freemium.js";
import { getStreakData } from "../../shared/lib/streak.js";
import { isToday }       from "../../shared/lib/date.js";

export function SettingsScreen({ thoughts, lang, onChangeLang, onClearAll, user, syncOn, onToggleSync, onShowAuth, onSignOut, persona, onExport, onNotion, isPro, onShowPricing, notifSettings, notifPermission, onUpdateNotifSettings, onRequestNotifPermission }) {
  const tx = T[lang] || T.en;
  const total       = thoughts.length;
  const archived    = thoughts.filter(t => t.archived).length;
  const todayActive = thoughts.filter(t => t.isToday && !t.archived).length;
  const todayDone   = thoughts.filter(t => t.archived && isToday(t.archivedAt || t.updatedAt)).length;
  const streak      = getStreakData(thoughts);
  const p           = persona?.patterns;
  const dumpCount   = getDumpCount();

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "18px 16px 80px" }}>
      <div style={{ fontFamily: "Syne, sans-serif", color: C.text, fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 16 }}>{tx.settings}</div>

      {/* Pro status banner */}
      {!isPro ? (
        <div onClick={() => onShowPricing?.("dumps")} style={{ marginBottom: 16, borderRadius: 16, padding: "14px 16px", background: `linear-gradient(135deg, ${C.accent}18, ${C.accentLit}10)`, border: `1.5px solid ${C.accent}33`, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 26 }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 700, fontFamily: "Syne, sans-serif" }}>
              {lang === "ru" ? "Перейти на Pro" : lang === "az" ? "Pro-ya keç" : "Upgrade to Pro"}
            </div>
            <div style={{ color: C.textSub, fontSize: 12, marginTop: 2 }}>
              {lang === "ru" ? `${dumpCount}/${FREE_LIMITS.dumpsPerMonth} AI-дампов этого месяца` :
               lang === "az" ? `Bu ay ${dumpCount}/${FREE_LIMITS.dumpsPerMonth} demp` :
               `${dumpCount}/${FREE_LIMITS.dumpsPerMonth} dumps this month`}
            </div>
          </div>
          {/* mini progress bar */}
          <div style={{ width: 40, height: 40, position: "relative", flexShrink: 0 }}>
            <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="18" cy="18" r="15" fill="none" stroke={`${C.accent}20`} strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke={C.accentLit} strokeWidth="3"
                strokeDasharray={`${Math.min(dumpCount / FREE_LIMITS.dumpsPerMonth * 94, 94)} 94`}
                strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: C.accentLit, fontWeight: 700 }}>
              {Math.round(dumpCount / FREE_LIMITS.dumpsPerMonth * 100)}%
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16, borderRadius: 16, padding: "10px 16px", background: `${C.done}10`, border: `1px solid ${C.done}25`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <span style={{ color: C.done, fontSize: 13, fontWeight: 700 }}>
            {lang === "ru" ? "Pro план активен" : lang === "az" ? "Pro plan aktivdir" : "Pro plan active"}
          </span>
        </div>
      )}

      <Card title={tx.account} icon={Icon.user(C.textSub, 14)}>
        {user ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: C.text, fontSize: 14 }}>{user.email}</div>
              <div style={{ color: C.done, fontSize: 12, marginTop: 2 }}>● {tx.signedIn}</div>
            </div>
            <button onClick={onSignOut} style={{ background: `${C.high}18`, color: C.high, border: `1px solid ${C.high}33`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {tx.signOut}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: C.textSub, fontSize: 14 }}>{tx.notSignedIn}</div>
            <button onClick={onShowAuth} style={{ background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {tx.signIn}
            </button>
          </div>
        )}
      </Card>

      {user ? (
        <Card title={tx.cloudSync} icon={Icon.cloud(C.textSub, 14)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: C.text, fontSize: 14 }}>{tx.syncThoughts}</div>
              <div style={{ color: C.textSub, fontSize: 12, marginTop: 2 }}>{user.email} · Supabase</div>
            </div>
            <Toggle on={syncOn} onChange={onToggleSync} />
          </div>
        </Card>
      ) : (
        <Card title={tx.cloudSync} icon={Icon.cloud(C.textSub, 14)}>
          <div style={{ color: C.textSub, fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
            {lang === "ru" ? "Войди чтобы синхронизировать мысли между устройствами и Telegram-ботом." : lang === "az" ? "Fikirlərini cihazlar arasında sinxronlaşdırmaq üçün daxil ol." : "Sign in to sync thoughts across devices and Telegram."}
          </div>
          <button onClick={onShowAuth} style={{ width: "100%", height: 44, background: `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`, color: "white", border: "none", borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {Icon.user("white", 15)}
            {lang === "ru" ? "Войти через email" : lang === "az" ? "Email ilə daxil ol" : "Sign in with email"}
          </button>
        </Card>
      )}

      {p?.topTags?.length > 0 && (
        <Card title={tx.patterns} icon={Icon.sparkle(C.textSub, 14)}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {p.topTags.map(tag => (
              <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.accentDim, color: C.accentLit, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 7, border: `1px solid ${C.accent}22` }}>
                {Icon.tag(C.accent, 9)}{tag}
              </span>
            ))}
          </div>
          {p.completionRate !== undefined && (
            <div style={{ color: C.textSub, fontSize: 13 }}>
              {lang === "ru" ? "Выполнение:" : "Completion:"} <strong style={{ color: C.done }}>{Math.round(p.completionRate * 100)}%</strong>
            </div>
          )}
        </Card>
      )}

      <Card title={tx.langLabel}>
        <div style={{ display: "flex", gap: 8 }}>
          {LANGS.map(l => (
            <button key={l.id} onClick={() => onChangeLang(l.id)} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: `1.5px solid ${lang === l.id ? C.accent : C.border}`, background: lang === l.id ? C.accentDim : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all .2s", boxShadow: lang === l.id ? `0 0 16px ${C.accentGlow}` : "none" }}>
              <span style={{ fontSize: 22 }}>{l.flag}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: lang === l.id ? C.accentLit : C.textSub, fontFamily: "Syne, sans-serif" }}>{l.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Streak Card — Duolingo-style loss aversion */}
      {streak.current > 0 && (
        <div style={{ background: streak.doneToday ? `${C.done}12` : `${C.high}12`, border: `1px solid ${streak.doneToday ? C.done : C.high}33`, borderRadius: 16, padding: "16px 18px", marginBottom: 4, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>🔥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: streak.doneToday ? C.done : C.high, lineHeight: 1 }}>
              {streak.current} <span style={{ fontSize: 14, fontWeight: 600, color: C.textSub }}>{lang === "ru" ? "дней" : lang === "az" ? "gün" : "days"}</span>
            </div>
            <div style={{ color: streak.doneToday ? C.done : C.high, fontSize: 12, fontWeight: 600, marginTop: 3 }}>
              {streak.doneToday
                ? (lang === "ru" ? "Серия жива — отличная работа" : lang === "az" ? "Seriya davam edir — əla iş" : "Streak alive — great work")
                : (lang === "ru" ? "⚠️ Сделай дамп сегодня — не теряй серию!" : lang === "az" ? "⚠️ Bu gün dump et — seriyani itirmə!" : "⚠️ Dump today — don't break the streak!")}
            </div>
            {streak.longest > streak.current && (
              <div style={{ color: C.textSub, fontSize: 11, marginTop: 2 }}>
                {lang === "ru" ? `Рекорд: ${streak.longest} дней` : lang === "az" ? `Rekord: ${streak.longest} gün` : `Best: ${streak.longest} days`}
              </div>
            )}
          </div>
        </div>
      )}

      <Card title={tx.stats} icon={Icon.focus(C.textSub, 14)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[{ l: tx.total, v: total }, { l: tx.totalDone, v: archived }, { l: tx.todayActive, v: todayActive, c: C.accentLit }, { l: tx.todayDone, v: todayDone, c: C.done }].map(s => (
            <div key={s.l} style={{ background: C.surfaceHi, borderRadius: 12, padding: "12px", textAlign: "center", border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 24, fontWeight: 800, color: s.c || C.text }}>{s.v}</div>
              <div style={{ fontSize: 10, color: C.textSub, marginTop: 2, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title={lang === "ru" ? "Напоминания" : lang === "az" ? "Xatırlatmalar" : "Reminders"} icon={Icon.bell(C.textSub, 14)}>
        <NotifInline
          settings={notifSettings}
          permission={notifPermission}
          onUpdate={onUpdateNotifSettings}
          onRequest={onRequestNotifPermission}
          lang={lang}
        />
      </Card>

      <Card title={tx.exportData} icon={Icon.export(C.textSub, 14)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onExport} style={{ width: "100%", height: 44, background: C.accentDim, color: C.accentLit, border: `1px solid ${C.accent}33`, borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {Icon.export(C.accentLit, 15)}
            {tx.exportThoughts}
          </button>
          <button onClick={onNotion} style={{ width: "100%", height: 44, background: "transparent", color: C.text, border: `1px solid ${C.border}`, borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s, background .15s" }}>
            📝 {lang === "ru" ? "Экспорт в Notion" : lang === "az" ? "Notion-a ixrac" : "Export to Notion"}
          </button>
        </div>
      </Card>

      <Card title={tx.about}>
        <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.8, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: C.text, fontWeight: 700, fontFamily: "Syne, sans-serif" }}>MindFlow</span>
            <span style={{ background: `${C.accent}20`, color: C.accentLit, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, letterSpacing: 0.5, border: `1px solid ${C.accent}30` }}>BETA · v0.7</span>
          </div>
          <span style={{ color: C.textDim, fontSize: 11 }}>React + AI + Supabase · ADHD OS</span>
        </div>
        <button onClick={() => window.confirm(tx.clearAll + "?") && onClearAll()} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${C.high}12`, color: C.high, border: `1px solid ${C.high}22`, borderRadius: 9, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {Icon.trash(C.high, 13)}
          {tx.clearAll}
        </button>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NotifInline — Bolt 2.6
// Inline notification settings inside the Reminders Card.
// No modal, no redirect — ADHD P7 (no dark patterns).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ settings, permission, onUpdate, onRequest, lang }} props
 * settings  — from useNotifications hook (loaded from localStorage)
 * permission — "granted"|"denied"|"default"|"unsupported"
 * onUpdate  — (patch) => void  saves + re-applies schedule
 * onRequest — async () => void  requests browser permission
 */
function NotifInline({ settings, permission, onUpdate, onRequest, lang }) {
  const [draft, setDraft] = useState({
    enabled:     settings?.enabled     ?? false,
    morningOn:   settings?.morningOn   ?? true,
    morningTime: settings?.morningTime ?? "09:00",
    eveningOn:   settings?.eveningOn   ?? true,
    eveningTime: settings?.eveningTime ?? "21:00",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdate(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  if (permission === "unsupported") {
    return (
      <div style={{ color: C.textDim, fontSize: 13, lineHeight: 1.6 }}>
        {lang === "ru" ? "Уведомления не поддерживаются в этом браузере."
         : lang === "az" ? "Bu brauzer bildirişləri dəstəkləmir."
         : "Notifications aren't supported in this browser."}
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <>
        <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
          {lang === "ru" ? "Уведомления заблокированы. Разрешите их в настройках браузера."
           : lang === "az" ? "Bildirişlər bloklanıb. Brauzer parametrlərindən icazə verin."
           : "Notifications are blocked. Enable them in your browser settings."}
        </div>
        <NotifDisclosure lang={lang} />
      </>
    );
  }

  if (permission === "default") {
    return (
      <>
        <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
          {lang === "ru" ? "Разреши уведомления для утреннего и вечернего напоминания."
           : lang === "az" ? "Səhər və axşam xatırlatmaları üçün bildirişlərə icazə ver."
           : "Allow notifications to get morning and evening reminders."}
        </div>
        <button
          onClick={onRequest}
          aria-label={lang === "ru" ? "Разрешить уведомления" : lang === "az" ? "Bildirişlərə icazə ver" : "Allow notifications"}
          style={{
            width: "100%", height: 44,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`,
            color: "white", border: "none", borderRadius: 11,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", marginBottom: 10,
          }}
        >
          {lang === "ru" ? "Разрешить уведомления"
           : lang === "az" ? "Bildirişlərə icazə ver"
           : "Allow notifications"}
        </button>
        <NotifDisclosure lang={lang} />
      </>
    );
  }

  // permission === "granted" — show full settings UI
  return (
    <>
      <NotifDisclosure lang={lang} />

      {/* Master enable/disable toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ color: C.text, fontSize: 14 }}>
          {lang === "ru" ? "Включить напоминания"
           : lang === "az" ? "Xatırlatmaları aktiv et"
           : "Enable reminders"}
        </span>
        <Toggle on={draft.enabled} onChange={v => setDraft(d => ({ ...d, enabled: v }))} />
      </div>

      {draft.enabled && (
        <>
          {/* Morning reminder row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🌅</span>
              <span style={{ color: C.text, fontSize: 14 }}>
                {lang === "ru" ? "Утро" : lang === "az" ? "Səhər" : "Morning"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="time"
                value={draft.morningTime}
                onChange={e => setDraft(d => ({ ...d, morningTime: e.target.value }))}
                disabled={!draft.morningOn}
                aria-label={lang === "ru" ? "Время утреннего напоминания" : lang === "az" ? "Səhər xatırlatma vaxtı" : "Morning reminder time"}
                style={{
                  background: C.surfaceHi, border: `1px solid ${C.border}`,
                  borderRadius: 8, color: C.text, fontSize: 13,
                  padding: "5px 8px", fontFamily: "inherit",
                  opacity: draft.morningOn ? 1 : 0.4,
                  minHeight: 34,
                }}
              />
              <Toggle on={draft.morningOn} onChange={v => setDraft(d => ({ ...d, morningOn: v }))} />
            </div>
          </div>

          {/* Evening reminder row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🌙</span>
              <span style={{ color: C.text, fontSize: 14 }}>
                {lang === "ru" ? "Вечер" : lang === "az" ? "Axşam" : "Evening"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="time"
                value={draft.eveningTime}
                onChange={e => setDraft(d => ({ ...d, eveningTime: e.target.value }))}
                disabled={!draft.eveningOn}
                aria-label={lang === "ru" ? "Время вечернего напоминания" : lang === "az" ? "Axşam xatırlatma vaxtı" : "Evening reminder time"}
                style={{
                  background: C.surfaceHi, border: `1px solid ${C.border}`,
                  borderRadius: 8, color: C.text, fontSize: 13,
                  padding: "5px 8px", fontFamily: "inherit",
                  opacity: draft.eveningOn ? 1 : 0.4,
                  minHeight: 34,
                }}
              />
              <Toggle on={draft.eveningOn} onChange={v => setDraft(d => ({ ...d, eveningOn: v }))} />
            </div>
          </div>

          <button
            onClick={handleSave}
            aria-label={saved
              ? (lang === "ru" ? "Сохранено" : lang === "az" ? "Saxlanıldı" : "Saved")
              : (lang === "ru" ? "Сохранить настройки" : lang === "az" ? "Parametrləri saxla" : "Save preferences")}
            style={{
              width: "100%", height: 44,
              background: saved ? `${C.done}18` : C.accentDim,
              color: saved ? C.done : C.accentLit,
              border: `1px solid ${saved ? `${C.done}44` : `${C.accent}33`}`,
              borderRadius: 11, fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", transition: "all .2s",
            }}
          >
            {saved
              ? (lang === "ru" ? "Сохранено ✓" : lang === "az" ? "Saxlanıldı ✓" : "Saved ✓")
              : (lang === "ru" ? "Сохранить настройки" : lang === "az" ? "Parametrləri saxla" : "Save preferences")}
          </button>
        </>
      )}
    </>
  );
}

/**
 * Bolt 2.6 CRITICAL: disclose that notifications are foreground-only.
 * Never promise background delivery (ADR 0010, AC user requirement).
 */
function NotifDisclosure({ lang }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 6,
      background: C.surfaceHi, borderRadius: 8,
      padding: "8px 12px", marginBottom: 12,
      border: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
      <span style={{ color: C.textDim, fontSize: 12, lineHeight: 1.5 }}>
        {lang === "ru"
          ? "Уведомления работают, пока приложение открыто в браузере."
          : lang === "az"
          ? "Bildirişlər yalnız proqram brauzerdə açıq olduğunda işləyir."
          : "Notifications only work while the app is open in your browser."}
      </span>
    </div>
  );
}
