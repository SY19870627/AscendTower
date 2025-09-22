import Phaser from 'phaser'
import { TILE, COLORS } from '../content/tilesets'
import { enemies } from '../content/enemies'
import type { SkillDef } from '../core/Types'
import { getEffectiveCombatStats } from './combat'

import { getWeaponAttribute, getWeaponAttributeChargeMax, isWeaponAttributeReady } from '../game/weapons/weaponAttributes'

const SKILL_HOTKEYS = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U']

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

function drawTileIcon(scene: any, tile: string, drawX: number, drawY: number, size: number) {
  const g = scene.gfx as Phaser.GameObjects.Graphics
  const cx = drawX + size / 2
  const cy = drawY + size / 2

  switch (tile) {
    case 'player': {
      g.fillStyle(0x2f98ff, 0.85)
      g.fillCircle(cx, cy, size * 0.24)
      g.lineStyle(3, 0xffffff, 0.95)
      g.strokeCircle(cx, cy, size * 0.28)
      break
    }
    case 'enemy': {
      g.fillStyle(0xff6b6b, 0.75)
      g.fillCircle(cx, cy, size * 0.26)
      g.lineStyle(3, 0x320808, 0.9)
      g.strokeCircle(cx, cy, size * 0.26)
      g.lineBetween(cx - size * 0.18, cy - size * 0.18, cx + size * 0.18, cy + size * 0.18)
      g.lineBetween(cx - size * 0.18, cy + size * 0.18, cx + size * 0.18, cy - size * 0.18)
      break
    }
    case 'weapon': {
      g.lineStyle(4, 0xfff2a6, 0.95)
      g.lineBetween(drawX + size * 0.28, drawY + size * 0.72, drawX + size * 0.72, drawY + size * 0.28)
      g.lineStyle(2, 0x8b6200, 0.9)
      g.strokeCircle(drawX + size * 0.72, drawY + size * 0.28, size * 0.08)
      break
    }
    case 'armor': {
      g.fillStyle(0x9fd4ff, 0.8)
      g.beginPath()
      g.moveTo(cx, drawY + size * 0.22)
      g.lineTo(drawX + size * 0.78, drawY + size * 0.36)
      g.lineTo(drawX + size * 0.64, drawY + size * 0.78)
      g.lineTo(drawX + size * 0.36, drawY + size * 0.78)
      g.lineTo(drawX + size * 0.22, drawY + size * 0.36)
      g.closePath()
      g.fillPath()
      g.lineStyle(2, 0x1a3f5a, 0.85)
      g.strokePath()
      break
    }
    case 'key': {
      g.fillStyle(0xffeb6b, 0.85)
      g.fillCircle(drawX + size * 0.36, cy, size * 0.18)
      g.lineStyle(3, 0x8a6c15, 0.9)
      g.strokeCircle(drawX + size * 0.36, cy, size * 0.18)
      g.lineBetween(drawX + size * 0.5, cy, drawX + size * 0.82, cy)
      g.lineBetween(drawX + size * 0.72, cy, drawX + size * 0.72, cy + size * 0.2)
      break
    }
    case 'door': {
      g.fillStyle(0xd9a86b, 0.85)
      g.fillRect(drawX + size * 0.22, drawY + size * 0.2, size * 0.56, size * 0.6)
      g.lineStyle(2, 0x4b3218, 0.85)
      g.strokeRect(drawX + size * 0.22, drawY + size * 0.2, size * 0.56, size * 0.6)
      break
    }
    case 'stairs_up': {
      g.fillStyle(0x7ad3b5, 0.9)
      g.fillTriangle(drawX + size * 0.3, drawY + size * 0.7, drawX + size * 0.7, drawY + size * 0.7, cx, drawY + size * 0.3)
      g.lineStyle(2, 0xffffff, 0.85)
      g.strokeTriangle(drawX + size * 0.3, drawY + size * 0.7, drawX + size * 0.7, drawY + size * 0.7, cx, drawY + size * 0.3)
      break
    }
    case 'stairs_down': {
      g.fillStyle(0x5c9bd3, 0.9)
      g.fillTriangle(drawX + size * 0.3, drawY + size * 0.3, drawX + size * 0.7, drawY + size * 0.3, cx, drawY + size * 0.7)
      g.lineStyle(2, 0xffffff, 0.85)
      g.strokeTriangle(drawX + size * 0.3, drawY + size * 0.3, drawX + size * 0.7, drawY + size * 0.3, cx, drawY + size * 0.7)
      break
    }
    case 'event': {
      g.fillStyle(0xd7b0ff, 0.85)
      g.fillEllipse(cx, cy - size * 0.05, size * 0.18, size * 0.24)
      g.lineStyle(2, 0x4b2f69, 0.9)
      g.strokeEllipse(cx, cy - size * 0.05, size * 0.18, size * 0.24)
      g.fillRect(cx - size * 0.04, cy + size * 0.05, size * 0.08, size * 0.22)
      break
    }
    case 'shop': {
      g.fillStyle(0xffc04d, 0.9)
      g.fillRect(drawX + size * 0.3, drawY + size * 0.32, size * 0.4, size * 0.34)
      g.lineStyle(2, 0x8a5a12, 0.85)
      g.strokeRect(drawX + size * 0.3, drawY + size * 0.32, size * 0.4, size * 0.34)
      g.fillCircle(cx - size * 0.08, cy + size * 0.08, size * 0.04)
      g.fillCircle(cx + size * 0.08, cy + size * 0.08, size * 0.04)
      break
    }
    case 'item': {
      g.fillStyle(0xffd27f, 0.85)
      g.beginPath()
      const points = 8
      const inner = size * 0.12
      const outer = size * 0.24
      for (let i = 0; i < points; i++) {
        const angle = (Math.PI / 4) * i
        const radius = i % 2 === 0 ? outer : inner
        const px = cx + Math.cos(angle) * radius
        const py = cy + Math.sin(angle) * radius
        if (i === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.closePath()
      g.fillPath()
      g.lineStyle(2, 0x6b4814, 0.9)
      g.strokePath()
      break
    }
    case 'npc': {
      g.fillStyle(0xbfe4ff, 0.9)
      g.fillCircle(cx, drawY + size * 0.32, size * 0.14)
      g.fillRect(drawX + size * 0.32, drawY + size * 0.42, size * 0.36, size * 0.32)
      g.lineStyle(2, 0x2a4a66, 0.85)
      g.strokeRect(drawX + size * 0.32, drawY + size * 0.42, size * 0.36, size * 0.32)
      break
    }
    case 'ending': {
      g.fillStyle(0xff71c8, 0.9)
      g.fillRect(drawX + size * 0.24, drawY + size * 0.24, size * 0.52, size * 0.52)
      g.lineStyle(2, 0xffffff, 0.9)
      g.strokeRect(drawX + size * 0.24, drawY + size * 0.24, size * 0.52, size * 0.52)
      g.fillCircle(cx, cy, size * 0.1)
      break
    }
    default:
      break
  }
}

function getTileColor(tile: string) {
  return (COLORS as Record<string, number>)[tile] ?? COLORS.floor
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
      const shieldLabel = typeof armor.shield === 'number' ? `，護盾 ${armor.shield}` : ''
      return `防具：${armor.name}（防禦 ${armor.def}${shieldLabel}）`
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

  const grid = scene.grid

  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const tile = grid.tiles[y][x]
      const drawX = baseX + x * tileSize
      const drawY = baseY + y * tileSize
      const color = getTileColor(tile)

      gfx.fillStyle(color, 1)
      gfx.fillRect(drawX, drawY, tileSize, tileSize)
      gfx.lineStyle(1, 0x0d1414, 0.4)
      gfx.strokeRect(drawX + 0.5, drawY + 0.5, tileSize - 1, tileSize - 1)

      drawTileIcon(scene, tile, drawX, drawY, tileSize)

    }
  }

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
    const special = weapon.special
    statsLines.push(`  +攻擊 ${weapon.atk}`)
    if (special) {
      statsLines.push(`  特技 ${special.name}：傷害 ${special.damage}`)
      const chargeMax = special.chargeMax
      const currentCharge = Math.min(scene.weaponCharge ?? 0, chargeMax)
      statsLines.push(`  蓄能 ${currentCharge}/${chargeMax}`)
      if (currentCharge >= chargeMax) statsLines.push('  特技 就緒')
      if (special.desc) statsLines.push(`  ${special.desc}`)
    }
    const attribute = getWeaponAttribute(weapon.attributeId ?? null)
    if (attribute) {
      const attributeMax = Math.max(getWeaponAttributeChargeMax(attribute), 1)
      const attributeCharge = Math.min(Math.max(scene.weaponAttributeCharge ?? 0, 0), attributeMax)
      const attributeReady = isWeaponAttributeReady(attribute, attributeCharge)
      statsLines.push(`  屬性 ${attribute.name}`)
      statsLines.push(`  蓄能 ${attributeCharge}/${attributeMax}${attributeReady ? ' 就緒' : ''}`)
      if (attribute.description) statsLines.push(`  ${attribute.description}`)
    }
    if (weapon.desc) statsLines.push(`  ${weapon.desc}`)
  }

  if (scene.playerArmor) {
    const armor = scene.playerArmor
    statsLines.push(`  +防禦 ${armor.def}`)
    if (typeof armor.shield === 'number') statsLines.push(`  護盾值 ${armor.shield}`)
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












