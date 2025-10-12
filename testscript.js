// Fun Assistant - Complete Script with Games
(function() {
  if(document.getElementById("funGuiBox")) document.getElementById("funGuiBox").remove();
  var gui = document.createElement("div");
  gui.id = "funGuiBox";
  gui.style.cssText = "position:fixed;top:50px;right:50px;width:360px;background:#1e1e2f;color:white;font-family:sans-serif;z-index:999999;padding:12px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.5);";
  document.body.appendChild(gui);

  var keyboardListener = null;
  var currentFocus = { type: "display" };
  var chatPanel = null, modchatPanel = null, passwordCorrect = false, userRole = "normal", currentPanel = "normal";
  var snakeInterval = null;
  var flappyInterval = null;

  async function sha256Hex(str) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hashArray = Array.from(new Uint8Array(hashBuf));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const OWNER_HASH = "95125a0d7c7370659219459f0f21a6745a2564cdb27e0c06a0bdd3f7cf564103";
  const MOD_HASH = "52a09997d29387622dee692f5b74988075a4a4dd2bd0f481661fc3d8c68dac62";
  const NORMAL_HASH = "36c8d8697265145d5dd65559fafcd4819fad3036551bb02a6b9b259c55545634";
  const SCHOOL_HASH = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";

  function createButton(t, f, o) {
    var b = document.createElement("button");
    b.type = "button";
    b.innerText = t;
    b.style.cssText = "background:#2a2a40;border:none;border-radius:8px;padding:10px 8px;color:white;cursor:pointer;margin:4px;font-size:15px";
    if(o && o.wide) b.style.width = "100%";
    if(o && o.bg) b.style.background = o.bg;
    b.onmouseover = function() { this.style.filter = "brightness(1.08)"; };
    b.onmouseout = function() { this.style.filter = ""; };
    b.onclick = f;
    return b;
  }

  function makeDisplay() {
    var disp = document.createElement("div");
    disp.style.cssText = "min-height:40px;background:#14141f;border-radius:8px;padding:8px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;cursor:text;";
    disp.id = "calcDisplay";
    disp.tabIndex = 0;
    return disp;
  }

  function createFractionWidget(initialNumerator) {
    var wrapper = document.createElement("span");
    wrapper.className = "frac-widget";
    wrapper.style.cssText = "display:inline-flex;flex-direction:column;align-items:center;border-radius:6px;padding:2px 6px;background:rgba(255,255,255,0.03);";
    var num = document.createElement("input");
    num.type = "text";
    num.value = initialNumerator ? String(initialNumerator) : "";
    num.placeholder = "a";
    num.style.cssText = "width:34px;background:transparent;border:none;color:white;text-align:center;font-size:13px;";
    var bar = document.createElement("div");
    bar.style.cssText = "width:40px;height:1px;background:#777;margin:4px 0;";
    var den = document.createElement("input");
    den.type = "text";
    den.value = "";
    den.placeholder = "b";
    den.style.cssText = "width:34px;background:transparent;border:none;color:white;text-align:center;font-size:13px;";
    num.addEventListener("focus", function() { currentFocus = { type: "fraction", elem: wrapper, part: "num" }; });
    den.addEventListener("focus", function() { currentFocus = { type: "fraction", elem: wrapper, part: "den" }; });
    wrapper._numElem = num;
    wrapper._denElem = den;
    wrapper.appendChild(num);
    wrapper.appendChild(bar);
    wrapper.appendChild(den);
    return wrapper;
  }

  function floatToFraction(x, maxDen) {
    if(!isFinite(x)) return null;
    var neg = x < 0;
    if(neg) x = -x;
    var eps = 1e-10;
    var a = Math.floor(x);
    var h1 = 1, k1 = 0, h = a, k = 1;
    var x1 = x;
    while(true) {
      var frac = h / k;
      if(Math.abs(frac - x) < eps) break;
      var rem = x1 - a;
      if(rem < eps) break;
      x1 = 1 / rem;
      a = Math.floor(x1);
      var h2 = a * h + h1;
      var k2 = a * k + k1;
      if(k2 > maxDen) {
        var r = (maxDen - k1) / k;
        var h_ = Math.round(h1 + r * h);
        var k_ = Math.round(k1 + r * k);
        return (neg ? "-" : "") + h_ + "/" + k_;
      }
      h1 = h;
      k1 = k;
      h = h2;
      k = k2;
    }
    if(k === 1) return (neg ? "-" : "") + h + "/1";
    return (neg ? "-" : "") + h + "/" + k;
  }

  function buildExpressionString(displayEl) {
    var tokens = [];
    var children = Array.from(displayEl.childNodes);
    function isNumberText(s) {
      return /^\s*-?\d+(\.\d+)?\s*$/.test(s);
    }
    for(var i = 0; i < children.length; i++) {
      var ch = children[i];
      if(ch.nodeType === Node.TEXT_NODE) {
        var txt = ch.textContent || "";
        if(txt.trim() !== "") tokens.push(txt);
      } else if(ch.nodeType === Node.ELEMENT_NODE) {
        if(ch.classList && ch.classList.contains("frac-widget")) {
          var n = (ch._numElem.value || "0").trim();
          var d = (ch._denElem.value || "1").trim();
          if(d === "" || d === "0") d = "1";
          var fracExpr = "(" + n + "/" + d + ")";
          var prev = tokens.length ? tokens[tokens.length - 1] : null;
          if(prev !== null && isNumberText(prev)) {
            var whole = prev.trim();
            tokens.pop();
            tokens.push("(" + whole + "+" + fracExpr + ")");
          } else {
            tokens.push(fracExpr);
          }
        } else if(ch.classList && ch.classList.contains("op-span")) {
          var op = ch.dataset.op || ch.innerText || "";
          if(op.trim() === "×") tokens.push("*");
          else if(op.trim() === "÷") tokens.push("/");
          else tokens.push(op.trim());
        } else if(ch.classList && ch.classList.contains("token-span")) {
          tokens.push(ch.innerText || "");
        } else {
          var t = ch.innerText || "";
          if(t.trim() !== "") tokens.push(t);
        }
      }
    }
    return tokens.join("");
  }

  function teardownKeyboard() {
    if(keyboardListener) {
      document.removeEventListener("keydown", keyboardListener);
      keyboardListener = null;
    }
  }

  function showCalculatorFull() {
    gui.innerHTML = "";
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title = document.createElement("strong");
    title.innerText = "🧮 Calculator";
    var backBtn = createButton("←", function() {
      teardownKeyboard();
      buildGridForPanel(currentPanel);
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "18px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var display = makeDisplay();
    gui.appendChild(display);

    var grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:6px;";
    gui.appendChild(grid);

    function appendToDisplayChar(ch) {
      if(currentFocus.type === "fraction") {
        var fw = currentFocus.elem;
        var target = (currentFocus.part === "num") ? fw._numElem : fw._denElem;
        target.value = target.value + ch;
        target.focus();
        return;
      }
      var last = display.lastChild;
      if(last && last.classList && last.classList.contains("token-span")) {
        last.innerText = last.innerText + ch;
      } else {
        var span = document.createElement("span");
        span.className = "token-span";
        span.style.cssText = "padding:2px 6px;border-radius:6px;background:transparent;color:white;";
        span.innerText = ch;
        span.addEventListener("click", function() {
          currentFocus = { type: "display" };
          display.focus();
        });
        display.appendChild(span);
      }
      currentFocus = { type: "display" };
    }

    function insertOperator(opVisible) {
      var opSpan = document.createElement("span");
      opSpan.className = "op-span";
      opSpan.dataset.op = opVisible;
      opSpan.style.cssText = "padding:2px 8px;border-radius:6px;background:rgba(255,255,255,0.02);color:#ffd39a;font-size:16px;";
      opSpan.innerText = " " + opVisible + " ";
      opSpan.addEventListener("click", function() {
        currentFocus = { type: "display" };
        display.focus();
      });
      display.appendChild(opSpan);
      currentFocus = { type: "display" };
    }

    grid.appendChild(createButton("clear", function() {
      display.innerHTML = "";
      currentFocus = { type: "display" };
    }));
    grid.appendChild(createButton("⌫", function() {
      handleBackspace(display);
    }));
    grid.appendChild(createButton("a/b", function() {
      handleSlashAsFraction(display);
    }));
    grid.appendChild(createButton("÷", function() {
      insertOperator("÷");
    }));

    [["7", "8", "9", "×"], ["4", "5", "6", "-"], ["1", "2", "3", "+"]].forEach(function(row) {
      for(var i = 0; i < 4; i++) {
        var label = row[i];
        if(/\d|\./.test(label)) {
          grid.appendChild(createButton(label, function(lbl) {
            return function() {
              appendToDisplayChar(lbl);
            };
          }(label)));
        } else {
          grid.appendChild(createButton(label, function(lbl) {
            return function() {
              insertOperator(lbl);
            };
          }(label)));
        }
      }
    });

    var zero = createButton("0", function() {
      appendToDisplayChar("0");
    });
    zero.style.gridColumn = "1 / span 2";
    grid.appendChild(zero);
    grid.appendChild(createButton(".", function() {
      appendToDisplayChar(".");
    }));
    grid.appendChild(createButton("=", function() {
      handleEquals(display);
    }));

    var resArea = document.createElement("div");
    resArea.style.cssText = "margin-top:8px;background:#14141f;padding:8px;border-radius:8px;min-height:28px;color:#dfe6ff;font-size:14px;";
    gui.appendChild(resArea);

    function handleSlashAsFraction(displayEl) {
      var chs = Array.from(displayEl.childNodes);
      var last = chs[chs.length - 1];
      var initialNum = null;
      if(last && last.nodeType === Node.ELEMENT_NODE && last.classList.contains("token-span")) {
        var txt = last.innerText.trim();
        if(/^-?\d+(\.\d+)?$/.test(txt)) {
          initialNum = txt;
          last.remove();
        }
      }
      var fw = createFractionWidget(initialNum);
      displayEl.appendChild(fw);
      setTimeout(function() {
        fw._denElem.focus();
        currentFocus = { type: "fraction", elem: fw, part: "den" };
      }, 0);
    }

    function handleBackspace(displayEl) {
      if(currentFocus.type === "fraction") {
        var fw = currentFocus.elem;
        var el = (currentFocus.part === "num") ? fw._numElem : fw._denElem;
        if(el.value.length) el.value = el.value.slice(0, -1);
        else {
          fw.remove();
          currentFocus = { type: "display" };
        }
        return;
      }
      var chs = Array.from(displayEl.childNodes);
      if(!chs.length) return;
      var last = chs[chs.length - 1];
      if(last.nodeType === Node.ELEMENT_NODE && last.classList.contains("token-span")) {
        if(last.innerText.length > 1) last.innerText = last.innerText.slice(0, -1);
        else last.remove();
      } else {
        last.remove();
      }
    }

    function handleEquals(displayEl) {
      var expr = buildExpressionString(displayEl);
      if(!expr) return;
      try {
        var value = eval(expr);
        var dec = (Math.abs(value) < 1e-12) ? 0 : value;
        var frac = floatToFraction(dec, 1000);
        var resultText = "Decimal: " + dec;
        if(frac) resultText += " • Fraction: " + frac;
        resArea.innerText = resultText;
      } catch(e) {
        resArea.innerText = "Invalid expression";
      }
    }

    function onKeyDown(e) {
      const active = document.activeElement;
      if(active && active.tagName === "INPUT" && active.closest(".frac-widget")) {
        return;
      }

      if(e.key === "Enter") {
        e.preventDefault();
        handleEquals(display);
        return;
      }
      if(e.key === "Backspace") {
        e.preventDefault();
        handleBackspace(display);
        return;
      }
      if(e.key === "/") {
        e.preventDefault();
        handleSlashAsFraction(display);
        return;
      }
      if(["+", "-", "*", "^"].includes(e.key)) {
        e.preventDefault();
        insertOperator(e.key === "*" ? "×" : e.key);
        return;
      }
      if(e.key === "." || (e.key >= "0" && e.key <= "9")) {
        e.preventDefault();
        appendToDisplayChar(e.key);
        return;
      }
    }

    keyboardListener = onKeyDown;
    document.addEventListener("keydown", keyboardListener);
  }

  function showYouTubePlayer() {
    gui.innerHTML = "";
    var h = document.createElement("div");
    h.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px";
    var ti = document.createElement("strong");
    ti.textContent = "▶ YouTube Player";
    h.appendChild(ti);
    var back = createButton("←", function() {
      buildGridForPanel(currentPanel);
    });
    back.style.background = "none";
    back.style.border = "none";
    back.style.fontSize = "18px";
    back.style.margin = "0";
    h.appendChild(back);
    gui.appendChild(h);

    var input = document.createElement("input");
    input.placeholder = "Search YouTube";
    input.style.cssText = "width:100%;padding:8px;border-radius:6px;margin-bottom:8px;border:none;font-size:14px;";
    gui.appendChild(input);

    var resultsDiv = document.createElement("div");
    resultsDiv.style.cssText = "margin-top:8px;max-height:400px;overflow-y:auto;";
    gui.appendChild(resultsDiv);

    input.addEventListener("keypress", function(e) {
      if(e.key === "Enter") performSearch();
    });

    async function performSearch() {
      if(!input.value.trim()) {
        alert("Enter search term!");
        return;
      }
      resultsDiv.innerHTML = "<div style='text-align:center;padding:20px;color:#999;'>Loading...</div>";
      try {
        let res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(input.value)}&type=video&maxResults=5&key=AIzaSyDyefgakEe7bbGnKL90rWbkHT9dScsIF3M`);
        let data = await res.json();
        resultsDiv.innerHTML = "";
        if(!data.items || data.items.length === 0) {
          resultsDiv.innerHTML = "<div style='text-align:center;padding:20px;color:#999;'>No results found!</div>";
          return;
        }
        data.items.forEach(item => {
          let vidDiv = document.createElement("div");
          vidDiv.style.cssText = "margin-bottom:12px;background:#14141f;padding:8px;border-radius:8px;";

          let iframe = document.createElement("iframe");
          iframe.src = `https://www.youtube.com/embed/${item.id.videoId}`;
          iframe.width = "100%";
          iframe.height = "200";
          iframe.frameBorder = "0";
          iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
          iframe.allowFullscreen = true;
          iframe.style.borderRadius = "8px";
          vidDiv.appendChild(iframe);

          let titleDiv = document.createElement("div");
          titleDiv.style.cssText = "margin-top:8px;color:#dfe6ff;font-size:13px;font-weight:bold;";
          titleDiv.textContent = item.snippet.title;
          vidDiv.appendChild(titleDiv);

          resultsDiv.appendChild(vidDiv);
        });
      } catch(e) {
        resultsDiv.innerHTML = "<div style='text-align:center;padding:20px;color:#ff6b6b;'>Error loading videos. Please try again!</div>";
      }
    }

    var searchBtn = createButton("Search", performSearch, { wide: true });
    searchBtn.style.background = "#ff0000";
    gui.appendChild(searchBtn);
  }

  function showTranslatePanel() {
    gui.innerHTML = "";
    var h = document.createElement("div");
    h.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px";
    var ti = document.createElement("strong");
    ti.textContent = "🌐 Translate";
    h.appendChild(ti);
    var back = createButton("←", function() {
      buildGridForPanel(currentPanel);
    });
    back.style.background = "none";
    back.style.border = "none";
    back.style.fontSize = "18px";
    back.style.margin = "0";
    h.appendChild(back);
    gui.appendChild(h);
    var input = document.createElement("input");
    input.placeholder = "Text to translate";
    input.style.cssText = "width:100%;padding:8px;border-radius:6px;margin-bottom:8px;border:none";
    gui.appendChild(input);
    var select = document.createElement("select");
    select.style.cssText = "width:100%;padding:8px;border-radius:6px;margin-bottom:8px";
    var languages = { "English": "en", "Spanish": "es", "French": "fr", "German": "de", "Chinese": "zh-CN", "Japanese": "ja" };
    for(var lang in languages) {
      var option = document.createElement("option");
      option.value = languages[lang];
      option.textContent = lang;
      select.appendChild(option);
    }
    gui.appendChild(select);
    var btn = createButton("Translate", function() {
      var text = encodeURIComponent(input.value.trim());
      if(!text) {
        alert("Enter text to translate!");
        return;
      }
      var lang = select.value;
      window.open(`https://translate.google.com/?sl=auto&tl=${lang}&text=${text}&op=translate`, "_blank");
    }, { wide: true });
    gui.appendChild(btn);
  }

  function danceParty() {
    var c = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"], i = 0;
    var intv = setInterval(() => {
      document.body.style.background = c[i % 6];
      i++;
    }, 200);
    setTimeout(() => {
      clearInterval(intv);
      document.body.style.background = "";
    }, 5000);
  }

  function mirrorMode() {
    document.body.style.transform = document.body.style.transform === "scaleX(-1)" ? "" : "scaleX(-1)";
  }

  function showCalendarPanel() {
    gui.innerHTML = "";
    let now = new Date(), month = now.getMonth(), year = now.getFullYear();
    function renderCalendar() {
      gui.innerHTML = "";
      var header = document.createElement("div");
      header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px";
      var back = createButton("←", function() {
        buildGridForPanel(currentPanel);
      });
      back.style.background = "none";
      back.style.border = "none";
      back.style.fontSize = "18px";
      back.style.margin = "0";
      header.appendChild(back);
      var monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
      var title = document.createElement("strong");
      title.textContent = `${monthName} ${year}`;
      header.appendChild(title);
      var nav = document.createElement("div");
      nav.style.display = "flex";
      nav.style.gap = "4px";
      nav.appendChild(createButton("<", function() {
        month--;
        if(month < 0) {
          month = 11;
          year--;
        }
        renderCalendar();
      }));
      nav.appendChild(createButton(">", function() {
        month++;
        if(month > 11) {
          month = 0;
          year++;
        }
        renderCalendar();
      }));
      header.appendChild(nav);
      gui.appendChild(header);
      var cal = document.createElement("div");
      cal.style.cssText = "display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:4px";
      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(d => {
        var day = document.createElement("div");
        day.textContent = d;
        day.style.fontWeight = "bold";
        day.style.textAlign = "center";
        cal.appendChild(day);
      });
      var firstDay = new Date(year, month, 1).getDay();
      var lastDate = new Date(year, month + 1, 0).getDate();
      for(let i = 0; i < firstDay; i++) cal.appendChild(document.createElement("div"));
      for(let i = 1; i <= lastDate; i++) {
        let cell = document.createElement("div");
        cell.textContent = i;
        cell.style.textAlign = "center";
        cell.style.padding = "6px 0";
        cell.style.cursor = "pointer";
        cell.style.borderRadius = "6px";
        if(i === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
          cell.style.background = "#2a2a40";
          cell.style.fontWeight = "bold";
        }
        cell.onmouseover = () => cell.style.background = "#3a3a50";
        cell.onmouseout = () => {
          if(i === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
            cell.style.background = "#2a2a40";
          } else {
            cell.style.background = "";
          }
        };
        cell.onclick = () => alert(`You clicked ${i}/${month + 1}/${year}`);
        cal.appendChild(cell);
      }
      gui.appendChild(cal);
    }
    renderCalendar();
  }

  function showGamesPanel() {
    gui.innerHTML = "";
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title = document.createElement("strong");
    title.innerText = "🎮 Games";
    var backBtn = createButton("←", function() {
      buildGridForPanel(currentPanel);
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "18px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:1fr;gap:8px;";
    
    grid.appendChild(createButton("🐍 Snake", showSnakeGame, { wide: true, bg: "#4CAF50" }));
    grid.appendChild(createButton("🐦 Flappy Bird", showFlappyBirdGame, { wide: true, bg: "#2196F3" }));
    grid.appendChild(createButton("🎨 Drawing Pad", showDrawingPad, { wide: true, bg: "#FF9800" }));
    grid.appendChild(createButton("📝 Wordle", showWordleGame, { wide: true, bg: "#6AAA64" }));
    
    gui.appendChild(grid);
  }

  function showSnakeGame() {
    gui.innerHTML = "";
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title = document.createElement("strong");
    title.innerText = "🐍 Snake";
    var backBtn = createButton("←", function() {
      if(snakeInterval) clearInterval(snakeInterval);
      snakeInterval = null;
      showGamesPanel();
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "18px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var scoreDiv = document.createElement("div");
    scoreDiv.style.cssText = "text-align:center;margin-bottom:8px;font-size:16px;color:#4CAF50;";
    scoreDiv.innerText = "Score: 0";
    gui.appendChild(scoreDiv);

    var canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    canvas.style.cssText = "display:block;margin:0 auto;background:#14141f;border-radius:8px;";
    gui.appendChild(canvas);

    var ctx = canvas.getContext("2d");
    var gridSize = 20;
    var tileCount = 16;
    var snake = [{ x: 8, y: 8 }];
    var dx = 0, dy = 0;
    var food = { x: 5, y: 5 };
    var score = 0;

    function drawGame() {
      ctx.fillStyle = "#14141f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = "#4CAF50";
      snake.forEach(segment => {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
      });
      
      ctx.fillStyle = "#FF5252";
      ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
    }

    function moveSnake() {
      if(dx === 0 && dy === 0) return;
      
      var head = { x: snake[0].x + dx, y: snake[0].y + dy };
      
      if(head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        clearInterval(snakeInterval);
        snakeInterval = null;
        alert("Game Over! Score: " + score);
        showGamesPanel();
        return;
      }
      
      for(var i = 0; i < snake.length; i++) {
        if(snake[i].x === head.x && snake[i].y === head.y) {
          clearInterval(snakeInterval);
          snakeInterval = null;
          alert("Game Over! Score: " + score);
          showGamesPanel();
          return;
        }
      }
      
      snake.unshift(head);
      
      if(head.x === food.x && head.y === food.y) {
        score++;
        scoreDiv.innerText = "Score: " + score;
        food = {
          x: Math.floor(Math.random() * tileCount),
          y: Math.floor(Math.random() * tileCount)
        };
      } else {
        snake.pop();
      }
      
      drawGame();
    }

    var snakeKeyHandler = function(e) {
      if(e.key === "ArrowUp" && dy === 0) { dx = 0; dy = -1; }
      else if(e.key === "ArrowDown" && dy === 0) { dx = 0; dy = 1; }
      else if(e.key === "ArrowLeft" && dx === 0) { dx = -1; dy = 0; }
      else if(e.key === "ArrowRight" && dx === 0) { dx = 1; dy = 0; }
    };
    
    document.addEventListener("keydown", snakeKeyHandler);

    drawGame();
    snakeInterval = setInterval(moveSnake, 150);
  }

  function showFlappyBirdGame() {
    gui.innerHTML = "";
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title = document.createElement("strong");
    title.innerText = "🐦 Flappy Bird";
    var backBtn = createButton("←", function() {
      if(flappyInterval) clearInterval(flappyInterval);
      flappyInterval = null;
      showGamesPanel();
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "18px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var scoreDiv = document.createElement("div");
    scoreDiv.style.cssText = "text-align:center;margin-bottom:8px;font-size:16px;color:#2196F3;";
    scoreDiv.innerText = "Score: 0";
    gui.appendChild(scoreDiv);

    var canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 400;
    canvas.style.cssText = "display:block;margin:0 auto;background:#87CEEB;border-radius:8px;cursor:pointer;";
    gui.appendChild(canvas);

    var ctx = canvas.getContext("2d");
    var bird = { x: 50, y: 200, velocity: 0, radius: 12 };
    var pipes = [];
    var score = 0;
    var gameStarted = false;

    function drawBird() {
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawPipes() {
      ctx.fillStyle = "#228B22";
      pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
        ctx.fillRect(pipe.x, pipe.top + pipe.gap, pipe.width, canvas.height);
      });
    }

    function drawGame() {
      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawPipes();
      drawBird();
      
      if(!gameStarted) {
        ctx.fillStyle = "white";
        ctx.font = "20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Click to Start", canvas.width / 2, canvas.height / 2);
      }
    }

    function updateGame() {
      if(!gameStarted) return;
      
      bird.velocity += 0.5;
      bird.y += bird.velocity;
      
      if(bird.y + bird.radius > canvas.height || bird.y - bird.radius < 0) {
        endGame();
        return;
      }
      
      pipes.forEach(pipe => {
        pipe.x -= 2;
        
        if(pipe.x + pipe.width < 0) {
          pipes.shift();
          score++;
          scoreDiv.innerText = "Score: " + score;
        }
        
        if(bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipe.width) {
          if(bird.y - bird.radius < pipe.top || bird.y + bird.radius > pipe.top + pipe.gap) {
            endGame();
            return;
          }
        }
      });
      
      if(pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 150) {
        var gapY = Math.random() * (canvas.height - 200) + 100;
        pipes.push({
          x: canvas.width,
          top: gapY - 75,
          gap: 150,
          width: 50
        });
      }
      
      drawGame();
    }

    function endGame() {
      clearInterval(flappyInterval);
      flappyInterval = null;
      alert("Game Over! Score: " + score);
      showGamesPanel();
    }

    canvas.addEventListener("click", function() {
      if(!gameStarted) {
        gameStarted = true;
        flappyInterval = setInterval(updateGame, 20);
      }
      bird.velocity = -8;
    });

    drawGame();
  }

  function showDrawingPad() {
    gui.innerHTML = "";
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title = document.createElement("strong");
    title.innerText = "🎨 Drawing Pad";
    var backBtn = createButton("←", function() {
      showGamesPanel();
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "18px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var controls = document.createElement("div");
    controls.style.cssText = "display:flex;gap:8px;margin-bottom:8px;align-items:center;";
    
    var colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.value = "#FFFFFF";
    colorPicker.style.cssText = "width:40px;height:30px;border:none;border-radius:6px;cursor:pointer;";
    
    var sizeSlider = document.createElement("input");
    sizeSlider.type = "range";
    sizeSlider.min = "1";
    sizeSlider.max = "20";
    sizeSlider.value = "3";
    sizeSlider.style.cssText = "flex:1;";
    
    var clearBtn = createButton("Clear", function() {
      ctx.fillStyle = "#14141f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
    clearBtn.style.margin = "0";
    
    controls.appendChild(colorPicker);
    controls.appendChild(sizeSlider);
    controls.appendChild(clearBtn);
    gui.appendChild(controls);

    var canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    canvas.style.cssText = "display:block;margin:0 auto;background:#14141f;border-radius:8px;cursor:crosshair;";
    gui.appendChild(canvas);

    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#14141f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    var isDrawing = false;

    canvas.addEventListener("mousedown", function(e) {
      isDrawing = true;
      var rect = canvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    });

    canvas.addEventListener("mousemove", function(e) {
      if(!isDrawing) return;
      var rect = canvas.getBoundingClientRect();
      ctx.strokeStyle = colorPicker.value;
      ctx.lineWidth = sizeSlider.value;
      ctx.lineCap = "round";
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    });

    canvas.addEventListener("mouseup", function() {
      isDrawing = false;
    });

    canvas.addEventListener("mouseleave", function() {
      isDrawing = false;
    });
  }

  function showWordleGame() {
    gui.innerHTML = "";
    gui.style.width = "600px";
    gui.style.right = "";
    gui.style.left = "50%";
    gui.style.transform = "translateX(-50%)";
    gui.style.top = "20px";
    
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;";
    var title = document.createElement("strong");
    title.style.fontSize = "20px";
    title.innerText = "📝 Wordle";
    var backBtn = createButton("←", function() {
      gui.style.width = "360px";
      gui.style.right = "50px";
      gui.style.left = "";
      gui.style.transform = "";
      gui.style.top = "50px";
      showGamesPanel();
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "22px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = "max-height:500px;overflow-y:auto;overflow-x:hidden;";
    gui.appendChild(contentWrapper);

    var words = ["ABOUT","ABOVE","ABUSE","ACTOR","ACUTE","ADMIT","ADOPT","ADULT","AFTER","AGAIN","AGENT","AGREE","AHEAD","ALARM","ALBUM","ALERT","ALIEN","ALIGN","ALIKE","ALIVE","ALLOW","ALONE","ALONG","ALTER","ANGEL","ANGLE","ANGRY","APART","APPLE","APPLY","ARENA","ARGUE","ARISE","ARMOR","ARMY","AROSE","ARRAY","ARROW","ASIDE","ASSET","ATOM","ATTIC","AUDIO","AVOID","AWAKE","AWARD","AWARE","BADLY","BAKER","BASES","BASIC","BASIN","BASIS","BEACH","BEGAN","BEGIN","BEING","BELOW","BENCH","BILLY","BIRTH","BLACK","BLADE","BLAME","BLANK","BLAST","BLEED","BLEND","BLESS","BLIND","BLINK","BLOCK","BLOOD","BLOOM","BLOWN","BOARD","BOOST","BOOTH","BOUND","BOWEL","BOXER","BRAIN","BRAKE","BRAND","BRASS","BRAVE","BREAD","BREAK","BREED","BRIEF","BRING","BROAD","BROKE","BROWN","BRUSH","BUILD","BUILT","BUNCH","BURST","BUYER","CABLE","CACHE","CALIF","CAMEL","CANAL","CANDY","CANON","CARRY","CARVE","CATCH","CAUSE","CHAIN","CHAIR","CHAOS","CHARM","CHART","CHASE","CHEAP","CHEAT","CHECK","CHEEK","CHEST","CHIEF","CHILD","CHINA","CHOSE","CIVIL","CLAIM","CLASS","CLEAN","CLEAR","CLICK","CLIFF","CLIMB","CLOCK","CLONE","CLOSE","CLOTH","CLOUD","COACH","COAST","CORAL","COUCH","COULD","COUNT","COURT","COVER","CRACK","CRAFT","CRASH","CRAZY","CREAM","CREEK","CRIME","CRISP","CROSS","CROWD","CROWN","CRUDE","CRUEL","CRUSH","CURVE","CYCLE","DAILY","DAIRY","DANCE","DATED","DEALT","DEATH","DEBUT","DECAY","DELAY","DELTA","DENSE","DEPTH","DOING","DOUBT","DOZEN","DRAFT","DRAIN","DRANK","DRAWN","DREAM","DRESS","DRILL","DRINK","DRIVE","DROVE","DROWN","DUTCH","DYING","EAGER","EARLY","EARTH","EIGHT","ELECT","ELITE","EMPTY","ENEMY","ENJOY","ENTER","ENTRY","EQUAL","ERROR","ERUPT","ESSAY","ETHER","ETHIC","EVENT","EVERY","EXACT","EXERT","EXIST","EXTRA","FAITH","FALSE","FAULT","FENCE","FIBER","FIELD","FIFTH","FIFTY","FIGHT","FINAL","FIRST","FIXED","FLASH","FLEET","FLESH","FLOOR","FLUID","FOCUS","FORCE","FORTH","FORTY","FORUM","FOUND","FRAME","FRANK","FRAUD","FRESH","FRONT","FROST","FRUIT","FULLY","FUNNY","GIANT","GIVEN","GLASS","GLOBE","GLORY","GRACE","GRADE","GRAIN","GRAND","GRANT","GRAPH","GRASS","GRAVE","GREAT","GREED","GREEK","GREEN","GREET","GROSS","GROUP","GROVE","GROWN","GUARD","GUESS","GUEST","GUIDE","GUILD","GUILT","HABIT","HAPPY","HARRY","HARSH","HATE","HAUNT","HEART","HEAVY","HEDGE","HELLO","HENRY","HORSE","HOTEL","HOUSE","HUMAN","HUMOR","IDEAL","IMAGE","IMPLY","INDEX","INNER","INPUT","IRONY","ISSUE","IVORY","JAPAN","JIMMY","JOINT","JONES","JUDGE","KNOWN","LABEL","LABOR","LARGE","LASER","LATER","LAUGH","LAYER","LEARN","LEASE","LEAST","LEAVE","LEGAL","LEMON","LEVEL","LEVER","LIGHT","LIMIT","LINEN","LIVED","LIVER","LOCAL","LOGIC","LOOSE","LOWER","LOYAL","LUCKY","LUNCH","LYING","MAGIC","MAJOR","MAKER","MARCH","MARRY","MATCH","MATRIX","MAYOR","MEANT","MEDIA","METAL","MIGHT","MINOR","MINUS","MIXED","MODEL","MONEY","MONTH","MORAL","MOTOR","MOUNT","MOUSE","MOUTH","MOVED","MOVIE","MUSIC","NEEDS","NERVE","NEVER","NEWLY","NIGHT","NINTH","NOBLE","NOISE","NORTH","NOTED","NOVEL","NURSE","OCCUR","OCEAN","OFFER","OFTEN","ORDER","OTHER","OUGHT","OUTER","OWNER","PAINT","PANEL","PANIC","PAPER","PARTY","PASTA","PATCH","PAUSE","PEACE","PEACH","PEARL","PHASE","PHONE","PHOTO","PIANO","PIECE","PILOT","PITCH","PLACE","PLAIN","PLANE","PLANT","PLATE","PLAZA","PLEAD","POINT","POKER","POLAR","POUND","POWER","PRESS","PRICE","PRIDE","PRIME","PRINT","PRIOR","PRISON","PRIZE","PROOF","PROUD","PROVE","QUEEN","QUICK","QUIET","QUITE","QUOTA","QUOTE","RADIO","RAISE","RANCH","RANGE","RANKS","RAPID","RATIO","REACH","REACT","REALM","REBEL","REFER","RELAX","RELAY","REMOTE","REPLY","RIDER","RIDGE","RIFLE","RIGHT","RIGID","RISKY","RIVAL","RIVER","ROBIN","ROCKY","ROMAN","ROUGH","ROUND","ROUTE","ROYAL","RUGBY","RURAL","SCALE","SCARE","SCARY","SCENE","SCOPE","SCORE","SCOUT","SCREW","SCRIPT","SEIZE","SENSE","SERVE","SETUP","SEVEN","SHADE","SHAFT","SHAKE","SHALL","SHAPE","SHARE","SHARP","SHEET","SHELF","SHELL","SHIFT","SHINE","SHINY","SHOCK","SHOOT","SHORT","SHOWN","SHRUG","SIDED","SIGHT","SILLY","SINCE","SIXTH","SIXTY","SIZED","SKILL","SLAVE","SLEEP","SLICE","SLIDE","SLOPE","SMALL","SMART","SMELL","SMILE","SMITH","SMOKE","SNAKE","SNEAK","SOLID","SOLVE","SOUND","SOUTH","SPACE","SPARE","SPARK","SPEAK","SPEED","SPEND","SPENT","SPLIT","SPOKE","SPORT","SPRAY","SQUAD","STACK","STAFF","STAGE","STAKE","STAND","START","STATE","STEAM","STEEL","STEEP","STICK","STILL","STOCK","STONE","STOOD","STORE","STORM","STORY","STRIP","STUCK","STUDY","STUFF","STYLE","SUGAR","SUITE","SUNNY","SUPER","SURGE","SWEET","SWIFT","SWING","SWISS","SWORD","TABLE","TAKEN","TASTE","TAXES","TEACH","TERNA","THANK","THEFT","THEIR","THEME","THERE","THESE","THICK","THING","THINK","THIRD","THOSE","THREE","THREW","THROW","THUMB","TIGHT","TIMER","TIRED","TITLE","TODAY","TOPIC","TOTAL","TOUCH","TOUGH","TOWER","TOXIC","TRACE","TRACK","TRACT","TRADE","TRAIL","TRAIN","TRAIT","TRASH","TREAT","TREND","TRIAL","TRIBE","TRICK","TRIED","TROOP","TRULY","TRUNK","TRUST","TRUTH","TWICE","TWIST","UNCLE","UNDER","UNDUE","UNION","UNITY","UNTIL","UPPER","UPSET","URBAN","USAGE","USUAL","VAGUE","VALID","VALUE","VENUE","VERSE","VIDEO","VIRUS","VISIT","VITAL","VOCAL","VOICE","VOTER","WASTE","WATCH","WATER","WHEEL","WHERE","WHICH","WHILE","WHITE","WHOLE","WHOSE","WIDER","WIELD","WOMAN","WOMEN","WOODS","WORLD","WORRY","WORSE","WORST","WORTH","WOULD","WOUND","WRIST","WRITE","WRONG","WROTE","YIELD","YOUNG","YOURS","YOUTH","ZONES"];
    var targetWord = words[Math.floor(Math.random() * words.length)];
    var currentRow = 0;
    var currentCol = 0;
    var maxGuesses = 6;
    var gameOver = false;

    var messageDiv = document.createElement("div");
    messageDiv.style.cssText = "text-align:center;margin-bottom:12px;font-size:16px;color:#FFD700;min-height:22px;font-weight:bold;";
    contentWrapper.appendChild(messageDiv);

    var boardDiv = document.createElement("div");
    boardDiv.style.cssText = "display:grid;grid-template-rows:repeat(6, 1fr);gap:6px;margin:0 auto 16px;max-width:380px;";
    
    var board = [];
    for(var i = 0; i < maxGuesses; i++) {
      var rowDiv = document.createElement("div");
      rowDiv.style.cssText = "display:grid;grid-template-columns:repeat(5, 1fr);gap:6px;";
      var row = [];
      for(var j = 0; j < 5; j++) {
        var cell = document.createElement("div");
        cell.style.cssText = "width:65px;height:65px;border:3px solid #3a3a3c;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;color:white;background:#121213;border-radius:4px;";
        cell.dataset.row = i;
        cell.dataset.col = j;
        rowDiv.appendChild(cell);
        row.push(cell);
      }
      boardDiv.appendChild(rowDiv);
      board.push(row);
    }
    contentWrapper.appendChild(boardDiv);

    var keyboardDiv = document.createElement("div");
    keyboardDiv.style.cssText = "display:flex;flex-direction:column;gap:6px;max-width:550px;margin:0 auto;";
    
    var keys = [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
    ];

    keys.forEach(function(keyRow) {
      var rowDiv = document.createElement("div");
      rowDiv.style.cssText = "display:flex;gap:5px;justify-content:center;";
      keyRow.forEach(function(key) {
        var keyBtn = document.createElement("button");
        keyBtn.innerText = key;
        keyBtn.style.cssText = "padding:16px;border:none;border-radius:6px;background:#818384;color:white;font-weight:bold;cursor:pointer;font-size:16px;";
        if(key === "ENTER" || key === "⌫") {
          keyBtn.style.padding = "16px 24px";
          keyBtn.style.fontSize = "14px";
        } else {
          keyBtn.style.minWidth = "42px";
        }
        keyBtn.onmouseover = function() { if(!gameOver) this.style.filter = "brightness(1.2)"; };
        keyBtn.onmouseout = function() { this.style.filter = ""; };
        keyBtn.onclick = function() {
          handleKey(key);
        };
        keyBtn.dataset.key = key;
        rowDiv.appendChild(keyBtn);
      });
      keyboardDiv.appendChild(rowDiv);
    });
    contentWrapper.appendChild(keyboardDiv);

    function handleKey(key) {
      if(gameOver) return;
      
      if(key === "ENTER") {
        if(currentCol === 5) {
          checkGuess();
        } else {
          messageDiv.innerText = "Not enough letters!";
          setTimeout(function() { messageDiv.innerText = ""; }, 1000);
        }
      } else if(key === "⌫") {
        if(currentCol > 0) {
          currentCol--;
          board[currentRow][currentCol].innerText = "";
        }
      } else {
        if(currentCol < 5) {
          board[currentRow][currentCol].innerText = key;
          currentCol++;
        }
      }
    }

    function checkGuess() {
      var guess = "";
      for(var i = 0; i < 5; i++) {
        guess += board[currentRow][i].innerText;
      }
      
      var targetLetters = targetWord.split("");
      var guessLetters = guess.split("");
      var colors = ["#3a3a3c", "#3a3a3c", "#3a3a3c", "#3a3a3c", "#3a3a3c"];
      var used = [false, false, false, false, false];
      
      for(var i = 0; i < 5; i++) {
        if(guessLetters[i] === targetLetters[i]) {
          colors[i] = "#6aaa64";
          used[i] = true;
        }
      }
      
      for(var i = 0; i < 5; i++) {
        if(colors[i] === "#6aaa64") continue;
        for(var j = 0; j < 5; j++) {
          if(!used[j] && guessLetters[i] === targetLetters[j]) {
            colors[i] = "#c9b458";
            used[j] = true;
            break;
          }
        }
      }
      
      for(var i = 0; i < 5; i++) {
        board[currentRow][i].style.background = colors[i];
        board[currentRow][i].style.borderColor = colors[i];
        
        var keyBtn = keyboardDiv.querySelector('[data-key="' + guessLetters[i] + '"]');
        if(keyBtn) {
          var currentBg = keyBtn.style.background;
          if(colors[i] === "#6aaa64") {
            keyBtn.style.background = "#6aaa64";
          } else if(colors[i] === "#c9b458" && currentBg !== "rgb(106, 170, 100)") {
            keyBtn.style.background = "#c9b458";
          } else if(colors[i] === "#3a3a3c" && currentBg !== "rgb(106, 170, 100)" && currentBg !== "rgb(201, 180, 88)") {
            keyBtn.style.background = "#3a3a3c";
          }
        }
      }
      
      if(guess === targetWord) {
        messageDiv.innerText = "🎉 You won!";
        messageDiv.style.color = "#6aaa64";
        gameOver = true;
        return;
      }
      
      currentRow++;
      currentCol = 0;
      
      if(currentRow === maxGuesses) {
        messageDiv.innerText = "Game Over! Word was: " + targetWord;
        messageDiv.style.color = "#ff6b6b";
        gameOver = true;
      }
    }

    document.addEventListener("keydown", function wordleKeyHandler(e) {
      if(gameOver) return;
      var key = e.key.toUpperCase();
      if(key === "ENTER") {
        handleKey("ENTER");
      } else if(key === "BACKSPACE") {
        handleKey("⌫");
      } else if(/^[A-Z]$/.test(key)) {
        handleKey(key);
      }
    });
  }

  function openChatPanel() {
    if(chatPanel) return;
    chatPanel = document.createElement("div");
    chatPanel.id = "funChatBox";
    chatPanel.style.cssText = "position:fixed;right:50px;width:360px;background:black;color:white;font-family:sans-serif;z-index:999998;padding:12px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.5);transform:scale(0.95);";
    var h = document.createElement("div");
    h.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:move";
    var t = document.createElement("strong");
    t.textContent = "💬 Chat";
    h.appendChild(t);
    var close = createButton("×", function() {
      chatPanel.remove();
      chatPanel = null;
    });
    close.style.background = "none";
    close.style.border = "none";
    close.style.fontSize = "18px";
    h.appendChild(close);
    chatPanel.appendChild(h);
    var iframe = document.createElement("iframe");
    iframe.src = "https://organizations.minnit.chat/189701754316687/c/ChatMenu?embed";
    iframe.style.cssText = "border:none;width:100%;height:300px;";
    chatPanel.appendChild(iframe);
    document.body.appendChild(chatPanel);
    chatPanel.style.top = (gui.offsetTop + gui.offsetHeight + 10) + "px";
    
    let offsetX = 0, offsetY = 0, isDragging = false;
    
    const onMouseMove = function(e) {
      if(isDragging) {
        chatPanel.style.left = (e.clientX - offsetX) + "px";
        chatPanel.style.top = (e.clientY - offsetY) + "px";
      }
    };
    
    const onMouseUp = function() {
      isDragging = false;
      document.body.style.userSelect = "";
    };
    
    h.onmousedown = function(e) {
      isDragging = true;
      offsetX = e.clientX - chatPanel.offsetLeft;
      offsetY = e.clientY - chatPanel.offsetTop;
      document.body.style.userSelect = "none";
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    chatPanel._moveHandler = onMouseMove;
    chatPanel._upHandler = onMouseUp;
    
    const obs = new ResizeObserver(() => {
      if(chatPanel) chatPanel.style.top = (gui.offsetTop + gui.offsetHeight + 10) + "px";
    });
    obs.observe(gui);
    chatPanel._observer = obs;
  }

  function openModChatPanel() {
    if(modchatPanel) return;
    modchatPanel = document.createElement("div");
    modchatPanel.id = "funModChatBox";
    modchatPanel.style.cssText = "position:fixed;right:50px;width:360px;background:black;color:white;font-family:sans-serif;z-index:999998;padding:12px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.5);transform:scale(0.95);";
    
    var h = document.createElement("div");
    h.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:move";
    
    var t = document.createElement("strong");
    t.textContent = "💬 Mod Chat";
    h.appendChild(t);
    
    var close = createButton("×", function() {
      modchatPanel.remove();
      modchatPanel = null;
    });
    close.style.background = "none";
    close.style.border = "none";
    close.style.fontSize = "18px";
    h.appendChild(close);
    
    modchatPanel.appendChild(h);
    
    var iframe = document.createElement("iframe");
    iframe.src = "https://organizations.minnit.chat/300057567744318/c/Panel?embed";
    iframe.style.cssText = "border:none;width:100%;height:300px;";
    modchatPanel.appendChild(iframe);
    
    document.body.appendChild(modchatPanel);
    modchatPanel.style.top = (gui.offsetTop + gui.offsetHeight + 10) + "px";
    
    let offsetX = 0, offsetY = 0, isDragging = false;
    
    const onMouseMove = function(e) {
      if(isDragging) {
        modchatPanel.style.left = (e.clientX - offsetX) + "px";
        modchatPanel.style.top = (e.clientY - offsetY) + "px";
      }
    };
    
    const onMouseUp = function() {
      isDragging = false;
      document.body.style.userSelect = "";
    };
    
    h.onmousedown = function(e) {
      isDragging = true;
      offsetX = e.clientX - modchatPanel.offsetLeft;
      offsetY = e.clientY - modchatPanel.offsetTop;
      document.body.style.userSelect = "none";
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    modchatPanel._moveHandler = onMouseMove;
    modchatPanel._upHandler = onMouseUp;
    
    const obs = new ResizeObserver(() => {
      if(modchatPanel) modchatPanel.style.top = (gui.offsetTop + gui.offsetHeight + 10) + "px";
    });
    obs.observe(gui);
    modchatPanel._observer = obs;
  }

  function muteAnimations() {
    document.querySelectorAll("*").forEach(e => e.style.animation = "none");
    alert("Animations muted");
  }

  function highlightSections() {
    document.querySelectorAll("section,h1,h2").forEach(e => e.style.outline = "2px solid cyan");
    alert("Sections highlighted");
  }

  function freezeInputs() {
    document.querySelectorAll("input,textarea,select,button").forEach(e => e.disabled = true);
    alert("Inputs frozen");
  }

  function pageStats() {
    alert("Links: " + document.querySelectorAll("a").length + "\nImages: " + document.querySelectorAll("img").length + "\nHeadings: " + document.querySelectorAll("h1,h2,h3,h4,h5,h6").length);
  }

  function quickCopyElements() {
    let t = Array.from(document.querySelectorAll("p")).map(e => e.innerText).join("\n");
    navigator.clipboard.writeText(t);
    alert("Paragraph text copied");
  }

  function toggleImages() {
    document.querySelectorAll("img").forEach(i => i.style.display = i.style.display === "none" ? "block" : "none");
  }

  function themeOverride() {
    document.body.style.background = document.body.style.background === "" ? "#111" : "";
    document.body.style.color = document.body.style.color === "" ? "#eee" : "";
  }

  function ownerNotes() {
    gui.innerHTML = "";
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title = document.createElement("strong");
    title.innerText = "📝 Owner Notes";
    var backBtn = createButton("←", function() {
      buildGridForPanel(currentPanel);
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "18px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var notesData = {};
    try {
      var saved = localStorage.getItem("ownerNotes");
      if(saved) notesData = JSON.parse(saved);
    } catch(e) {}

    var textarea = document.createElement("textarea");
    textarea.placeholder = "Write your notes here...";
    textarea.value = notesData.notes || "";
    textarea.style.cssText = "width:100%;height:250px;padding:8px;border-radius:6px;border:1px solid #3a3a3c;background:#14141f;color:white;font-family:sans-serif;font-size:14px;resize:vertical;";
    gui.appendChild(textarea);

    var saveBtn = createButton("💾 Save Notes", function() {
      try {
        localStorage.setItem("ownerNotes", JSON.stringify({ notes: textarea.value }));
        var msg = document.createElement("div");
        msg.innerText = "✓ Notes saved!";
        msg.style.cssText = "text-align:center;margin-top:8px;color:#4CAF50;font-size:13px;";
        gui.appendChild(msg);
        setTimeout(function() { msg.remove(); }, 2000);
      } catch(e) {
        alert("Error saving notes: " + e.message);
      }
    }, { wide: true, bg: "#4CAF50" });
    saveBtn.style.marginTop = "8px";
    gui.appendChild(saveBtn);

    var clearBtn = createButton("🗑️ Clear Notes", function() {
      if(confirm("Are you sure you want to clear all notes?")) {
        textarea.value = "";
        try {
          localStorage.removeItem("ownerNotes");
          var msg = document.createElement("div");
          msg.innerText = "✓ Notes cleared!";
          msg.style.cssText = "text-align:center;margin-top:8px;color:#ff6b6b;font-size:13px;";
          gui.appendChild(msg);
          setTimeout(function() { msg.remove(); }, 2000);
        } catch(e) {
          alert("Error clearing notes: " + e.message);
        }
      }
    }, { wide: true, bg: "#ff6b6b" });
    clearBtn.style.marginTop = "4px";
    gui.appendChild(clearBtn);
  }

  function togglePanels() {
    if(chatPanel) chatPanel.style.display = chatPanel.style.display === "none" ? "block" : "none";
    if(modchatPanel) modchatPanel.style.display = modchatPanel.style.display === "none" ? "block" : "none";
  }

  var normalButtons = [
    createButton("Calculator", showCalculatorFull),
    createButton("YouTube Player", showYouTubePlayer),
    createButton("Translate", showTranslatePanel),
    createButton("Calendar", showCalendarPanel),
    createButton("Dance Party", danceParty),
    createButton("Mirror Mode", mirrorMode),
    createButton("Chat", openChatPanel),
    createButton("Games", showGamesPanel)
  ];

  var modButtons = [
    createButton("Mute Animations", muteAnimations),
    createButton("Highlight Sections", highlightSections),
    createButton("Freeze Inputs", freezeInputs),
    createButton("Page Stats", pageStats),
    createButton("Quick Copy Elements", quickCopyElements),
    createButton("Toggle Images", toggleImages),
    createButton("Theme Override", themeOverride),
    createButton("Mod Chat", openModChatPanel),
  ];
  
  var ownerButtons = [
    createButton("Owner Notes", ownerNotes),
    createButton("Toggle Panels", togglePanels),
    createButton("Inspect Elements", function() { document.querySelectorAll("*").forEach(e => e.style.outline = "2px solid red"); alert("Elements outlined"); }),
    createButton("Copy All Text", function() { navigator.clipboard.writeText(document.body.innerText); alert("All text copied"); }),
    createButton("Highlight Links", function() { document.querySelectorAll("a").forEach(e => e.style.outline = "2px solid cyan"); alert("All links highlighted"); }),
    createButton("Clear User Data", function() { alert("Local and session storage cleared!"); })
  ];

  var schoolButtons = [
    createButton("📅 Calendar", showCalendarPanel),
    createButton("🔔 Bell Schedule", showBellSchedule),
    createButton("🎵 Focus Music", showFocusMusic),
    createButton("📝 Study Notes", showStudyNotes),
    createButton("⏰ Class Timer", showClassTimer),
    createButton("📚 Resources", showResources)
  ];

  function showBellSchedule() {
    gui.innerHTML = "";
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title = document.createElement("strong");
    title.innerText = "🔔 Bell Schedule";
    var backBtn = createButton("←", function() {
      buildGridForPanel(currentPanel);
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "18px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var schedules = {
      regular: [
        { period: "Zero Period", time: "7:15 AM - 8:00 AM" },
        { period: "First Bell", time: "8:13 AM" },
        { period: "Homeroom", time: "8:18 AM - 8:23 AM" },
        { period: "Period 1", time: "8:23 AM - 9:12 AM" },
        { period: "Period 2", time: "9:17 AM - 10:06 AM" },
        { period: "Period 3", time: "10:11 AM - 11:00 AM" },
        { period: "Period 4", time: "11:05 AM - 11:54 AM" },
        { period: "Lunch", time: "11:54 AM - 12:32 PM" },
        { period: "SSR", time: "12:37 PM - 12:52 PM" },
        { period: "Period 5", time: "12:52 PM - 1:41 PM" },
        { period: "Period 6", time: "1:46 PM - 2:35 PM" }
      ],
      staff: [
        { period: "Zero Period", time: "7:15 AM - 8:00 AM" },
        { period: "First Bell", time: "8:13 AM" },
        { period: "Homeroom", time: "8:18 AM - 8:22 AM" },
        { period: "Period 1", time: "8:22 AM - 8:56 AM" },
        { period: "Period 2", time: "9:01 AM - 9:35 AM" },
        { period: "Period 3", time: "9:40 AM - 10:14 AM" },
        { period: "Period 4", time: "10:19 AM - 10:53 AM" },
        { period: "Nutrition", time: "10:53 AM - 11:12 AM" },
        { period: "Period 5", time: "11:17 AM - 11:51 AM" },
        { period: "Period 6", time: "11:56 AM - 12:30 PM" }
      ],
      minimum: [
        { period: "First Bell", time: "8:13 AM" },
        { period: "Homeroom & Period 1", time: "8:18 AM - 8:49 AM" },
        { period: "Period 2", time: "8:54 AM - 9:20 AM" },
        { period: "Period 3", time: "9:25 AM - 9:51 AM" },
        { period: "Period 4", time: "9:56 AM - 10:22 AM" },
        { period: "Nutrition", time: "10:22 AM - 10:47 AM" },
        { period: "Period 5", time: "10:53 AM - 11:19 AM" },
        { period: "Period 6", time: "11:24 AM - 11:50 AM" }
      ]
    };

    var currentSchedule = "regular";

    var tabContainer = document.createElement("div");
    tabContainer.style.cssText = "display:flex;gap:4px;margin-bottom:10px;";

    var regularTab = createButton("Regular", function() {
      currentSchedule = "regular";
      renderSchedule();
      updateTabs();
    });
    regularTab.style.margin = "0";
    regularTab.style.flex = "1";

    var staffTab = createButton("Staff Day", function() {
      currentSchedule = "staff";
      renderSchedule();
      updateTabs();
    });
    staffTab.style.margin = "0";
    staffTab.style.flex = "1";

    var minimumTab = createButton("Minimum", function() {
      currentSchedule = "minimum";
      renderSchedule();
      updateTabs();
    });
    minimumTab.style.margin = "0";
    minimumTab.style.flex = "1";

    tabContainer.appendChild(regularTab);
    tabContainer.appendChild(staffTab);
    tabContainer.appendChild(minimumTab);
    gui.appendChild(tabContainer);

    var scheduleDiv = document.createElement("div");
    scheduleDiv.id = "scheduleContent";
    gui.appendChild(scheduleDiv);

    function updateTabs() {
      regularTab.style.background = currentSchedule === "regular" ? "#4CAF50" : "#2a2a40";
      staffTab.style.background = currentSchedule === "staff" ? "#4CAF50" : "#2a2a40";
      minimumTab.style.background = currentSchedule === "minimum" ? "#4CAF50" : "#2a2a40";
    }

    function renderSchedule() {
      scheduleDiv.innerHTML = "";
      scheduleDiv.style.cssText = "background:#14141f;border-radius:8px;padding:12px;max-height:300px;overflow-y:auto;";
      
      schedules[currentSchedule].forEach(function(item) {
        var itemDiv = document.createElement("div");
        itemDiv.style.cssText = "padding:10px;margin-bottom:6px;background:#2a2a40;border-radius:6px;display:flex;justify-content:space-between;align-items:center;";
        
        var periodSpan = document.createElement("span");
        periodSpan.style.fontWeight = "bold";
        periodSpan.innerText = item.period;
        
        var timeSpan = document.createElement("span");
        timeSpan.style.color = "#b0b0b0";
        timeSpan.style.fontSize = "13px";
        timeSpan.innerText = item.time;
        
        itemDiv.appendChild(periodSpan);
        itemDiv.appendChild(timeSpan);
        scheduleDiv.appendChild(itemDiv);
      });
    }

    renderSchedule();
    updateTabs();
  }

  function showFocusMusic() {
    gui.innerHTML = "";
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title = document.createElement("strong");
    title.innerText = "🎵 Focus Music";
    var backBtn = createButton("←", function() {
      buildGridForPanel(currentPanel);
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "18px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var playlists = [
      { name: "Lofi Hip Hop", url: "https://www.youtube.com/embed/jfKfPfyJRdk" },
      { name: "Study Beats", url: "https://www.youtube.com/embed/5qap5aO4i9A" },
      { name: "Piano Relaxing", url: "https://www.youtube.com/embed/lTRiuFIWV54" }
    ];

    var currentIndex = 0;
    var iframe = document.createElement("iframe");
    iframe.width = "100%";
    iframe.height = "200";
    iframe.frameBorder = "0";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.style.borderRadius = "8px";
    iframe.src = playlists[currentIndex].url;
    gui.appendChild(iframe);

    var nameDiv = document.createElement("div");
    nameDiv.style.cssText = "text-align:center;margin-top:8px;font-weight:bold;";
    nameDiv.innerText = playlists[currentIndex].name;
    gui.appendChild(nameDiv);

    var btnContainer = document.createElement("div");
    btnContainer.style.cssText = "display:flex;gap:6px;margin-top:8px;";
    
    btnContainer.appendChild(createButton("Previous", function() {
      currentIndex = (currentIndex - 1 + playlists.length) % playlists.length;
      iframe.src = playlists[currentIndex].url;
      nameDiv.innerText = playlists[currentIndex].name;
    }, { wide: true }));
    
    btnContainer.appendChild(createButton("Next", function() {
      currentIndex = (currentIndex + 1) % playlists.length;
      iframe.src = playlists[currentIndex].url;
      nameDiv.innerText = playlists[currentIndex].name;
    }, { wide: true }));
    
    gui.appendChild(btnContainer);
  }

  function showStudyNotes() {
    gui.innerHTML = "";
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title = document.createElement("strong");
    title.innerText = "📝 Study Notes";
    var backBtn = createButton("←", function() {
      buildGridForPanel(currentPanel);
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "18px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var notesData = {};
    try {
      var saved = localStorage.getItem("studyNotes");
      if(saved) notesData = JSON.parse(saved);
    } catch(e) {}

    var textarea = document.createElement("textarea");
    textarea.placeholder = "Write your study notes here...";
    textarea.value = notesData.notes || "";
    textarea.style.cssText = "width:100%;height:200px;padding:8px;border-radius:6px;border:1px solid #3a3a3c;background:#14141f;color:white;font-family:sans-serif;font-size:14px;resize:vertical;";
    gui.appendChild(textarea);

    var saveBtn = createButton("💾 Save Notes", function() {
      try {
        localStorage.setItem("studyNotes", JSON.stringify({ notes: textarea.value }));
        var msg = document.createElement("div");
        msg.innerText = "✓ Notes saved!";
        msg.style.cssText = "text-align:center;margin-top:8px;color:#4CAF50;font-size:13px;";
        gui.appendChild(msg);
        setTimeout(function() { msg.remove(); }, 2000);
      } catch(e) {
        alert("Error saving notes");
      }
    }, { wide: true, bg: "#4CAF50" });
    saveBtn.style.marginTop = "8px";
    gui.appendChild(saveBtn);
  }

  function showClassTimer() {
    gui.innerHTML = "";
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title = document.createElement("strong");
    title.innerText = "⏰ Class Timer";
    var backBtn = createButton("←", function() {
      if(timerInterval) clearInterval(timerInterval);
      buildGridForPanel(currentPanel);
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "18px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var currentPeriodDiv = document.createElement("div");
    currentPeriodDiv.style.cssText = "text-align:center;font-size:18px;font-weight:bold;padding:12px;background:#2a2a40;border-radius:8px;margin-bottom:8px;color:#4CAF50;";
    gui.appendChild(currentPeriodDiv);

    var display = document.createElement("div");
    display.style.cssText = "text-align:center;font-size:48px;font-weight:bold;padding:30px;background:#14141f;border-radius:8px;margin-bottom:12px;";
    display.innerText = "--:--";
    gui.appendChild(display);

    var timerInterval = null;

    var regularSchedule = [
      { name: "Zero Period", start: "7:15", end: "8:00" },
      { name: "Homeroom", start: "8:18", end: "8:23" },
      { name: "Period 1", start: "8:23", end: "9:12" },
      { name: "Period 2", start: "9:17", end: "10:06" },
      { name: "Period 3", start: "10:11", end: "11:00" },
      { name: "Period 4", start: "11:05", end: "11:54" },
      { name: "Lunch", start: "11:54", end: "12:32" },
      { name: "SSR", start: "12:37", end: "12:52" },
      { name: "Period 5", start: "12:52", end: "13:41" },
      { name: "Period 6", start: "13:46", end: "14:35" }
    ];

    var staffSchedule = [
      { name: "Zero Period", start: "7:15", end: "8:00" },
      { name: "Homeroom", start: "8:18", end: "8:22" },
      { name: "Period 1", start: "8:22", end: "8:56" },
      { name: "Period 2", start: "9:01", end: "9:35" },
      { name: "Period 3", start: "9:40", end: "10:14" },
      { name: "Period 4", start: "10:19", end: "10:53" },
      { name: "Nutrition", start: "10:53", end: "11:12" },
      { name: "Period 5", start: "11:17", end: "11:51" },
      { name: "Period 6", start: "11:56", end: "12:30" }
    ];

    var minimumSchedule = [
      { name: "Homeroom & Period 1", start: "8:18", end: "8:49" },
      { name: "Period 2", start: "8:54", end: "9:20" },
      { name: "Period 3", start: "9:25", end: "9:51" },
      { name: "Period 4", start: "9:56", end: "10:22" },
      { name: "Nutrition", start: "10:22", end: "10:47" },
      { name: "Period 5", start: "10:53", end: "11:19" },
      { name: "Period 6", start: "11:24", end: "11:50" }
    ];

    var currentSchedule = regularSchedule;
    var scheduleType = "Regular";

    function timeToMinutes(timeStr) {
      var parts = timeStr.split(":");
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }

    function getCurrentPeriod() {
      var now = new Date();
      var currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      for(var i = 0; i < currentSchedule.length; i++) {
        var period = currentSchedule[i];
        var startMin = timeToMinutes(period.start);
        var endMin = timeToMinutes(period.end);
        
        if(currentMinutes >= startMin && currentMinutes < endMin) {
          return { period: period, secondsLeft: (endMin - currentMinutes) * 60 - now.getSeconds() };
        }
      }
      return null;
    }

    function updateTimer() {
      var current = getCurrentPeriod();
      
      if(current) {
        currentPeriodDiv.innerText = "📚 " + current.period.name + " (" + scheduleType + ")";
        
        var mins = Math.floor(current.secondsLeft / 60);
        var secs = current.secondsLeft % 60;
        display.innerText = mins + ":" + (secs < 10 ? "0" : "") + secs;
        
        if(current.secondsLeft <= 60) {
          display.style.color = "#ff6b6b";
        } else if(current.secondsLeft <= 300) {
          display.style.color = "#FFD700";
        } else {
          display.style.color = "white";
        }
      } else {
        currentPeriodDiv.innerText = "No class in session";
        display.innerText = "--:--";
        display.style.color = "#b0b0b0";
      }
    }

    var btnContainer = document.createElement("div");
    btnContainer.style.cssText = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;";

    var regularBtn = createButton("Regular", function() {
      currentSchedule = regularSchedule;
      scheduleType = "Regular";
      updateTimer();
      regularBtn.style.background = "#4CAF50";
      staffBtn.style.background = "#2a2a40";
      minimumBtn.style.background = "#2a2a40";
    }, { wide: true, bg: "#4CAF50" });

    var staffBtn = createButton("Staff Day", function() {
      currentSchedule = staffSchedule;
      scheduleType = "Staff Day";
      updateTimer();
      regularBtn.style.background = "#2a2a40";
      staffBtn.style.background = "#4CAF50";
      minimumBtn.style.background = "#2a2a40";
    }, { wide: true });

    var minimumBtn = createButton("Minimum", function() {
      currentSchedule = minimumSchedule;
      scheduleType = "Minimum";
      updateTimer();
      regularBtn.style.background = "#2a2a40";
      staffBtn.style.background = "#2a2a40";
      minimumBtn.style.background = "#4CAF50";
    }, { wide: true });

    btnContainer.appendChild(regularBtn);
    btnContainer.appendChild(staffBtn);
    btnContainer.appendChild(minimumBtn);
    gui.appendChild(btnContainer);

    var infoDiv = document.createElement("div");
    infoDiv.style.cssText = "text-align:center;font-size:12px;color:#b0b0b0;padding:8px;";
    infoDiv.innerText = "Timer automatically updates every second";
    gui.appendChild(infoDiv);

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }

  function showResources() {
    gui.innerHTML = "";
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title = document.createElement("strong");
    title.innerText = "📚 Study Resources";
    var backBtn = createButton("←", function() {
      buildGridForPanel(currentPanel);
    });
    backBtn.style.background = "none";
    backBtn.style.border = "none";
    backBtn.style.fontSize = "18px";
    backBtn.style.margin = "0";
    header.appendChild(title);
    header.appendChild(backBtn);
    gui.appendChild(header);

    var resources = [
      { name: "Khan Academy", url: "https://www.khanacademy.org", icon: "📖" },
      { name: "Quizlet", url: "https://quizlet.com", icon: "🎯" },
      { name: "Wolfram Alpha", url: "https://www.wolframalpha.com", icon: "🔬" },
      { name: "Google Scholar", url: "https://scholar.google.com", icon: "🎓" }
    ];

    var container = document.createElement("div");
    container.style.cssText = "display:grid;gap:8px;";

    resources.forEach(function(resource) {
      var btn = createButton(resource.icon + " " + resource.name, function() {
        window.open(resource.url, "_blank");
      }, { wide: true, bg: "#2196F3" });
      container.appendChild(btn);
    });

    gui.appendChild(container);
  }

  function buildGridForPanel(pt) {
    gui.innerHTML = "";
    var h = document.createElement("div");
    h.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px";
    var ti = document.createElement("strong");
    ti.textContent = pt === "owner" ? "🔑 Owner Panel" : pt === "mod" ? "🛡️ Mod Panel" : pt === "school" ? "🎓 School Zone" : "🌟 Fun Assistant";
    h.appendChild(ti);
    if(userRole !== "normal" && userRole !== "school") {
      var t = createButton("Switch Panel", function() { togglePanel(); });
      h.appendChild(t);
    }
    var c = createButton("×", function() { 
      gui.remove(); 
      if(chatPanel) chatPanel.remove(); 
      if(modchatPanel) modchatPanel.remove();
      chatPanel = null; 
      modchatPanel = null;
    });
    c.style.background = "none";
    c.style.border = "none";
    c.style.fontSize = "18px";
    c.style.margin = "0";
    h.appendChild(c);
    gui.appendChild(h);
    var g = document.createElement("div");
    g.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:6px";
    gui.appendChild(g);
    if(pt === "normal") normalButtons.forEach(b => g.appendChild(b));
    if(pt === "mod") modButtons.forEach(b => g.appendChild(b));
    if(pt === "owner") ownerButtons.forEach(b => g.appendChild(b));
    if(pt === "school") schoolButtons.forEach(b => g.appendChild(b));
  }

  function togglePanel() {
    if(userRole === "mod") {
      currentPanel = currentPanel === "normal" ? "mod" : "normal";
    } else if(userRole === "owner") {
      if(currentPanel === "normal") currentPanel = "mod";
      else if(currentPanel === "mod") currentPanel = "owner";
      else currentPanel = "normal";
    }
    buildGridForPanel(currentPanel);
  }

  function showPanelWithBack(title, text) {
    gui.innerHTML = "";
    var h = document.createElement("div");
    h.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px";
    var ti = document.createElement("strong");
    ti.textContent = title;
    h.appendChild(ti);
    var back = createButton("←", function() { buildGridForPanel(currentPanel); });
    back.style.background = "none";
    back.style.border = "none";
    back.style.fontSize = "18px";
    back.style.margin = "0";
    h.appendChild(back);
    gui.appendChild(h);
    var p = document.createElement("div");
    p.textContent = text;
    gui.appendChild(p);
  }

  function showPasswordScreen() {
    gui.innerHTML = "";
    var t = document.createElement("h3");
    t.textContent = "Enter Password";
    gui.appendChild(t);
    var i = document.createElement("input");
    i.type = "password";
    i.placeholder = "Password";
    i.style.cssText = "width:100%;padding:5px;margin-bottom:5px;border-radius:6px;border:none";
    gui.appendChild(i);
    var s = createButton("Submit", function() {
      (async () => {
        var val = i.value || "";
        var h = await sha256Hex(val);
        if(h === OWNER_HASH) { passwordCorrect = true; userRole = "owner"; currentPanel = "normal"; buildGridForPanel(currentPanel); }
        else if(h === MOD_HASH) { passwordCorrect = true; userRole = "mod"; currentPanel = "normal"; buildGridForPanel(currentPanel); }
        else if(h === NORMAL_HASH) { passwordCorrect = true; userRole = "normal"; currentPanel = "normal"; buildGridForPanel(currentPanel); }
        else if(h === SCHOOL_HASH) { passwordCorrect = true; userRole = "school"; currentPanel = "school"; buildGridForPanel(currentPanel); }
        else { gui.innerHTML = "<h3 style='color:red'>You do not have access to this!</h3>"; passwordCorrect = false; }
      })();
    }, { wide: true });
    gui.appendChild(s);
  }

  showPasswordScreen();

})();
