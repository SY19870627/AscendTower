import type { NpcDef } from '../core/Types'

export const npcs: NpcDef[] = [
  {
    id: 'tower-sage',
    name: 'Tower Sage',
    lines: [
      'The tower remembers every step you take.',
      'Breathe, focus, and climb with purpose.'
    ],
    postMessage: 'The sage shares a simple breathing exercise.',
    outcome: {
      message: "You feel steadier after the sage's advice.",
      hpDelta: 8
    }
  },
  {
    id: 'scout',
    name: 'Wandering Scout',
    minFloor: 2,
    lines: [
      'I mapped a few hallways ahead.',
      'Merchants gather toward the eastern halls on this floor.'
    ],
    postMessage: 'Knowledge is the best gear I can offer.'
  }
]
