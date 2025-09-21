import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'
import { TitleScene } from './scenes/TitleScene'


new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 1600, // 64px * 14 board + sidebar + right info panel
  height: 896, // 64px * 14 board
  backgroundColor: '#0a1414',
  pixelArt: true,
  scene: [TitleScene, GameScene],
})
