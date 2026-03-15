export type Difficulty = 'easy' | 'medium' | 'hard';
export type Pool = 'now' | 'next' | 'someday';

export interface MockTask {
  id: string;
  title: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  pool: Pool;
  done: boolean;
  doneAt?: string;
  createdAt: string;
  isCarryOver: boolean;
  hasReminder: boolean;
  hasIdea: boolean;
}

export const difficultyConfig: Record<Difficulty, { label: string; color: string; dots: number }> = {
  easy:   { label: 'Easy',   color: '#4ECDC4', dots: 1 },
  medium: { label: 'Medium', color: '#7B72FF', dots: 2 },
  hard:   { label: 'Hard',   color: '#F59E0B', dots: 3 },
};

export const energyOptions = [
  { emoji: '😴', label: 'Drained' },
  { emoji: '😌', label: 'Low' },
  { emoji: '🙂', label: 'OK' },
  { emoji: '😄', label: 'Good' },
  { emoji: '⚡', label: 'Peak' },
];

export const durationOptions = [5, 15, 25, 45, 60];

export const mockTasks: MockTask[] = [
  {
    id: '1',
    title: 'Write daily standup notes',
    difficulty: 'easy',
    estimatedMinutes: 5,
    pool: 'now',
    done: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isCarryOver: false,
    hasReminder: false,
    hasIdea: false,
  },
  {
    id: '2',
    title: 'Review project proposal draft',
    difficulty: 'medium',
    estimatedMinutes: 25,
    pool: 'now',
    done: false,
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    isCarryOver: true,
    hasReminder: false,
    hasIdea: false,
  },
  {
    id: '3',
    title: 'Reply to team Slack messages',
    difficulty: 'easy',
    estimatedMinutes: 15,
    pool: 'now',
    done: true,
    doneAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isCarryOver: false,
    hasReminder: false,
    hasIdea: false,
  },
  {
    id: '4',
    title: 'Prep agenda for product meeting',
    difficulty: 'medium',
    estimatedMinutes: 20,
    pool: 'now',
    done: true,
    doneAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    isCarryOver: false,
    hasReminder: true,
    hasIdea: false,
  },
  {
    id: '5',
    title: 'Update roadmap with Q2 priorities',
    difficulty: 'hard',
    estimatedMinutes: 45,
    pool: 'next',
    done: false,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    isCarryOver: false,
    hasReminder: false,
    hasIdea: false,
  },
  {
    id: '6',
    title: 'Research async communication tools',
    difficulty: 'easy',
    estimatedMinutes: 15,
    pool: 'next',
    done: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isCarryOver: false,
    hasReminder: false,
    hasIdea: true,
  },
  {
    id: '7',
    title: 'Draft user interview questions',
    difficulty: 'medium',
    estimatedMinutes: 30,
    pool: 'next',
    done: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isCarryOver: false,
    hasReminder: false,
    hasIdea: false,
  },
  {
    id: '8',
    title: 'Set up personal knowledge base',
    difficulty: 'hard',
    estimatedMinutes: 60,
    pool: 'someday',
    done: false,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isCarryOver: false,
    hasReminder: false,
    hasIdea: true,
  },
  {
    id: '9',
    title: 'Learn keyboard shortcuts for Figma',
    difficulty: 'easy',
    estimatedMinutes: 25,
    pool: 'someday',
    done: false,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    isCarryOver: false,
    hasReminder: false,
    hasIdea: false,
  },
  {
    id: '10',
    title: 'Write weekly reflection journal entry',
    difficulty: 'easy',
    estimatedMinutes: 15,
    pool: 'now',
    done: false,
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    isCarryOver: true,
    hasReminder: true,
    hasIdea: false,
  },
];
