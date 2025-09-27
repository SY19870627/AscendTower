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

npm -v如果出現下面錯誤
PS D:\Git\DragonSuccession> node -v v22.20.0 
PS D:\Git\DragonSuccession> npm -v npm : 
因為這個系統上已停用指令碼執行，所以無法載入 C:\Program Files\nodejs\npm.ps1 檔案。
如需詳細資訊，請參閱 about_Execution_Policies，網址為 https:/go.microsoft.com/fwlink/? LinkID=135170。 
位於 線路:1 字元:1 + npm -v + ~~~ + CategoryInfo : 
SecurityError: (:) [], PSSecurityException + FullyQualifiedErrorId : UnauthorizedAccess

代表 PowerShell 的執行政策擋掉了 npm.ps1
以系統管理員身分開 PowerShell，輸入：
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

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
