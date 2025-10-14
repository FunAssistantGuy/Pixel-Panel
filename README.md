## How to Use the Pixel Panel

<img width="1920" height="1080" alt="Example!" src="https://github.com/user-attachments/assets/27eade26-227f-403a-99c7-29b74fd559bc" />

1. Go to [`Bookmarklet Loader.html`](Bookmarklet%20Loader.html).
2. Download the file.
3. Open it in a **new browser tab** to start using the Pixel Panel.

## Mod Applications are open now!

Fill out the application form here: https://forms.gle/KouJQtNyx1rBZzJi8

<img width="500" height="500" alt="pixel" src="https://github.com/user-attachments/assets/428de299-4bb3-4343-881f-3a1992744438" />

[Bookmarklet Loader (1).html](https://github.com/user-attachments/files/22896617/Bookmarklet.Loader.1.html)<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pixel Panel Bookmarklet</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    h1 {
      text-align: center;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    .subtitle {
      text-align: center;
      opacity: 0.9;
      margin-bottom: 30px;
    }
    .bookmarklet-box {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .bookmarklet-link {
      display: inline-block;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 10px;
      font-weight: bold;
      font-size: 1.1em;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: move;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
    .bookmarklet-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }
    .instructions {
      background: rgba(255, 255, 255, 0.1);
      border-left: 4px solid #f5576c;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .instructions h3 {
      margin-top: 0;
    }
    .instructions ol {
      line-height: 1.8;
    }
    .code-box {
      background: rgba(0, 0, 0, 0.4);
      padding: 15px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      overflow-x: auto;
      margin: 10px 0;
      word-wrap: break-word;
    }
    .feature-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .feature-item {
      background: rgba(255, 255, 255, 0.1);
      padding: 15px;
      border-radius: 10px;
      text-align: center;
    }
    .feature-item span {
      font-size: 2em;
      display: block;
      margin-bottom: 10px;
    }
    .note {
      background: rgba(255, 200, 0, 0.2);
      border-left: 4px solid #ffd700;
      padding: 15px;
      margin: 20px 0;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌟 Pixel Panel</h1>
    <p class="subtitle">Your All-in-One Web Utility Bookmarklet</p>

    <div class="bookmarklet-box">
      <h3>📌 Drag this to your bookmarks bar:</h3>
      <p style="text-align: center; margin: 20px 0;">
        <a href="javascript:(function(){var t=Date.now();fetch('https://raw.githubusercontent.com/FunAssistantGuy/Pixel-Panel/refs/heads/main/script.js?t='+t).then(r=>r.text()).then(code=>{var s=document.createElement('script');s.textContent=code;document.body.appendChild(s);}).catch(e=>alert('Failed to load: '+e));})();" class="bookmarklet-link">
          🚀 Pixel Panel
        </a>
      </p>
    </div>

    <div class="instructions">
      <h3>📖 How to Install:</h3>
      <ol>
        <li>Make sure your bookmarks bar is visible (press <strong>Ctrl+Shift+B</strong> on Windows or <strong>Cmd+Shift+B</strong> on Mac)</li>
        <li>Drag the button above to your bookmarks bar</li>
        <li>Click the bookmark on any website to launch Pixel Panel!</li>
      </ol>
    </div>

    <div class="note">
      <strong>✨ Auto-Updates Enabled!</strong> This bookmarklet always loads the latest version of the Pixel Panel!
    </div>

    <div class="feature-list">
      <div class="feature-item">
        <span>🧮</span>
        <strong>Calculator</strong>
      </div>
      <div class="feature-item">
        <span>▶️</span>
        <strong>YouTube Player</strong>
      </div>
      <div class="feature-item">
        <span>🌐</span>
        <strong>Translate</strong>
      </div>
      <div class="feature-item">
        <span>🗓️</span>
        <strong>Calendar</strong>
      </div>
      <div class="feature-item">
        <span>💬</span>
        <strong>Chat</strong>
      </div>
      <div class="feature-item">
        <span>🎮</span>
        <strong>Games</strong>
      </div>
       <div class="feature-item">
        <span>💎</span>
        <strong>More!</strong>
      </div>
    </div>

    <div class="instructions">
      <h3>🔧 Alternative: Manual Installation</h3>
      <p>If dragging doesn't work, follow these steps:</p>
      <ol>
        <li>Right-click on your bookmarks bar and select "Add page" or "New bookmark"</li>
        <li>Name it: <strong>Pixel Panel</strong></li>
        <li>Copy and paste this code into the URL field:</li>
      </ol>
      <div class="code-box">
javascript:(function(){fetch('https://raw.githubusercontent.com/FunAssistantGuy/Pixel-Panel/refs/heads/main/script.js?'+Date.now()).then(r=>r.text()).then(code=>{var s=document.createElement('script');s.textContent=code;document.body.appendChild(s);}).catch(e=>alert('Failed to load: '+e));})();
      </div>
    </div>
  </div>
</body>
</html>

