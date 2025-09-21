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
  },
  {
    id: 'armory-curator',
    name: 'Armory Curator',
    minFloor: 3,
    lines: [
      'I catalogued relics from every fallen challenger.',
      'Take this and keep the stories alive.'
    ],
    outcome: {
      message: 'The curator quietly hands you preserved supplies.',
      grantItems: [{ id: 'iron-ration', quantity: 1 }]
    }
  },
  {
    id: 'battle-scholar',
    name: 'Battle Scholar',
    minFloor: 4,
    lines: [
      'Your stance leaks strength at the third breath.',
      'Let me show you a warding mantra.'
    ],
    outcome: {
      message: 'You internalize a steadier guard.',
      grantSkills: ['stone-ward']
    }
  },
  {
    id: 'vault-keeper',
    name: 'Vault Keeper',
    minFloor: 5,
    lines: [
      'The tower hoards more than dust.',
      'Spend these coins before the climb claims you.'
    ],
    outcome: {
      message: 'A hidden pouch of crowns bolsters your purse.',
      coinDelta: 35
    }
  }
]
