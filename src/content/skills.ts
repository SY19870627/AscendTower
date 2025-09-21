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
  },
  {
    id: 'phoenix-flare',
    name: '鳳炎迸發',
    description: '引燃殘火，形成保護的熾羽並灼傷敵心。',
    cooldown: 5,
    minFloor: 3,
    effect: {
      message: '鳳羽環繞，灼熱護盾在你周身展開。',
      grantStatuses: [{ id: 'ember-ward', duration: 3 }]
    }
  },
  {
    id: 'tempest-footwork',
    name: '疾風步勢',
    description: '以連環步伐穿梭空檔，減少來自正面的衝擊。',
    cooldown: 4,
    minFloor: 2,
    effect: {
      message: '疾風纏身，身形穿梭於風縫之間。',
      grantStatuses: [{ id: 'wind-steps', duration: 3 }]
    }
  },
  {
    id: 'moonlit-reprise',
    name: '月光重奏',
    description: '以月光節奏調息，恢復傷勢並築起靈霧。',
    cooldown: 6,
    minFloor: 4,
    effect: {
      message: '月霧在你掌間流轉，身心逐漸安定。',
      hpDelta: 10,
      grantStatuses: [{ id: 'moon-ward', duration: 4 }]
    }
  },
  {
    id: 'thunder-echo',
    name: '雷鳴回響',
    description: '以鼓震之勢召喚雷音，提振攻勢。',
    cooldown: 4,
    minFloor: 3,
    effect: {
      message: '雷鳴在胸腔內激盪，你的戰意高漲。',
      grantStatuses: [{ id: 'storm-heart', duration: 2 }]
    }
  }
]

export function getSkillDef(id: string): SkillDef | undefined {
  return skills.find(skill => skill.id === id)
}
