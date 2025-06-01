const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors({
    origin: 'http://localhost:8000',
    credentials: true
}));
// 添加靜態文件服務
app.use(express.static(path.join(__dirname)));
// 添加根路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:8000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// 儲存所有玩家的狀態
const players = new Map();
// 儲存所有食物的狀態
const foods = new Map();
// 遊戲世界大小
const WORLD_SIZE = {
    width: 1600,  // 800 * 2
    height: 1000  // 500 * 2
};

// 生成隨機顏色
function getRandomColor() {
    const colors = [
        0xff0000, // 紅
        0x00ff00, // 綠
        0x0000ff, // 藍
        0xffff00, // 黃
        0xff00ff, // 紫
        0x00ffff, // 青
        0xffa500, // 橙
        0x800080  // 紫
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 初始化食物
function initFoods() {
    for (let i = 0; i < 100; i++) {
        const id = `food_${i}`;
        foods.set(id, {
            id: id,
            x: Math.random() * WORLD_SIZE.width - WORLD_SIZE.width/2,
            y: Math.random() * WORLD_SIZE.height - WORLD_SIZE.height/2
        });
    }
}

// 更新排行榜
function updateLeaderboard() {
    const sortedPlayers = Array.from(players.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    io.emit('leaderboardUpdate', sortedPlayers);
}

// 初始化食物
initFoods();

io.on('connection', (socket) => {
    console.log('玩家已連線:', socket.id);

    // 當新玩家加入時
    socket.on('playerJoin', (playerData) => {
        // 為新玩家分配隨機顏色
        const color = getRandomColor();
        players.set(socket.id, {
            id: socket.id,
            username: playerData.username,
            x: playerData.x,
            y: playerData.y,
            angle: playerData.angle,
            speed: playerData.speed,
            snakeLength: playerData.snakeLength,
            scale: playerData.scale,
            color: color,
            score: 0
        });
        
        // 發送當前所有玩家資訊給新玩家
        socket.emit('currentPlayers', Array.from(players.values()));
        // 發送當前所有食物資訊給新玩家
        socket.emit('currentFoods', Array.from(foods.values()));
        // 發送排行榜資訊
        updateLeaderboard();
        
        // 通知其他玩家有新玩家加入
        socket.broadcast.emit('newPlayer', players.get(socket.id));
    });

    // 當玩家移動時
    socket.on('playerMove', (playerData) => {
        const player = players.get(socket.id);
        if (player) {
            player.x = playerData.x;
            player.y = playerData.y;
            player.angle = playerData.angle;
            player.speed = playerData.speed;
            player.snakeLength = playerData.snakeLength;
            player.scale = playerData.scale;
            player.score = playerData.score;
            player.username = playerData.username;
            
            // 廣播玩家移動資訊給其他玩家
            socket.broadcast.emit('playerMoved', player);
            // 更新排行榜
            updateLeaderboard();
        }
    });

    // 當食物被吃掉時
    socket.on('foodEaten', (foodId) => {
        if (foods.has(foodId)) {
            foods.delete(foodId);
            // 通知所有玩家食物被吃掉
            io.emit('foodRemoved', foodId);
            
            // 生成新的食物
            const newFoodId = `food_${Date.now()}`;
            foods.set(newFoodId, {
                id: newFoodId,
                x: Math.random() * WORLD_SIZE.width - WORLD_SIZE.width/2,
                y: Math.random() * WORLD_SIZE.height - WORLD_SIZE.height/2
            });
            // 通知所有玩家有新食物生成
            io.emit('newFood', foods.get(newFoodId));
        }
    });

    // 當玩家死亡時
    socket.on('playerDeath', () => {
        const player = players.get(socket.id);
        if (player) {
            player.score = 0;
            player.snakeLength = 0;
            player.scale = 0.6;
            updateLeaderboard();
        }
    });

    // 當玩家離開時
    socket.on('disconnect', () => {
        console.log('玩家已離線:', socket.id);
        players.delete(socket.id);
        io.emit('playerLeft', socket.id);
        updateLeaderboard();
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`伺服器運行在 port ${PORT}`);
}); 