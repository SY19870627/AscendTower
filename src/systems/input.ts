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
  if (scene.isLifespanEndingActive) return
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

  if (targetTile === 'battle_event') {
    if (typeof scene.startBattleEventEncounter === 'function') {
      scene.startBattleEventEncounter(nextPos)
    }
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
    case 'door': {
      const openedBranch = typeof scene.tryEnterDoorBranch === 'function' ? scene.tryEnterDoorBranch() : false
      if (openedBranch) {
        scene.transitionFloor?.('branch')
        return
      }
      scene.grid.setTileUnderPlayer('floor')
      break
    }
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
    case 'battle_event':
      if (typeof scene.startBattleEventEncounter === 'function') {
        scene.startBattleEventEncounter(nextPos)
      }
      return
    case 'npc':
      scene.startNpc(nextPos)
      break
    case 'ending':
      if (typeof scene.triggerEndingTile === 'function') {
        scene.triggerEndingTile(nextPos)
      }
      return
    case 'stairs_up':
      scene.transitionFloor?.(scene.isBranchFloor ? 'return' : 'up')
      return
    case 'stairs_branch':
      scene.transitionFloor?.('branch')
      return
    default:
      break
  }

  const continueTurn = scene.advanceTurn('move')
  if (!continueTurn) return
  draw(scene)
}






