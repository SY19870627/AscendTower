import type { SkillDef } from '../core/Types'

export const skills: SkillDef[] = [
  {
    id: 'battle-shout',
    name: 'Battle Shout',
    description: 'Let loose a roar that bolsters your attack and rattles foes.',
    cooldown: 3,
    effect: {
      message: 'You roar with ferocity, your strikes feel lighter.',
      grantStatuses: [{ id: 'battle-focus' }]
    }
  },
  {
    id: 'stone-ward',
    name: 'Stone Ward',
    description: 'A defensive mantra that hardens your skin for a few turns.',
    cooldown: 4,
    effect: {
      message: 'Earthen energy shields you from harm.',
      grantStatuses: [{ id: 'stone-skin' }]
    }
  },
  {
    id: 'renewing-wave',
    name: 'Renewing Wave',
    description: 'Channel restorative magic to mend wounds over time.',
    cooldown: 5,
    effect: {
      message: 'A soothing current washes over you.',
      grantStatuses: [{ id: 'regeneration' }]
    }
  }
]

export function getSkillDef(id: string): SkillDef | undefined {
  return skills.find(skill => skill.id === id)
}
