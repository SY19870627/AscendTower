import type { ShopDef } from '../core/Types'

const catalog: ShopDef[] = [
  {
    id: 'travelling-herbalist',
    title: '行腳藥師',
    description: '和善的遊方者把草藥與藥瓶鋪在補釘斗篷上。',
    offers: [
      { id: 'herb-single', itemId: 'healing-herb', price: 20 },
      { id: 'herb-bundle', itemId: 'healing-herb', price: 55, quantity: 3 },
      { id: 'iron-ration', itemId: 'iron-ration', price: 45 }
    ]
  },
  {
    id: 'lightning-curio',
    title: '雷光古玩商',
    description: '玻璃瓶在木箱中噼啪作響，一名戴面具的商人靜靜注視著。',
    minFloor: 2,
    offers: [
      { id: 'charge-crystal', itemId: 'charge-crystal', price: 60 },
      { id: 'refresher-pack', itemId: 'healing-herb', price: 90, quantity: 4 },
      { id: 'storm-lunch', itemId: 'iron-ration', price: 80, quantity: 2 }
    ]
  }
]

export const shops: ShopDef[] = catalog

export function getShopsForFloor(floor: number): ShopDef[] {
  return catalog.filter(def => (def.minFloor ?? 1) <= floor)
}

export const shopsById = new Map(catalog.map(shop => [shop.id, shop]))

export function getShopDef(id: string): ShopDef | undefined {
  return shopsById.get(id)
}

