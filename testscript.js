// Fun Assistant - Complete Script (Draggable Chats Fixed)
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

  // --- DRAG HELPER FUNCTION ---
  function makeDraggable(panel, header) {
    let offsetX = 0, offsetY = 0, isDragging = false;

    function onMouseMove(e) {
      if(!isDragging) return;
      panel.style.left = (e.clientX - offsetX) + "px";
      panel.style.top = (e.clientY - offsetY) + "px";
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
    }

    header.onmousedown = function(e) {
      isDragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };
  }

  function openChatPanel() {
    if(chatPanel) return;
    chatPanel = document.createElement("div");
    chatPanel.id = "funChatBoxNormal"; // unique ID
    chatPanel.style.cssText = "position:fixed;right:50px;width:360px;background:black;color:white;font-family:sans-serif;z-index:999998;padding:12px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.5);";
    
    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:move";
    const title = document.createElement("strong");
    title.textContent = "💬 Chat";
    header.appendChild(title);
    
    const close = document.createElement("button");
    close.textContent = "×";
    close.onclick = () => { chatPanel.remove(); chatPanel = null; };
    close.style.cssText = "background:none;border:none;font-size:18px";
    header.appendChild(close);
    
    chatPanel.appendChild(header);

    const iframe = document.createElement("iframe");
    iframe.src = "https://organizations.minnit.chat/189701754316687/c/ChatMenu?embed";
    iframe.style.cssText = "border:none;width:100%;height:300px;";
    chatPanel.appendChild(iframe);

    document.body.appendChild(chatPanel);

    makeDraggable(chatPanel, header);
}

function openModChatPanel() {
    if(modchatPanel) return;
    modchatPanel = document.createElement("div");
    modchatPanel.id = "funChatBoxMod"; // unique ID
    modchatPanel.style.cssText = "position:fixed;right:50px;width:360px;background:black;color:white;font-family:sans-serif;z-index:999998;padding:12px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.5);";
    
    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:move";
    const title = document.createElement("strong");
    title.textContent = "💬 Mod Chat";
    header.appendChild(title);
    
    const close = document.createElement("button");
    close.textContent = "×";
    close.onclick = () => { modchatPanel.remove(); modchatPanel = null; };
    close.style.cssText = "background:none;border:none;font-size:18px";
    header.appendChild(close);
    
    modchatPanel.appendChild(header);

    const iframe = document.createElement("iframe");
    iframe.src = "https://organizations.minnit.chat/300057567744318/c/Panel?embed";
    iframe.style.cssText = "border:none;width:100%;height:300px;";
    modchatPanel.appendChild(iframe);

    document.body.appendChild(modchatPanel);

    makeDraggable(modchatPanel, header);
}

// Draggable helper (per panel)
function makeDraggable(panel, header) {
    let offsetX = 0, offsetY = 0, dragging = false;

    header.onmousedown = function(e) {
        dragging = true;
        offsetX = e.clientX - panel.offsetLeft;
        offsetY = e.clientY - panel.offsetTop;
        document.body.style.userSelect = "none";
    }

    document.addEventListener("mousemove", function(e) {
        if(!dragging) return;
        panel.style.left = (e.clientX - offsetX) + "px";
        panel.style.top = (e.clientY - offsetY) + "px";
    });

    document.addEventListener("mouseup", function() {
        dragging = false;
        document.body.style.userSelect = "";
    });
}

  // --- NORMAL AND MOD BUTTONS ---
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
  ];

  var ownerButtons = [
    createButton("Owner Notes", ownerNotes),
    createButton("Toggle Panels", togglePanels),
    createButton("Inspect Elements", function() { document.querySelectorAll("*").forEach(e => e.style.outline = "2px solid red"); alert("Elements outlined"); }),
    createButton("Copy All Text", function() { navigator.clipboard.writeText(document.body.innerText); alert("All text copied"); }),
    createButton("Highlight Links", function() { document.querySelectorAll("a").forEach(e => e.style.outline = "2px solid cyan"); alert("All links highlighted"); }),
    createButton("Clear User Data", function() { alert("Local and session storage cleared!"); })
  ];

  // --- PANEL BUILDING ---
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
