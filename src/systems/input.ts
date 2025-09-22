import { pickupWeapon, pickupArmor, pickupItem } from './spawning'
import { draw } from './render'

export function handleInput(scene: any, key: string) {
  const lower = typeof key === 'string' ? key.toLowerCase() : ''
  if (lower === 'p') {
    if (typeof scene.saveGame === 'function') scene.saveGame()
    return
  }
  if (lower === 'o') {
    if (typeof scene.loadGame === 'function') scene.loadGame()
    return
  }

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

  const nextPos = { x: scene.grid.playerPos.x + dir.x, y: scene.grid.playerPos.y + dir.y }
  if (!scene.grid.inBounds(nextPos)) return

  const targetTile = scene.grid.getTile(nextPos)
  if (targetTile === 'wall') return

  if (targetTile === 'enemy') {
    scene.startBattle(nextPos)
    return
  }

  if (targetTile === 'door' && !scene.hasKey) {
    scene.cameras.main.shake(80, 0.003)
    return
  }

  const steppedOn = scene.grid.movePlayer(nextPos)

  switch (steppedOn) {
    case 'key':
      scene.hasKey = true
      scene.grid.setTileUnderPlayer('floor')
      break
    case 'door':
      scene.grid.setTileUnderPlayer('floor')
      break
    case 'weapon':
      pickupWeapon(scene, nextPos)
      scene.grid.setTileUnderPlayer('floor')
      break
    case 'armor':
      pickupArmor(scene, nextPos)
      scene.grid.setTileUnderPlayer('floor')
      break
    case 'item':
      pickupItem(scene, nextPos)
      scene.grid.setTileUnderPlayer('floor')
      scene.syncFloorLastAction?.()
      break
    case 'shop':
      scene.startShop(nextPos)
      break
    case 'event':
      scene.startEvent(nextPos)
      break
    case 'npc':
      scene.startNpc(nextPos)
      break
    case 'ending':
      if (typeof scene.triggerEndingTile === 'function') {
        scene.triggerEndingTile(nextPos)
      }
      return
    case 'stairs_up':
      scene.transitionFloor?.('up')
      return
    case 'stairs_down':
      scene.transitionFloor?.('down')
      return
    default:
      break
  }

  const continueTurn = scene.advanceTurn('move')
  if (!continueTurn) return
  draw(scene)
}






