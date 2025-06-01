/**
 * Player of the core snake for controls
 * @param  {Phaser.Game} game      game object
 * @param  {String} spriteKey Phaser sprite key
 * @param  {Number} x         coordinate
 * @param  {Number} y         coordinate
 */
PlayerSnake = function (game, spriteKey, x, y) {
  Snake.call(this, game, spriteKey, x, y);
  this.cursors = game.input.keyboard.createCursorKeys();

  // === 新增：速度屬性 ===
  this.baseSpeed = 200; // 基礎移動速度
  this.slowSpeed = this.baseSpeed;
  this.fastSpeed = this.baseSpeed * 2;
  this.speed = this.slowSpeed; // 當前速度

  // handle the space key so that the player's snake can speed up
  var spaceKey = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
  spaceKey.onDown.add(this.spaceKeyDown, this);
  spaceKey.onUp.add(this.spaceKeyUp, this);
  this.addDestroyedCallback(function () {
    spaceKey.onDown.remove(this.spaceKeyDown, this);
    spaceKey.onUp.remove(this.spaceKeyUp, this);
  }, this);
};

PlayerSnake.prototype = Object.create(Snake.prototype);
PlayerSnake.prototype.constructor = PlayerSnake;

/**
 * 統一的速度設定介面
 * @param {number} newSpeed - 要設定的速度值
 */
PlayerSnake.prototype.setSpeed = function (newSpeed) {
  this.speed = newSpeed;
};

/** 空白鍵按下：加速 */
PlayerSnake.prototype.spaceKeyDown = function () {
  this.setSpeed(this.fastSpeed);
  this.shadow.isLightingUp = true;
};

/** 空白鍵放開：回到慢速 */
PlayerSnake.prototype.spaceKeyUp = function () {
  this.setSpeed(this.slowSpeed);
  this.shadow.isLightingUp = false;
};

/**
 * Add functionality to the original snake update method so that the player
 * can control where this snake goes, 並使用 this.speed 移動
 */
PlayerSnake.prototype.tempUpdate = PlayerSnake.prototype.update;
PlayerSnake.prototype.update = function () {
  // 1. 轉向控制（滑鼠 + 方向鍵、複製你原本的邏輯）
  var mousePosX = this.game.input.activePointer.worldX;
  var mousePosY = this.game.input.activePointer.worldY;
  var headX = this.head.body.x;
  var headY = this.head.body.y;
  var angle =
    (180 * Math.atan2(mousePosX - headX, mousePosY - headY)) / Math.PI;
  angle = angle > 0 ? 180 - angle : -180 - angle;
  var dif = this.head.body.angle - angle;
  this.head.body.setZeroRotation();

  if (this.cursors.left.isDown) {
    this.head.body.rotateLeft(this.rotationSpeed);
  } else if (this.cursors.right.isDown) {
    this.head.body.rotateRight(this.rotationSpeed);
  } else if ((dif < 0 && dif > -180) || dif > 180) {
    this.head.body.rotateRight(this.rotationSpeed);
  } else if ((dif > 0 && dif < 180) || dif < -180) {
    this.head.body.rotateLeft(this.rotationSpeed);
  }

  // 2. 呼叫原本 Snake.prototype.update，並在裡面使用 this.speed
  //    確保 Snake.update 裡是這樣設定 velocityFromRotation：
  //    game.physics.arcade.velocityFromRotation(
  //        this.head.rotation, this.speed, this.head.body.velocity
  //    );
  this.tempUpdate();
};
