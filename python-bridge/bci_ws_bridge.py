# python-bridge/bci_ws_bridge.py
import asyncio
import logging
import websockets
from websockets.exceptions import ConnectionClosed
from pylsl import StreamInlet, ContinuousResolver

STREAM_NAME = "Unity_Markers"  # 必須和你的 simulate_bci.py 一致
WS_PORT     = 8765

logging.basicConfig(level=logging.INFO)

async def lsl_to_ws(ws):
    logging.info("🔗 Browser WS connected, start resolving LSL…")
    resolver = ContinuousResolver("name", STREAM_NAME)
    while not resolver.results():
        await asyncio.sleep(0.2)
    inlet = StreamInlet(resolver.results()[0])
    logging.info("✅ Connected to LSL stream %s", STREAM_NAME)

    try:
        while True:
            # 從 LSL 拉 sample
            res = inlet.pull_sample(timeout=0.0)
            if res:
                sample, timestamp = res
                if sample and sample[0] is not None:
                    logging.info("📡 Forwarding sample '%s'", sample[0])
                    await ws.send(sample[0])
            await asyncio.sleep(0.01)
    except ConnectionClosed as e:
        logging.info("🛑 WS connection closed: %s", e)
        # handler 結束後，serve 會自動接受下一次連線
        return

async def main():
    # serve 時會傳入 path 參數給 handler
    async with websockets.serve(lsl_to_ws, "", WS_PORT):
        logging.info("WS 服務啟動：ws://localhost:%d", WS_PORT)
        await asyncio.Future()  # 永遠不結束

if __name__ == "__main__":
    asyncio.run(main())


