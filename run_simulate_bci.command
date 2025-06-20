#!/bin/bash
# 請先確保 ~/.zshrc 中已設定 intel alias，如：
# alias intel="env /usr/bin/arch -x86_64 /bin/zsh --login"

# 載入 zsh 設定（alias 會定義在此）
source ~/.zshrc

# 切換到 x86_64 模式（透過 alias intel）
intel

# 啟動 conda 環境
conda activate bci_unity

# 設定 liblsl 的路徑（使用你下載並解壓到 ~/lsl_x86 的版本）
export PYLSL_LIB="$HOME/lsl_x86/lib/liblsl.dylib"

echo "🚀 啟動 simulate_bci.py..."
python "/Users/marktsai333/Documents/專題/slither-bci-demo/slither-io/simulate_bci.py"

echo "完成。請按任意鍵關閉此視窗..."
read -n 1 -s -r