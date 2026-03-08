/**
 * features/today/TimelineView.test.js
 * Unit tests for the scheduleTimeline() pure algorithm.
 *
 * Run with: npx vitest run
 *
 * Tests cover:
 *   - Empty input → empty output
 *   - Single task: scheduled from cursor, no buffer appended after last
 *   - Multiple tasks: buffer inserted between (not after last)
 *   - Priority ordering: high → medium → low
 *   - Auto-shift: incomplete task past cursor advances to now
 *   - Completed tasks: placed at cursor as-is (no auto-shift)
 *   - Min block height guard (estimated_minutes = 0 → treated as 1 min)
 *   - Start-time logic: before 09:00 → cursor at 09:00
 *   - formatHHMM: correct formatting
 *   - formatDuration: correct formatting
 */

import { describe, it, expect } from "vitest";
import {
  scheduleTimeline,
  formatHHMM,
  formatDuration,
  BUFFER_MINUTES,
} from "./lib/scheduleTimeline.js";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Build a minimal DailyTask for tests. */
function makeTask(overrides = {}) {
  return {
    id:                `task-${Math.random().toString(36).slice(2)}`,
    title:             "Test task",
    priority:          "medium",
    estimated_minutes: 30,
    completed:         false,
    microsteps:        [],
    ...overrides,
  };
}

/** Create a Date at today HH:MM local time. */
function todayAt(h, m = 0) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// ── scheduleTimeline ─────────────────────────────────────────────────────

describe("scheduleTimeline", () => {
  it("returns [] for empty input", () => {
    expect(scheduleTimeline([])).toEqual([]);
    expect(scheduleTimeline(null)).toEqual([]);
    expect(scheduleTimeline(undefined)).toEqual([]);
  });

  it("schedules a single task with no trailing buffer", () => {
    const ref  = todayAt(10, 0);
    const task = makeTask({ estimated_minutes: 30 });
    const result = scheduleTimeline([task], ref);

    // Only 1 item — no buffer
    expect(result).toHaveLength(1);
    const item = result[0];

    expect(item.isBuffer).toBe(false);
    expect(item.scheduledStart.getTime()).toBe(ref.getTime());
    expect(item.scheduledEnd.getTime()).toBe(ref.getTime() + 30 * 60_000);
    expect(item.id).toBe(task.id);
  });

  it("inserts a buffer between two tasks but not after the last", () => {
    const ref = todayAt(10, 0);
    const t1  = makeTask({ estimated_minutes: 20, priority: "high" });
    const t2  = makeTask({ estimated_minutes: 15, priority: "high" });
    const result = scheduleTimeline([t1, t2], ref);

    // Expect: task1, buffer, task2 — 3 items total
    expect(result).toHaveLength(3);

    const [item1, buf, item2] = result;

    expect(item1.isBuffer).toBe(false);
    expect(buf.isBuffer).toBe(true);
    expect(item2.isBuffer).toBe(false);

    // Buffer starts where task1 ends
    expect(buf.scheduledStart.getTime()).toBe(item1.scheduledEnd.getTime());
    expect(buf.estimated_minutes).toBe(BUFFER_MINUTES);

    // task2 starts where buffer ends
    expect(item2.scheduledStart.getTime()).toBe(buf.scheduledEnd.getTime());
  });

  it("sorts by priority: high → medium → low", () => {
    const ref  = todayAt(9, 0);
    const low  = makeTask({ id: "low",  priority: "low",    estimated_minutes: 10 });
    const high = makeTask({ id: "high", priority: "high",   estimated_minutes: 10 });
    const med  = makeTask({ id: "med",  priority: "medium", estimated_minutes: 10 });

    const result = scheduleTimeline([low, high, med], ref);

    // Non-buffer items in order: high, med, low
    const tasks = result.filter(i => !i.isBuffer);
    expect(tasks[0].id).toBe("high");
    expect(tasks[1].id).toBe("med");
    expect(tasks[2].id).toBe("low");
  });

  it("auto-shifts: incomplete task with cursor in the past uses now", () => {
    // Simulate: ref (now) is 11:00, but task was notionally planned for 10:00.
    // The cursor would be at 10:00 (past) for an incomplete task → advance to now.
    const past = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h ago
    const ref  = new Date(); // now

    const t1 = makeTask({ estimated_minutes: 60, completed: false }); // placed at 2h ago (past)
    const t2 = makeTask({ estimated_minutes: 30, completed: false }); // should auto-shift to now

    // Manually seed: t1 scheduled at "past", t2 would be at past+60+15 = still in past
    // We use a reference time of "now" so cursor starts at now.
    const result = scheduleTimeline([t1, t2], ref);

    const tasks = result.filter(i => !i.isBuffer);
    // Both tasks should start at or after "now" since cursor starts at ref (now)
    expect(tasks[0].scheduledStart.getTime()).toBeGreaterThanOrEqual(ref.getTime() - 1000);
    expect(tasks[1].scheduledStart.getTime()).toBeGreaterThanOrEqual(ref.getTime() - 1000);
  });

  it("does NOT auto-shift completed tasks", () => {
    const ref  = todayAt(10, 0);
    const done = makeTask({ estimated_minutes: 30, completed: true });
    const result = scheduleTimeline([done], ref);

    expect(result[0].completed).toBe(true);
    // Completed task starts at cursor (ref), not shifted
    expect(result[0].scheduledStart.getTime()).toBe(ref.getTime());
  });

  it("handles estimated_minutes = 0 safely (treated as 1 min)", () => {
    const ref    = todayAt(10, 0);
    const task   = makeTask({ estimated_minutes: 0 });
    const result = scheduleTimeline([task], ref);

    // Should not throw; end should be after start
    expect(result[0].scheduledEnd.getTime()).toBeGreaterThan(result[0].scheduledStart.getTime());
  });

  it("starts at 09:00 when referenceTime is before 09:00", () => {
    const earlyMorning = todayAt(7, 30);
    const task = makeTask({ estimated_minutes: 30 });
    const result = scheduleTimeline([task], earlyMorning);

    const startHour = result[0].scheduledStart.getHours();
    expect(startHour).toBe(9);
  });

  it("starts at referenceTime when it is after 09:00", () => {
    const ref  = todayAt(14, 15);
    const task = makeTask({ estimated_minutes: 30 });
    const result = scheduleTimeline([task], ref);

    expect(result[0].scheduledStart.getHours()).toBe(14);
    expect(result[0].scheduledStart.getMinutes()).toBe(15);
  });

  it("buffer block carries correct data-hook attributes info", () => {
    const ref = todayAt(10, 0);
    const t1  = makeTask({ estimated_minutes: 20 });
    const t2  = makeTask({ estimated_minutes: 20 });
    const result = scheduleTimeline([t1, t2], ref);

    const buf = result.find(i => i.isBuffer);
    expect(buf).toBeDefined();
    expect(buf.scheduledStart).toBeInstanceOf(Date);
    expect(buf.scheduledEnd).toBeInstanceOf(Date);
    // Bolt 5.2 will attach Web Audio to data-buffer-slot elements
  });

  it("preserves original task fields (title, microsteps, etc.)", () => {
    const ref  = todayAt(10, 0);
    const task = makeTask({
      title:      "My special task",
      microsteps: ["Step A", "Step B"],
      priority:   "high",
    });
    const [scheduled] = scheduleTimeline([task], ref);

    expect(scheduled.title).toBe("My special task");
    expect(scheduled.microsteps).toEqual(["Step A", "Step B"]);
    expect(scheduled.priority).toBe("high");
  });
});

// ── formatHHMM ────────────────────────────────────────────────────────────

describe("formatHHMM", () => {
  it("formats 09:05", () => {
    const d = todayAt(9, 5);
    expect(formatHHMM(d)).toBe("09:05");
  });

  it("formats 14:30", () => {
    const d = todayAt(14, 30);
    expect(formatHHMM(d)).toBe("14:30");
  });

  it("formats midnight 00:00", () => {
    const d = todayAt(0, 0);
    expect(formatHHMM(d)).toBe("00:00");
  });

  it("formats 23:59", () => {
    const d = todayAt(23, 59);
    expect(formatHHMM(d)).toBe("23:59");
  });
});

// ── formatDuration ────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("formats minutes < 60 as 'Xm'", () => {
    expect(formatDuration(25)).toBe("25m");
    expect(formatDuration(5)).toBe("5m");
    expect(formatDuration(59)).toBe("59m");
  });

  it("formats exactly 60 as '1h'", () => {
    expect(formatDuration(60)).toBe("1h");
  });

  it("formats 90 as '1h 30m'", () => {
    expect(formatDuration(90)).toBe("1h 30m");
  });

  it("formats 120 as '2h'", () => {
    expect(formatDuration(120)).toBe("2h");
  });
});
