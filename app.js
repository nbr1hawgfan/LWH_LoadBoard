
const CONFIG={
  loadCsv:"https://docs.google.com/spreadsheets/d/e/2PACX-1vTgw11TS3xBI37HrqoJmJSI1ZSy5mxhT6-9BBUzr3jj9119oUZwAIAI-caD4W3m0SwjQdE7Xd4Pazf_/pub?output=csv",
  inventoryCsv:"https://docs.google.com/spreadsheets/d/e/2PACX-1vR88eoG2Hhmq_JCsS_jZMnBiTWlcmehB4i0A5Z6BXZ2oykJ0KqGB6IhrZc0Tr5l5ZOYxtuy8OffpPL-/pub?output=csv",
  laborCsv:"https://docs.google.com/spreadsheets/d/e/2PACX-1vRihZPpC8D0OvPHt44DZaH9d5SiooI2lPczdtw6vtApjEC5eKH_JC8wb3ds-IC4OByZOhwIDRYybCzJ/pub?gid=0&single=true&output=csv",
  version:"2.7.1",
  timezone:"America/Chicago"
};
const DEFAULT_SETTINGS={theme:"executive",accent:"#6c63ff",density:"comfortable",textSize:"normal",defaultModule:"dashboard",warehouse:"",weather:true,weatherLocation:"fort-smith",seconds:true};
const WEATHER_LOCATIONS={"fort-smith":{name:"Fort Smith, AR",lat:35.3859,lon:-94.3985},"dallas":{name:"Dallas, TX",lat:32.7767,lon:-96.7970}};
const state={loadRows:[],loads:[],inventory:[],labor:[],loadRange:"today",laborRange:"today",inventoryView:"cards",calendarMonth:new Date(new Date().getFullYear(),new Date().getMonth(),1),settings:{...DEFAULT_SETTINGS},deferredInstall:null};
const $=id=>document.getElementById(id),clean=v=>String(v??"").trim(),upper=v=>clean(v).toUpperCase(),num=v=>{const n=Number(String(v??"").replace(/[$,%\s,]/g,""));return Number.isFinite(n)?n:0};
const esc=s=>clean(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmtNum=n=>new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(num(n));
const dateKey=d=>d instanceof Date&&!Number.isNaN(d)?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`:"";
const fmtDate=d=>d instanceof Date&&!Number.isNaN(d)?new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(d):"";
function parseDate(v){const s=clean(v);if(!s)return null;let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);if(m){let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[1]-1,+m[2])}const d=new Date(s);return Number.isNaN(d)?null:d}
function parseCSV(text){const rows=[];let row=[],field="",q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c=='"'&&q&&n=='"'){field+='"';i++}else if(c=='"')q=!q;else if(c==","&&!q){row.push(field);field=""}else if((c=="\n"||c=="\r")&&!q){if(c=="\r"&&n=="\n")i++;row.push(field);field="";if(row.some(x=>x!==""))rows.push(row);row=[]}else field+=c}if(field||row.length){row.push(field);rows.push(row)}const heads=(rows.shift()||[]).map(h=>clean(h).replace(/^\uFEFF/,""));return rows.map(vals=>Object.fromEntries(heads.map((h,i)=>[h,vals[i]??""])))}
function pick(row,...names){const entries=Object.entries(row);for(const n of names){const f=entries.find(([k])=>upper(k)===upper(n));if(f)return f[1]}return""}
function normalizeLoad(raw){return{key:clean(pick(raw,"LoadKey")),date:parseDate(pick(raw,"CalendarDate","DeliveredDate","Date")),dateTime:pick(raw,"LoadDateTime"),whse:clean(pick(raw,"WHSE","Warehouse")),direction:upper(pick(raw,"Direction")),customer:clean(pick(raw,"SubCust","Customer","SubCustNm")),pro:clean(pick(raw,"ProNumber")),relatedPro:clean(pick(raw,"RelatedPro")),billRef:clean(pick(raw,"BillToReference","BillToRefNum")),carrier:clean(pick(raw,"Carrier","CarrierName")),shipper:clean(pick(raw,"Shipper","ShipperName")),conName:clean(pick(raw,"ConName")),status:clean(pick(raw,"Status")),item:clean(pick(raw,"ItemNm","Item")),description:clean(pick(raw,"ItemDescription","Description1","ItemDesc")),units:num(pick(raw,"Units")),qty:num(pick(raw,"ItemQty","Qty")),loadItems:num(pick(raw,"LoadItemCount")),loadUnits:num(pick(raw,"LoadUnits")),loadQty:num(pick(raw,"LoadQty")),mapCity:clean(pick(raw,"MapCity")),mapState:upper(pick(raw,"MapState")),mapKey:upper(pick(raw,"MapCityKey")),instructions:clean(pick(raw,"Instructions")),comments:clean(pick(raw,"Comments")),raw}}
function groupLoads(rows){const map=new Map();rows.forEach(r=>{const key=r.key||["LOAD",dateKey(r.date),r.whse,r.direction,r.pro,r.billRef,r.customer].join("|");if(!map.has(key))map.set(key,{...r,key,items:[]});const l=map.get(key);if(r.item||r.units||r.qty){const ik=`${r.item}|${r.description}`,e=l.items.find(x=>x.key===ik);if(e){e.units+=r.units;e.qty+=r.qty}else l.items.push({key:ik,item:r.item||"Unspecified",description:r.description,units:r.units,qty:r.qty})}});return[...map.values()].sort((a,b)=>(a.date?.valueOf()||0)-(b.date?.valueOf()||0))}
function normalizeInventory(raw){const received=parseDate(pick(raw,"DateReceived","ReceivedDate","SystemCreatedOn","CreatedOn","Received","InboundDate"));const age=num(pick(raw,"AgeDays","DaysInInventory","DaysOld"))||(received?Math.max(0,Math.floor((new Date()-received)/86400000)):0);return{lwh:clean(pick(raw,"LWH_ID","LWHID","ControlNumber","PalletID")),customer:clean(pick(raw,"Customer","SubCustNm","SubCust","BillToName")),customerId:clean(pick(raw,"Customer_ID","CustomerID")),item:clean(pick(raw,"ItemNm","Item","ItemNumber")),description:clean(pick(raw,"ItemDescription","ItemDesc","Description1")),lot:clean(pick(raw,"LotNum","Lot","LotNm")),qty:num(pick(raw,"Qty","Quantity")),units:num(pick(raw,"Units","UnitCount"))||1,bay:clean(pick(raw,"BayName","Bay","Location")),warehouse:clean(pick(raw,"Warehouse","WHSE","LocationCode","Location")),received,age,invReceipt:clean(pick(raw,"INV_Receipt","InvReceipt")),vendor:clean(pick(raw,"Vendor")),comments:clean(pick(raw,"Comments")),unique2:clean(pick(raw,"Unique2")),unique3:clean(pick(raw,"Unique3")),raw}}

function normalizeLabor(raw){
  return{
    date:parseDate(pick(raw,"Work_Date","Work Date","Date")),
    day:clean(pick(raw,"Day_Of_Week","Day Of Week")),
    employee:clean(pick(raw,"Employee_Name","Employee Name")),
    employeeType:clean(pick(raw,"Employee_Type","Employee Type")),
    clockLocation:clean(pick(raw,"Time_Clock_Location","Time Clock Location")),
    warehouse:clean(pick(raw,"Warehouse_Code","Warehouse Code","WHSE","Warehouse")),
    totalHours:num(pick(raw,"Total_Hours","Total Hours")),
    regularHours:num(pick(raw,"Regular_Hours","Regular Hours")),
    overtimeHours:num(pick(raw,"Overtime_Hours","Overtime Hours")),
    rate:num(pick(raw,"Hourly_Pay_Rate","Hourly Pay Rate")),
    baseWages:num(pick(raw,"Daily_Base_Wages","Daily Base Wages")),
    benefits:num(pick(raw,"Benefits_21pct","Benefits 21pct","Benefits")),
    actualCost:num(pick(raw,"Daily_Actual_Cost","Daily Actual Cost")),
    raw
  }
}
function loadMetrics(l){return{items:l.items.length||l.loadItems,units:l.items.reduce((s,i)=>s+i.units,0)||l.loadUnits,qty:l.items.reduce((s,i)=>s+i.qty,0)||l.loadQty}}
async function fetchWithTimeout(url,options={},timeoutMs=60000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal})}
  finally{clearTimeout(timer)}
}
async function fetchCsv(url){
  const attempts=[url,url+(url.includes("?")?"&":"?")+"cacheBust="+Date.now()];
  let lastError=null;
  for(const attempt of attempts){
    try{
      const r=await fetchWithTimeout(attempt,{cache:"no-store",mode:"cors",redirect:"follow"});
      if(!r.ok)throw new Error("HTTP "+r.status);
      const text=await r.text();
      if(!text.trim())throw new Error("Empty CSV response");
      if(/<!doctype html|<html/i.test(text.slice(0,300)))throw new Error("Google returned HTML instead of CSV");
      return{text,live:true,url:attempt};
    }catch(e){lastError=e}
  }
  throw lastError||new Error("CSV fetch failed");
}
async function refreshAll(){
  setStatus("Refreshing data…");
  $("refreshAllBtn").disabled=true;
  const results=await Promise.allSettled([
    fetchCsv(CONFIG.loadCsv),
    fetchCsv(CONFIG.inventoryCsv),
    fetchCsv(CONFIG.laborCsv)
  ]);
  const [loadResult,inventoryResult,laborResult]=results;
  const messages=[],failed=[];
  if(loadResult.status==="fulfilled"){
    state.loadRows=parseCSV(loadResult.value.text).map(normalizeLoad).filter(x=>x.date||x.pro||x.customer);
    state.loads=groupLoads(state.loadRows);
    messages.push(`loads: ${state.loads.length}`);
  }else{console.error("Load feed failed:",loadResult.reason);failed.push(`<li><b>Load Board:</b> ${esc(loadResult.reason?.message||"Failed")}</li>`)}
  if(inventoryResult.status==="fulfilled"){
    state.inventory=parseCSV(inventoryResult.value.text).map(normalizeInventory).filter(x=>x.lwh||x.item||x.customer).map((x,i)=>({...x,idx:i}));
    messages.push(`inventory: ${state.inventory.length}`);
  }else{console.error("Inventory feed failed:",inventoryResult.reason);failed.push(`<li><b>Inventory:</b> ${esc(inventoryResult.reason?.message||"Failed")}</li>`)}
  if(laborResult.status==="fulfilled"){
    state.labor=parseCSV(laborResult.value.text).map(normalizeLabor).filter(x=>x.date||x.employee||x.warehouse);
    messages.push(`labor: ${state.labor.length}`);
  }else{console.error("Labor feed failed:",laborResult.reason);failed.push(`<li><b>Labor:</b> ${esc(laborResult.reason?.message||"Failed")}</li>`)}
  populateOptions();
  renderAll();
  setStatus(messages.length?`Live · ${messages.join(" · ")}`:"Data unavailable");
  if(failed.length)showDialog(`<div class="dialog-content"><h2>One or more data feeds could not load</h2><p>Available modules will continue working.</p><ul>${failed.join("")}</ul></div>`);
  $("refreshAllBtn").disabled=false;
}
function setStatus(s){const el=$("dataStatus");el.textContent=s;el.classList.remove("status-live","status-warn","status-error");if(/^live/i.test(s))el.classList.add("status-live");else if(/refreshing/i.test(s))el.classList.add("status-warn");else if(/unavailable/i.test(s))el.classList.add("status-error")}
function settingsLoad(){state.settings={...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem("lwh-settings-v2")||"{}")};applySettings();fillSettings()}
function settingsSave(){localStorage.setItem("lwh-settings-v2",JSON.stringify(state.settings));applySettings()}
function applySettings(){document.body.className="";if(state.settings.theme!=="executive")document.body.classList.add("theme-"+state.settings.theme);if(state.settings.density==="compact")document.body.classList.add("density-compact");if(state.settings.textSize!=="normal")document.body.classList.add("text-"+state.settings.textSize);document.documentElement.style.setProperty("--accent",state.settings.accent);document.documentElement.style.setProperty("--accent-soft",hexToSoft(state.settings.accent));$("weatherPanel").style.display=state.settings.weather?"grid":"none";$("globalWarehouse").value=state.settings.warehouse||""}
function hexToSoft(hex){const h=hex.replace("#","");if(h.length!==6)return"#e8f1ff";const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return`rgba(${r},${g},${b},.12)`}
function fillSettings(){$("settingTheme").value=state.settings.theme;$("settingAccent").value=state.settings.accent;$("settingDensity").value=state.settings.density;$("settingTextSize").value=state.settings.textSize;$("settingDefaultModule").value=state.settings.defaultModule;$("settingWeather").checked=state.settings.weather;$("settingWeatherLocation").value=state.settings.weatherLocation;$("settingSeconds").checked=state.settings.seconds}
function commonLoadFilter(l){const q=upper($("globalSearch").value),w=$("globalWarehouse").value,d=$("globalDirection").value,date=$("globalDate").value;if(w&&l.whse!==w)return false;if(d&&l.direction!==d)return false;if(date&&dateKey(l.date)!==date)return false;if(q){const hay=upper([l.whse,l.direction,l.customer,l.pro,l.billRef,l.carrier,l.shipper,l.conName,l.mapCity,l.mapState,...l.items.flatMap(i=>[i.item,i.description])].join(" "));if(!hay.includes(q))return false}return true}
function filteredLoads(range=state.loadRange){const today=new Date();today.setHours(0,0,0,0);return state.loads.filter(commonLoadFilter).filter(l=>{if($("globalDate").value||range==="all")return true;const d=l.date;if(!d)return false;if(range==="today")return dateKey(d)===dateKey(today);const days=+range;return d>=today&&d<new Date(today.getFullYear(),today.getMonth(),today.getDate()+days)})}
function filteredInventory(){const q=upper($("globalSearch").value),w=$("globalWarehouse").value,c=$("inventoryCustomer").value,item=upper($("inventoryItem").value),bay=upper($("inventoryBay").value);const recvFrom=$("inventoryReceivedFrom").value?parseDate($("inventoryReceivedFrom").value):null;const recvToRaw=$("inventoryReceivedTo").value?parseDate($("inventoryReceivedTo").value):null;const recvTo=recvToRaw?new Date(recvToRaw.getFullYear(),recvToRaw.getMonth(),recvToRaw.getDate(),23,59,59):null;return state.inventory.filter(x=>{if(w&&x.warehouse!==w)return false;if(c&&x.customer!==c)return false;if(item&&!upper(x.item).includes(item))return false;if(bay&&!upper(x.bay).includes(bay))return false;if(recvFrom&&(!x.received||x.received<recvFrom))return false;if(recvTo&&(!x.received||x.received>recvTo))return false;if(q&&!upper([x.lwh,x.customer,x.customerId,x.item,x.description,x.lot,x.bay,x.warehouse,x.invReceipt,x.vendor,x.comments].join(" ")).includes(q))return false;return true})}
function populateOptions(){const warehouses=[...new Set([...state.loads.map(x=>x.whse),...state.inventory.map(x=>x.warehouse)].filter(Boolean))].sort();for(const id of["globalWarehouse","settingWarehouse"]){const e=$(id),v=e.value;e.innerHTML='<option value="">All warehouses</option>'+warehouses.map(x=>`<option>${esc(x)}</option>`).join("");e.value=id==="settingWarehouse"?state.settings.warehouse:v}const customers=[...new Set(state.inventory.map(x=>x.customer).filter(Boolean))].sort();
  $("inventoryCustomer").innerHTML='<option value="">All customers</option>'+customers.map(x=>`<option>${esc(x)}</option>`).join("");
  const employeeTypes=[...new Set(state.labor.map(x=>x.employeeType).filter(Boolean))].sort();
  $("laborEmployeeType").innerHTML='<option value="">All employee types</option>'+employeeTypes.map(x=>`<option>${esc(x)}</option>`).join("");
  const clockLocations=[...new Set(state.labor.map(x=>x.clockLocation).filter(Boolean))].sort();
  $("laborClockLocation").innerHTML='<option value="">All clock locations</option>'+clockLocations.map(x=>`<option>${esc(x)}</option>`).join("")
}
function renderAll(){renderDashboard();renderLoads();renderCalendar();renderInventory();renderLabor();renderAnalytics()}
function kpi(label,value){return`<article class="kpi"><span>${label}</span><strong>${value}</strong></article>`}
function renderDashboard(){const today=filteredLoads("today"),lm=aggregateLoadMetrics(today),inv=filteredInventory();$("dashboardKpis").innerHTML=[kpi("Today's Loads",today.length),kpi("Inbound",today.filter(x=>x.direction==="INBOUND").length),kpi("Outbound",today.filter(x=>x.direction==="OUTBOUND").length),kpi("Load Units",fmtNum(lm.units)),kpi("Inventory Units",fmtNum(inv.reduce((s,x)=>s+x.units,0))),kpi("Warehouses",new Set(today.map(x=>x.whse).filter(Boolean)).size)].join("");const byWh=groupStats(today,x=>x.whse||"Not listed");$("warehouseSnapshot").innerHTML='<div class="snapshot-row head"><span>Warehouse</span><strong>Loads</strong><strong>Units</strong><strong>Qty</strong></div>'+byWh.map(x=>`<div class="snapshot-row"><span>${esc(x.name)}</span><strong>${x.loads}</strong><strong>${fmtNum(x.units)}</strong><strong>${fmtNum(x.qty)}</strong></div>`).join("")||'<div class="empty">No loads today.</div>';const upcoming=filteredLoads("7").filter(x=>dateKey(x.date)!==dateKey(new Date())).slice(0,8);$("upcomingLoads").innerHTML=upcoming.map(l=>`<button class="upcoming-item text-button" data-load="${esc(l.key)}"><b>${esc(fmtDate(l.date))} · ${esc(l.whse)}</b><small>${esc(l.customer||l.pro)} · ${esc(l.direction)}</small></button>`).join("")||'<div class="empty">No upcoming loads.</div>';$("upcomingLoads").querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>openLoad(b.dataset.load));const invQty=inv.reduce((s,x)=>s+x.qty,0),aged=inv.filter(x=>x.age>=90).length;$("inventorySnapshot").innerHTML=`<div class="snapshot-row"><span>Inventory records</span><strong>${fmtNum(inv.length)}</strong><strong></strong><strong></strong></div><div class="snapshot-row"><span>Total units</span><strong>${fmtNum(inv.reduce((s,x)=>s+x.units,0))}</strong><strong></strong><strong></strong></div><div class="snapshot-row"><span>Total quantity</span><strong>${fmtNum(invQty)}</strong><strong></strong><strong></strong></div><div class="snapshot-row"><span>90+ day records</span><strong>${fmtNum(aged)}</strong><strong></strong><strong></strong></div>`;const cities=groupStats(state.loads.filter(commonLoadFilter),x=>x.mapKey||"").filter(x=>x.name).slice(0,8);$("citySnapshot").innerHTML=renderBars(cities,"loads")}
function aggregateLoadMetrics(loads){return loads.reduce((a,l)=>{const m=loadMetrics(l);a.units+=m.units;a.qty+=m.qty;return a},{units:0,qty:0})}
function groupStats(loads,keyFn){const m=new Map();loads.forEach(l=>{const k=keyFn(l);if(!k)return;const z=loadMetrics(l),v=m.get(k)||{name:k,loads:0,units:0,qty:0};v.loads++;v.units+=z.units;v.qty+=z.qty;m.set(k,v)});return[...m.values()].sort((a,b)=>b.loads-a.loads)}
function renderBars(rows,field){const max=Math.max(1,...rows.map(x=>x[field]));return rows.map(x=>`<div class="bar-row"><span>${esc(x.name.replace("|",", "))}</span><div class="bar-track"><div class="bar-fill" style="width:${x[field]/max*100}%"></div></div><b>${fmtNum(x[field])}</b></div>`).join("")||'<div class="empty">No data.</div>'}
function renderLoads(){const loads=filteredLoads();const m=aggregateLoadMetrics(loads);$("loadKpis").innerHTML=[kpi("Loads",loads.length),kpi("Inbound",loads.filter(x=>x.direction==="INBOUND").length),kpi("Outbound",loads.filter(x=>x.direction==="OUTBOUND").length),kpi("Units",fmtNum(m.units)),kpi("Quantity",fmtNum(m.qty))].join("");const groups=new Map();loads.forEach(l=>{const k=l.whse||"Warehouse not listed";if(!groups.has(k))groups.set(k,[]);groups.get(k).push(l)});$("loadBoard").innerHTML=[...groups.entries()].map(([w,ls])=>`<section class="warehouse-section"><div class="warehouse-title"><h2>${esc(w)}</h2><span>${ls.length} loads</span></div><div class="load-grid">${ls.map(loadCard).join("")}</div></section>`).join("")||'<div class="card empty">No matching loads.</div>';$("loadBoard").querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>openLoad(b.dataset.load))}
function loadCard(l){const m=loadMetrics(l);return`<article class="load-card ${l.direction==="OUTBOUND"?"outbound":""}"><button class="load-open" data-load="${esc(l.key)}"><div class="load-top"><div><b>${esc(fmtDate(l.date))}</b><span class="status">${esc(l.status||"Status not listed")}</span></div><b>${esc(l.direction)}</b></div><div class="load-body"><h3>${esc(l.customer||l.conName||"Customer not listed")}</h3><div class="load-meta"><b>Pro</b><span>${esc(l.pro||"—")}</span><b>Reference</b><span>${esc(l.billRef||"—")}</span><b>City</b><span>${esc(l.mapCity&&l.mapState?`${l.mapCity}, ${l.mapState}`:"—")}</span></div></div><div class="load-metrics"><div><b>${fmtNum(m.items)}</b><span>Items</span></div><div><b>${fmtNum(m.units)}</b><span>Units</span></div><div><b>${fmtNum(m.qty)}</b><span>Qty</span></div></div></button></article>`}
function renderCalendar(){const month=state.calendarMonth,y=month.getFullYear(),mo=month.getMonth(),first=new Date(y,mo,1),start=new Date(y,mo,1-first.getDay()),loads=state.loads.filter(commonLoadFilter),by=new Map();loads.forEach(l=>{const k=dateKey(l.date);if(!by.has(k))by.set(k,[]);by.get(k).push(l)});$("calendarTitle").textContent=new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric"}).format(month);let html=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<div class="calendar-head">${x}</div>`).join("");for(let i=0;i<42;i++){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),list=by.get(dateKey(d))||[];html+=`<div class="calendar-day ${d.getMonth()!==mo?"other":""} ${dateKey(d)===dateKey(new Date())?"today":""}"><button class="day-number" data-day="${dateKey(d)}">${d.getDate()}</button>${list.slice(0,3).map(l=>`<button class="day-load" data-load="${esc(l.key)}">${esc(l.whse)} · ${esc(l.customer||l.pro)}</button>`).join("")}${list.length>3?`<button class="day-more" data-day="${dateKey(d)}">+ ${list.length-3} more</button>`:""}</div>`}$("calendarGrid").innerHTML=html;$("calendarGrid").querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>openLoad(b.dataset.load));$("calendarGrid").querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>openDay(b.dataset.day,by.get(b.dataset.day)||[]))}
function openInventoryItem(idx){const x=state.inventory.find(r=>r.idx===idx);if(!x)return;showDialog(`<div class="dialog-content"><h2>${esc(x.item||"Item not listed")}</h2><p class="muted">${esc(x.description||"No description on file")}</p><div class="bay-badge">${esc(x.bay||"No bay on file")}</div><div class="detail-grid">${detail("LWH ID",x.lwh)}${detail("Warehouse",x.warehouse)}${detail("Customer",x.customer)}${detail("Customer ID",x.customerId)}${detail("Lot",x.lot)}${detail("Units",fmtNum(x.units))}${detail("Quantity",fmtNum(x.qty))}${detail("Received",x.received?fmtDate(x.received):"—")}${detail("Age",x.age?`${fmtNum(x.age)} days`:"—")}${detail("Receipt Ref.",x.invReceipt)}${detail("Vendor",x.vendor)}${detail("Ref. 2",x.unique2)}${detail("Ref. 3",x.unique3)}</div>${x.comments?`<p><b>Comments</b><br>${esc(x.comments)}</p>`:""}</div>`)}
function renderInventory(){const rows=filteredInventory();$("inventoryKpis").innerHTML=[kpi("Records",fmtNum(rows.length)),kpi("Units",fmtNum(rows.reduce((s,x)=>s+x.units,0))),kpi("Quantity",fmtNum(rows.reduce((s,x)=>s+x.qty,0))),kpi("Customers",new Set(rows.map(x=>x.customer).filter(Boolean)).size),kpi("90+ Days",rows.filter(x=>x.age>=90).length)].join("");const host=$("inventoryResults");if(state.inventoryView==="table"){host.innerHTML=`<div class="table-wrap"><table><thead><tr><th>LWH ID</th><th>Warehouse</th><th>Customer</th><th>Item</th><th>Description</th><th>Lot</th><th>Bay</th><th>Vendor</th><th>Received</th><th>Units</th><th>Qty</th><th>Age</th></tr></thead><tbody>${rows.map(x=>`<tr data-inv-idx="${x.idx}"><td>${esc(x.lwh)}</td><td>${esc(x.warehouse)}</td><td>${esc(x.customer)}</td><td>${esc(x.item)}</td><td>${esc(x.description)}</td><td>${esc(x.lot)}</td><td class="bay-cell">${esc(x.bay||"—")}</td><td>${esc(x.vendor)}</td><td>${x.received?esc(fmtDate(x.received)):"—"}</td><td>${fmtNum(x.units)}</td><td>${fmtNum(x.qty)}</td><td>${fmtNum(x.age)}</td></tr>`).join("")}</tbody></table></div>`;host.querySelectorAll("[data-inv-idx]").forEach(tr=>tr.onclick=()=>openInventoryItem(+tr.dataset.invIdx))}else{host.innerHTML=`<div class="inventory-grid">${rows.slice(0,1000).map(x=>`<article class="card inventory-card" data-inv-idx="${x.idx}"><div class="bay-badge">${esc(x.bay||"No bay on file")}</div><h3>${esc(x.item||"Item not listed")}</h3><p class="muted">${esc(x.description)}</p><div class="inventory-detail"><div><span>LWH ID</span><b>${esc(x.lwh||"—")}</b></div><div><span>Warehouse</span><b>${esc(x.warehouse||"—")}</b></div><div><span>Customer</span><b>${esc(x.customer||"—")}</b></div><div><span>Lot</span><b>${esc(x.lot||"—")}</b></div><div><span>Vendor</span><b>${esc(x.vendor||"—")}</b></div><div><span>Received</span><b>${x.received?esc(fmtDate(x.received)):"—"}</b></div><div><span>Age</span><b>${x.age?`${fmtNum(x.age)} days`:"—"}</b></div><div><span>Units</span><b>${fmtNum(x.units)}</b></div><div><span>Quantity</span><b>${fmtNum(x.qty)}</b></div></div></article>`).join("")}</div>${rows.length>1000?'<p class="muted">Showing the first 1,000 matching cards. Use Table view for the full result.</p>':""}`;host.querySelectorAll("[data-inv-idx]").forEach(el=>el.onclick=()=>openInventoryItem(+el.dataset.invIdx))}}

function startOfWorkweek(d){
  const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  x.setDate(x.getDate()-x.getDay());
  return x
}
function filteredLabor(){
  const q=upper($("globalSearch").value),w=$("globalWarehouse").value,specific=$("globalDate").value;
  const type=$("laborEmployeeType").value,employee=upper($("laborEmployee").value),clock=$("laborClockLocation").value,minOt=num($("laborMinOt").value);
  const today=new Date();today.setHours(0,0,0,0);
  return state.labor.filter(x=>{
    if(w&&x.warehouse!==w)return false;
    if(type&&x.employeeType!==type)return false;
    if(employee&&!upper(x.employee).includes(employee))return false;
    if(clock&&x.clockLocation!==clock)return false;
    if(minOt&&x.overtimeHours<minOt)return false;
    if(q&&!upper([x.employee,x.employeeType,x.clockLocation,x.warehouse,x.day].join(" ")).includes(q))return false;
    if(specific)return dateKey(x.date)===specific;
    if(state.laborRange==="all")return true;
    if(state.laborRange==="today")return dateKey(x.date)===dateKey(today);
    if(state.laborRange==="week"){const s=startOfWorkweek(today),e=new Date(s.getFullYear(),s.getMonth(),s.getDate()+7);return x.date>=s&&x.date<e}
    const days=+state.laborRange;
    return x.date>=new Date(today.getFullYear(),today.getMonth(),today.getDate()-(days-1))&&x.date<new Date(today.getFullYear(),today.getMonth(),today.getDate()+1)
  })
}
function laborGroup(rows,keyFn){
  const m=new Map();
  rows.forEach(x=>{const k=keyFn(x)||"Not listed",v=m.get(k)||{name:k,hours:0,regular:0,ot:0,cost:0,employees:new Set()};v.hours+=x.totalHours;v.regular+=x.regularHours;v.ot+=x.overtimeHours;v.cost+=x.actualCost;v.employees.add(x.employee);m.set(k,v)});
  return[...m.values()].sort((a,b)=>b.hours-a.hours)
}
function renderLabor(){
  const rows=filteredLabor(),total=rows.reduce((a,x)=>{a.hours+=x.totalHours;a.reg+=x.regularHours;a.ot+=x.overtimeHours;a.cost+=x.actualCost;a.base+=x.baseWages;return a},{hours:0,reg:0,ot:0,cost:0,base:0});
  $("laborKpis").innerHTML=[kpi("Employees",new Set(rows.map(x=>x.employee).filter(Boolean)).size),kpi("Total Hours",fmtNum(total.hours)),kpi("Regular Hours",fmtNum(total.reg)),kpi("Overtime Hours",fmtNum(total.ot)),kpi("Actual Cost","$"+fmtNum(total.cost))].join("");
  const byWh=laborGroup(rows,x=>x.warehouse),byType=laborGroup(rows,x=>x.employeeType),byEmployee=laborGroup(rows,x=>x.employee);
  $("laborWarehouseChart").innerHTML=renderLaborBars(byWh,"hours");
  $("laborCostChart").innerHTML=renderLaborBars(byWh,"cost",true);
  $("laborTypeChart").innerHTML=renderLaborBars(byType,"hours");
  $("laborOtLeaders").innerHTML=renderLaborBars(byEmployee.sort((a,b)=>b.ot-a.ot).slice(0,15),"ot");
  $("laborTable").innerHTML=`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Day</th><th>Employee</th><th>Type</th><th>Clock Location</th><th>Warehouse</th><th>Total</th><th>Regular</th><th>OT</th><th>Rate</th><th>Base Wages</th><th>Benefits</th><th>Actual Cost</th></tr></thead><tbody>${rows.sort((a,b)=>(b.date?.valueOf()||0)-(a.date?.valueOf()||0)||a.employee.localeCompare(b.employee)).map(x=>`<tr><td>${esc(fmtDate(x.date))}</td><td>${esc(x.day)}</td><td>${esc(x.employee)}</td><td>${esc(x.employeeType)}</td><td>${esc(x.clockLocation)}</td><td>${esc(x.warehouse)}</td><td>${fmtNum(x.totalHours)}</td><td>${fmtNum(x.regularHours)}</td><td>${fmtNum(x.overtimeHours)}</td><td>$${fmtNum(x.rate)}</td><td>$${fmtNum(x.baseWages)}</td><td>$${fmtNum(x.benefits)}</td><td>$${fmtNum(x.actualCost)}</td></tr>`).join("")}</tbody></table></div>`
}
function renderLaborBars(rows,field,currency=false){
  const max=Math.max(1,...rows.map(x=>x[field]));
  return rows.map(x=>`<div class="bar-row"><span>${esc(x.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${x[field]/max*100}%"></div></div><b>${currency?"$":""}${fmtNum(x[field])}</b></div>`).join("")||'<div class="empty">No labor data.</div>'
}
function renderAnalytics(){const loads=state.loads.filter(commonLoadFilter);$("analyticsWarehouse").innerHTML=renderBars(groupStats(loads,x=>x.whse||"Not listed").slice(0,15),"loads");$("analyticsDirection").innerHTML=renderBars(groupStats(loads,x=>x.direction||"Unknown"),"loads");$("analyticsCustomers").innerHTML=renderBars(groupStats(loads,x=>x.customer||"Not listed").slice(0,15),"loads");const m=new Map();loads.forEach(l=>l.items.forEach(i=>{const v=m.get(i.item)||{name:i.item,loads:0,units:0,qty:0};v.loads++;v.units+=i.units;v.qty+=i.qty;m.set(i.item,v)}));$("analyticsItems").innerHTML=renderBars([...m.values()].sort((a,b)=>b.loads-a.loads).slice(0,15),"loads");$("analyticsCities").innerHTML=renderBars(groupStats(loads,x=>x.mapKey||"").filter(x=>x.name).slice(0,15),"loads")}
function openLoad(key){const l=state.loads.find(x=>x.key===key);if(!l)return;const m=loadMetrics(l);showDialog(`<div class="dialog-content"><h2>${esc(l.direction)} · ${esc(l.customer||l.pro)}</h2><div class="detail-grid">${detail("Date",fmtDate(l.date))}${detail("Warehouse",l.whse)}${detail("Status",l.status)}${detail("Carrier",l.carrier)}${detail("Pro Number",l.pro)}${detail("Bill To Reference",l.billRef)}${detail("Shipment City",l.mapCity&&l.mapState?`${l.mapCity}, ${l.mapState}`:"—")}${detail("Totals",`${m.items} items · ${fmtNum(m.units)} units · ${fmtNum(m.qty)} qty`)}</div><h3>Items</h3>${l.items.length?l.items.map(i=>`<div class="item-row"><div><b>${esc(i.item)}</b><br><small>${esc(i.description)}</small></div><div><b>${fmtNum(i.units)}</b><br><small>Units</small></div><div><b>${fmtNum(i.qty)}</b><br><small>Qty</small></div></div>`).join(""):"<p>No matched item data yet.</p>"}${l.instructions?`<p><b>Instructions</b><br>${esc(l.instructions)}</p>`:""}${l.comments?`<p><b>Comments</b><br>${esc(l.comments)}</p>`:""}</div>`)}
function openDay(key,loads){showDialog(`<div class="dialog-content"><h2>${esc(fmtDate(parseDate(key)))}</h2>${loads.map(l=>`<button class="city-list-button" data-load="${esc(l.key)}"><b>${esc(l.whse)} · ${esc(l.customer||l.pro)}</b><span>${esc(l.direction)} · ${esc(l.status)}${l.pro?` · Pro ${esc(l.pro)}`:l.billRef?` · Ref ${esc(l.billRef)}`:""}</span></button>`).join("")||"<p>No loads.</p>"}</div>`);$("dialogBody").querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>openLoad(b.dataset.load))}
function detail(a,b){return`<div class="detail"><span>${a}</span><b>${esc(b||"—")}</b></div>`}
function showDialog(html){$("dialogBody").innerHTML=html;$("detailDialog").showModal()}

/* ---------- scan-to-lookup ---------- */
let html5QrCode=null;
function scanFormats(){return(typeof Html5QrcodeSupportedFormats!=="undefined")?[Html5QrcodeSupportedFormats.CODE_128,Html5QrcodeSupportedFormats.CODE_39,Html5QrcodeSupportedFormats.CODE_93,Html5QrcodeSupportedFormats.EAN_13,Html5QrcodeSupportedFormats.EAN_8,Html5QrcodeSupportedFormats.UPC_A,Html5QrcodeSupportedFormats.UPC_E,Html5QrcodeSupportedFormats.QR_CODE,Html5QrcodeSupportedFormats.ITF,Html5QrcodeSupportedFormats.CODABAR]:undefined}
async function stopCameraScan(){if(!html5QrCode)return;const inst=html5QrCode;html5QrCode=null;try{await inst.stop();inst.clear()}catch(e){}const reader=$("scannerReader");if(reader)reader.innerHTML=""}
async function startCameraScan(){
  if(typeof Html5Qrcode==="undefined"){$("scanResults").innerHTML='<p class="muted">Camera scanner library failed to load — check your connection, or use a handheld scanner / type the code above.</p>';return}
  $("scanResults").innerHTML="";
  $("scannerStatus").textContent="Starting camera…";
  html5QrCode=new Html5Qrcode("scannerReader");
  const config={fps:10,qrbox:{width:260,height:140},formatsToSupport:scanFormats()};
  const onSuccess=code=>{try{navigator.vibrate&&navigator.vibrate(70)}catch(e){}stopCameraScan();runScan(code)};
  try{
    const devices=await Html5Qrcode.getCameras();
    if(!devices||!devices.length)throw new Error("No camera found");
    const back=devices.find(d=>/back|rear|environment/i.test(d.label))||devices[devices.length-1];
    $("scannerStatus").textContent="Point the camera at a barcode or QR code.";
    await html5QrCode.start(back.id,config,onSuccess,()=>{});
  }catch(err){
    try{
      $("scannerStatus").textContent="Point the camera at a barcode or QR code.";
      await html5QrCode.start({facingMode:"environment"},config,onSuccess,()=>{});
    }catch(err2){
      $("scanResults").innerHTML=`<p class="muted">Camera access failed: ${esc(err2.message||"unknown error")}. Use a handheld scanner or type the code above.</p>`;
      stopCameraScan();
    }
  }
}
function runScan(raw){
  const code=clean(raw);
  if(!code)return;
  const loadMatches=state.loads.filter(l=>[l.pro,l.billRef,l.key].some(v=>v&&upper(v)===upper(code)));
  const invMatches=state.inventory.filter(x=>[x.lwh,x.item,x.lot].some(v=>v&&upper(v)===upper(code)));
  const total=loadMatches.length+invMatches.length;
  if(total===1){if(loadMatches.length)openLoad(loadMatches[0].key);else openInventoryItem(invMatches[0].idx);return}
  if(total===0){
    $("scanResults").innerHTML=`<p class="muted">No exact match for "${esc(code)}". <button class="text-button" id="scanSearchFallback">Search for it instead</button></p>`;
    $("scanSearchFallback").onclick=()=>{stopCameraScan();$("detailDialog").close();$("globalSearch").value=code;renderAll()};
    return;
  }
  $("scanResults").innerHTML="<p class=\"muted\">Multiple matches — choose one:</p>"+
    loadMatches.map(l=>`<button class="scan-result-item" data-load="${esc(l.key)}"><b>${esc(l.direction)} · ${esc(l.customer||l.pro||"Load")}</b><span>Load · ${esc(fmtDate(l.date))} · ${esc(l.whse)}</span></button>`).join("")+
    invMatches.map(x=>`<button class="scan-result-item" data-inv="${x.idx}"><b>${esc(x.item||x.lwh||"Inventory record")}</b><span>Inventory · ${esc(x.warehouse)} · Bay ${esc(x.bay||"—")}</span></button>`).join("");
  $("scanResults").querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>openLoad(b.dataset.load));
  $("scanResults").querySelectorAll("[data-inv]").forEach(b=>b.onclick=()=>openInventoryItem(+b.dataset.inv));
}
function openScan(){
  showDialog(`<div class="dialog-content"><h2>Scan</h2><p class="muted">Scan with a handheld scanner (it types like a keyboard — just scan and it'll jump straight to the record), or type a Pro Number, LWH ID, Item, or Lot below.</p>
    <input id="scanInput" class="scan-input" type="text" autocomplete="off" placeholder="Scan or type a code, then press Enter">
    <button id="scanCameraBtn" class="secondary">Use Camera</button>
    <div id="scannerReader" class="scanner-reader"></div>
    <p id="scannerStatus" class="muted scanner-status"></p>
    <div id="scanResults"></div></div>`);
  const input=$("scanInput");
  input.focus();
  input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const v=input.value;input.value="";runScan(v)}});
  $("scanCameraBtn").onclick=startCameraScan;
}
function navigate(name){document.querySelectorAll(".module").forEach(m=>m.classList.toggle("active",m.id===name+"Module"));document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.module===name));$("sidebar").classList.remove("open");localStorage.setItem("lwh-last-module",name)}
function updateClock(){const now=new Date(),opts={hour:"numeric",minute:"2-digit",timeZone:CONFIG.timezone};if(state.settings.seconds)opts.second="2-digit";$("currentDate").textContent=new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric",timeZone:CONFIG.timezone}).format(now);$("currentTime").textContent=new Intl.DateTimeFormat("en-US",opts).format(now)}
async function loadWeather(){const loc=WEATHER_LOCATIONS[state.settings.weatherLocation];$("weatherPlace").textContent=loc.name;try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FChicago`);const d=await r.json();$("weatherNow").textContent=`${Math.round(d.current.temperature_2m)}°F · ${weatherLabel(d.current.weather_code)}`}catch(e){$("weatherNow").textContent="Weather unavailable"}}
function weatherLabel(c){return({0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Cloudy",45:"Fog",51:"Drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Snow",80:"Showers",95:"Thunderstorms"})[c]||"Current conditions"}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>navigate(b.dataset.module));document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>navigate(b.dataset.go));$("mobileMenu").onclick=()=>$("sidebar").classList.toggle("open");$("closeDialog").onclick=()=>$("detailDialog").close();$("detailDialog").onclick=e=>{if(e.target===$("detailDialog"))$("detailDialog").close()};$("detailDialog").addEventListener("close",stopCameraScan);$("refreshAllBtn").onclick=refreshAll;$("scanBtn").onclick=openScan;
["globalSearch","globalWarehouse","globalDirection","globalDate"].forEach(id=>$(id).addEventListener("input",renderAll));$("clearGlobal").onclick=()=>{$("globalSearch").value="";$("globalWarehouse").value="";$("globalDirection").value="";$("globalDate").value="";renderAll()};
document.querySelectorAll("[data-load-range]").forEach(b=>b.onclick=()=>{state.loadRange=b.dataset.loadRange;document.querySelectorAll("[data-load-range]").forEach(x=>x.classList.toggle("active",x===b));renderLoads()});
$("prevMonth").onclick=()=>{state.calendarMonth=new Date(state.calendarMonth.getFullYear(),state.calendarMonth.getMonth()-1,1);renderCalendar()};$("nextMonth").onclick=()=>{state.calendarMonth=new Date(state.calendarMonth.getFullYear(),state.calendarMonth.getMonth()+1,1);renderCalendar()};$("calendarToday").onclick=()=>{const n=new Date();state.calendarMonth=new Date(n.getFullYear(),n.getMonth(),1);renderCalendar()};
["inventoryCustomer","inventoryItem","inventoryBay","inventoryReceivedFrom","inventoryReceivedTo"].forEach(id=>$(id).addEventListener("input",renderInventory));document.querySelectorAll("[data-inv-view]").forEach(b=>b.onclick=()=>{state.inventoryView=b.dataset.invView;document.querySelectorAll("[data-inv-view]").forEach(x=>x.classList.toggle("active",x===b));renderInventory()});

["laborEmployeeType","laborEmployee","laborClockLocation","laborMinOt"].forEach(id=>$(id).addEventListener("input",renderLabor));
document.querySelectorAll("[data-labor-range]").forEach(b=>b.onclick=()=>{state.laborRange=b.dataset.laborRange;document.querySelectorAll("[data-labor-range]").forEach(x=>x.classList.toggle("active",x===b));renderLabor()});
const settingMap={settingTheme:"theme",settingAccent:"accent",settingDensity:"density",settingTextSize:"textSize",settingDefaultModule:"defaultModule",settingWarehouse:"warehouse",settingWeather:"weather",settingWeatherLocation:"weatherLocation",settingSeconds:"seconds"};
Object.entries(settingMap).forEach(([id,key])=>$(id).addEventListener("input",e=>{state.settings[key]=e.target.type==="checkbox"?e.target.checked:e.target.value;settingsSave();if(key==="weatherLocation")loadWeather();if(key==="warehouse")$("globalWarehouse").value=state.settings.warehouse;renderAll()}));
$("resetSettings").onclick=()=>{state.settings={...DEFAULT_SETTINGS};settingsSave();fillSettings();loadWeather();renderAll()};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();state.deferredInstall=e;$("installBtn").hidden=false});$("installBtn").onclick=async()=>{if(!state.deferredInstall)return;state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;$("installBtn").hidden=true};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));
settingsLoad();updateClock();setInterval(updateClock,1000);loadWeather();setInterval(loadWeather,900000);refreshAll().then(()=>navigate(localStorage.getItem("lwh-last-module")||state.settings.defaultModule));
