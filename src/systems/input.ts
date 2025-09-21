import { pickupWeapon, pickupArmor, pickupItem } from './spawning'
import { draw } from './render'

export function handleInput(scene: any, key: string) {
  if (scene.battleOverlay?.isActive) return
  if (scene.eventOverlay?.isActive) return
  if (scene.shopOverlay?.isActive) return
  if (scene.libraryOverlay?.isActive) return
  if (key === "l" || key === "L") {
    if (typeof scene.toggleLibrary === "function") {
      scene.toggleLibrary()
    } else if (scene.libraryOverlay) {
      if (scene.libraryOverlay.isActive) {
        scene.libraryOverlay.close()
      } else {
        scene.libraryOverlay.open()
      }
    }
    return
  }
  const skillMap: Record<string, number> = { q: 0, w: 1, e: 2, r: 3, t: 4, y: 5, u: 6 }
  const skillIndex = skillMap[key.toLowerCase()]
  if (typeof skillIndex === "number") {
    if (scene.useSkill?.(skillIndex)) return
  }
  if (/^[1-9]$/.test(key)) {
    if (scene.useInventorySlot?.(Number.parseInt(key, 10) - 1)) return
  }
  const dir = ({
    ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 }
  } as any)[key]
  if (!dir) return

  const np = { x: scene.grid.playerPos.x + dir.x, y: scene.grid.playerPos.y + dir.y }
  if (!scene.grid.inBounds(np)) return

  const t = scene.grid.tiles[np.y][np.x]
  if (t === 'wall') return

  if (t === 'enemy') {
    scene.startBattle(np)
    return
  }

  if (t === 'door' && !scene.hasKey) {
    scene.cameras.main.shake(80, 0.003)
    return
  }

  scene.grid.tiles[scene.grid.playerPos.y][scene.grid.playerPos.x] = 'floor'
  scene.grid.playerPos = np
  scene.grid.tiles[np.y][np.x] = 'player'

  if (t === 'key') { scene.hasKey = true }
  if (t === 'door' && scene.hasKey) { scene.grid.tiles[np.y][np.x] = 'floor' }
  if (t === 'stairs') {
    const continueTurn = scene.advanceTurn('move')
    if (!continueTurn) return
    scene.scene.restart({ floor: scene.floor + 1 })
    return
  }
  if (t === 'weapon') { pickupWeapon(scene, np) }
  if (t === 'armor') { pickupArmor(scene, np) }
  if (t === 'item') { pickupItem(scene, np) }
  if (t === 'shop') { scene.startShop(np) }
  if (t === 'event') { scene.startEvent(np) }

  const continueTurn = scene.advanceTurn('move')
  if (!continueTurn) return
  draw(scene)
}

