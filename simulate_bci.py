import time, random
# from pylsl import StreamInfo, StreamOutlet
from pylsl import StreamInfo, StreamOutlet

# 把下面 3 行有 socket 呼叫的直接刪掉：
# import socket
# print("模擬器 IP:", socket.gethostbyname(socket.gethostname()))

print("BCI 模擬器啟動中...")

info   = StreamInfo('Unity_Markers','Markers',1,0,'string','bci123')
outlet = StreamOutlet(info)

# 設定初始階段為低值
is_high_phase = False
start_time = time.time()
last_ratio = 0.3  # 初始值

while True:
    current_time = time.time()
    elapsed_time = current_time - start_time
    
    # 每10秒切換一次狀態
    if elapsed_time >= 10:
        is_high_phase = not is_high_phase
        start_time = current_time
        print("\n" + "="*50)
        print(f"切換到{'高' if is_high_phase else '低'}值階段")
        print("="*50 + "\n")
    
    if is_high_phase:
        # 高值範圍：0.6-0.8
        target_ratio = random.uniform(0.6, 0.8)
    else:
        # 低值範圍：0.2-0.4
        target_ratio = random.uniform(0.2, 0.4)
    
    # 平滑過渡：每次最多改變0.1
    if target_ratio > last_ratio:
        ratio = min(last_ratio + 0.1, target_ratio)
    else:
        ratio = max(last_ratio - 0.1, target_ratio)
    
    # 加入小幅度隨機波動
    ratio += random.uniform(-0.02, 0.02)
    ratio = max(0.1, min(0.9, ratio))  # 確保值在合理範圍內
    
    last_ratio = ratio
    
    outlet.push_sample([str(ratio)])
    print(f"[{'高' if is_high_phase else '低'}] theta/beta ratio: {ratio:.4f}")
    time.sleep(0.5)  # 加快更新頻率使變化更平滑