/**
 * Mochi Discoveries — variable reinforcement system.
 *
 * After completing a task, Mochi "finds" a random nature item.
 * Items collect over time like a garden. Never lost, only grows.
 *
 * Rarity: common (70%), uncommon (25%), rare (5%)
 * Based on Research #5: variable ratio dopamine bridge for ADHD.
 * Inspired by Finch app's "discoveries" (2.3M downloads/90 days).
 */

export interface Discovery {
  id: string
  emoji: string
  name: string
  rarity: 'common' | 'uncommon' | 'rare'
}

export const DISCOVERIES: Discovery[] = [
  // Common (70%)
  { id: 'leaf',         emoji: '🍃', name: 'Leaf',            rarity: 'common' },
  { id: 'daisy',        emoji: '🌼', name: 'Daisy',           rarity: 'common' },
  { id: 'pebble',       emoji: '🪨', name: 'Smooth pebble',   rarity: 'common' },
  { id: 'feather',      emoji: '🪶', name: 'Feather',         rarity: 'common' },
  { id: 'acorn',        emoji: '🌰', name: 'Acorn',           rarity: 'common' },
  { id: 'clover',       emoji: '☘️', name: 'Clover',          rarity: 'common' },
  { id: 'dewdrop',      emoji: '💧', name: 'Dewdrop',         rarity: 'common' },
  { id: 'pinecone',     emoji: '🌲', name: 'Pinecone',        rarity: 'common' },
  { id: 'dandelion',    emoji: '🌾', name: 'Dandelion',       rarity: 'common' },
  { id: 'moss',         emoji: '🌿', name: 'Soft moss',       rarity: 'common' },
  { id: 'seedling',     emoji: '🌱', name: 'Seedling',        rarity: 'common' },
  { id: 'raindrop',     emoji: '🌧️', name: 'Raindrop',       rarity: 'common' },
  { id: 'sunbeam',      emoji: '☀️', name: 'Sunbeam',         rarity: 'common' },
  { id: 'breeze',       emoji: '🍃', name: 'Gentle breeze',   rarity: 'common' },

  // Uncommon (25%)
  { id: 'mushroom',     emoji: '🍄', name: 'Mushroom',        rarity: 'uncommon' },
  { id: 'cherry',       emoji: '🌸', name: 'Cherry blossom',  rarity: 'uncommon' },
  { id: 'butterfly',    emoji: '🦋', name: 'Butterfly',       rarity: 'uncommon' },
  { id: 'seashell',     emoji: '🐚', name: 'Seashell',        rarity: 'uncommon' },
  { id: 'rainbow',      emoji: '🌈', name: 'Rainbow',         rarity: 'uncommon' },
  { id: 'firefly',      emoji: '✨', name: 'Firefly',         rarity: 'uncommon' },
  { id: 'lotus',        emoji: '🪷', name: 'Lotus',           rarity: 'uncommon' },
  { id: 'starfish',     emoji: '⭐', name: 'Starfish',        rarity: 'uncommon' },
  { id: 'lavender',     emoji: '💜', name: 'Lavender',        rarity: 'uncommon' },
  { id: 'moonstone',    emoji: '🌙', name: 'Moonstone',       rarity: 'uncommon' },

  // Rare (5%)
  { id: 'crystal',      emoji: '💎', name: 'Crystal',         rarity: 'rare' },
  { id: 'aurora',       emoji: '🌌', name: 'Aurora',          rarity: 'rare' },
  { id: 'phoenix',      emoji: '🔥', name: 'Phoenix feather', rarity: 'rare' },
  { id: 'cosmic_seed',  emoji: '🌟', name: 'Cosmic seed',     rarity: 'rare' },
  { id: 'ocean_pearl',  emoji: '🫧', name: 'Ocean pearl',     rarity: 'rare' },
  { id: 'golden_leaf',  emoji: '🍂', name: 'Golden leaf',     rarity: 'rare' },
]

const COMMON    = DISCOVERIES.filter(d => d.rarity === 'common')
const UNCOMMON  = DISCOVERIES.filter(d => d.rarity === 'uncommon')
const RARE      = DISCOVERIES.filter(d => d.rarity === 'rare')

/** Weighted random selection: 70% common, 25% uncommon, 5% rare */
export function getRandomDiscovery(): Discovery {
  const roll = Math.random()
  const pool = roll < 0.05 ? RARE : roll < 0.30 ? UNCOMMON : COMMON
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Get a discovery by ID */
export function getDiscoveryById(id: string): Discovery | undefined {
  return DISCOVERIES.find(d => d.id === id)
}
