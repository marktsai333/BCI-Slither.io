/**
 * Bot extension of the core snake
 * @param  {Phaser.Game} game      game object
 * @param  {String} spriteKey Phaser sprite key
 * @param  {Number} x         coordinate
 * @param  {Number} y         coordinate
 */
BotSnake = function(game, spriteKey, x, y) {
    Snake.call(this, game, spriteKey, x, y);
    this.trend = 1;
    
    // 生成隨機顏色
    var r = Math.floor(Math.random() * 200) + 55; // 55-255
    var g = Math.floor(Math.random() * 200) + 55; // 55-255
    var b = Math.floor(Math.random() * 200) + 55; // 55-255
    this.color = (r << 16) | (g << 8) | b;
    
    // 設定蛇頭和身體的顏色
    this.head.tint = this.color;
    this.sections.forEach(function(section) {
        section.tint = this.color;
    }, this);
}

BotSnake.prototype = Object.create(Snake.prototype);
BotSnake.prototype.constructor = BotSnake;

/**
 * Add functionality to the original snake update method so that this bot snake
 * can turn randomly
 */
BotSnake.prototype.tempUpdate = BotSnake.prototype.update;
BotSnake.prototype.update = function() {
    this.head.body.setZeroRotation();

    //ensure that the bot keeps rotating in one direction for a
    //substantial amount of time before switching directions
    if (Util.randomInt(1,20) == 1) {
        this.trend *= -1;
    }
    this.head.body.rotateRight(this.trend * this.rotationSpeed);
    this.tempUpdate();
}
