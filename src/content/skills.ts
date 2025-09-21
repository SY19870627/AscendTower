import type { SkillDef } from '../core/Types'

export const skills: SkillDef[] = [
  {
    id: 'battle-shout',
    name: '戰鬥吼聲',
    description: '放聲怒吼，提振攻勢並震懾敵人。',
    cooldown: 3,
    effect: {
      message: '你怒吼不止，出手變得更為凌厲。',
      grantStatuses: [{ id: 'battle-focus' }]
    }
  },
  {
    id: 'stone-ward',
    name: '石壁護咒',
    description: '防禦真言，讓肌膚在數回合內堅若磐石。',
    cooldown: 4,
    effect: {
      message: '大地之力在你身周築起護罩。',
      grantStatuses: [{ id: 'stone-skin' }]
    }
  },
  {
    id: 'renewing-wave',
    name: '回春靈波',
    description: '導引療癒靈力，隨時間慢慢撫平傷勢。',
    cooldown: 5,
    effect: {
      message: '柔和的波流洗過全身。',
      grantStatuses: [{ id: 'regeneration' }]
    }
  }
]

export function getSkillDef(id: string): SkillDef | undefined {
  return skills.find(skill => skill.id === id)
}
