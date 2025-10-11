// Fun Assistant - Full Version
(function() {
  if(document.getElementById("funGuiBox")) document.getElementById("funGuiBox").remove();
  var gui = document.createElement("div");
  gui.id = "funGuiBox";
  gui.style.cssText = "position:fixed;top:50px;right:50px;width:360px;background:#1e1e2f;color:white;font-family:sans-serif;z-index:999999;padding:12px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.5);";
  document.body.appendChild(gui);

  var currentPanel = "normal";
  var userRole = "normal";
  var chatPanel = null;
  var passwordCorrect = false;
  var keyboardListener = null;
  var currentFocus = { type: "display" };

  // ------------------ Hash ------------------
  async function sha256Hex(str) {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  const OWNER_HASH = "95125a0d7c7370659219459f0f21a6745a2564cdb27e0c06a0bdd3f7cf564103";
  const MOD_HASH = "52a09997d29387622dee692f5b74988075a4a4dd2bd0f481661fc3d8c68dac62";
  const NORMAL_HASH = "36c8d8697265145d5dd65559fafcd4819fad3036551bb02a6b9b259c55545634";

  // ------------------ Utilities ------------------
  function createButton(text, func, opts) {
    var b = document.createElement("button");
    b.type="button"; b.innerText=text;
    b.style.cssText="background:#2a2a40;border:none;border-radius:8px;padding:10px 8px;color:white;cursor:pointer;margin:4px;font-size:15px";
    if(opts && opts.wide) b.style.width="100%";
    if(opts && opts.bg) b.style.background=opts.bg;
    b.onmouseover=()=>b.style.filter="brightness(1.08)";
    b.onmouseout=()=>b.style.filter="";
    b.onclick=func;
    return b;
  }

  function makeDisplay() {
    var disp = document.createElement("div");
    disp.style.cssText="min-height:40px;background:#14141f;border-radius:8px;padding:8px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;cursor:text;";
    disp.id="calcDisplay"; disp.tabIndex=0;
    return disp;
  }

  function createFractionWidget(initialNumerator) {
    var wrapper = document.createElement("span");
    wrapper.className="frac-widget";
    wrapper.style.cssText="display:inline-flex;flex-direction:column;align-items:center;border-radius:6px;padding:2px 6px;background:rgba(255,255,255,0.03);";
    var num=document.createElement("input");
    num.type="text"; num.value=initialNumerator?String(initialNumerator):""; num.placeholder="a";
    num.style.cssText="width:34px;background:transparent;border:none;color:white;text-align:center;font-size:13px;";
    var bar=document.createElement("div");
    bar.style.cssText="width:40px;height:1px;background:#777;margin:4px 0;";
    var den=document.createElement("input"); den.type="text"; den.value=""; den.placeholder="b";
    den.style.cssText="width:34px;background:transparent;border:none;color:white;text-align:center;font-size:13px;";
    num.addEventListener("focus",()=>currentFocus={type:"fraction",elem:wrapper,part:"num"});
    den.addEventListener("focus",()=>currentFocus={type:"fraction",elem:wrapper,part:"den"});
    wrapper._numElem=num; wrapper._denElem=den;
    wrapper.appendChild(num); wrapper.appendChild(bar); wrapper.appendChild(den);
    return wrapper;
  }

  function floatToFraction(x,maxDen){
    if(!isFinite(x)) return null;
    var neg=x<0;if(neg)x=-x;
    var eps=1e-10;var a=Math.floor(x),h1=1,k1=0,h=a,k=1,x1=x;
    while(true){
      var frac=h/k;if(Math.abs(frac-x)<eps) break;
      var rem=x1-a;if(rem<eps) break;
      x1=1/rem;a=Math.floor(x1);
      var h2=a*h+h1,k2=a*k+k1;
      if(k2>maxDen){var r=(maxDen-k1)/k;var h_=Math.round(h1+r*h),k_=Math.round(k1+r*k);return (neg?"-":"")+h_+"/"+k_}
      h1=h;k1=k;h=h2;k=k2;
    }
    return k===1?(neg?"-":"")+h+"/"+1:(neg?"-":"")+h+"/"+k;
  }

  function buildExpressionString(displayEl){
    var tokens=[],children=Array.from(displayEl.childNodes);
    function isNumberText(s){return/^\s*-?\d+(\.\d+)?\s*$/.test(s);}
    for(var i=0;i<children.length;i++){
      var ch=children[i];
      if(ch.nodeType===Node.TEXT_NODE){var txt=ch.textContent||""; if(txt.trim()!=="") tokens.push(txt);}
      else if(ch.nodeType===Node.ELEMENT_NODE){
        if(ch.classList&&ch.classList.contains("frac-widget")){
          var n=(ch._numElem.value||"0").trim(),d=(ch._denElem.value||"1").trim();
          if(d===""||d==="0")d="1"; var fracExpr="("+n+"/"+d+")";
          var prev=tokens.length?tokens[tokens.length-1]:null;
          if(prev!==null&&isNumberText(prev)){var whole=prev.trim();tokens.pop();tokens.push("("+whole+"+"+fracExpr+")");} else tokens.push(fracExpr);
        } else if(ch.classList&&ch.classList.contains("op-span")){var op=ch.dataset.op||ch.innerText||""; tokens.push(op.trim()==="×"?"*":op.trim()==="÷"?"/":op.trim());}
        else if(ch.classList&&ch.classList.contains("token-span"))tokens.push(ch.innerText||"");
        else {var t=ch.innerText||""; if(t.trim()!=="")tokens.push(t);}
      }
    } return tokens.join("");
  }

  function handleBackspace(displayEl){
    if(currentFocus.type==="fraction"){
      var fw=currentFocus.elem,el=currentFocus.part==="num"?fw._numElem:fw._denElem;
      if(el.value.length) el.value=el.value.slice(0,-1); else {fw.remove();currentFocus={type:"display"};}
      return;
    }
    var chs=Array.from(displayEl.childNodes); if(!chs.length)return;
    var last=chs[chs.length-1];
    if(last.nodeType===Node.ELEMENT_NODE&&last.classList.contains("token-span")){
      if(last.innerText.length>1) last.innerText=last.innerText.slice(0,-1);
      else last.remove();
    } else last.remove();
  }

  function appendToDisplayChar(displayEl,ch){
    if(currentFocus.type==="fraction"){var fw=currentFocus.elem,target=currentFocus.part==="num"?fw._numElem:fw._denElem;target.value+=ch;target.focus();return;}
    var last=displayEl.lastChild;
    if(last&&last.classList&&last.classList.contains("token-span")) last.innerText+=ch;
    else {var span=document.createElement("span"); span.className="token-span"; span.style.cssText="padding:2px 6px;border-radius:6px;background:transparent;color:white;"; span.innerText=ch; span.addEventListener("click",()=>currentFocus={type:"display"}); displayEl.appendChild(span);}
    currentFocus={type:"display"};
  }

  function insertOperator(displayEl,opVisible){
    var opSpan=document.createElement("span"); opSpan.className="op-span"; opSpan.dataset.op=opVisible;
    opSpan.style.cssText="padding:2px 8px;border-radius:6px;background:rgba(255,255,255,0.02);color:#ffd39a;font-size:16px;";
    opSpan.innerText=" "+opVisible+" "; opSpan.addEventListener("click",()=>currentFocus={type:"display"});
    displayEl.appendChild(opSpan); currentFocus={type:"display"};
  }

  function handleEquals(displayEl,resArea){
    var expr=buildExpressionString(displayEl); if(!expr)return;
    try{var value=eval(expr); var dec=Math.abs(value)<1e-12?0:value; var frac=floatToFraction(dec,1000);
      resArea.innerText="Decimal: "+dec+(frac?" • Fraction: "+frac:"");} catch(e){resArea.innerText="Invalid expression";}
  }

  function showCalculatorFull(){
    gui.innerHTML=""; var header=document.createElement("div"); header.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    var title=document.createElement("strong"); title.innerText="🧮 Calculator"; header.appendChild(title);
    var back=createButton("←",()=>buildGridForPanel(currentPanel)); back.style.background="none"; back.style.border="none"; back.style.fontSize="18px"; back.style.margin="0"; header.appendChild(back);
    gui.appendChild(header);
    var display=makeDisplay(); gui.appendChild(display);
    var grid=document.createElement("div"); grid.style.cssText="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;"; gui.appendChild(grid);
    var resArea=document.createElement("div"); resArea.style.cssText="margin-top:8px;background:#14141f;padding:8px;border-radius:8px;min-height:28px;color:#dfe6ff;font-size:14px;"; gui.appendChild(resArea);
    [["7","8","9","×"],["4","5","6","-"],["1","2","3","+"],["0",".","÷","="]].forEach(function(row){for(var i=0;i<4;i++){var label=row[i]; if(label==="="){grid.appendChild(createButton(label,()=>handleEquals(display,resArea))); continue;}
      if(/\d|\./.test(label)) grid.appendChild(createButton(label,()=>appendToDisplayChar(display,label)));
      else grid.appendChild(createButton(label,()=>insertOperator(display,label)));
    });
  }

  // ------------------ Fun Tools ------------------
  function danceParty(){var c=["#FF0000","#00FF00","#0000FF","#FFFF00","#FF00FF","#00FFFF"],i=0;var intv=setInterval(()=>{document.body.style.background=c[i%6];i++;},200);setTimeout(()=>{clearInterval(intv);document.body.style.background="";},5000);}
  function mirrorMode(){document.body.style.transform=document.body.style.transform==="scaleX(-1)"?"":"scaleX(-1)";}

  // ------------------ Chat Panels ------------------
  function openChatPanel(url,title,id){
    if(document.getElementById(id)) return;
    var panel=document.createElement("div"); panel.id=id; panel.style.cssText="position:fixed;right:50px;width:360px;background:black;color:white;font-family:sans-serif;z-index:999998;padding:12px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.5);transform:scale(0.95);";
    var h=document.createElement("div"); h.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:move";
    var t=document.createElement("strong"); t.textContent=title; h.appendChild(t);
    var close=createButton("×",()=>{panel._observer.disconnect();panel.remove();}); close.style.background="none"; close.style.border="none"; close.style.fontSize="18px"; h.appendChild(close); panel.appendChild(h);
    var iframe=document.createElement("iframe"); iframe.src=url; iframe.style.cssText="border:none;width:100%;height:300px;"; iframe.allowTransparency=true; panel.appendChild(iframe);
    document.body.appendChild(panel); panel.style.top=(gui.offsetTop+gui.offsetHeight+10)+"px";
    let offsetX=0,offsetY=0,isDragging=false;
    h.onmousedown=e=>{isDragging=true;offsetX=e.clientX-panel.offsetLeft;offsetY=e.clientY-panel.offsetTop;document.body.style.userSelect="none";};
    document.onmousemove=e=>{if(isDragging){panel.style.left=(e.clientX-offsetX)+"px";panel.style.top=(e.clientY-offsetY)+"px";}};
    document.onmouseup=()=>{isDragging=false;document.body.style.userSelect="";};
    const obs=new ResizeObserver(()=>{panel.style.top=(gui.offsetTop+gui.offsetHeight+10)+"px";}); obs.observe(gui); panel._observer=obs;
    if(id==="funChatBox") chatPanel=panel;
  }
  function openUserChat(){openChatPanel("https://organizations.minnit.chat/189701754316687/c/ChatMenu?embed","💬 Chat","funChatBox");}
  function openModChat(){openChatPanel("https://organizations.minnit.chat/300057567744318/c/Panel?embed","🛡️ Mod Chat","modChatPanel");}

  // ------------------ Main Grid ------------------
  var normalButtons=[createButton("Calculator",showCalculatorFull),createButton("YouTube Player",()=>alert("YouTube panel coming soon!")),createButton("Translate",()=>alert("Translate panel coming soon!")),createButton("Calendar",()=>alert("Calendar panel coming soon!")),createButton("Dance Party",danceParty),createButton("Mirror Mode",mirrorMode),createButton("Chat",openUserChat)];
  var modButtons=[createButton("Mod Chat",openModChat)];

  function buildGridForPanel(pt){gui.innerHTML=""; var h=document.createElement("div"); h.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"; var ti=document.createElement("strong"); ti.textContent=pt==="mod"?"🛡️ Mod Panel":"🌟 Fun Assistant"; h.appendChild(ti); var c=createButton("×",()=>{gui.remove(); if(chatPanel) chatPanel.remove(); chatPanel=null;}); c.style.background="none"; c.style.border="none"; c.style.fontSize="18px"; h.appendChild(c); gui.appendChild(h); var g=document.createElement("div"); g.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:6px"; gui.appendChild(g); if(pt==="normal") normalButtons.forEach(b=>g.appendChild(b)); if(pt==="mod") modButtons.forEach(b=>g.appendChild(b));}

  // ------------------ Password ------------------
  function showPasswordScreen(){gui.innerHTML=""; var t=document.createElement("h3"); t.textContent="Enter Password"; gui.appendChild(t); var i=document.createElement("input"); i.type="password"; i.placeholder="Password"; i.style.cssText="width:100%;padding:5px;margin-bottom:5px;border-radius:6px;border:none"; gui.appendChild(i);
    var s=createButton("Submit",async()=>{var val=i.value||"";var h=await sha256Hex(val);
      if(h===OWNER_HASH||h===MOD_HASH||h===NORMAL_HASH){passwordCorrect=true; userRole=(h===OWNER_HASH?"owner":h===MOD_HASH?"mod":"normal"); currentPanel="normal"; buildGridForPanel(currentPanel);}
      else{gui.innerHTML="<h3 style='color:red'>You do not have access!</h3>"; passwordCorrect=false;}}, {wide:true}); gui.appendChild(s);}
  showPasswordScreen();
})();
