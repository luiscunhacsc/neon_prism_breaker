import { Brick, BrickTypes } from '../entities/Brick.js';

/**
 * Fábrica orientada a dados (Data-Driven Level Design) para geração de níveis.
 * Códigos: '.' vazio, 'S' normal, 'A' blindado (2 HP), 'H' pesado (3 HP), 'E' explosivo, 'X' indestrutível.
 */
const LEVEL_BLUEPRINTS = [
  {
    name: 'Prisma Inicial',
    grid: [
      'SSSSSSSSSS',
      'SSSSSSSSSS',
      'S..S..S..S',
      'SSSSSSSSSS',
    ],
  },
  {
    name: 'Fortaleza Ciano',
    grid: [
      'A.A.A.A.A.',
      'SSSSSSSSSS',
      'S.E.SS.E.S',
      'SSSSSSSSSS',
      'X..S..S..X',
    ],
  },
  {
    name: 'Núcleo Reativo',
    grid: [
      'HHHHHHHHHH',
      'A.E.AA.E.A',
      'SS.XXXX.SS',
      'A.E.AA.E.A',
      'SSSSSSSSSS',
    ],
  },
  {
    name: 'Cidadela Prismática',
    grid: [
      'X.HHHHHH.X',
      'AEEAAAAEEA',
      'SSSSSSSSSS',
      'X.A.EE.A.X',
      'HHHHHHHHHH',
    ],
  },
];

export class LevelManager {
  constructor(canvasWidth) {
    this.canvasWidth = canvasWidth;
    this.totalLevels = LEVEL_BLUEPRINTS.length;
  }

  buildLevel(levelNumber) {
    const idx = Math.max(0, Math.min(this.totalLevels - 1, levelNumber - 1));
    const blueprint = LEVEL_BLUEPRINTS[idx];
    const cols = blueprint.grid[0].length;
    const paddingX = 48;
    const gap = 8;
    const brickWidth = (this.canvasWidth - paddingX * 2 - gap * (cols - 1)) / cols;
    const brickHeight = 24;
    const startY = 64;
    const bricks = [];

    blueprint.grid.forEach((rowStr, r) => {
      [...rowStr].forEach((cell, c) => {
        if (cell === '.') return;
        const x = paddingX + c * (brickWidth + gap);
        const y = startY + r * (brickHeight + gap);

        let type = BrickTypes.STANDARD;
        let hp = 1;
        if (cell === 'A') { type = BrickTypes.ARMORED; hp = 2; }
        else if (cell === 'H') { type = BrickTypes.ARMORED; hp = 3; }
        else if (cell === 'E') { type = BrickTypes.EXPLOSIVE; hp = 1; }
        else if (cell === 'X') { type = BrickTypes.INDESTRUCTIBLE; hp = Infinity; }

        bricks.push(new Brick({ x, y, width: brickWidth, height: brickHeight, type, hp, row: r }));
      });
    });

    return { name: blueprint.name, bricks };
  }
}
