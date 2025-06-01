import time, random
# from pylsl import StreamInfo, StreamOutlet
from pylsl import StreamInfo, StreamOutlet

# 把下面 3 行有 socket 呼叫的直接刪掉：
# import socket
# print("模擬器 IP:", socket.gethostbyname(socket.gethostname()))

print("BCI 模擬器啟動中...")

info   = StreamInfo('Unity_Markers','Markers',1,0,'string','bci123')
outlet = StreamOutlet(info)

while True:
    theta = random.uniform(3, 8)
    beta  = random.uniform(13, 30)
    ratio = theta / beta
    outlet.push_sample([str(ratio)])
    print(f"發送 theta/beta ratio: {ratio:.4f}")
    time.sleep(1)