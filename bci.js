(function () {
  console.log("🔍 bci.js script loaded");
  const WS_URL = "ws://localhost:8765";
  console.log("▶️ BCIClient connecting to", WS_URL);
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => console.log("🔌 BCI WS connected");
  ws.onerror = (e) => console.error("🔌 BCI WS error", e);
  ws.onclose = () => console.warn("🔌 BCI WS closed");

  ws.onmessage = ({ data }) => {
    console.log("🔌 raw:", data);
    const ratio = parseFloat(data);
    console.log("🔌 parsed:", ratio);
    if (isNaN(ratio) || !window.playerSnake) return;

    // 理論範圍
    const minR = 3 / 30;
    const maxR = 8 / 13;
    // clamp 到理論範圍
    const clamped = Phaser.Math.clamp(ratio, minR, maxR);

    // 更新 Game.currentRatio
    if (window.game && window.game.state && window.game.state.states.Game) {
      window.game.state.states.Game.currentRatio = clamped;
      console.log("🔌 currentRatio set to", clamped.toFixed(3));
    }

    // 同步速度
    const base = window.playerSnake.baseSpeed;
    window.playerSnake.setSpeed(base * (1 + ratio * 2));
  };
})();
