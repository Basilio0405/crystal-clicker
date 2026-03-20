const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // Create simple placeholder textures using graphics
    this.createPlaceholderTextures();
  }

  createPlaceholderTextures() {
    // Player texture (simple stickman)
    const playerGfx = this.add.graphics();
    const width = 32;
    const height = 48;
    const centerX = width / 2;

    // Clear and set styles
    playerGfx.clear();
    playerGfx.lineStyle(3, 0xffffff, 1);

    // Head (circle)
    const headRadius = 6;
    const headCenterY = 10;
    playerGfx.strokeCircle(centerX, headCenterY, headRadius);

    // Body
    const bodyTopY = headCenterY + headRadius;
    const bodyBottomY = 32;
    playerGfx.lineBetween(centerX, bodyTopY, centerX, bodyBottomY);

    // Arms
    const armY = bodyTopY + 6;
    playerGfx.lineBetween(centerX, armY, centerX - 8, armY + 4);
    playerGfx.lineBetween(centerX, armY, centerX + 8, armY + 4);

    // Legs
    const legStartY = bodyBottomY;
    const legEndY = height - 2;
    playerGfx.lineBetween(centerX, legStartY, centerX - 6, legEndY);
    playerGfx.lineBetween(centerX, legStartY, centerX + 6, legEndY);

    playerGfx.generateTexture("player", width, height);
    playerGfx.destroy();

    // Monster texture (simple red square with eyes)
    const monsterGfx = this.add.graphics();
    const mSize = 28;
    monsterGfx.fillStyle(0xef4444, 1);
    monsterGfx.fillRect(0, 0, mSize, mSize);
    // Eyes
    monsterGfx.fillStyle(0xffffff, 1);
    monsterGfx.fillRect(6, 6, 5, 5);
    monsterGfx.fillRect(mSize - 11, 6, 5, 5);
    monsterGfx.fillStyle(0x000000, 1);
    monsterGfx.fillRect(8, 8, 2, 2);
    monsterGfx.fillRect(mSize - 9, 8, 2, 2);
    monsterGfx.generateTexture("monster", mSize, mSize);
    monsterGfx.destroy();

    // Door texture
    const doorGfx = this.add.graphics();
    doorGfx.fillStyle(0x22d3ee, 1);
    doorGfx.fillRect(0, 0, 32, 48);
    doorGfx.generateTexture("door", 32, 48);
    doorGfx.destroy();

    // Projectile texture
    const projGfx = this.add.graphics();
    projGfx.fillStyle(0xfacc15, 1);
    projGfx.fillRect(0, 0, 12, 4);
    projGfx.generateTexture("projectile", 12, 4);
    projGfx.destroy();

    // Ground/platform texture (simple gray rectangle)
    const platformGfx = this.add.graphics();
    platformGfx.fillStyle(0x6b7280, 1);
    platformGfx.fillRect(0, 0, 200, 24);
    platformGfx.generateTexture("platform", 200, 24);
    platformGfx.destroy();
  }

  create() {
    // Enable arcade physics
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Health
    this.playerMaxHealth = 150;
    this.playerHealth = this.playerMaxHealth;
    this.playerInvulnerable = false;
    this.healthBarMaxWidth = 200;

    // Player facing direction for shooting
    this.playerFacing = "right";
    this.inLevelTransition = false;

    // Groups
    this.platforms = this.physics.add.staticGroup();
    this.monsters = this.physics.add.group();
    this.projectiles = this.physics.add.group({
      allowGravity: false,
    });

    // Player
    this.player = this.physics.add.sprite(100, GAME_HEIGHT - 100, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.player.body.setSize(32, 48);

    // Colliders
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.monsters, this.platforms);
    this.physics.add.collider(
      this.projectiles,
      this.platforms,
      (projectile) => {
        projectile.destroy();
      }
    );
    this.physics.add.overlap(
      this.projectiles,
      this.monsters,
      (projectile, monster) => {
        projectile.destroy();
        monster.destroy();
      }
    );
    this.physics.add.overlap(
      this.player,
      this.monsters,
      this.handlePlayerHit,
      null,
      this
    );

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.jumpKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.shootKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.X
    );

    // Instructions text
    this.add
      .text(
        16,
        16,
        "Left/Right: Arrows\nJump: Space\nShoot: X\nReach the door to advance",
        {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#ffffff",
        }
      )
      .setScrollFactor(0);

    // Health bar UI
    const barX = 16;
    const barY = 60;

    this.healthBarBg = this.add.rectangle(
      barX,
      barY,
      this.healthBarMaxWidth,
      12,
      0x4b5563
    );
    this.healthBarBg.setOrigin(0, 0.5);

    this.healthBar = this.add.rectangle(
      barX,
      barY,
      this.healthBarMaxWidth,
      12,
      0x22c55e
    );
    this.healthBar.setOrigin(0, 0.5);

    // Level definitions (more levels, increasing difficulty)
    this.levels = [
      {
        playerStart: { x: 100, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 60 },
        platforms: [
          { x: GAME_WIDTH / 2 + 100, y: GAME_HEIGHT - 150 },
          { x: GAME_WIDTH / 2 - 150, y: GAME_HEIGHT - 220 },
        ],
        monsters: [
          {
            x: GAME_WIDTH / 2 + 100,
            y: GAME_HEIGHT - 180,
            vx: 60,
          },
        ],
      },
      {
        playerStart: { x: 80, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 100, y: GAME_HEIGHT - 220 },
        platforms: [
          { x: GAME_WIDTH / 2 - 150, y: GAME_HEIGHT - 180 },
          { x: GAME_WIDTH / 2 + 120, y: GAME_HEIGHT - 240 },
          { x: GAME_WIDTH / 2 - 220, y: GAME_HEIGHT - 300 },
        ],
        monsters: [
          {
            x: GAME_WIDTH / 2 - 150,
            y: GAME_HEIGHT - 200,
            vx: 70,
          },
          {
            x: GAME_WIDTH / 2 + 120,
            y: GAME_HEIGHT - 260,
            vx: -70,
          },
        ],
      },
      {
        playerStart: { x: 80, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 60, y: GAME_HEIGHT - 300 },
        platforms: [
          { x: GAME_WIDTH / 2 - 180, y: GAME_HEIGHT - 160 },
          { x: GAME_WIDTH / 2 + 60, y: GAME_HEIGHT - 210 },
          { x: GAME_WIDTH / 2 + 200, y: GAME_HEIGHT - 260 },
          { x: GAME_WIDTH / 2 - 100, y: GAME_HEIGHT - 310 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2 - 180, y: GAME_HEIGHT - 180, vx: 80 },
          { x: GAME_WIDTH / 2 + 60, y: GAME_HEIGHT - 230, vx: -80 },
        ],
      },
      {
        playerStart: { x: 80, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 60, y: GAME_HEIGHT - 280 },
        platforms: [
          { x: GAME_WIDTH / 2 - 200, y: GAME_HEIGHT - 170 },
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 210 },
          { x: GAME_WIDTH / 2 + 200, y: GAME_HEIGHT - 250 },
          { x: GAME_WIDTH / 2 - 120, y: GAME_HEIGHT - 290 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 230, vx: 90 },
          { x: GAME_WIDTH / 2 + 200, y: GAME_HEIGHT - 270, vx: -90 },
        ],
      },
      {
        playerStart: { x: 60, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 320 },
        platforms: [
          { x: GAME_WIDTH / 2 - 220, y: GAME_HEIGHT - 160 },
          { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT - 200 },
          { x: GAME_WIDTH / 2 + 140, y: GAME_HEIGHT - 240 },
          { x: GAME_WIDTH / 2 - 200, y: GAME_HEIGHT - 280 },
          { x: GAME_WIDTH / 2 + 40, y: GAME_HEIGHT - 320 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT - 220, vx: 100 },
          { x: GAME_WIDTH / 2 + 140, y: GAME_HEIGHT - 260, vx: -100 },
        ],
      },
      {
        playerStart: { x: 60, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 300 },
        platforms: [
          { x: GAME_WIDTH / 2 - 220, y: GAME_HEIGHT - 150 },
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 190 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 230 },
          { x: GAME_WIDTH / 2 - 120, y: GAME_HEIGHT - 270 },
          { x: GAME_WIDTH / 2 + 80, y: GAME_HEIGHT - 310 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 210, vx: 110 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 250, vx: -110 },
          { x: GAME_WIDTH / 2 - 120, y: GAME_HEIGHT - 290, vx: 80 },
        ],
      },
      {
        playerStart: { x: 60, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 260 },
        platforms: [
          { x: GAME_WIDTH / 2 - 200, y: GAME_HEIGHT - 150 },
          { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT - 185 },
          { x: GAME_WIDTH / 2 + 120, y: GAME_HEIGHT - 220 },
          { x: GAME_WIDTH / 2 - 160, y: GAME_HEIGHT - 255 },
          { x: GAME_WIDTH / 2 + 40, y: GAME_HEIGHT - 290 },
          { x: GAME_WIDTH / 2 + 200, y: GAME_HEIGHT - 325 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT - 205, vx: 120 },
          { x: GAME_WIDTH / 2 + 120, y: GAME_HEIGHT - 240, vx: -120 },
          { x: GAME_WIDTH / 2 + 40, y: GAME_HEIGHT - 310, vx: 90 },
        ],
      },
      {
        playerStart: { x: 60, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 240 },
        platforms: [
          { x: GAME_WIDTH / 2 - 220, y: GAME_HEIGHT - 150 },
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 190 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 230 },
          { x: GAME_WIDTH / 2 - 150, y: GAME_HEIGHT - 270 },
          { x: GAME_WIDTH / 2 + 50, y: GAME_HEIGHT - 310 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 350 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 210, vx: 130 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 250, vx: -130 },
          { x: GAME_WIDTH / 2 - 150, y: GAME_HEIGHT - 290, vx: 100 },
        ],
      },
      {
        playerStart: { x: 60, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 220 },
        platforms: [
          { x: GAME_WIDTH / 2 - 200, y: GAME_HEIGHT - 150 },
          { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT - 185 },
          { x: GAME_WIDTH / 2 + 120, y: GAME_HEIGHT - 220 },
          { x: GAME_WIDTH / 2 - 160, y: GAME_HEIGHT - 255 },
          { x: GAME_WIDTH / 2 + 40, y: GAME_HEIGHT - 290 },
          { x: GAME_WIDTH / 2 + 200, y: GAME_HEIGHT - 325 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT - 205, vx: 140 },
          { x: GAME_WIDTH / 2 + 120, y: GAME_HEIGHT - 240, vx: -140 },
          { x: GAME_WIDTH / 2 + 40, y: GAME_HEIGHT - 310, vx: 110 },
          { x: GAME_WIDTH / 2 + 200, y: GAME_HEIGHT - 345, vx: -110 },
        ],
      },
      {
        playerStart: { x: 60, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 200 },
        platforms: [
          { x: GAME_WIDTH / 2 - 220, y: GAME_HEIGHT - 150 },
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 190 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 230 },
          { x: GAME_WIDTH / 2 - 150, y: GAME_HEIGHT - 270 },
          { x: GAME_WIDTH / 2 + 50, y: GAME_HEIGHT - 310 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 350 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 210, vx: 150 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 250, vx: -150 },
          { x: GAME_WIDTH / 2 - 150, y: GAME_HEIGHT - 290, vx: 120 },
          { x: GAME_WIDTH / 2 + 50, y: GAME_HEIGHT - 330, vx: -120 },
        ],
      },
      {
        playerStart: { x: 60, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 220 },
        platforms: [
          { x: GAME_WIDTH / 2 - 220, y: GAME_HEIGHT - 150 },
          { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT - 185 },
          { x: GAME_WIDTH / 2 + 140, y: GAME_HEIGHT - 220 },
          { x: GAME_WIDTH / 2 - 180, y: GAME_HEIGHT - 255 },
          { x: GAME_WIDTH / 2 + 20, y: GAME_HEIGHT - 290 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 325 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT - 205, vx: 160 },
          { x: GAME_WIDTH / 2 + 140, y: GAME_HEIGHT - 240, vx: -160 },
          { x: GAME_WIDTH / 2 + 20, y: GAME_HEIGHT - 310, vx: 130 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 345, vx: -130 },
        ],
      },
      {
        playerStart: { x: 60, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 240 },
        platforms: [
          { x: GAME_WIDTH / 2 - 200, y: GAME_HEIGHT - 150 },
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 185 },
          { x: GAME_WIDTH / 2 + 200, y: GAME_HEIGHT - 220 },
          { x: GAME_WIDTH / 2 - 150, y: GAME_HEIGHT - 255 },
          { x: GAME_WIDTH / 2 + 50, y: GAME_HEIGHT - 290 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 325 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 205, vx: 170 },
          { x: GAME_WIDTH / 2 + 200, y: GAME_HEIGHT - 240, vx: -170 },
          { x: GAME_WIDTH / 2 - 150, y: GAME_HEIGHT - 275, vx: 140 },
          { x: GAME_WIDTH / 2 + 50, y: GAME_HEIGHT - 310, vx: -140 },
        ],
      },
      {
        playerStart: { x: 60, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 260 },
        platforms: [
          { x: GAME_WIDTH / 2 - 220, y: GAME_HEIGHT - 150 },
          { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT - 185 },
          { x: GAME_WIDTH / 2 + 120, y: GAME_HEIGHT - 220 },
          { x: GAME_WIDTH / 2 - 160, y: GAME_HEIGHT - 255 },
          { x: GAME_WIDTH / 2 + 40, y: GAME_HEIGHT - 290 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 325 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT - 205, vx: 180 },
          { x: GAME_WIDTH / 2 + 120, y: GAME_HEIGHT - 240, vx: -180 },
          { x: GAME_WIDTH / 2 + 40, y: GAME_HEIGHT - 310, vx: 150 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 345, vx: -150 },
          { x: GAME_WIDTH / 2 - 160, y: GAME_HEIGHT - 275, vx: 130 },
        ],
      },
      {
        playerStart: { x: 60, y: GAME_HEIGHT - 100 },
        door: { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 280 },
        platforms: [
          { x: GAME_WIDTH / 2 - 220, y: GAME_HEIGHT - 150 },
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 185 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 220 },
          { x: GAME_WIDTH / 2 - 160, y: GAME_HEIGHT - 255 },
          { x: GAME_WIDTH / 2 + 40, y: GAME_HEIGHT - 290 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 325 },
        ],
        monsters: [
          { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 205, vx: 190 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 240, vx: -190 },
          { x: GAME_WIDTH / 2 - 160, y: GAME_HEIGHT - 275, vx: 160 },
          { x: GAME_WIDTH / 2 + 40, y: GAME_HEIGHT - 310, vx: -160 },
          { x: GAME_WIDTH / 2 + 220, y: GAME_HEIGHT - 345, vx: 140 },
        ],
      },
    ];

    this.currentLevel = 0;
    this.door = null;

    // Load the first level
    this.loadLevel(this.currentLevel);
  }

  update() {
    const speed = 200;
    const jumpVelocity = -550;

    if (!this.player || !this.player.body) {
      return;
    }

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.playerFacing = "left";
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.playerFacing = "right";
    } else {
      this.player.setVelocityX(0);
    }

    // Jump: only when touching the ground/platform
    const isOnGround = this.player.body.blocked.down;
    if (Phaser.Input.Keyboard.JustDown(this.jumpKey) && isOnGround) {
      this.player.setVelocityY(jumpVelocity);
    }

    // Shooting
    if (Phaser.Input.Keyboard.JustDown(this.shootKey)) {
      this.shootProjectile();
    }
  }

  loadLevel(levelIndex) {
    const data = this.levels[levelIndex];
    if (!data) return;

    // Clear existing level objects
    this.clearLevel();

    // Reset health each level
    this.playerHealth = this.playerMaxHealth;
    this.healthBar.displayWidth = this.healthBarMaxWidth;

    // Ground platform (full width at bottom)
    this.platforms
      .create(GAME_WIDTH / 2, GAME_HEIGHT - 12, "platform")
      .setScale(GAME_WIDTH / 200, 1)
      .refreshBody();

    // Level-specific platforms
    data.platforms.forEach((p) => {
      this.platforms.create(p.x, p.y, "platform").refreshBody();
    });

    // Player position
    this.player.setPosition(data.playerStart.x, data.playerStart.y);
    this.player.setVelocity(0, 0);

    // Monsters
    data.monsters.forEach((m, index) => {
      const monster = this.monsters.create(m.x, m.y, "monster");
      monster.setCollideWorldBounds(true);
      monster.setBounceX(1);
      monster.setVelocityX(m.vx);
    });

    // Door
    this.door = this.physics.add.staticImage(
      data.door.x,
      data.door.y,
      "door"
    );
    this.physics.add.overlap(
      this.player,
      this.door,
      this.goToNextLevel,
      null,
      this
    );
  }

  clearLevel() {
    // Clear platforms except the group itself
    this.platforms.clear(true, true);
    this.monsters.clear(true, true);
    this.projectiles.clear(true, true);

    if (this.door) {
      this.door.destroy();
      this.door = null;
    }
  }

  goToNextLevel(player, door) {
    if (this.inLevelTransition) return;
    this.inLevelTransition = true;

    this.currentLevel += 1;
    if (this.currentLevel >= this.levels.length) {
      // Loop back to level 0 after finishing all 10 levels
      this.currentLevel = 0;
    }

    this.time.delayedCall(300, () => {
      this.inLevelTransition = false;
      this.loadLevel(this.currentLevel);
    });
  }

  shootProjectile() {
    const direction = this.playerFacing === "left" ? -1 : 1;
    const offsetX = 16 * direction;

    const projectile = this.projectiles.create(
      this.player.x + offsetX,
      this.player.y,
      "projectile"
    );

    projectile.setVelocityX(400 * direction);

    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (projectile && projectile.active) {
          projectile.destroy();
        }
      },
    });
  }

  handlePlayerHit(player, monster) {
    if (this.playerInvulnerable || this.inLevelTransition) {
      return;
    }

    const damage = 25;
    this.playerHealth = Math.max(this.playerHealth - damage, 0);

    // Update health bar width
    const ratio = this.playerHealth / this.playerMaxHealth;
    this.healthBar.displayWidth = this.healthBarMaxWidth * ratio;

    // Brief invulnerability and flash
    this.playerInvulnerable = true;
    this.player.setTint(0xfff000);

    this.time.addEvent({
      delay: 800,
      callback: () => {
        this.playerInvulnerable = false;
        this.player.clearTint();
      },
    });

    // If health is zero, restart from level 0
    if (this.playerHealth <= 0) {
      this.currentLevel = 0;
      this.scene.restart();
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 800 },
      debug: false,
    },
  },
  backgroundColor: "#111827",
  scene: MainScene,
};

new Phaser.Game(config);

