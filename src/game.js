Game = function (game) {};

Game.prototype = {
  preload: function () {
    // load assets
    this.game.load.image("circle", "asset/circle.png");
    this.game.load.image("shadow", "asset/white-shadow.png");
    this.game.load.image("background", "asset/tile.png");
    this.game.load.image("eye-white", "asset/eye-white.png");
    this.game.load.image("eye-black", "asset/eye-black.png");
    this.game.load.image("food", "asset/hex.png");
  },

  create: function () {
    // expose game instance for BCI
    window.game = this.game;

    var width = this.game.width;
    var height = this.game.height;

    // world bounds and background
    this.game.world.setBounds(-width, -height, width * 2, height * 2);
    this.game.stage.backgroundColor = "#444";
    this.game.add.tileSprite(
      -width,
      -height,
      this.game.world.width,
      this.game.world.height,
      "background"
    );

    // physics and groups
    this.game.physics.startSystem(Phaser.Physics.P2JS);
    this.foodGroup = this.game.add.group();
    this.snakeHeadCollisionGroup = this.game.physics.p2.createCollisionGroup();
    this.foodCollisionGroup = this.game.physics.p2.createCollisionGroup();

    // initial food
    for (var i = 0; i < 100; i++) {
      this.initFood(
        Util.randomInt(-width, width),
        Util.randomInt(-height, height)
      );
    }

    // snakes
    this.game.snakes = [];
    var player = new PlayerSnake(this.game, "circle", 0, 0);
    this.game.camera.follow(player.head);
    window.playerSnake = player;

    // 修改 BotSnake 的初始位置，讓它們離玩家更遠
    var spawnDistance = Math.min(width, height) * 0.4; // 使用世界大小的 40% 作為生成距離
    var angle1 = Math.random() * Math.PI * 2;
    var angle2 = angle1 + Math.PI + (Math.random() * Math.PI - Math.PI/2); // 確保兩個 bot 不會太靠近

    new BotSnake(
      this.game, 
      "circle", 
      Math.cos(angle1) * spawnDistance, 
      Math.sin(angle1) * spawnDistance
    );
    new BotSnake(
      this.game, 
      "circle", 
      Math.cos(angle2) * spawnDistance, 
      Math.sin(angle2) * spawnDistance
    );

    this.game.snakes.forEach(function (snake) {
      snake.head.body.setCollisionGroup(this.snakeHeadCollisionGroup);
      snake.head.body.collides([this.foodCollisionGroup]);
      snake.addDestroyedCallback(this.snakeDestroyed, this);
    }, this);

    // UI bar fixed to camera
    this.barWidth = 300;
    this.barHeight = 20;
    this.barX = (this.game.width - this.barWidth) / 2;
    this.barY = 20;

    // draw bar background
    this.barBg = this.game.add.graphics();
    this.barBg.fixedToCamera = true;
    this.barBg.beginFill(0x0000ff, 0.5); // 淡藍色背景
    this.barBg.drawRect(0, 0, this.barWidth / 2, this.barHeight);
    this.barBg.beginFill(0xff0000, 0.5); // 淡紅色背景
    this.barBg.drawRect(
      this.barWidth / 2,
      0,
      this.barWidth / 2,
      this.barHeight
    );
    this.barBg.endFill();
    this.barBg.cameraOffset.set(this.barX, this.barY);

    // draw triangle marker
    this.barMarker = this.game.add.graphics();
    this.barMarker.fixedToCamera = true;
    this.barMarker.beginFill(0x000000);
    this.barMarker.drawPolygon([
      0,
      this.barHeight + 15,
      -10,
      this.barHeight,
      +10,
      this.barHeight,
    ]);
    this.barMarker.endFill();
    this.barMarker.cameraOffset.set(
      this.barX + this.barWidth / 2,
      this.barY - 5
    );

    // initial ratio
    this.currentRatio = 0.5;
  },

  update: function () {
    // update snakes & food
    this.game.snakes.forEach((snake) => snake.update());
    this.foodGroup.children.forEach((child) => child.food.update());

    // world wrap
    var b = this.game.world.bounds;
    this.game.snakes.forEach((snake) => {
      // 確保蛇頭不會超出邊界
      snake.head.x = Phaser.Math.wrap(snake.head.x, b.x, b.right);
      snake.head.y = Phaser.Math.wrap(snake.head.y, b.y, b.bottom);
      
      // 確保蛇身不會超出邊界
      snake.sections.forEach((section) => {
        section.x = Phaser.Math.wrap(section.x, b.x, b.right);
        section.y = Phaser.Math.wrap(section.y, b.y, b.bottom);
      });
    });

    // update UI marker
    var minRatio = 3 / 30,
      maxRatio = 8 / 13;
    var rClamped = Phaser.Math.clamp(this.currentRatio, minRatio, maxRatio);
    var rNorm = (rClamped - minRatio) / (maxRatio - minRatio);

    // debug
    console.log(
      "BAR DEBUG → currentRatio:",
      this.currentRatio.toFixed(3),
      "rNorm:",
      rNorm.toFixed(3)
    );

    var targetX = this.barX + rNorm * this.barWidth;
    // smooth lerp (0.15 factor)
    var currX = this.barMarker.cameraOffset.x;
    this.barMarker.cameraOffset.x = currX + (targetX - currX) * 0.15;
  },

  initFood: function (x, y) {
    var f = new Food(this.game, x, y);
    f.sprite.body.setCollisionGroup(this.foodCollisionGroup);
    this.foodGroup.add(f.sprite);
    f.sprite.body.collides([this.snakeHeadCollisionGroup]);
    return f;
  },

  snakeDestroyed: function (snake) {
    // drop food along destroyed snake path
    var step = Math.round(snake.headPath.length / snake.snakeLength) * 2 || 1;
    for (var i = 0; i < snake.headPath.length; i += step) {
      this.initFood(
        snake.headPath[i].x + Util.randomInt(-10, 10),
        snake.headPath[i].y + Util.randomInt(-10, 10)
      );
    }
    // respawn bot snake
    if (snake instanceof BotSnake) {
      var self = this;
      setTimeout(function () {
        var player = self.game.snakes.find((s) => s instanceof PlayerSnake);
        if (!player) return;
        
        // 計算新的生成位置
        var spawnDistance = Math.min(
          self.game.world.bounds.width,
          self.game.world.bounds.height
        ) * 0.4; // 使用世界大小的 40% 作為生成距離
        
        var angle = Math.random() * Math.PI * 2;
        var x = player.head.x + Math.cos(angle) * spawnDistance;
        var y = player.head.y + Math.sin(angle) * spawnDistance;
        
        // 確保生成位置在邊界內
        x = Phaser.Math.clamp(x, self.game.world.bounds.x, self.game.world.bounds.right);
        y = Phaser.Math.clamp(y, self.game.world.bounds.y, self.game.world.bounds.bottom);
        
        var bot = new BotSnake(self.game, "circle", x, y);
        bot.head.body.setCollisionGroup(self.snakeHeadCollisionGroup);
        bot.head.body.collides([self.foodCollisionGroup]);
        bot.addDestroyedCallback(self.snakeDestroyed, self);
        
        // grow to match player length
        if (player.snakeLength > bot.snakeLength) {
          bot.addSectionsAfterLast(player.snakeLength - bot.snakeLength);
        }
      }, 300);
    }
  },
};
