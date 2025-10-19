(function() {
  if(document.getElementById("pixelGuiBox")) document.getElementById("pixelGuiBox").remove();
  var gui = document.createElement("div");
  gui.id = "pixelGuiBox";
  gui.style.cssText = "position:fixed;top:50px;right:50px;width:360px;background:#1e1e2f;color:white;font-family:sans-serif;z-index:999999;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.5);overflow:hidden;";
  document.body.appendChild(gui);

  var header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:10px 12px;gap:8px;background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.08));border-bottom:1px solid rgba(255,255,255,0.02);";
  
  var logoBox = document.createElement("div");
  logoBox.style.cssText = "width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,#22c55e,#0ea5a1);display:flex;align-items:center;justify-content:center;font-weight:700;color:#021014;box-shadow:0 4px 18px rgba(16,185,129,0.12);font-size:13px;";
  logoBox.innerText = "PX²";
  header.appendChild(logoBox);
  
  var titleBox = document.createElement("div");
  titleBox.style.cssText = "flex:1;";
  var titleMain = document.createElement("div");
  titleMain.style.cssText = "font-weight:600;color:#dfffe6;font-size:14px;";
  titleMain.innerText = "Pixel Panel";
  var titleSub = document.createElement("div");
  titleSub.style.cssText = "font-size:11px;color:#9ca3af;";
  titleSub.innerText = "Dark • Green accent • Top-right";
  titleBox.appendChild(titleMain);
  titleBox.appendChild(titleSub);
  header.appendChild(titleBox);
  
  var closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  closeBtn.style.cssText = "background:transparent;border:1px solid rgba(255,255,255,0.03);color:#9ca3af;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:14px;";
  closeBtn.onclick = function() { gui.remove(); };
  header.appendChild(closeBtn);
  
  gui.appendChild(header);
  
  var contentWrapper = document.createElement("div");
  contentWrapper.id = "pixelContent";
  contentWrapper.style.cssText = "padding:12px;max-height:calc(100vh - 200px);overflow-y:auto;";
  gui.appendChild(contentWrapper);

  var userRole = "normal", currentPanel = "normal";
  var chatPanel = null, modchatPanel = null;

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
    b.innerText = t;
    b.style.cssText = "background:#2a2a40;border:none;border-radius:8px;padding:10px 8px;color:white;cursor:pointer;margin:4px;font-size:15px;";
    if(o && o.wide) b.style.width = "calc(100% - 8px)";
    if(o && o.bg) b.style.background = o.bg;
    b.onmouseover = function() { this.style.filter = "brightness(1.08)"; };
    b.onmouseout = function() { this.style.filter = ""; };
    b.onclick = f;
    return b;
  }

  function showPasswordScreen() {
    contentWrapper.innerHTML = "";
    var title = document.createElement("h3");
    title.innerText = "Enter Password";
    title.style.cssText = "color:white;margin-bottom:12px;";
    contentWrapper.appendChild(title);
    
    var input = document.createElement("input");
    input.type = "password";
    input.placeholder = "Password";
    input.style.cssText = "width:calc(100% - 16px);padding:8px;margin-bottom:12px;border-radius:6px;border:none;box-sizing:border-box;";
    contentWrapper.appendChild(input);
    
    var btn = createButton("Submit", function() {
      (async function() {
        var val = input.value || "";
        var h = await sha256Hex(val);
        if(h === OWNER_HASH) { userRole = "owner"; buildGridForPanel("normal"); }
        else if(h === MOD_HASH) { userRole = "mod"; buildGridForPanel("normal"); }
        else if(h === NORMAL_HASH) { userRole = "normal"; buildGridForPanel("normal"); }
        else { contentWrapper.innerHTML = "<h3 style='color:red;'>Access Denied</h3>"; }
      })();
    }, {wide: true});
    contentWrapper.appendChild(btn);
  }

  function buildGridForPanel(pt) {
    contentWrapper.innerHTML = "";
    
    if(userRole !== "normal") {
      var switchBtn = createButton("Switch Panel", function() { 
        if(userRole === "mod") currentPanel = currentPanel === "normal" ? "mod" : "normal";
        else if(userRole === "owner") {
          if(currentPanel === "normal") currentPanel = "mod";
          else if(currentPanel === "mod") currentPanel = "owner";
          else currentPanel = "normal";
        }
        buildGridForPanel(currentPanel);
      }, {wide: true});
      contentWrapper.appendChild(switchBtn);
    }
    
    var label = document.createElement("div");
    label.style.cssText = "text-align:center;margin:12px 0;font-size:14px;color:#22c55e;font-weight:bold;";
    label.innerText = pt === "owner" ? "Owner Panel" : pt === "mod" ? "Mod Panel" : "Normal Panel";
    contentWrapper.appendChild(label);
    
    var grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:6px;";
    
    var buttons = [];
    if(pt === "normal") {
      buttons = [
        createButton("Calculator", function() { alert("Calculator - Feature Coming Soon"); }),
        createButton("YouTube", function() { alert("YouTube - Feature Coming Soon"); }),
        createButton("Translate", function() { alert("Translate - Feature Coming Soon"); }),
        createButton("Calendar", function() { alert("Calendar - Feature Coming Soon"); }),
        createButton("Dance Party", function() { var c=["#FF0000","#00FF00","#0000FF","#FFFF00","#FF00FF","#00FFFF"],i=0; var int=setInterval(()=>{document.body.style.background=c[i%6];i++;},200); setTimeout(()=>{clearInterval(int);document.body.style.background="";},5000); }),
        createButton("Mirror Mode", function() { document.body.style.transform=document.body.style.transform==="scaleX(-1)"?"":"scaleX(-1)"; }),
        createButton("Chat", function() { alert("Chat - Opening..."); }),
        createButton("Games", function() { alert("Games - Feature Coming Soon"); })
      ];
    } else if(pt === "mod") {
      buttons = [
        createButton("Mute Animations", function() { document.querySelectorAll("*").forEach(e=>e.style.animation="none"); alert("Animations muted"); }),
        createButton("Highlight Sections", function() { document.querySelectorAll("section,h1,h2").forEach(e=>e.style.outline="2px solid #22c55e"); alert("Sections highlighted"); }),
        createButton("Freeze Inputs", function() { document.querySelectorAll("input,textarea,select,button").forEach(e=>e.disabled=true); alert("Inputs frozen"); }),
        createButton("Page Stats", function() { alert("Links: "+document.querySelectorAll("a").length+"\nImages: "+document.querySelectorAll("img").length+"\nHeadings: "+document.querySelectorAll("h1,h2,h3,h4,h5,h6").length); }),
        createButton("Copy Text", function() { let t=Array.from(document.querySelectorAll("p")).map(e=>e.innerText).join("\n"); navigator.clipboard.writeText(t); alert("Copied!"); }),
        createButton("Toggle Images", function() { document.querySelectorAll("img").forEach(i=>i.style.display=i.style.display==="none"?"block":"none"); alert("Images toggled"); }),
        createButton("Theme Override", function() { document.body.style.background=document.body.style.background===""?"#111":""; alert("Theme toggled"); }),
        createButton("Mod Chat", function() { alert("Mod Chat - Feature Coming Soon"); }),
        createButton("Auto Clicker", function() { alert("Auto Clicker - Feature Coming Soon"); }),
        createButton("History Flooder", function() { alert("History Flooder - Feature Coming Soon"); })
      ];
    } else if(pt === "owner") {
      buttons = [
        createButton("Owner Notes", function() { alert("Owner Notes - Feature Coming Soon"); }),
        createButton("Toggle Panels", function() { alert("Toggle Panels - Feature Coming Soon"); }),
        createButton("Inspect Elements", function() { document.querySelectorAll("*").forEach(e=>e.style.outline="2px solid red"); alert("Elements outlined"); }),
        createButton("Copy All Text", function() { navigator.clipboard.writeText(document.body.innerText); alert("All text copied"); }),
        createButton("Highlight Links", function() { document.querySelectorAll("a").forEach(e=>e.style.outline="2px solid cyan"); alert("Links highlighted"); }),
        createButton("Clear Storage", function() { localStorage.clear(); sessionStorage.clear(); alert("Storage cleared!"); })
      ];
    }
    
    buttons.forEach(b => grid.appendChild(b));
    contentWrapper.appendChild(grid);
  }

  showPasswordScreen();
})();
