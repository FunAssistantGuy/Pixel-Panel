// Fun Assistant - Complete Script
(function() {
  if(document.getElementById("funGuiBox")) document.getElementById("funGuiBox").remove();
  var gui = document.createElement("div");
  gui.id = "funGuiBox";
  gui.style.cssText = "position:fixed;top:50px;right:50px;width:360px;background:#1e1e2f;color:white;font-family:sans-serif;z-index:999999;padding:12px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.5);";
  document.body.appendChild(gui);

  var keyboardListener = null;
  var currentFocus = { type: "display" };
  var chatPanel = null, modchatPanel = null, passwordCorrect = false, userRole = "normal", currentPanel = "normal";

  async function sha256Hex(str) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hashArray = Array.from(new Uint8Array(hashBuf));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const OWNER_HASH = "95125a0d7c7370659219459f0f21a6745a2564cdb27e0c06a0bdd3f7cf564103";
  const MOD_HASH = "52a09997d29387622dee692f5b74988075a4a4dd2bd0f481661fc3d8c68dac62";
  const NORMAL_HASH = "36c8d8697265145d5dd65559fafcd4819fad3036551bb02a6b9b259c55545634";

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
    h.onmousedown = function(e) {
      isDragging = true;
      offsetX = e.clientX - chatPanel.offsetLeft;
      offsetY = e.clientY - chatPanel.offsetTop;
      document.body.style.userSelect = "none";
    };
    document.onmousemove = function(e) {
      if(isDragging) {
        chatPanel.style.left = (e.clientX - offsetX) + "px";
        chatPanel.style.top = (e.clientY - offsetY) + "px";
      }
    };
    document.onmouseup = function() {
      isDragging = false;
      document.body.style.userSelect = "";
    };
    const obs = new ResizeObserver(() => {
      if(chatPanel) chatPanel.style.top = (gui.offsetTop + gui.offsetHeight + 10) + "px";
    });
    obs.observe(gui);
    chatPanel._observer = obs;
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
    showPanelWithBack("Owner Notes", "Write notes here...");
  }

  function togglePanels() {
    if(chatPanel) chatPanel.style.display = chatPanel.style.display === "none" ? "block" : "none";
  }

  function openModChatPanel() {
  if(modchatPanel) return;
  modchatPanel = document.createElement("div");
  modchatPanel.id = "funChatBox";
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
  h.onmousedown = function(e) {
    isDragging = true;
    offsetX = e.clientX - modchatPanel.offsetLeft;
    offsetY = e.clientY - modchatPanel.offsetTop;
    document.body.style.userSelect = "none";
  };
  
  document.onmousemove = function(e) {
    if(isDragging) {
      modchatPanel.style.left = (e.clientX - offsetX) + "px";
      modchatPanel.style.top = (e.clientY - offsetY) + "px";
    }
  };
  
  document.onmouseup = function() {
    isDragging = false;
    document.body.style.userSelect = "";
  };
  
  const obs = new ResizeObserver(() => {
    if(modchatPanel) modchatPanel.style.top = (gui.offsetTop + gui.offsetHeight + 10) + "px";
  });
  obs.observe(gui);
  modchatPanel._observer = obs;
}

  var normalButtons = [
    createButton("Calculator", showCalculatorFull),
    createButton("YouTube Player", showYouTubePlayer),
    createButton("Translate", showTranslatePanel),
    createButton("Calendar", showCalendarPanel),
    createButton("Dance Party", danceParty),
    createButton("Mirror Mode", mirrorMode),
    createButton("Chat", openChatPanel),
    createButton("Settings", function() { alert("Settings panel coming soon!") })
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
  ];var ownerButtons = [
    createButton("Owner Notes", ownerNotes),
    createButton("Toggle Panels", togglePanels),
    createButton("Inspect Elements", function() { document.querySelectorAll("*").forEach(e => e.style.outline = "2px solid red"); alert("Elements outlined"); }),
    createButton("Copy All Text", function() { navigator.clipboard.writeText(document.body.innerText); alert("All text copied"); }),
    createButton("Highlight Links", function() { document.querySelectorAll("a").forEach(e => e.style.outline = "2px solid cyan"); alert("All links highlighted"); }),
    createButton("Clear User Data", function() { alert("Local and session storage cleared!"); })
  ];

  function buildGridForPanel(pt) {
    gui.innerHTML = "";
    var h = document.createElement("div");
    h.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px";
    var ti = document.createElement("strong");
    ti.textContent = pt === "owner" ? "🔑 Owner Panel" : pt === "mod" ? "🛡️ Mod Panel" : "🌟 Fun Assistant";
    h.appendChild(ti);
    if(userRole !== "normal") {
      var t = createButton("Switch Panel", function() { togglePanel(); });
      h.appendChild(t);
    }
    var c = createButton("×", function() { gui.remove(); if(chatPanel) chatPanel.remove(); chatPanel = null; });
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
        else { gui.innerHTML = "<h3 style='color:red'>You do not have access to this!</h3>"; passwordCorrect = false; }
      })();
    }, { wide: true });
    gui.appendChild(s);
  }

  showPasswordScreen();

})();
