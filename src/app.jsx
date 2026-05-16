import { useState, useEffect, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const PRAYER_ICONS = { Fajr: "🌙", Dhuhr: "☀️", Asr: "🌤️", Maghrib: "🌅", Isha: "🌃" };
const STATUS = { NONE: "none", JAMAAT: "jamaat", SOLO: "solo", QAZA: "qaza" };
const STATUS_COLORS = {
  jamaat: { bg: "rgba(34,197,94,0.2)",  border: "#22c55e", text: "#4ade80", label: "With Jamaat",    dot: "#22c55e" },
  solo:   { bg: "rgba(234,179,8,0.2)",  border: "#eab308", text: "#facc15", label: "Without Jamaat", dot: "#eab308" },
  qaza:   { bg: "rgba(249,115,22,0.2)", border: "#f97316", text: "#fb923c", label: "Qazaa",          dot: "#f97316" },
};
const PRAYER_END_HOURS = { Fajr: 6, Dhuhr: 15, Asr: 18, Maghrib: 20, Isha: 24 };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d; }
function getAge7Date(dob) { const d = new Date(dob); d.setFullYear(d.getFullYear()+7); return d; }
function randomBool(pct) { return Math.random()*100 < pct; }

// ─── Storage ──────────────────────────────────────────────────────────────────
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("auth");
  const [user, setUser]     = useState(null);
  const [prayerLog, setPrayerLog] = useState({});
  const [tab, setTab]       = useState("home");

  useEffect(() => {
    const u = store.get("st_user");
    if (u) {
      setUser(u);
      setPrayerLog(store.get(`st_log_${u.email}`) || {});
      setScreen(u.setupDone ? "main" : "setup");
    }
  }, []);

  const saveLog = useCallback((log, email) => {
    setPrayerLog(log);
    store.set(`st_log_${email || user?.email}`, log);
  }, [user]);

  const handleAuth = (u) => {
    setUser(u);
    store.set("st_user", u);
    setPrayerLog(store.get(`st_log_${u.email}`) || {});
    setScreen(u.setupDone ? "main" : "setup");
  };

  const handleSetupDone = (newLog) => {
    saveLog(newLog, user.email);
    const updated = { ...user, setupDone: true };
    setUser(updated);
    store.set("st_user", updated);
    const accs = store.get("st_google_accs") || [];
    const idx = accs.findIndex(a => a.email === updated.email);
    if (idx >= 0) accs[idx] = updated;
    store.set("st_google_accs", accs);
    setScreen("main");
  };

  const updateUser = (updated) => {
    setUser(updated);
    store.set("st_user", updated);
    const accs = store.get("st_google_accs") || [];
    const idx = accs.findIndex(a => a.email === updated.email);
    if (idx >= 0) { accs[idx] = updated; store.set("st_google_accs", accs); }
  };

  const logout = () => { setUser(null); setPrayerLog({}); setScreen("auth"); };

  if (screen === "auth")  return <AuthScreen onAuth={handleAuth} />;
  if (screen === "setup") return <SetupScreen user={user} onDone={handleSetupDone} />;
  if (screen === "main")  return (
    <MainScreen user={user} prayerLog={prayerLog} saveLog={saveLog}
      onLogout={logout} updateUser={updateUser} tab={tab} setTab={setTab} />
  );
  return null;
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState("picker"); // picker | new
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [dob, setDob]           = useState("");
  const [err, setErr]           = useState("");
  const existingAccounts        = store.get("st_google_accs") || [];

  const signInExisting = (acc) => onAuth(acc);

  const createAccount = () => {
    setErr("");
    if (!name || !email || !dob) return setErr("Please fill all fields.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr("Invalid email address.");
    const accs = store.get("st_google_accs") || [];
    if (accs.find(a => a.email === email)) return setErr("Account already exists. Sign in above.");
    const u = { name, email, dob, setupDone: false };
    accs.push(u);
    store.set("st_google_accs", accs);
    onAuth(u);
  };

  return (
    <div style={S.page}>
      <div style={S.authCard}>
        <div style={{ fontSize:52, marginBottom:8 }}>☪</div>
        <h1 style={{ color:"#4ade80", fontSize:30, fontWeight:900, margin:"0 0 4px", letterSpacing:-1 }}>SalahTrack</h1>
        <p style={{ color:"#334155", fontSize:13, margin:"0 0 32px", textAlign:"center" }}>Your personal prayer companion</p>

        {/* Existing accounts */}
        {existingAccounts.length > 0 && (
          <>
            <p style={{ color:"#475569", fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:10, alignSelf:"flex-start" }}>
              Saved Accounts
            </p>
            {existingAccounts.map(acc => (
              <button key={acc.email} style={S.accountRow} onClick={() => signInExisting(acc)}>
                <div style={S.avatar}>{acc.name[0].toUpperCase()}</div>
                <div style={{ flex:1, textAlign:"left" }}>
                  <p style={{ color:"#fff", fontWeight:700, margin:0, fontSize:14 }}>{acc.name}</p>
                  <p style={{ color:"#475569", margin:0, fontSize:12 }}>{acc.email}</p>
                </div>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:10, width:"100%", margin:"16px 0" }}>
              <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }} />
              <span style={{ color:"#334155", fontSize:12 }}>or</span>
              <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }} />
            </div>
          </>
        )}

        {/* New account form */}
        <p style={{ color:"#475569", fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:12, alignSelf:"flex-start" }}>
          {existingAccounts.length > 0 ? "Add New Account" : "Create Account"}
        </p>
        <input style={S.input} placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
        <input style={S.input} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
        <label style={{ color:"#334155", fontSize:12, marginBottom:4, alignSelf:"flex-start" }}>Date of Birth</label>
        <input style={S.input} type="date" value={dob} onChange={e => setDob(e.target.value)} />
        {err && <p style={{ color:"#f87171", fontSize:13, margin:"0 0 8px", alignSelf:"flex-start" }}>{err}</p>}
        <button style={S.primaryBtn} onClick={createAccount}>
          {existingAccounts.length > 0 ? "Add Account →" : "Get Started →"}
        </button>
        <p style={{ color:"#1e293b", fontSize:11, marginTop:16, textAlign:"center", lineHeight:1.6 }}>
          All data is stored locally on this device.{"\n"}No password needed — just tap your account to sign in.
        </p>
      </div>
    </div>
  );
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────
function SetupScreen({ user, onDone }) {
  const [step, setStep]           = useState(0);
  const [method, setMethod]       = useState(null);
  const [globalPct, setGlobalPct] = useState(50);
  const [yearPcts, setYearPcts]   = useState({});
  const [ranges, setRanges]       = useState([{ from:"", to:"", pct:50 }]);
  const [jamaatPct, setJamaatPct] = useState(40);
  const [soloPct, setSoloPct]     = useState(40);
  const [qazaPct, setQazaPct]     = useState(20);
  const [building, setBuilding]   = useState(false);

  const startDate = getAge7Date(user.dob);
  const today     = new Date();
  const years     = Array.from({ length: today.getFullYear()-startDate.getFullYear()+1 }, (_,i) => startDate.getFullYear()+i);
  const totalJ    = jamaatPct + soloPct + qazaPct;

  const build = () => {
    setBuilding(true);
    setTimeout(() => {
      const log = {};
      let cur = new Date(startDate); cur.setHours(0,0,0,0);
      const end = new Date(today);   end.setHours(0,0,0,0);
      while (cur <= end) {
        const key = dateKey(cur);
        const yr  = cur.getFullYear();
        let pct   = 0;
        if (method === "random") pct = globalPct;
        else if (method === "year") pct = yearPcts[yr] ?? 0;
        else if (method === "range") {
          for (const r of ranges)
            if (r.from && r.to && yr >= +r.from && yr <= +r.to) { pct = r.pct; break; }
        }
        log[key] = {};
        for (const p of PRAYERS) {
          if (randomBool(pct)) {
            const r  = Math.random()*100;
            const jP = totalJ>0 ? (jamaatPct/totalJ)*100 : 0;
            const sP = totalJ>0 ? ((jamaatPct+soloPct)/totalJ)*100 : 0;
            log[key][p] = r < jP ? STATUS.JAMAAT : r < sP ? STATUS.SOLO : STATUS.QAZA;
          } else log[key][p] = STATUS.NONE;
        }
        cur = addDays(cur, 1);
      }
      onDone(log);
    }, 50);
  };

  if (building) return (
    <div style={S.page}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:52, animation:"pulse 1.5s infinite" }}>☪</div>
        <p style={{ color:"#4ade80", fontSize:18, marginTop:16, fontWeight:700 }}>Building your prayer history…</p>
        <p style={{ color:"#334155", fontSize:13 }}>This only takes a moment</p>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={{ ...S.authCard, maxWidth:460 }}>
        {/* Progress bar */}
        <div style={{ width:"100%", marginBottom:24 }}>
          <div style={{ display:"flex", gap:6, marginBottom:6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ flex:1, height:3, borderRadius:99, background: step>=i ? "#4ade80" : "rgba(255,255,255,0.06)", transition:"background 0.3s" }} />
            ))}
          </div>
          <p style={{ color:"#334155", fontSize:12 }}>Step {step+1} of 3</p>
        </div>

        <div style={{ width:"100%", marginBottom:18, background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.18)", borderRadius:14, padding:"10px 14px" }}>
          <p style={{ color:"#475569", fontSize:12, margin:0 }}>
            ☪ Salah became obligatory: <strong style={{ color:"#4ade80" }}>{startDate.toDateString()}</strong>
          </p>
        </div>

        {step === 0 && (
          <>
            <p style={{ color:"#e2e8f0", fontWeight:800, fontSize:16, marginBottom:16, alignSelf:"flex-start" }}>How to fill past prayers?</p>
            {[
              { k:"random", icon:"🎲", label:"Random",       desc:"One percentage for all years" },
              { k:"year",   icon:"📅", label:"Year by Year", desc:"Set a % for each individual year" },
              { k:"range",  icon:"📆", label:"By Range",     desc:"Group years into ranges with different %s" },
            ].map(o => (
              <button key={o.k} style={{ ...S.methodBtn, ...(method===o.k ? S.methodBtnActive : {}) }} onClick={() => setMethod(o.k)}>
                <span style={{ fontSize:24 }}>{o.icon}</span>
                <div>
                  <p style={{ color:"#fff", fontWeight:700, margin:0, fontSize:14 }}>{o.label}</p>
                  <p style={{ color:"#334155", margin:0, fontSize:12 }}>{o.desc}</p>
                </div>
                {method===o.k && <div style={{ marginLeft:"auto", width:18, height:18, borderRadius:"50%", background:"#4ade80", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:"#020c14", fontSize:12, fontWeight:900 }}>✓</span>
                </div>}
              </button>
            ))}
            <button style={{ ...S.primaryBtn, marginTop:16, opacity:method?1:0.4 }} disabled={!method} onClick={() => setStep(1)}>Next →</button>
          </>
        )}

        {step === 1 && (
          <>
            {method === "random" && (
              <>
                <p style={{ color:"#e2e8f0", fontWeight:800, fontSize:15, marginBottom:16, alignSelf:"flex-start" }}>Overall completion %</p>
                <div style={{ width:"100%", background:"rgba(74,222,128,0.06)", borderRadius:16, padding:"18px 16px", marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ color:"#94a3b8", fontSize:14 }}>Prayers completed</span>
                    <span style={{ color:"#4ade80", fontWeight:900, fontSize:22 }}>{globalPct}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={globalPct}
                    onChange={e => setGlobalPct(+e.target.value)}
                    style={{ width:"100%", accentColor:"#4ade80" }} />
                </div>
              </>
            )}
            {method === "year" && (
              <div style={{ width:"100%", maxHeight:340, overflowY:"auto" }}>
                <p style={{ color:"#e2e8f0", fontWeight:800, fontSize:15, marginBottom:14 }}>% per year (default 0%)</p>
                {years.map(y => (
                  <div key={y} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{ color:"#475569", fontSize:13, width:46, fontWeight:700 }}>{y}</span>
                    <input type="range" min={0} max={100} value={yearPcts[y]??0}
                      onChange={e => setYearPcts(p => ({ ...p, [y]:+e.target.value }))}
                      style={{ flex:1, accentColor:"#4ade80" }} />
                    <span style={{ color:"#4ade80", fontWeight:700, width:36, textAlign:"right" }}>{yearPcts[y]??0}%</span>
                  </div>
                ))}
              </div>
            )}
            {method === "range" && (
              <div style={{ width:"100%" }}>
                <p style={{ color:"#e2e8f0", fontWeight:800, fontSize:15, marginBottom:14 }}>Define year ranges</p>
                {ranges.map((r,i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:14, marginBottom:10 }}>
                    <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                      <select style={S.select} value={r.from} onChange={e => { const n=[...ranges]; n[i].from=e.target.value; setRanges(n); }}>
                        <option value="">From year</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <select style={S.select} value={r.to} onChange={e => { const n=[...ranges]; n[i].to=e.target.value; setRanges(n); }}>
                        <option value="">To year</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <input type="range" min={0} max={100} value={r.pct}
                        onChange={e => { const n=[...ranges]; n[i].pct=+e.target.value; setRanges(n); }}
                        style={{ flex:1, accentColor:"#4ade80" }} />
                      <span style={{ color:"#4ade80", fontWeight:700, width:40 }}>{r.pct}%</span>
                    </div>
                    {ranges.length>1 && <button style={S.removeBtn} onClick={() => setRanges(ranges.filter((_,j)=>j!==i))}>Remove</button>}
                  </div>
                ))}
                <button style={S.addBtn} onClick={() => setRanges([...ranges,{from:"",to:"",pct:50}])}>+ Add Range</button>
              </div>
            )}
            <div style={{ display:"flex", gap:10, marginTop:20, width:"100%" }}>
              <button style={{ ...S.ghostBtn, flex:1 }} onClick={() => setStep(0)}>← Back</button>
              <button style={{ ...S.primaryBtn, flex:2 }} onClick={() => setStep(2)}>Next →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ color:"#e2e8f0", fontWeight:800, fontSize:15, marginBottom:4, alignSelf:"flex-start" }}>Of completed prayers, how were they split?</p>
            <p style={{ color: totalJ===100?"#4ade80":"#f87171", fontSize:12, marginBottom:18 }}>
              {totalJ===100 ? "✓ Total is 100% — good to go!" : `Total: ${totalJ}% — needs to be exactly 100%`}
            </p>
            {[
              { label:"🕌 With Jamaat",    val:jamaatPct, set:setJamaatPct, col:"#4ade80" },
              { label:"🙏 Without Jamaat", val:soloPct,   set:setSoloPct,   col:"#facc15" },
              { label:"⏳ As Qazaa",       val:qazaPct,   set:setQazaPct,   col:"#fb923c" },
            ].map(o => (
              <div key={o.label} style={{ width:"100%", marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:"#94a3b8", fontSize:14 }}>{o.label}</span>
                  <span style={{ color:o.col, fontWeight:800, fontSize:16 }}>{o.val}%</span>
                </div>
                <input type="range" min={0} max={100} value={o.val}
                  onChange={e => o.set(+e.target.value)}
                  style={{ width:"100%", accentColor:o.col }} />
              </div>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:4, width:"100%" }}>
              <button style={{ ...S.ghostBtn, flex:1 }} onClick={() => setStep(1)}>← Back</button>
              <button style={{ ...S.primaryBtn, flex:2, opacity:totalJ===100?1:0.35 }}
                disabled={totalJ!==100} onClick={build}>
                Build History ✓
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
function MainScreen({ user, prayerLog, saveLog, onLogout, updateUser, tab, setTab }) {
  return (
    <div style={S.page}>
      <div style={S.appShell}>
        {tab==="home"    && <HomeTab    user={user} prayerLog={prayerLog} saveLog={saveLog} />}
        {tab==="log"     && <LogTab     user={user} prayerLog={prayerLog} />}
        {tab==="profile" && <ProfileTab user={user} onLogout={onLogout}  updateUser={updateUser} />}
        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ user, prayerLog, saveLog }) {
  const today      = new Date();
  const startDate  = getAge7Date(user.dob);

  // selected date — defaults to today
  const [selectedDate, setSelectedDate] = useState(today);
  const [datePicker, setDatePicker]     = useState(false);
  const [pickerMonth, setPickerMonth]   = useState(today.getMonth());
  const [pickerYear, setPickerYear]     = useState(today.getFullYear());

  const [prayerPopup, setPrayerPopup]   = useState(null);
  const [qazaPopup, setQazaPopup]       = useState(null);
  const [qazaCount, setQazaCount]       = useState(1);

  const selKey  = dateKey(selectedDate);
  const isToday = selKey === dateKey(today);
  const selLog  = prayerLog[selKey] || {};

  const isPassed = (p) => isToday && today.getHours() >= PRAYER_END_HOURS[p];

  const markPrayer = (prayer, status) => {
    saveLog({ ...prayerLog, [selKey]: { ...selLog, [prayer]: status } });
    setPrayerPopup(null);
  };

  const handleQazaDone = (prayer, count) => {
    let cur = new Date(startDate); let filled = 0;
    const newLog = JSON.parse(JSON.stringify(prayerLog));
    while (filled < count && cur <= today) {
      const key = dateKey(cur);
      if (!newLog[key]) newLog[key] = {};
      if (!newLog[key][prayer] || newLog[key][prayer] === STATUS.NONE) { newLog[key][prayer] = STATUS.QAZA; filled++; }
      cur = addDays(cur, 1);
    }
    saveLog(newLog);
    setQazaPopup(null); setQazaCount(1);
  };

  const getBtnStyle = (prayer) => {
    const st = selLog[prayer];
    // explicitly marked statuses
    if (st === STATUS.JAMAAT || st === STATUS.SOLO || st === STATUS.QAZA) return STATUS_COLORS[st];
    // explicitly marked as not prayed (null stored in log), OR time has passed today
    if (prayer in selLog || isPassed(prayer)) return { bg:"rgba(239,68,68,0.1)", border:"#ef4444", text:"#f87171", label:"Missed" };
    // never touched
    return { bg:"rgba(255,255,255,0.03)", border:"rgba(255,255,255,0.08)", text:"#64748b", label:"Tap to mark" };
  };

  // Streak (always from today backwards)
  let streak = 0, d = new Date(today);
  while (true) {
    const k = dateKey(d), dl = prayerLog[k] || {};
    if (PRAYERS.every(p => dl[p] && dl[p] !== STATUS.NONE)) { streak++; d = addDays(d,-1); }
    else break;
  }

  const doneSel  = PRAYERS.filter(p => selLog[p] && selLog[p] !== STATUS.NONE).length;
  const dateStr  = selectedDate.toLocaleDateString("en-US", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  // Date picker calendar helpers
  const pickerFirst = new Date(pickerYear, pickerMonth, 1);
  const pickerLast  = new Date(pickerYear, pickerMonth + 1, 0);
  const pickerDow   = (pickerFirst.getDay() + 6) % 7;
  const pickerDays  = [];
  for (let i = 0; i < pickerDow; i++) pickerDays.push(null);
  for (let d = 1; d <= pickerLast.getDate(); d++) pickerDays.push(new Date(pickerYear, pickerMonth, d));

  const pickerCanPrev = new Date(pickerYear, pickerMonth, 1) > new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const pickerCanNext = new Date(pickerYear, pickerMonth, 1) < new Date(today.getFullYear(), today.getMonth(), 1);

  const pickerPrev = () => { if(pickerMonth===0){setPickerYear(y=>y-1);setPickerMonth(11);}else setPickerMonth(m=>m-1); };
  const pickerNext = () => { if(pickerMonth===11){setPickerYear(y=>y+1);setPickerMonth(0);}else setPickerMonth(m=>m+1); };

  const selectDay = (date) => {
    if (!date) return;
    if (date < startDate || date > today) return;
    setSelectedDate(date);
    setDatePicker(false);
  };

  return (
    <div style={S.scrollArea}>
      {/* Header */}
      <div style={{ padding:"24px 20px 8px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <p style={{ color:"#334155", fontSize:13, margin:0 }}>Assalamu Alaikum,</p>
          <h2 style={{ color:"#fff", margin:"2px 0 0", fontSize:22, fontWeight:900 }}>{user.name.split(" ")[0]} 👋</h2>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.18)", borderRadius:16, padding:"10px 16px", gap:1 }}>
          <span style={{ fontSize:22 }}>🔥</span>
          <span style={{ color:"#4ade80", fontWeight:900, fontSize:22, lineHeight:1 }}>{streak}</span>
          <span style={{ color:"#334155", fontSize:10, fontWeight:700 }}>day streak</span>
        </div>
      </div>

      {/* Clickable date card */}
      <button
        onClick={() => { setPickerMonth(selectedDate.getMonth()); setPickerYear(selectedDate.getFullYear()); setDatePicker(true); }}
        style={{ margin:"8px 16px 16px", width:"calc(100% - 32px)", background:"linear-gradient(135deg,rgba(74,222,128,0.08),rgba(34,197,94,0.03))", border:"1px solid rgba(74,222,128,0.15)", borderRadius:18, padding:"14px 18px", textAlign:"left", cursor:"pointer" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div>
            <p style={{ color:"#4ade80", fontWeight:700, fontSize:14, margin:0 }}>{dateStr}</p>
            {!isToday && <p style={{ color:"#f97316", fontSize:11, margin:"2px 0 0", fontWeight:700 }}>← Viewing past date · tap to change</p>}
            {isToday  && <p style={{ color:"#334155", fontSize:11, margin:"2px 0 0" }}>Tap to view a different date</p>}
          </div>
          <div style={{ width:32, height:32, borderRadius:10, background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:99, height:6 }}>
            <div style={{ background:"linear-gradient(90deg,#4ade80,#22c55e)", width:`${(doneSel/5)*100}%`, height:6, borderRadius:99, transition:"width 0.5s ease" }} />
          </div>
          <span style={{ color:"#94a3b8", fontSize:13, fontWeight:700 }}>{doneSel}/5</span>
        </div>
      </button>

      {/* Prayer buttons */}
      <div style={{ padding:"0 16px" }}>
        <p style={S.sectionTitle}>{isToday ? "Today's Prayers" : `Prayers — ${selectedDate.toLocaleDateString("en-US",{day:"numeric",month:"short"})}`}</p>
        {PRAYERS.map(prayer => {
          const st = selLog[prayer];
          const bs = getBtnStyle(prayer);
          return (
            <div key={prayer} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <button style={{ flex:1, padding:"14px 16px", borderRadius:18, display:"flex", alignItems:"center", gap:12, cursor:"pointer", transition:"all 0.2s", background:bs.bg, border:`1.5px solid ${bs.border}` }}
                onClick={() => setPrayerPopup({ prayer })}>
                <div style={{ width:42, height:42, borderRadius:14, background:"rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                  {PRAYER_ICONS[prayer]}
                </div>
                <div style={{ flex:1, textAlign:"left" }}>
                  <p style={{ color:bs.text, fontWeight:700, margin:0, fontSize:15 }}>{prayer}</p>
                  <p style={{ color:"#334155", fontSize:11, margin:0 }}>{bs.label}</p>
                </div>
                {st && st !== STATUS.NONE && (
                  <div style={{ width:10, height:10, borderRadius:"50%", background:STATUS_COLORS[st]?.dot, flexShrink:0 }} />
                )}
              </button>

              {/* Add Qaza button */}
              <button
                style={{ height:52, paddingLeft:10, paddingRight:10, borderRadius:14, background:"rgba(249,115,22,0.07)", border:"1.5px solid rgba(249,115,22,0.22)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, flexShrink:0 }}
                onClick={() => { setQazaPopup({ prayer }); setQazaCount(1); }}
                title={`Add Qaza for ${prayer}`}>
                <span style={{ fontSize:14 }}>⏳</span>
                <span style={{ fontSize:8, color:"#fb923c", fontWeight:800, letterSpacing:0.3, whiteSpace:"nowrap" }}>Add Qaza</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, padding:"14px 16px 28px", justifyContent:"center" }}>
        {[
          ...Object.entries(STATUS_COLORS).map(([,v]) => ({ col:v.dot, label:v.label })),
          { col:"#ef4444", label:"Missed" },
        ].map(l => (
          <div key={l.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:l.col }} />
            <span style={{ color:"#334155", fontSize:11 }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Date Picker Overlay ── */}
      {datePicker && (
        <Overlay onClose={() => setDatePicker(false)}>
          <h3 style={{ color:"#fff", margin:"0 0 4px", fontSize:18, fontWeight:900 }}>📅 Select a Date</h3>
          <p style={{ color:"#334155", fontSize:12, margin:"0 0 16px" }}>Choose any day from when Salah became obligatory</p>

          {/* Month nav */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <button style={S.navBtn} onClick={pickerPrev} disabled={!pickerCanPrev}>‹</button>
            <span style={{ color:"#fff", fontWeight:800, fontSize:15 }}>
              {pickerFirst.toLocaleString("default",{month:"long"})} {pickerYear}
            </span>
            <button style={S.navBtn} onClick={pickerNext} disabled={!pickerCanNext}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
            {["M","T","W","T","F","S","S"].map((d,i) => (
              <div key={i} style={{ color:"#1e293b", fontSize:10, textAlign:"center", fontWeight:800 }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:16 }}>
            {pickerDays.map((date, i) => {
              if (!date) return <div key={i} />;
              const disabled  = date < startDate || date > today;
              const isSelDay  = date.toDateString() === selectedDate.toDateString();
              const isTodayD  = date.toDateString() === today.toDateString();
              const dl        = prayerLog[dateKey(date)] || {};
              const doneCnt   = PRAYERS.filter(p => dl[p] && dl[p] !== STATUS.NONE).length;
              const dotCol    = disabled ? "transparent"
                              : doneCnt === 5 ? "#22c55e"
                              : doneCnt > 0   ? "#eab308"
                              : "#ef4444";
              return (
                <button key={i} disabled={disabled}
                  onClick={() => selectDay(date)}
                  style={{
                    width:"100%", aspectRatio:"1", borderRadius:10, border:"none",
                    background: isSelDay ? "#4ade80" : isTodayD ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)",
                    color: isSelDay ? "#020c14" : disabled ? "#1e293b" : "#fff",
                    fontWeight: isSelDay || isTodayD ? 800 : 500,
                    fontSize:13, cursor: disabled ? "default" : "pointer",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1,
                    outline: isTodayD && !isSelDay ? "1.5px solid rgba(74,222,128,0.4)" : "none",
                  }}>
                  <span>{date.getDate()}</span>
                  {!disabled && <div style={{ width:4, height:4, borderRadius:"50%", background: isSelDay?"rgba(2,12,20,0.5)":dotCol }} />}
                </button>
              );
            })}
          </div>

          {/* Quick jumps */}
          <button style={{ ...S.primaryBtn, marginBottom:0 }}
            onClick={() => { setSelectedDate(today); setDatePicker(false); }}>
            Jump to Today
          </button>
        </Overlay>
      )}

      {/* Prayer status popup */}
      {prayerPopup && (
        <Overlay onClose={() => setPrayerPopup(null)}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div style={{ width:52, height:52, borderRadius:16, background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>
              {PRAYER_ICONS[prayerPopup.prayer]}
            </div>
            <div>
              <h3 style={{ color:"#fff", margin:0, fontSize:20, fontWeight:900 }}>{prayerPopup.prayer}</h3>
              <p style={{ color:"#334155", margin:0, fontSize:13 }}>
                {isToday ? "How did you pray?" : selectedDate.toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"})}
              </p>
            </div>
          </div>
          {Object.entries(STATUS_COLORS).map(([k,v]) => (
            <button key={k} style={{ ...S.popupBtn, background:v.bg, border:`1.5px solid ${v.border}`, color:v.text }}
              onClick={() => markPrayer(prayerPopup.prayer, k)}>
              {k==="jamaat"?"🕌 ":k==="solo"?"🙏 ":"⏳ "}{v.label}
            </button>
          ))}
          <button style={{ ...S.popupBtn, background:"rgba(239,68,68,0.08)", border:"1.5px solid rgba(239,68,68,0.3)", color:"#f87171", marginTop:6 }}
            onClick={() => markPrayer(prayerPopup.prayer, STATUS.NONE)}>
            ✕ Mark as Missed
          </button>
        </Overlay>
      )}

      {/* Qaza count popup */}
      {qazaPopup && (
        <Overlay onClose={() => setQazaPopup(null)}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
            <div style={{ width:52, height:52, borderRadius:16, background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>
              ⏳
            </div>
            <div>
              <h3 style={{ color:"#fff", margin:0, fontSize:18, fontWeight:900 }}>Complete Qaza</h3>
              <p style={{ color:"#334155", margin:0, fontSize:12 }}>{qazaPopup.prayer} · fills earliest missed dates</p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:24, justifyContent:"center", margin:"18px 0 24px" }}>
            <button style={S.counterBtn} onClick={() => setQazaCount(Math.max(1, qazaCount-1))}>−</button>
            <div style={{ textAlign:"center" }}>
              <p style={{ color:"#4ade80", fontSize:42, fontWeight:900, margin:0, lineHeight:1 }}>{qazaCount}</p>
              <p style={{ color:"#334155", fontSize:12, margin:"4px 0 0" }}>prayer{qazaCount!==1?"s":""}</p>
            </div>
            <button style={S.counterBtn} onClick={() => setQazaCount(qazaCount+1)}>+</button>
          </div>
          <button style={S.primaryBtn} onClick={() => handleQazaDone(qazaPopup.prayer, qazaCount)}>
            Confirm {qazaCount} Qaza for {qazaPopup.prayer}
          </button>
        </Overlay>
      )}
    </div>
  );
}

// ─── 5-dot prayer indicator ───────────────────────────────────────────────────
function PrayerDots({ dayLog, size=32 }) {
  const r     = size/2;
  const dotR  = size*0.085;
  const ringR = size*0.36;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {PRAYERS.map((p, i) => {
        const angle = (i/5)*2*Math.PI - Math.PI/2;
        const cx    = r + ringR*Math.cos(angle);
        const cy    = r + ringR*Math.sin(angle);
        const st    = dayLog?.[p];
        const col   = st===STATUS.JAMAAT ? "#22c55e"
                    : st===STATUS.SOLO   ? "#eab308"
                    : st===STATUS.QAZA   ? "#f97316"
                    : st===STATUS.NONE   ? "#ef4444"
                    : "rgba(255,255,255,0.1)";
        return <circle key={p} cx={cx} cy={cy} r={dotR} fill={col} />;
      })}
    </svg>
  );
}

// ─── Log Tab ──────────────────────────────────────────────────────────────────
function LogTab({ user, prayerLog }) {
  const today     = new Date();
  const startDate = getAge7Date(user.dob);
  const minYear   = startDate.getFullYear(), minMonth = startDate.getMonth();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [navPopup, setNavPopup]   = useState(false);
  const [navY, setNavY]           = useState(today.getFullYear());
  const [navM, setNavM]           = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay  = new Date(viewYear, viewMonth+1, 0);
  const startDow = (firstDay.getDay()+6)%7;

  const canPrev = viewYear>minYear || (viewYear===minYear && viewMonth>minMonth);
  const canNext = viewYear<today.getFullYear() || (viewYear===today.getFullYear() && viewMonth<today.getMonth());

  const prev = () => { if(viewMonth===0){setViewYear(v=>v-1);setViewMonth(11);}else setViewMonth(m=>m-1); };
  const next = () => { if(viewMonth===11){setViewYear(v=>v+1);setViewMonth(0);}else setViewMonth(m=>m+1); };

  const calDays = [];
  for(let i=0;i<startDow;i++) calDays.push(null);
  for(let d=1;d<=lastDay.getDate();d++) calDays.push(new Date(viewYear,viewMonth,d));

  const isActive = (date) => date && date >= startDate && date <= today;

  // Aggregate stats
  let totalPossible=0, totalDone=0, totalJamaat=0, totalSolo=0, totalQaza=0;
  let cur = new Date(startDate);
  while(cur <= today) {
    const k=dateKey(cur), dl=prayerLog[k]||{};
    for(const p of PRAYERS) {
      totalPossible++;
      const st=dl[p];
      if(st===STATUS.JAMAAT){totalDone++;totalJamaat++;}
      else if(st===STATUS.SOLO){totalDone++;totalSolo++;}
      else if(st===STATUS.QAZA){totalDone++;totalQaza++;}
    }
    cur=addDays(cur,1);
  }
  const pct = totalPossible ? Math.round((totalDone/totalPossible)*100) : 0;

  // Yearly breakdown
  const yearRange = Array.from({length:today.getFullYear()-minYear+1},(_,i)=>minYear+i);
  const yearStats = yearRange.map(yr => {
    let yP=0, yD=0;
    const s2 = new Date(yr,0,1) < startDate ? startDate : new Date(yr,0,1);
    const e2 = new Date(yr,11,31) > today ? today : new Date(yr,11,31);
    let c2=new Date(s2);
    while(c2<=e2){ const k=dateKey(c2),dl=prayerLog[k]||{}; for(const p of PRAYERS){yP++;if(dl[p]&&dl[p]!==STATUS.NONE)yD++;} c2=addDays(c2,1); }
    return { yr, pct:yP?Math.round((yD/yP)*100):0, done:yD, poss:yP };
  });

  const monthName = firstDay.toLocaleString("default",{month:"long"});

  return (
    <div style={S.scrollArea}>
      <div style={{ padding:"24px 20px 12px" }}>
        <h2 style={{ color:"#fff", margin:0, fontSize:22, fontWeight:900 }}>Prayer Log</h2>
        <p style={{ color:"#334155", fontSize:13, margin:"2px 0 0" }}>Your complete history</p>
      </div>

      {/* Calendar */}
      <div style={{ margin:"0 16px 16px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:22, padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <button style={S.navBtn} onClick={prev} disabled={!canPrev}>‹</button>
          {/* Clickable — opens month/year navigator */}
          <button style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 12px", borderRadius:10, background:"rgba(255,255,255,0.04)" }}
            onClick={() => { setNavY(viewYear); setNavM(viewMonth); setNavPopup(true); }}>
            <span style={{ color:"#fff", fontWeight:800, fontSize:15 }}>{monthName} {viewYear}</span>
            <span style={{ color:"#4ade80", fontSize:11, marginLeft:6 }}>▾</span>
          </button>
          <button style={S.navBtn} onClick={next} disabled={!canNext}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
          {["M","T","W","T","F","S","S"].map((d,i) => (
            <div key={i} style={{ color:"#1e293b", fontSize:10, textAlign:"center", fontWeight:800, padding:"0 0 4px" }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:0 }}>
          {calDays.map((date,i) => {
            if (!date) return <div key={i} style={{ height:46 }} />;
            const active = isActive(date);
            const k      = dateKey(date);
            const dl     = prayerLog[k];
            const isToday = date.toDateString()===today.toDateString();
            return (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"2px 0", opacity:active?1:0.18 }}>
                <span style={{ color:isToday?"#4ade80":"#334155", fontSize:9, fontWeight:isToday?900:600, marginBottom:1 }}>
                  {date.getDate()}
                </span>
                {active ? <PrayerDots dayLog={dl} size={28} /> : <div style={{ width:28, height:28 }} />}
              </div>
            );
          })}
        </div>

        {/* Dot legend */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", marginTop:12, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.04)" }}>
          {[["#22c55e","Jamaat"],["#eab308","Solo"],["#f97316","Qaza"],["#ef4444","Missed"],["rgba(255,255,255,0.15)","Pending"]].map(([c,l])=>(
            <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:c }} />
              <span style={{ color:"#334155", fontSize:10 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Overall progress */}
      <div style={{ margin:"0 16px 16px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:22, padding:18 }}>
        <p style={S.sectionTitle}>Overall Progress</p>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:18 }}>
          <CircleProgress pct={pct} color="#4ade80" size={74} />
          <div>
            <p style={{ color:"#fff", fontSize:34, fontWeight:900, margin:0, lineHeight:1 }}>{pct}%</p>
            <p style={{ color:"#334155", fontSize:12, margin:"4px 0 0" }}>Prayers Completed</p>
            <p style={{ color:"#ef4444", fontSize:12, margin:"2px 0 0" }}>{100-pct}% missed</p>
          </div>
          <div style={{ marginLeft:"auto", textAlign:"right" }}>
            <p style={{ color:"#4ade80", fontSize:18, fontWeight:900, margin:0 }}>{totalDone.toLocaleString()}</p>
            <p style={{ color:"#334155", fontSize:11, margin:"2px 0 0" }}>of {totalPossible.toLocaleString()}</p>
          </div>
        </div>
        {[
          { label:"🕌 With Jamaat",    val:totalJamaat, col:"#4ade80" },
          { label:"🙏 Without Jamaat", val:totalSolo,   col:"#facc15" },
          { label:"⏳ As Qazaa",       val:totalQaza,   col:"#fb923c" },
        ].map(s => {
          const pOfTotal = totalPossible ? Math.round((s.val/totalPossible)*100) : 0;
          const pOfDone  = totalDone     ? Math.round((s.val/totalDone)*100)     : 0;
          return (
            <div key={s.label} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                <span style={{ color:"#94a3b8", fontSize:13 }}>{s.label}</span>
                <div style={{ textAlign:"right" }}>
                  <span style={{ color:s.col, fontWeight:700, fontSize:13 }}>{s.val.toLocaleString()}</span>
                  <span style={{ color:"#475569", fontSize:11 }}> ({pOfTotal}% of all · {pOfDone}% of done)</span>
                </div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:99, height:5 }}>
                <div style={{ background:s.col, width:`${pOfTotal}%`, height:5, borderRadius:99, transition:"width 0.6s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Qaza Journey — Year by Year */}
      <div style={{ margin:"0 16px 16px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:22, padding:18 }}>
        <p style={S.sectionTitle}>Qaza Journey — Year by Year</p>
        {[...yearStats].reverse().map(({ yr, pct:yp, done:yd, poss:yps }) => {
          const barCol = yp===100 ? "#4ade80" : yp>66 ? "#22c55e" : yp>33 ? "#eab308" : "#ef4444";
          return (
            <div key={yr} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
                <span style={{ color:"#e2e8f0", fontWeight:800, fontSize:14 }}>{yr}</span>
                <span style={{ color:barCol, fontWeight:700, fontSize:12 }}>{yp}% · {yd}/{yps} prayers</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:99, height:7, overflow:"hidden" }}>
                <div style={{ background:barCol, width:`${yp}%`, height:7, borderRadius:99, transition:"width 0.5s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height:80 }} />

      {/* Month/Year navigator popup */}
      {navPopup && (
        <Overlay onClose={() => setNavPopup(false)}>
          <h3 style={{ color:"#fff", marginBottom:18, fontSize:18, fontWeight:900 }}>📅 Navigate to Month</h3>
          <div style={{ display:"flex", gap:10, marginBottom:18 }}>
            <select style={{ ...S.select, flex:1 }} value={navY} onChange={e => setNavY(+e.target.value)}>
              {yearRange.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select style={{ ...S.select, flex:1 }} value={navM} onChange={e => setNavM(+e.target.value)}>
              {Array.from({length:12},(_,i)=>i).map(m => {
                const tooEarly = navY===minYear && m<minMonth;
                const tooLate  = navY===today.getFullYear() && m>today.getMonth();
                return (
                  <option key={m} value={m} disabled={tooEarly||tooLate}>
                    {new Date(2000,m,1).toLocaleString("default",{month:"long"})}
                  </option>
                );
              })}
            </select>
          </div>
          <button style={S.primaryBtn} onClick={() => { setViewYear(navY); setViewMonth(navM); setNavPopup(false); }}>
            Go → {new Date(navY,navM,1).toLocaleString("default",{month:"long"})} {navY}
          </button>
        </Overlay>
      )}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ user, onLogout, updateUser }) {
  const [editDob, setEditDob] = useState(false);
  const [newDob, setNewDob]   = useState(user.dob);
  const [saved, setSaved]     = useState(false);

  const saveDob = () => {
    if (!newDob) return;
    updateUser({ ...user, dob: newDob });
    setEditDob(false); setSaved(true);
    setTimeout(()=>setSaved(false),2500);
  };

  const startDate = getAge7Date(user.dob);

  return (
    <div style={S.scrollArea}>
      <div style={{ padding:"24px 20px 12px" }}>
        <h2 style={{ color:"#fff", margin:0, fontSize:22, fontWeight:900 }}>Profile</h2>
      </div>

      {/* Avatar */}
      <div style={{ margin:"0 16px 16px", background:"linear-gradient(135deg,rgba(74,222,128,0.1),rgba(34,197,94,0.03))", border:"1px solid rgba(74,222,128,0.18)", borderRadius:22, padding:20, display:"flex", alignItems:"center", gap:16 }}>
        <div style={{ width:62, height:62, borderRadius:20, background:"linear-gradient(135deg,#4ade80,#22c55e)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:900, color:"#020c14", flexShrink:0 }}>
          {user.name[0].toUpperCase()}
        </div>
        <div>
          <p style={{ color:"#fff", fontWeight:900, fontSize:18, margin:0 }}>{user.name}</p>
          <p style={{ color:"#334155", fontSize:13, margin:"2px 0 0" }}>{user.email}</p>
        </div>
      </div>

      {/* DOB */}
      <div style={{ margin:"0 16px 16px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:22, padding:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <p style={S.sectionTitle}>Date of Birth</p>
          <button style={{ background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.25)", color:"#4ade80", borderRadius:10, padding:"5px 14px", cursor:"pointer", fontSize:12, fontWeight:700 }}
            onClick={() => setEditDob(!editDob)}>
            {editDob ? "Cancel" : "✎ Edit"}
          </button>
        </div>
        {!editDob ? (
          <>
            <p style={{ color:"#fff", fontSize:16, fontWeight:700, margin:"0 0 6px" }}>{new Date(user.dob).toDateString()}</p>
            <p style={{ color:"#334155", fontSize:13, margin:0 }}>
              Salah became obligatory: <span style={{ color:"#4ade80", fontWeight:700 }}>{startDate.toDateString()}</span>
            </p>
          </>
        ) : (
          <>
            <input type="date" style={{ ...S.input, marginBottom:12 }} value={newDob} onChange={e => setNewDob(e.target.value)} />
            <button style={S.primaryBtn} onClick={saveDob}>Save Date of Birth</button>
          </>
        )}
        {saved && <p style={{ color:"#4ade80", fontSize:13, marginTop:10 }}>✓ Date of birth updated successfully</p>}
      </div>

      {/* Data note */}
      <div style={{ margin:"0 16px 16px", background:"rgba(74,222,128,0.04)", border:"1px solid rgba(74,222,128,0.1)", borderRadius:18, padding:14 }}>
        <p style={{ color:"#334155", fontSize:13, margin:0, lineHeight:1.6 }}>
          💾 Your prayer data is stored locally on this device. Signing out won't delete it — sign back in with the same account to access it.
        </p>
      </div>

      {/* Logout */}
      <div style={{ margin:"0 16px" }}>
        <button style={{ width:"100%", padding:"14px 0", background:"rgba(239,68,68,0.08)", border:"1.5px solid rgba(239,68,68,0.22)", borderRadius:16, color:"#f87171", fontWeight:800, fontSize:15, cursor:"pointer" }}
          onClick={onLogout}>
          Sign Out
        </button>
      </div>
      <div style={{ height:80 }} />
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  return (
    <div style={S.bottomNav}>
      {[
        { k:"home",    icon:<HomeIcon />,    label:"Today"   },
        { k:"log",     icon:<LogIcon />,     label:"Log"     },
        { k:"profile", icon:<ProfileIcon />, label:"Profile" },
      ].map(t => (
        <button key={t.k} style={{ ...S.navTab, color: tab===t.k?"#4ade80":"#1e293b" }} onClick={() => setTab(t.k)}>
          {t.icon}
          <span style={{ fontSize:10, fontWeight:800 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function HomeIcon() {
  return <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>;
}
function LogIcon() {
  return <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function ProfileIcon() {
  return <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>;
}

// ─── Circle Progress ──────────────────────────────────────────────────────────
function CircleProgress({ pct, color, size=70 }) {
  const r = size/2-5, c = 2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={c} strokeDashoffset={c*(1-pct/100)} strokeLinecap="round"
        style={{ transition:"stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}

// ─── Overlay ──────────────────────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div style={S.overlayBg} onClick={onClose}>
      <div style={S.overlayCard} onClick={e => e.stopPropagation()}>
        {children}
        <button style={{ width:"100%", padding:"13px 0", borderRadius:14, cursor:"pointer", fontWeight:600, fontSize:14, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", color:"#334155", marginTop:6 }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page:        { minHeight:"100vh", background:"linear-gradient(160deg,#020c14 0%,#05101e 60%,#020810 100%)", display:"flex", alignItems:"flex-start", justifyContent:"center", fontFamily:"'SF Pro Display','Segoe UI',system-ui,sans-serif" },
  appShell:    { width:"100%", maxWidth:430, minHeight:"100vh", display:"flex", flexDirection:"column", position:"relative" },
  authCard:    { background:"rgba(255,255,255,0.025)", backdropFilter:"blur(28px)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:28, padding:"40px 28px", width:"100%", maxWidth:380, margin:"40px 20px", display:"flex", flexDirection:"column", alignItems:"center" },
  accountRow:  { width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, marginBottom:8, cursor:"pointer", display:"flex", alignItems:"center", gap:12 },
  avatar:      { width:42, height:42, borderRadius:13, background:"linear-gradient(135deg,#4ade80,#22c55e)", display:"flex", alignItems:"center", justifyContent:"center", color:"#020c14", fontWeight:900, fontSize:19, flexShrink:0 },
  ghostBtn:    { width:"100%", padding:"12px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, color:"#334155", fontSize:14, cursor:"pointer", fontWeight:700 },
  input:       { width:"100%", padding:"12px 16px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, color:"#fff", fontSize:14, marginBottom:10, outline:"none", boxSizing:"border-box" },
  primaryBtn:  { width:"100%", padding:"14px 0", background:"linear-gradient(135deg,#4ade80,#22c55e)", border:"none", borderRadius:14, color:"#020c14", fontSize:15, fontWeight:900, cursor:"pointer", letterSpacing:0.3 },
  methodBtn:   { width:"100%", padding:"14px 16px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, color:"#fff", marginBottom:10, cursor:"pointer", display:"flex", alignItems:"center", gap:14, textAlign:"left", transition:"all 0.2s" },
  methodBtnActive: { background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.35)" },
  select:      { flex:1, padding:"10px 12px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#fff", fontSize:13 },
  removeBtn:   { background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12, marginTop:8 },
  addBtn:      { width:"100%", padding:"10px 0", background:"rgba(74,222,128,0.05)", border:"1px dashed rgba(74,222,128,0.2)", borderRadius:12, color:"#4ade80", cursor:"pointer", fontSize:14, fontWeight:700, marginTop:4 },
  scrollArea:  { flex:1, overflowY:"auto", paddingBottom:80 },
  sectionTitle:{ color:"#1e293b", fontSize:11, fontWeight:800, letterSpacing:1.5, textTransform:"uppercase", margin:"0 0 14px" },
  overlayBg:   { position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 },
  overlayCard: { background:"#040d18", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"28px 28px 0 0", padding:"28px 24px 36px", width:"100%", maxWidth:430, display:"flex", flexDirection:"column" },
  popupBtn:    { width:"100%", padding:"14px 0", borderRadius:14, cursor:"pointer", fontWeight:700, fontSize:15, marginBottom:8 },
  counterBtn:  { width:48, height:48, borderRadius:14, background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)", color:"#4ade80", fontSize:28, cursor:"pointer", fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center" },
  bottomNav:   { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"rgba(2,8,16,0.97)", backdropFilter:"blur(28px)", borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", zIndex:50 },
  navTab:      { flex:1, padding:"12px 0 14px", background:"transparent", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, fontWeight:800, transition:"color 0.2s" },
  navBtn:      { background:"rgba(255,255,255,0.04)", border:"none", color:"#475569", width:34, height:34, borderRadius:10, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" },
};
