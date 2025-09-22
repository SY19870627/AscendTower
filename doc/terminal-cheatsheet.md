# 🚀 終端機指令備忘錄（Phaser + Vite）

這份備忘錄整理了 **全新環境** 下，從安裝 Node.js/npm，到建立 Phaser + Vite 專案、開發、打包與預覽的完整指令。

建議把專案放在簡單路徑，例如：  
- `C:\dev\games\ascend-tower`  
- 或 `D:\dev\games\ascend-tower`

---

## 🟢 1. 安裝 Node.js 與 npm
1. 到官方網站下載 LTS 版本：[https://nodejs.org](https://nodejs.org)  
   （建議安裝 Node.js 20.x LTS，會自帶 npm）
2. 安裝完成後，檢查版本：
```powershell
node -v
npm -v

cd Git資料夾

# 安裝專案依賴
npm install

# 安裝 Phaser
npm install phaser

# 啟動開發伺服器 (http://localhost:5173)
npm run dev

# 關閉伺服器 (在 terminal 按 Ctrl + C)

# 打包輸出到 dist/
npm run build

# 啟動預覽伺服器 (http://localhost:4173)
npm run preview
