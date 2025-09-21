import { TILE, GLYPH } from '../content/tilesets'
import type { SkillDef } from '../core/Types'
import { enemies } from '../content/enemies'
import { getEffectiveCombatStats, describeDirection } from './combat'

const SKILL_HOTKEYS = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U']

type DirectionKey = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
const DIRECTION_LABEL: Record<DirectionKey, string> = {
  UP: 'Up',
  DOWN: 'Down',
  LEFT: 'Left',
  RIGHT: 'Right'
}
const DIRECTION_ORDER: DirectionKey[] = ['UP', 'DOWN', 'LEFT', 'RIGHT']

const SPRITE_FRAME_SIZE = 16
const FLOOR_WALL_SHEET_KEY = 'floor_wall'
const SYMBOL_SHEET_KEY = 'symbol_tiles'

type TileSpriteConfig = {
  texture: string
  frame: number
}

const TILE_SPRITES: Partial<Record<string, TileSpriteConfig>> = {
  player: { texture: SYMBOL_SHEET_KEY, frame: 0 },
  key: { texture: SYMBOL_SHEET_KEY, frame: 1 },
  door: { texture: SYMBOL_SHEET_KEY, frame: 2 },
  stairs: { texture: SYMBOL_SHEET_KEY, frame: 3 },
  enemy: { texture: SYMBOL_SHEET_KEY, frame: 4 },
  weapon: { texture: SYMBOL_SHEET_KEY, frame: 5 },
  armor: { texture: SYMBOL_SHEET_KEY, frame: 6 },
  shop: { texture: SYMBOL_SHEET_KEY, frame: 7 },
  npc: { texture: SYMBOL_SHEET_KEY, frame: 8 },
  event: { texture: SYMBOL_SHEET_KEY, frame: 9 }
}

function updateTileSprite(scene: any, id: string, texture: string, frame: number, drawX: number, drawY: number, size: number, depth: number) {
  const key = `spr_${id}`
  const existing = scene.children.getByName(key) as Phaser.GameObjects.Image | undefined
  const cx = drawX + size / 2
  const cy = drawY + size / 2
  const scale = size / SPRITE_FRAME_SIZE
  if (existing) {
    existing
      .setTexture(texture, frame)
      .setPosition(cx, cy)
      .setScale(scale)
      .setDepth(depth)
      .setVisible(true)
      .setActive(true)
    return existing
  }
  const image = scene.add.image(cx, cy, texture, frame)
  image.setOrigin(0.5).setScale(scale).setDepth(depth).setName(key).setVisible(true).setActive(true)
  return image
}

function hideTileSprite(scene: any, id: string) {
  const sprite = scene.children.getByName(`spr_${id}`) as Phaser.GameObjects.Image | undefined
  sprite?.setVisible(false).setActive(false)
}
function drawTileIcon(scene: any, tile: string, drawX: number, drawY: number, size: number) {
  const g = scene.gfx
  const cx = drawX + size / 2
  const cy = drawY + size / 2

  switch (tile) {
    case 'player': {
      g.fillStyle(0x2f98ff, 0.85)
      g.fillCircle(cx, cy, size * 0.24)
      g.lineStyle(3, 0xffffff, 0.95)
      g.strokeCircle(cx, cy, size * 0.28)
      g.lineBetween(cx - size * 0.18, cy, cx + size * 0.18, cy)
      g.lineBetween(cx, cy - size * 0.18, cx, cy + size * 0.18)
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
      g.lineBetween(drawX + size * 0.5, cy, drawX + size * 0.8, cy)
      g.lineBetween(drawX + size * 0.7, cy, drawX + size * 0.7, cy + size * 0.16)
      break
    }
    case 'door': {
      g.fillStyle(0xd9a86b, 0.85)
      g.fillRect(drawX + size * 0.22, drawY + size * 0.2, size * 0.56, size * 0.6)
      g.lineStyle(2, 0x4b3218, 0.85)
      g.strokeRect(drawX + size * 0.22, drawY + size * 0.2, size * 0.56, size * 0.6)
      break
    }
    case 'stairs': {
      g.fillStyle(0x7ad3b5, 0.9)
      g.fillTriangle(drawX + size * 0.3, drawY + size * 0.7, drawX + size * 0.7, drawY + size * 0.7, cx, drawY + size * 0.3)
      g.lineStyle(2, 0xffffff, 0.85)
      g.strokeTriangle(drawX + size * 0.3, drawY + size * 0.7, drawX + size * 0.7, drawY + size * 0.7, cx, drawY + size * 0.3)
      break
    }
    case 'event': {
      g.fillStyle(0xd7b0ff, 0.85)
      g.fillEllipse(cx, cy - size * 0.05, size * 0.18, size * 0.24)
      g.lineStyle(2, 0x4b2f69, 0.9)
      g.strokeEllipse(cx, cy - size * 0.05, size * 0.18, size * 0.24)
      g.fillStyle(0xd7b0ff, 0.9)
      g.fillRect(cx - size * 0.04, cy + size * 0.05, size * 0.08, size * 0.22)
      break
    }
    case 'shop': {
      g.fillStyle(0xffc04d, 0.9)
      g.fillRect(drawX + size * 0.3, drawY + size * 0.32, size * 0.4, size * 0.34)
      g.lineStyle(2, 0x8a5a12, 0.85)
      g.strokeRect(drawX + size * 0.3, drawY + size * 0.32, size * 0.4, size * 0.34)
      g.fillStyle(0x8a5a12, 0.9)
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
        const r = i % 2 === 0 ? outer : inner
        const px = cx + Math.cos(angle) * r
        const py = cy + Math.sin(angle) * r
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
      g.fillStyle(0xbfe4ff, 0.85)
      g.fillRect(drawX + size * 0.32, drawY + size * 0.42, size * 0.36, size * 0.32)
      g.lineStyle(2, 0x2a4a66, 0.85)
      g.strokeRect(drawX + size * 0.32, drawY + size * 0.42, size * 0.36, size * 0.32)
      break
    }
    default:
      break
  }
}

function addTextOnce(scene: any, id: string, x: number, y: number, text: string, color: string) {
  const key = `txt_${id}`
  const existing = scene.children.getByName(key) as Phaser.GameObjects.Text | undefined
  if (existing) {
    existing.setText(text).setPosition(x, y).setColor(color).setDepth(1)
    return existing
  }
  const t = scene.add.text(x, y, text, { fontSize: '14px', color }).setName(key).setDepth(1)
  return t
}

export function draw(scene: any) {
  scene.gfx.clear()
  const s = TILE.size
  const baseX = scene.gridOrigin.x
  const baseY = scene.gridOrigin.y

  const directionInfo: Record<DirectionKey, string[]> = {
    UP: [],
    DOWN: [],
    LEFT: [],
    RIGHT: []
  }

  const registerDirection = (dir: DirectionKey, line: string) => {
    const bucket = directionInfo[dir]
    if (!bucket.includes(line)) bucket.push(line)
  }

  const playerCombat = getEffectiveCombatStats(scene)

  const cleanupIds = [
    'enemy_info',
    'weapon_info',
    'armor_info',
    'event_info',
    'npc_info',
    'shop_info',
    'item_info',
    'direction_up',
    'direction_down',
    'direction_left',
    'direction_right'
  ]
  cleanupIds.forEach(id => {
    const existing = scene.children.getByName(`txt_${id}`) as Phaser.GameObjects.Text | undefined
    existing?.destroy()
  })

  for (let y = 0; y < scene.grid.h; y++) {
    for (let x = 0; x < scene.grid.w; x++) {
      const tile = scene.grid.tiles[y][x]
      const drawX = baseX + x * s
      const drawY = baseY + y * s
      const tileKey = `${x}_${y}`
      const backgroundFrame = tile === 'wall' ? 1 : 0
      updateTileSprite(scene, `bg_${tileKey}`, FLOOR_WALL_SHEET_KEY, backgroundFrame, drawX, drawY, s, -2)

      const spriteDef = TILE_SPRITES[tile as keyof typeof TILE_SPRITES]
      if (spriteDef) {
        updateTileSprite(scene, `fg_${tileKey}`, spriteDef.texture, spriteDef.frame, drawX, drawY, s, -1)
      } else {
        hideTileSprite(scene, `fg_${tileKey}`)
      }

      const showGlyph = !spriteDef && tile !== 'floor' && tile !== 'wall'
      const glyphValue = showGlyph ? (GLYPH as any)[tile] ?? '' : ''
      const glyphId = `glyph_${x}_${y}`
      if (glyphValue) {
        const glyph = addTextOnce(scene, glyphId, drawX + (s / 2 - 10), drawY + (s / 2 - 12), glyphValue, '#ffffff')
        glyph.setVisible(true)
      } else {
        const existingGlyph = scene.children.getByName(`txt_${glyphId}`) as Phaser.GameObjects.Text | undefined
        existingGlyph?.setVisible(false)
      }

      if (showGlyph) {
        drawTileIcon(scene, tile, drawX, drawY, s)
      }

      const dx = x - scene.grid.playerPos.x
      const dy = y - scene.grid.playerPos.y
      const adj = Math.abs(dx) + Math.abs(dy) === 1
      if (!adj) {
        if (tile === 'enemy') {
          const pid = `preview_${x}_${y}`
          addTextOnce(scene, pid, drawX + 6, drawY + 4, '', '#000')
        }
        continue
      }

      const dir = describeDirection(dx, dy) as DirectionKey

      switch (tile) {
        case 'enemy': {
          const pid = `preview_${x}_${y}`
          addTextOnce(scene, pid, drawX + 6, drawY + 4, '', '#000')
          const enemy = enemies[0]
          registerDirection(dir, `Enemy: ${enemy.name} (HP ${enemy.base.hp}, ATK ${enemy.base.atk})`)
          break
        }
        case 'weapon': {
          const weapon = scene.weaponDrops?.get(`${x},${y}`)
          if (weapon) registerDirection(dir, `Weapon: ${weapon.name} (ATK ${weapon.atk})`)
          break
        }
        case 'armor': {
          const armor = scene.armorDrops?.get(`${x},${y}`)
          if (armor) {
            const shieldLabel = typeof armor.shield === 'number' ? `, Shield ${armor.shield}` : ''
            registerDirection(dir, `Armor: ${armor.name} (+DEF ${armor.def}${shieldLabel})`)
          }
          break
        }
        case 'shop': {
          const shop = scene.shopNodes?.get(`${x},${y}`)
          if (shop) registerDirection(dir, `Shop: ${shop.title}`)
          break
        }
        case 'event': {
          const event = scene.eventNodes?.get(`${x},${y}`)
          if (event) registerDirection(dir, `Event: ${event.title}`)
          break
        }
        case 'npc': {
          const npc = scene.npcNodes?.get(`${x},${y}`)
          if (npc) registerDirection(dir, `NPC: ${npc.name}`)
          break
        }
        case 'item': {
          const item = scene.itemDrops?.get(`${x},${y}`)
          if (item) registerDirection(dir, `Item: ${item.name}`)
          break
        }
        case 'key': {
          registerDirection(dir, 'Key: Nearby')
          break
        }
        case 'door': {
          registerDirection(dir, scene.hasKey ? 'Door: Unlockable' : 'Door: Locked')
          break
        }
        case 'stairs': {
          registerDirection(dir, 'Stairs: Next floor')
          break
        }
        default:
          break
      }
    }
  }

  const totalItems = scene.inventory?.reduce((sum: number, stack: any) => sum + (stack.quantity ?? 0), 0) ?? 0

  const statsLines = [
    `FLOOR ${scene.floor}`,
    `HP ${scene.playerStats.hp}`,
    `ATK ${playerCombat.atk}`,
    `DEF ${playerCombat.def}`,
    `KEY ${scene.hasKey ? 'Y' : 'N'}`,
    `COINS ${scene.coins}`,
    `WEAPON ${scene.playerWeapon ? scene.playerWeapon.name : 'None'}`,
    `ARMOR ${scene.playerArmor ? scene.playerArmor.name : 'None'}`,
    `ITEMS ${totalItems}`
  ]
  if (scene.playerWeapon) {
    const special = scene.playerWeapon.special
    const currentCharge = Math.min(scene.weaponCharge, special.chargeMax)
    statsLines.push(`  +ATK ${scene.playerWeapon.atk}`)
    statsLines.push(`  Special ${special.name}: DMG ${special.damage}`)
    statsLines.push(`  Charge ${currentCharge}/${special.chargeMax}`)
    if (currentCharge >= special.chargeMax) statsLines.push('  Special READY')
    if (special.desc) statsLines.push(`  ${special.desc}`)
  }
  if (scene.playerArmor) {
    statsLines.push(`  +DEF ${scene.playerArmor.def}`)
    if (typeof scene.playerArmor.shield === 'number') statsLines.push(`  Shield HP ${scene.playerArmor.shield}`)
    if (scene.playerArmor.desc) statsLines.push(`  ${scene.playerArmor.desc}`)
  }

  const lineHeight = 18
  const sectionGap = 12
  const sidebarX = scene.sidebarPadding
  let currentY = scene.sidebarPadding

  const statsText = statsLines.join('\n')
  addTextOnce(scene, 'ui', sidebarX, currentY, statsText, '#ffffff')
  currentY += statsText.split('\n').length * lineHeight + sectionGap

  const statusLinesRaw = (scene.activeStatuses ?? []).map((entry: { def: any; remaining: number }) => {
    const effectBits: string[] = []
    if (entry.def?.atkBonus) effectBits.push(`ATK ${entry.def.atkBonus >= 0 ? '+' : ''}${entry.def.atkBonus}`)
    if (entry.def?.defBonus) effectBits.push(`DEF ${entry.def.defBonus >= 0 ? '+' : ''}${entry.def.defBonus}`)
    if (entry.def?.hpPerTurn) effectBits.push(`HP ${entry.def.hpPerTurn >= 0 ? '+' : ''}${entry.def.hpPerTurn}/turn`)
    const effectSummary = effectBits.length ? ` [${effectBits.join(', ')}]` : ''
    return `${entry.def.name} (${entry.remaining})${effectSummary}`
  })
  const statusHeader = 'Statuses:'
  const statusText = statusLinesRaw.length ? [statusHeader, ...statusLinesRaw].join('\n') : `${statusHeader} none`
  const statusColor = statusLinesRaw.length
    ? (scene.activeStatuses.some((entry: { def: any }) => entry.def.type === 'debuff') ? '#f9a6a6' : '#cfe')
    : '#888'
  addTextOnce(scene, 'status_info', sidebarX, currentY, statusText, statusColor)
  currentY += Math.max(statusText.split('\n').length, 1) * lineHeight + sectionGap

  const knownSkills: SkillDef[] = scene.knownSkills ?? []
  const skillLines = knownSkills.map((skill, idx) => {
    const hotkey = SKILL_HOTKEYS[idx] ?? `#${idx + 1}`
    const cooldown = typeof scene.getSkillCooldown === 'function'
      ? scene.getSkillCooldown(skill.id)
      : (scene.skillCooldowns?.get(skill.id) ?? 0)
    const state = cooldown > 0 ? `CD ${cooldown}` : 'READY'
    return `${hotkey} ${skill.name} (${state})`
  })
  const skillHeader = 'Skills:'
  const skillText = skillLines.length ? [skillHeader, ...skillLines].join('\n') : `${skillHeader} none`
  const skillColor = skillLines.some(line => line.includes('CD')) ? '#ffd27f' : '#cfe'
  addTextOnce(scene, 'skill_info', sidebarX, currentY, skillText, skillColor)
  currentY += Math.max(skillText.split('\n').length, 1) * lineHeight + sectionGap

  const inventoryStacks: any[] = scene.inventory ?? []
  const inventoryLines = inventoryStacks.length
    ? inventoryStacks.map((stack: any, idx: number) => {
        const qty = stack.quantity > 1 ? ` x${stack.quantity}` : ''
        const label = stack.def?.name ?? stack.name ?? 'Unknown'
        return `${idx + 1}. ${label}${qty}`
      })
    : ['(empty)']
  const inventoryHeader = 'Inventory (1-9 to use)'
  const inventoryText = [inventoryHeader, ...inventoryLines].join('\n')
  const inventoryColor = inventoryStacks.length ? '#cfe' : '#888'
  const inventoryLinesCount = Math.max(inventoryText.split('\n').length, 1)
  addTextOnce(scene, 'inventory', sidebarX, currentY, inventoryText, inventoryColor)
  currentY += inventoryLinesCount * lineHeight + sectionGap

  const lastMessage = (scene.lastActionMessage ?? '').trim()
  const lastActionText = ['Last action:', lastMessage.length ? lastMessage : 'None'].join('\n')
  const actionLinesCount = Math.max(lastActionText.split('\n').length, 1)
  addTextOnce(scene, 'last_action', sidebarX, currentY, lastActionText, '#ffe9a6')
  currentY += actionLinesCount * lineHeight + sectionGap

  const rightPanelX = baseX + scene.grid.w * s + 24
  const boxWidth = 220
  const boxPadding = 8
  const verticalGap = 16
  let directionY = scene.sidebarPadding

  DIRECTION_ORDER.forEach(key => {
    const lines = directionInfo[key]
    const content = [DIRECTION_LABEL[key], ...(lines.length ? lines : ['Nothing notable'])]
    const boxHeight = content.length * lineHeight + boxPadding * 2
    scene.gfx.fillStyle(0x102424, 0.8).fillRect(rightPanelX, directionY, boxWidth, boxHeight)
    scene.gfx.lineStyle(1, 0x2c4c4c, 1).strokeRect(rightPanelX, directionY, boxWidth, boxHeight)
    addTextOnce(
      scene,
      `direction_${key.toLowerCase()}`,
      rightPanelX + boxPadding,
      directionY + boxPadding,
      content.join('\n'),
      '#cfe'
    )
    directionY += boxHeight + verticalGap
  })
}





