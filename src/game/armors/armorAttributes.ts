import type {
  ArmorAttributeBonuses,
  ArmorAttributeDef,
  ArmorAttributeId
} from '../../core/Types'

const definitions: ArmorAttributeDef[] = [
  {
    id: 'light-padding',
    name: '輕軟護層',
    description: '貼身的內襯吸收衝擊，額外提供 1 點防禦。',
    defBonus: 1
  },
  {
    id: 'wind-channeling',
    name: '導風紋絡',
    description: '導引來風卸力，額外提供 2 點防禦。',
    defBonus: 2
  },
  {
    id: 'gust-barrier',
    name: '風障護幕',
    description: '旋風守護身周，再獲 1 點防禦。',
    defBonus: 1
  },
  {
    id: 'scale-reinforcement',
    name: '鱗片加固',
    description: '堅實鱗片錯落堆疊，額外提供 3 點防禦。',
    defBonus: 3
  },
  {
    id: 'riverflow-weave',
    name: '川流織護',
    description: '如水勢般導流衝擊，再添 3 點防禦。',
    defBonus: 3
  },
  {
    id: 'spirit-warding',
    name: '靈紋護結',
    description: '靈光成結界，額外提供 3 點防禦。',
    defBonus: 3
  },
  {
    id: 'phoenix-ember',
    name: '鳳炎守耀',
    description: '炙炎羽翼環身，再增 4 點防禦。',
    defBonus: 4
  },
  {
    id: 'starfall-bastion',
    name: '墜星壁垣',
    description: '星鋼壁障凝實，額外提供 5 點防禦。',
    defBonus: 5
  }
]

export const armorAttributes = definitions

export const armorAttributesById = new Map<ArmorAttributeId, ArmorAttributeDef>(
  definitions.map(def => [def.id, def])
)

export function getArmorAttributes(ids: ArmorAttributeId[] = []): ArmorAttributeDef[] {
  const results: ArmorAttributeDef[] = []
  for (const id of ids) {
    const def = armorAttributesById.get(id)
    if (def) results.push(def)
  }
  return results
}

export function sumArmorAttributeBonuses(attributes: ArmorAttributeDef[]): ArmorAttributeBonuses {
  return attributes.reduce<ArmorAttributeBonuses>(
    (acc, attribute) => {
      acc.def += attribute.defBonus ?? 0
      return acc
    },
    { def: 0 }
  )
}

export function getArmorAttributeBonuses(ids: ArmorAttributeId[] | undefined): ArmorAttributeBonuses {
  const attributes = getArmorAttributes(ids ?? [])
  return sumArmorAttributeBonuses(attributes)
}
