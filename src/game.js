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
      // 檢查是否碰到邊界
      if (snake.head.body.x <= b.x || snake.head.body.x >= b.right ||
          snake.head.body.y <= b.y || snake.head.body.y >= b.bottom) {
        
        // 如果是玩家蛇，根據游標位置決定轉向
        if (snake instanceof PlayerSnake) {
          var mousePosX = this.game.input.activePointer.worldX;
          var mousePosY = this.game.input.activePointer.worldY;
          var headX = snake.head.body.x;
          var headY = snake.head.body.y;
          
          // 計算游標相對於蛇頭的角度
          var targetAngle = (180 * Math.atan2(mousePosX - headX, mousePosY - headY)) / Math.PI;
          targetAngle = targetAngle > 0 ? 180 - targetAngle : -180 - targetAngle;
          
          // 根據碰到的邊界調整目標角度
          if (snake.head.body.x <= b.x) {
            // 碰到左邊界，限制角度在 -90 到 90 度之間
            targetAngle = Phaser.Math.clamp(targetAngle, -90, 90);
          } else if (snake.head.body.x >= b.right) {
            // 碰到右邊界，限制角度在 90 到 270 度之間
            targetAngle = Phaser.Math.clamp(targetAngle, 90, 270);
          } else if (snake.head.body.y <= b.y) {
            // 碰到上邊界，限制角度在 0 到 180 度之間
            targetAngle = Phaser.Math.clamp(targetAngle, 0, 180);
          } else {
            // 碰到下邊界，限制角度在 -180 到 0 度之間
            targetAngle = Phaser.Math.clamp(targetAngle, -180, 0);
          }
          
          // 平滑轉向
          var angleDiff = targetAngle - snake.head.body.angle;
          // 確保角度差在 -180 到 180 度之間
          if (angleDiff > 180) angleDiff -= 360;
          if (angleDiff < -180) angleDiff += 360;
          
          // 每次更新時轉向一小部分
          snake.head.body.angle += angleDiff * 0.2;
          
          // 確保蛇不會卡在邊界
          snake.head.body.x = Phaser.Math.clamp(snake.head.body.x, b.x + 2, b.right - 2);
          snake.head.body.y = Phaser.Math.clamp(snake.head.body.y, b.y + 2, b.bottom - 2);
        } else {
          // 如果是 Bot 蛇，使用原來的邏輯
          var currentAngle = snake.head.body.angle;
          var newAngle;
          
          if (snake.head.body.x <= b.x) {
            newAngle = 0;
          } else if (snake.head.body.x >= b.right) {
            newAngle = 180;
          } else if (snake.head.body.y <= b.y) {
            newAngle = 90;
          } else {
            newAngle = -90;
          }
          
          var angleDiff = newAngle - currentAngle;
          if (angleDiff > 180) angleDiff -= 360;
          if (angleDiff < -180) angleDiff += 360;
          
          snake.head.body.angle += angleDiff * 0.2;
          snake.head.body.x = Phaser.Math.clamp(snake.head.body.x, b.x + 2, b.right - 2);
          snake.head.body.y = Phaser.Math.clamp(snake.head.body.y, b.y + 2, b.bottom - 2);
        }
      }
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
