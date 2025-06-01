class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.otherPlayers = new Map();
        this.foods = new Map();
        this.username = '';
        // 從 URL 參數獲取伺服器位址，如果沒有則使用預設值
        const urlParams = new URLSearchParams(window.location.search);
        const serverUrl = urlParams.get('server') || 'http://localhost:3000';
        this.socket = io(serverUrl);
        this.setupSocketListeners();
        this.setupLoginHandlers();
    }

    setupLoginHandlers() {
        const loginScreen = document.getElementById('login-screen');
        const usernameInput = document.getElementById('username-input');
        const playButton = document.getElementById('play-button');
        const leaderboard = document.getElementById('leaderboard');

        playButton.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            if (username) {
                this.username = username;
                loginScreen.classList.add('hidden');
                leaderboard.classList.remove('hidden');
                this.startGame();
            }
        });

        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                playButton.click();
            }
        });
    }

    startGame() {
        // 開始遊戲
        this.game.state.states.Game.startGame();
        
        // 發送玩家加入資訊
        this.socket.emit('playerJoin', {
            username: this.username,
            x: window.playerSnake.head.body.x,
            y: window.playerSnake.head.body.y,
            angle: window.playerSnake.head.body.angle,
            speed: window.playerSnake.speed,
            snakeLength: window.playerSnake.snakeLength,
            scale: window.playerSnake.scale
        });
    }

    setupSocketListeners() {
        // 當連線成功時
        this.socket.on('connect', () => {
            console.log('已連線到遊戲伺服器');
        });

        // 當收到當前所有玩家資訊時
        this.socket.on('currentPlayers', (players) => {
            players.forEach(player => {
                if (player.id !== this.socket.id) {
                    this.addOtherPlayer(player);
                }
            });
        });

        // 當收到當前所有食物資訊時
        this.socket.on('currentFoods', (foods) => {
            foods.forEach(food => {
                this.addFood(food);
            });
        });

        // 當有新玩家加入時
        this.socket.on('newPlayer', (player) => {
            this.addOtherPlayer(player);
        });

        // 當其他玩家移動時
        this.socket.on('playerMoved', (player) => {
            const otherPlayer = this.otherPlayers.get(player.id);
            if (otherPlayer) {
                otherPlayer.updatePosition(player);
            }
        });

        // 當玩家離開時
        this.socket.on('playerLeft', (playerId) => {
            const otherPlayer = this.otherPlayers.get(playerId);
            if (otherPlayer) {
                otherPlayer.destroy();
                this.otherPlayers.delete(playerId);
            }
        });

        // 當食物被移除時
        this.socket.on('foodRemoved', (foodId) => {
            const food = this.foods.get(foodId);
            if (food) {
                food.destroy();
                this.foods.delete(foodId);
            }
        });

        // 當有新食物生成時
        this.socket.on('newFood', (foodData) => {
            this.addFood(foodData);
        });

        // 當排行榜更新時
        this.socket.on('leaderboardUpdate', (players) => {
            this.updateLeaderboard(players);
        });
    }

    updateLeaderboard(players) {
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = `${player.username}: ${player.score}`;
            if (player.id === this.socket.id) {
                li.style.fontWeight = 'bold';
            }
            leaderboardList.appendChild(li);
        });
    }

    addOtherPlayer(playerData) {
        const otherPlayer = new OtherPlayerSnake(
            this.game,
            'circle',
            playerData.x,
            playerData.y,
            playerData.id
        );
        otherPlayer.setScale(playerData.scale);
        otherPlayer.setSpeed(playerData.speed);
        otherPlayer.setColor(playerData.color);
        otherPlayer.setUsername(playerData.username);
        this.otherPlayers.set(playerData.id, otherPlayer);
    }

    addFood(foodData) {
        const food = new Food(this.game, foodData.x, foodData.y);
        food.id = foodData.id;
        this.foods.set(foodData.id, food);
    }

    update() {
        // 嚴格判斷 playerSnake 是否存在且有 head/body
        if (!window.playerSnake || !window.playerSnake.head || !window.playerSnake.head.body) return;
        this.socket.emit('playerMove', {
            username: this.username,
            x: window.playerSnake.head.body.x,
            y: window.playerSnake.head.body.y,
            angle: window.playerSnake.head.body.angle,
            speed: window.playerSnake.speed,
            snakeLength: window.playerSnake.snakeLength,
            scale: window.playerSnake.scale,
            score: window.playerSnake.score || 0
        });
    }

    handleDeath() {
        this.socket.emit('playerDeath');
        // 直接 reload 頁面，leaderboard 不隱藏
        window.location.reload();
    }
}

class OtherPlayerSnake extends Snake {
    constructor(game, spriteKey, x, y, id) {
        super(game, spriteKey, x, y);
        this.id = id;
        this.username = '';
    }

    updatePosition(playerData) {
        this.head.body.x = playerData.x;
        this.head.body.y = playerData.y;
        this.head.body.angle = playerData.angle;
        this.setSpeed(playerData.speed);
        this.setScale(playerData.scale);
        this.setColor(playerData.color);
        this.setUsername(playerData.username);
    }

    setColor(color) {
        this.head.tint = color;
        this.sections.forEach(section => {
            section.tint = color;
        });
    }

    setUsername(username) {
        this.username = username;
    }
} 