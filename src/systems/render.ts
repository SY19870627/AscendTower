import Phaser from 'phaser'
import { TILE } from '../content/tilesets'
import { enemies } from '../content/enemies'
import type { SkillDef } from '../core/Types'
import { getEffectiveCombatStats } from './combat'

import { getWeaponAttributes, getWeaponAttributeChargeMax, isWeaponAttributeReady, normalizeWeaponAttributeCharges } from '../game/weapons/weaponAttributes'

const SKILL_HOTKEYS = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U']

const TILE_TEXTURE_KEY = 'floor_wall'
const SYMBOL_TEXTURE_KEY = 'symbol_tiles'

type SymbolConfig = {
  frame: number
  tint?: number
  flipX?: boolean
  flipY?: boolean
}

const SYMBOL_BY_TILE: Record<string, SymbolConfig> = {
  player: { frame: 0 },
  key: { frame: 1 },
  door: { frame: 2 },
  stairs_up: { frame: 3 },
  stairs_down: { frame: 3, flipY: true },
  enemy: { frame: 4 },
  weapon: { frame: 5 },
  armor: { frame: 6 },
  shop: { frame: 7, tint: 0xffb85c },
  npc: { frame: 7, tint: 0x9fd4ff },
  item: { frame: 8 },
  event: { frame: 9 },
  ending: { frame: 9, tint: 0xff71c8 }
}

type DirectionKey = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

type TextStyleOptions = {
  fontSize?: string
  color?: string
  depth?: number
  originX?: number
  originY?: number
  lineSpacing?: number
}

const DIRECTION_LABEL: Record<DirectionKey, string> = {
  UP: '上',
  DOWN: '下',
  LEFT: '左',
  RIGHT: '右'
}

const DIRECTION_ORDER: DirectionKey[] = ['UP', 'DOWN', 'LEFT', 'RIGHT']

const TEXT_PREFIX = 'ui::'

function addText(
  scene: Phaser.Scene,
  activeIds: Set<string>,
  id: string,
  x: number,
  y: number,
  text: string,
  style: TextStyleOptions = {}
) {
  const fullId = `${TEXT_PREFIX}${id}`
  activeIds.add(fullId)

  const defaultStyle = { fontSize: '14px', color: '#ffffff' }
  const mergedStyle = { ...defaultStyle, ...style }
  const existing = scene.children.getByName(fullId) as Phaser.GameObjects.Text | undefined
  if (existing) {
    existing.setText(text)
    existing.setPosition(x, y)
    existing.setDepth(mergedStyle.depth ?? existing.depth)
    existing.setColor(mergedStyle.color ?? defaultStyle.color)
    if (mergedStyle.fontSize) existing.setFontSize(mergedStyle.fontSize)
    if (mergedStyle.lineSpacing !== undefined) existing.setLineSpacing(mergedStyle.lineSpacing)
    if (mergedStyle.originX !== undefined || mergedStyle.originY !== undefined) {
      existing.setOrigin(mergedStyle.originX ?? existing.originX, mergedStyle.originY ?? existing.originY)
    }
    existing.setVisible(true)
    return existing
  }

  const textObj = scene.add.text(x, y, text, {
    fontSize: mergedStyle.fontSize,
    color: mergedStyle.color
  })
  textObj.setName(fullId)
  textObj.setDepth(mergedStyle.depth ?? 1)
  textObj.setScrollFactor?.(0)
  textObj.setLineSpacing(mergedStyle.lineSpacing ?? 0)
  textObj.setOrigin(mergedStyle.originX ?? 0, mergedStyle.originY ?? 0)
  return textObj
}

function cleanupUnusedText(scene: Phaser.Scene, activeIds: Set<string>) {
  scene.children.each(child => {
    if (child instanceof Phaser.GameObjects.Text && typeof child.name === 'string') {
      if (child.name.startsWith(TEXT_PREFIX) && !activeIds.has(child.name)) {
        child.destroy()
      }
    }
  })
}

type TileSpriteCache = Map<string, Phaser.GameObjects.Image>

function updateTileSprites(
  scene: any,
  caches: { base: TileSpriteCache; icons: TileSpriteCache },
  posKey: string,
  tile: string,
  drawX: number,
  drawY: number,
  tileSize: number,
  activeBase: Set<string>,
  activeIcons: Set<string>
) {
  const baseFrame = tile === 'wall' ? 1 : 0
  const sprite = caches.base.get(posKey) ?? (() => {
    const created = scene.add.image(drawX, drawY, TILE_TEXTURE_KEY, baseFrame)
    created.setOrigin(0, 0)
    created.setDepth(-1)
    caches.base.set(posKey, created)
    return created
  })()
  sprite.setFrame(baseFrame)
  sprite.setPosition(drawX, drawY)
  sprite.setDisplaySize(tileSize, tileSize)
  sprite.setVisible(true)
  activeBase.add(posKey)

  const symbolConfig = SYMBOL_BY_TILE[tile]
  if (symbolConfig) {
    const symbol = caches.icons.get(posKey) ?? (() => {
      const created = scene.add.image(drawX + tileSize / 2, drawY + tileSize / 2, SYMBOL_TEXTURE_KEY, symbolConfig.frame)
      created.setDepth(1)
      caches.icons.set(posKey, created)
      return created
    })()
    symbol.setFrame(symbolConfig.frame)
    symbol.setPosition(drawX + tileSize / 2, drawY + tileSize / 2)
    symbol.setDisplaySize(tileSize, tileSize)
    symbol.setFlipX(!!symbolConfig.flipX)
    symbol.setFlipY(!!symbolConfig.flipY)
    if (symbolConfig.tint !== undefined) {
      symbol.setTint(symbolConfig.tint)
    } else {
      symbol.clearTint()
    }
    symbol.setVisible(true)
    activeIcons.add(posKey)
  } else {
    const icon = caches.icons.get(posKey)
    if (icon) {
      icon.setVisible(false)
    }
  }
}

function hideUnusedSprites(cache: TileSpriteCache, activeKeys: Set<string>) {
  cache.forEach((sprite, key) => {
    if (!activeKeys.has(key)) {
      sprite.setVisible(false)
    }
  })
}

function makePosKey(x: number, y: number) {
  return `${x},${y}`
}

function describeTile(scene: any, tile: string, x: number, y: number): string | null {
  const posKey = makePosKey(x, y)
  switch (tile) {
    case 'enemy': {
      const pool = enemies.filter(enemy => (enemy.minFloor ?? 1) <= scene.floor)
      const enemy = pool.length ? pool[pool.length - 1] : enemies[0]
      return `敵人：${enemy.name}（生命 ${enemy.base.hp}，攻擊 ${enemy.base.atk}）`
    }
    case 'weapon': {
      const weapon = scene.weaponDrops?.get(posKey)
      return weapon ? `武器：${weapon.name}（攻擊 ${weapon.atk}）` : '武器：未知'
    }
    case 'armor': {
      const armor = scene.armorDrops?.get(posKey)
      if (!armor) return '防具：未知'
      return `防具：${armor.name}（防禦 ${armor.def}）`
    }
    case 'item': {
      const item = scene.itemDrops?.get(posKey)
      return item ? `道具：${item.name}` : '道具：未知'
    }
    case 'shop': {
      const shop = scene.shopNodes?.get(posKey)
      return shop ? `商人：${shop.title}` : '商人：未知'
    }
    case 'event': {
      const event = scene.eventNodes?.get(posKey)
      return event ? `事件：${event.title}` : '事件：未知'
    }
    case 'npc': {
      const npc = scene.npcNodes?.get(posKey)
      return npc ? `人物：${npc.name}` : '人物：未知'
    }
    case 'key':
      return '鑰匙：就在附近'
    case 'door':
      return `門：${scene.hasKey ? '可開啟' : '上鎖'}`
    case 'stairs_up':
      return '樓梯：向上'
    case 'stairs_down':
      return '樓梯：向下'
    default:
      return null
  }
}

function gatherDirectionInfo(scene: any): Record<DirectionKey, string[]> {
  const info: Record<DirectionKey, string[]> = {
    UP: [],
    DOWN: [],
    LEFT: [],
    RIGHT: []
  }

  const directions: Record<DirectionKey, { dx: number; dy: number }> = {
    UP: { dx: 0, dy: -1 },
    DOWN: { dx: 0, dy: 1 },
    LEFT: { dx: -1, dy: 0 },
    RIGHT: { dx: 1, dy: 0 }
  }

  const playerPos = scene.grid.playerPos

  const register = (dir: DirectionKey, message: string) => {
    if (!info[dir].includes(message)) info[dir].push(message)
  }

  for (const dir of DIRECTION_ORDER) {
    const { dx, dy } = directions[dir]
    let x = playerPos.x + dx
    let y = playerPos.y + dy

    while (scene.grid.inBounds({ x, y })) {
      const tile = scene.grid.tiles[y][x]
      if (tile === 'wall') break
      if (tile !== 'floor' && tile !== 'player') {
        const message = describeTile(scene, tile, x, y)
        if (message) register(dir, message)
        break
      }
      x += dx
      y += dy
    }
  }

  return info
}

export function draw(scene: any) {
  const gfx = scene.gfx as Phaser.GameObjects.Graphics
  if (!gfx) return

  const activeTextIds = new Set<string>()
  const tileSize = TILE.size
  const baseX = scene.gridOrigin?.x ?? 0
  const baseY = scene.gridOrigin?.y ?? 0

  gfx.clear()

  const baseCache: TileSpriteCache =
    scene.tileSprites instanceof Map ? scene.tileSprites : new Map<string, Phaser.GameObjects.Image>()
  if (!(scene.tileSprites instanceof Map)) {
    scene.tileSprites = baseCache
  }
  const iconCache: TileSpriteCache =
    scene.tileIcons instanceof Map ? scene.tileIcons : new Map<string, Phaser.GameObjects.Image>()
  if (!(scene.tileIcons instanceof Map)) {
    scene.tileIcons = iconCache
  }
  const caches = { base: baseCache, icons: iconCache }
  const activeBaseTiles = new Set<string>()
  const activeIconTiles = new Set<string>()

  const grid = scene.grid

  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const tile = grid.tiles[y][x]
      const drawX = baseX + x * tileSize
      const drawY = baseY + y * tileSize
      const posKey = makePosKey(x, y)

      updateTileSprites(scene, caches, posKey, tile, drawX, drawY, tileSize, activeBaseTiles, activeIconTiles)

      gfx.lineStyle(1, 0x0d1414, 0.4)
      gfx.strokeRect(drawX + 0.5, drawY + 0.5, tileSize - 1, tileSize - 1)
    }
  }

  hideUnusedSprites(caches.base, activeBaseTiles)
  hideUnusedSprites(caches.icons, activeIconTiles)

  const statsStartX = scene.sidebarPadding ?? 16
  let currentY = scene.sidebarPadding ?? 16
  const lineHeight = 18
  const sectionGap = 12

  const combatStats = getEffectiveCombatStats(scene)
  const totalItems = scene.inventory?.reduce((sum: number, stack: any) => sum + (stack.quantity ?? 0), 0) ?? 0

  const statsLines = [
    `樓層 ${scene.floor}`,
    `生命 ${scene.playerStats?.hp ?? 0}`,
    `攻擊 ${combatStats.atk}`,
    `防禦 ${combatStats.def}`,
    `鑰匙 ${scene.hasKey ? '有' : '無'}`,
    `金幣 ${scene.coins ?? 0}`,
    `武器 ${scene.playerWeapon ? scene.playerWeapon.name : '無'}`,
    `防具 ${scene.playerArmor ? scene.playerArmor.name : '無'}`,
    `道具 ${totalItems}`
  ]

  if (scene.playerWeapon) {
    const weapon = scene.playerWeapon
    statsLines.push(`  +攻擊 ${weapon.atk}`)
    const attributes = getWeaponAttributes(weapon.attributeIds ?? [])
    if (attributes.length) {
      const normalizedCharges = normalizeWeaponAttributeCharges(attributes, scene.weaponAttributeCharges ?? null)
      for (const attribute of attributes) {
        const attributeMax = Math.max(getWeaponAttributeChargeMax(attribute), 1)
        const attributeCharge = Math.min(normalizedCharges[attribute.id] ?? 0, attributeMax)
        const attributeReady = isWeaponAttributeReady(attribute, attributeCharge)
        statsLines.push(`  屬性 ${attribute.name}`)
        statsLines.push(`  蓄能 ${attributeCharge}/${attributeMax}${attributeReady ? ' 就緒' : ''}`)
        if (attribute.description) statsLines.push(`  ${attribute.description}`)
      }
    }
    if (weapon.desc) statsLines.push(`  ${weapon.desc}`)
  }

  if (scene.playerArmor) {
    const armor = scene.playerArmor
    statsLines.push(`  +防禦 ${armor.def}`)
    if (armor.desc) statsLines.push(`  ${armor.desc}`)
  }

  const statsText = statsLines.join('\n')
  addText(scene, activeTextIds, 'stats', statsStartX, currentY, statsText, {
    fontSize: '16px',
    lineSpacing: 4,
    color: '#ffffff'
  })
  currentY += statsText.split('\n').length * lineHeight + sectionGap

  const statusEntries = scene.activeStatuses ?? []
  const statusLines = statusEntries.map((entry: any) => {
    const bits: string[] = []
    if (entry.def?.atkBonus) bits.push(`攻擊 ${entry.def.atkBonus >= 0 ? '+' : ''}${entry.def.atkBonus}`)
    if (entry.def?.defBonus) bits.push(`防禦 ${entry.def.defBonus >= 0 ? '+' : ''}${entry.def.defBonus}`)
    if (entry.def?.hpPerTurn) bits.push(`生命 ${entry.def.hpPerTurn >= 0 ? '+' : ''}${entry.def.hpPerTurn}/回合`)
    const suffix = bits.length ? ` [${bits.join(', ')}]` : ''
    return `${entry.def?.name ?? '狀態'} (${entry.remaining ?? 0})${suffix}`
  })
  const statusHeader = '狀態：'
  const statusText = statusLines.length ? [statusHeader, ...statusLines].join('\n') : `${statusHeader} 無`
  const statusColor = statusLines.length
    ? (statusEntries.some((entry: any) => entry.def?.type === 'debuff') ? '#f9a6a6' : '#cfe')
    : '#888888'
  addText(scene, activeTextIds, 'statuses', statsStartX, currentY, statusText, {
    fontSize: '14px',
    lineSpacing: 4,
    color: statusColor
  })
  currentY += Math.max(statusText.split('\n').length, 1) * lineHeight + sectionGap

  const knownSkills: SkillDef[] = scene.knownSkills ?? []
  const skillLines = knownSkills.map((skill, idx) => {
    const hotkey = SKILL_HOTKEYS[idx] ?? `#${idx + 1}`
    let cooldown = 0
    if (typeof scene.getSkillCooldown === 'function') {
      cooldown = scene.getSkillCooldown(skill.id) ?? 0
    } else if (scene.skillCooldowns instanceof Map) {
      cooldown = scene.skillCooldowns.get(skill.id) ?? 0
    }
    const state = cooldown > 0 ? `CD ${cooldown}` : '就緒'
    return `${hotkey} ${skill.name} (${state})`
  })
  const skillHeader = '技能：'
  const skillText = skillLines.length ? [skillHeader, ...skillLines].join('\n') : `${skillHeader} 無`
  const skillColor = skillLines.some(line => line.includes('CD')) ? '#ffd27f' : '#cfe'
  addText(scene, activeTextIds, 'skills', statsStartX, currentY, skillText, {
    fontSize: '14px',
    lineSpacing: 4,
    color: skillColor
  })
  currentY += Math.max(skillText.split('\n').length, 1) * lineHeight + sectionGap

  const inventoryStacks: any[] = scene.inventory ?? []
  const inventoryLines = inventoryStacks.length
    ? inventoryStacks.map((stack: any, idx: number) => {
        const qty = stack.quantity > 1 ? ` x${stack.quantity}` : ''
        const label = stack.def?.name ?? stack.name ?? '未知'
        return `${idx + 1}. ${label}${qty}`
      })
    : ['（空）']
  const inventoryHeader = '背包（按 1-9 使用）'
  const inventoryText = [inventoryHeader, ...inventoryLines].join('\n')
  const inventoryColor = inventoryStacks.length ? '#cfe' : '#888888'
  addText(scene, activeTextIds, 'inventory', statsStartX, currentY, inventoryText, {
    fontSize: '14px',
    lineSpacing: 4,
    color: inventoryColor
  })
  currentY += Math.max(inventoryText.split('\n').length, 1) * lineHeight + sectionGap

  const lastMessage = (scene.lastActionMessage ?? '').trim()
  const lastActionText = ['最後行動：', lastMessage.length ? lastMessage : '無'].join('\n')
  addText(scene, activeTextIds, 'last_action', statsStartX, currentY, lastActionText, {
    fontSize: '14px',
    lineSpacing: 4,
    color: '#ffe9a6'
  })

  const directionInfo = gatherDirectionInfo(scene)
  const rightPanelX = baseX + grid.w * tileSize + 24
  let directionY = scene.sidebarPadding ?? 16
  const boxWidth = 220
  const boxPadding = 8

  for (const dir of DIRECTION_ORDER) {
    const entries = directionInfo[dir]
    const lines = [DIRECTION_LABEL[dir], ...(entries.length ? entries : ['暫無特別資訊'])]
    const boxHeight = lines.length * lineHeight + boxPadding * 2
    gfx.fillStyle(0x102424, 0.8).fillRect(rightPanelX, directionY, boxWidth, boxHeight)
    gfx.lineStyle(1, 0x2c4c4c, 1).strokeRect(rightPanelX, directionY, boxWidth, boxHeight)
    addText(scene, activeTextIds, 'direction_' + dir.toLowerCase(), rightPanelX + boxPadding, directionY + boxPadding, lines.join('\n'), {
      fontSize: '14px',
      lineSpacing: 4,
      color: '#cfe'
    })
    directionY += boxHeight + 16
  }

  const instructions = [
    '移動: WASD / 方向鍵',
    '使用技能: Q/W/E',
    '開啟圖鑑: L',
    '存檔:P 讀檔:O'
  ].join('\n')
  addText(scene, activeTextIds, 'instructions', rightPanelX + boxPadding, directionY, instructions, {
    fontSize: '12px',
    lineSpacing: 2,
    color: '#9fd'
  })

  cleanupUnusedText(scene, activeTextIds)
}

export default draw












