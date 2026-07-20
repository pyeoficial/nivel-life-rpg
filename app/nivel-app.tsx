"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Mission = { id: string; title: string; detail: string; area: string; icon: string; xp: number; coins: number; minutes: number; done: boolean };
type Habit = { id: string; title: string; icon: string; area: string; xp: number; coins: number; history: string[] };
type Reward = { id: string; title: string; detail: string; icon: string; cost: number; timesRedeemed?: number };
type EventItem = { id: string; text: string; icon: string; at: string };
type CheckIn = { date: string; energy: string; mood: string };
type GameState = {
  name: string;
  xp: number;
  coins: number;
  missions: Mission[];
  habits: Habit[];
  rewards: Reward[];
  events: EventItem[];
  checkIns: CheckIn[];
  streak: number;
  activeDays: string[];
  lastActiveDate: string;
  chestClaimedDate: string;
  totalQuests: number;
};

const today = () => new Date().toISOString().slice(0, 10);

const FALLBACK: GameState = {
  name: "Ale", xp: 176, coins: 42, streak: 4, activeDays: [], lastActiveDate: today(), chestClaimedDate: "", totalQuests: 7,
  missions: [
    { id: "focus", title: "Cerrar la prioridad clave", detail: "Una sesión sin interrupciones", area: "Enfoque", icon: "⚡", xp: 25, coins: 12, minutes: 45, done: false },
    { id: "body", title: "Activar el cuerpo", detail: "Movimiento breve y consciente", area: "Vitalidad", icon: "🌿", xp: 10, coins: 5, minutes: 15, done: false },
    { id: "read", title: "Lectura con intención", detail: "Lee y registra una idea", area: "Sabiduría", icon: "📚", xp: 10, coins: 5, minutes: 20, done: false },
  ],
  habits: [
    { id: "exercise", title: "Mover mi cuerpo", icon: "🏃", area: "Vitalidad", xp: 8, coins: 3, history: [] },
    { id: "sleep", title: "Dormir a tiempo", icon: "🌙", area: "Descanso", xp: 8, coins: 3, history: [] },
    { id: "punctual", title: "Llegar a tiempo", icon: "⏱", area: "Orden", xp: 8, coins: 3, history: [] },
    { id: "read-habit", title: "Leer 10 minutos", icon: "📖", area: "Sabiduría", xp: 8, coins: 3, history: [] },
  ],
  rewards: [
    { id: "coffee", title: "Café especial", detail: "Disfrútalo sin culpa", icon: "☕", cost: 50, timesRedeemed: 0 },
    { id: "game", title: "90 min de videojuegos", detail: "Tiempo libre elegido", icon: "🎮", cost: 90, timesRedeemed: 0 },
    { id: "food", title: "Comida fuera", detail: "Tu capricho favorito", icon: "🍜", cost: 140, timesRedeemed: 0 },
  ],
  events: [{ id: "welcome", text: "Tu aventura comenzó", icon: "✨", at: "Hoy" }],
  checkIns: [],
};

const tabs = [
  { id: "map", label: "Aventura", icon: "⌁" },
  { id: "habits", label: "Rituales", icon: "↻" },
  { id: "hero", label: "Héroe", icon: "♞" },
  { id: "camp", label: "Base", icon: "⌂" },
] as const;

const energies = [
  { id: "baja", icon: "🌙", label: "Suave" },
  { id: "media", icon: "☀️", label: "Lista" },
  { id: "alta", icon: "⚡", label: "A tope" },
];

const moods = ["😌", "🙂", "🔥", "😵‍💫"];

function levelOf(xp: number) { return Math.floor(xp / 100) + 1; }
function stageOf(level: number) {
  if (level >= 8) return { label: "Leyenda", index: 3, next: 10 };
  if (level >= 5) return { label: "Campeón", index: 2, next: 8 };
  if (level >= 3) return { label: "Explorador", index: 1, next: 5 };
  return { label: "Aspirante", index: 0, next: 3 };
}

function lastSevenDays() {
  const now = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - 6 + index);
    return { key: date.toISOString().slice(0, 10), label: ["D", "L", "M", "X", "J", "V", "S"][date.getDay()] };
  });
}

function habitStreak(history: string[]) {
  const set = new Set(history);
  let streak = 0;
  const cursor = new Date();
  for (let index = 0; index < 90; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function NivelApp() {
  const [state, setState] = useState<GameState>(FALLBACK);
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("map");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<"mission" | "habit">("mission");
  const [installOpen, setInstallOpen] = useState(false);
  const [energy, setEnergy] = useState("media");
  const [minutes, setMinutes] = useState("60");
  const [connected, setConnected] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newArea, setNewArea] = useState("Enfoque");
  const [newIcon, setNewIcon] = useState("⚡");
  const [campView, setCampView] = useState<"rewards" | "progress">("rewards");

  const level = levelOf(state.xp);
  const stage = stageOf(level);
  const xpWithin = state.xp % 100;
  const completed = state.missions.filter((mission) => mission.done).length;
  const habitsDone = state.habits.filter((habit) => habit.history.includes(today())).length;
  const dailySteps = completed + habitsDone;
  const chestGoal = Math.min(5, Math.max(3, state.missions.length > 0 ? 5 : 3));
  const chestReady = dailySteps >= chestGoal && state.chestClaimedDate !== today();
  const checkIn = state.checkIns.find((item) => item.date === today());
  const week = useMemo(() => lastSevenDays(), []);
  const balance = Math.min(100, Math.round((dailySteps / Math.max(state.missions.length + Math.min(3, state.habits.length), 1)) * 100));

  useEffect(() => {
    fetch("/api/state", { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => setState(data.state))
      .catch(() => setConnected(false));
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function act(action: Record<string, string>) {
    const key = action.id ?? action.type;
    setBusy(key);
    try {
      const response = await fetch("/api/state", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(action) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo completar");
      setState(data.state);
      setConnected(true);
      setToast(data.message);
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Inténtalo de nuevo");
      setConnected(false);
      return false;
    } finally { setBusy(null); }
  }

  async function submitCapture(event: FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) return;
    const success = await act({ type: captureMode === "mission" ? "addMission" : "addHabit", title: newTitle, area: newArea, icon: newIcon, minutes: "20" });
    if (success) { setCaptureOpen(false); setNewTitle(""); }
  }

  async function saveCheckIn(selectedEnergy: string, mood = checkIn?.mood ?? "🙂") {
    setEnergy(selectedEnergy);
    await act({ type: "checkin", energy: selectedEnergy, mood });
  }

  return (
    <main className="stage game-stage">
      <aside className="story-panel game-story">
        <div className="brand"><span className="brand-mark">N</span><span>NIVEL</span></div>
        <div className="story-copy">
          <p className="eyebrow">TU VIDA · TU AVENTURA</p>
          <h1>Entrena a tu héroe viviendo mejor.</h1>
          <p>Registra en un toque, crea rituales y avanza por un mundo que cambia contigo.</p>
          <div className="pill-row"><span>🗺 Misiones</span><span>↻ Rituales</span><span>🎁 Botín</span></div>
        </div>
        <div className="world-legend"><i /><span>CAPÍTULO I · EL DESPERTAR</span><i /></div>
      </aside>

      <section className="phone-shell game-shell" aria-label="Aplicación NIVEL">
        <div className="sky-stars" />
        <header className="game-header">
          <button className="profile-medal" onClick={() => setTab("hero")} aria-label="Abrir héroe"><span className={`mini-avatar stage-${stage.index}`} /></button>
          <div><p>CAPÍTULO {Math.max(1, level - 1)}</p><h2>Día de aventura</h2></div>
          <div className="resource-bar"><button onClick={() => setTab("hero")}><span>✦</span>{xpWithin}</button><button onClick={() => { setTab("camp"); setCampView("rewards"); }}><span>●</span>{state.coins}</button></div>
        </header>

        {!connected && <div className="offline-note">Reconectando tu partida…</div>}

        <div className="screen-content game-content">
          {tab === "map" && (
            <>
              <section className="adventure-banner">
                <div className="banner-copy"><span className="level-ribbon">NIVEL {level}</span><h3>{stage.label}</h3><p>{dailySteps ? `${dailySteps} acciones fortalecieron tu día.` : "El mapa espera tu primera acción."}</p><div className="xp-line"><span>Próximo nivel</span><strong>{xpWithin}/100 XP</strong></div><div className="progress-track"><i style={{ width: `${xpWithin}%` }} /></div></div>
                <div className="world-avatar"><div className={`avatar stage-${stage.index}`} /><span className="streak">🔥 {state.streak}</span></div>
              </section>

              <section className="checkin-card">
                <div><span className="orb">◉</span><p><b>{checkIn ? "Estado guardado" : "¿Cómo está tu energía?"}</b><small>{checkIn ? "Tu ruta puede adaptarse cuando quieras" : "Un toque y seguimos"}</small></p></div>
                <div className="energy-picks">{energies.map((item) => <button key={item.id} className={checkIn?.energy === item.id ? "selected" : ""} disabled={busy === "checkin"} onClick={() => saveCheckIn(item.id)} title={item.label}>{item.icon}</button>)}</div>
              </section>

              <section className="quest-board">
                <div className="board-head"><div><p className="eyebrow">RUTA DE HOY</p><h3>Misiones principales</h3></div><button onClick={() => setPlannerOpen(true)}>✦ Forjar ruta</button></div>
                <div className="quest-path">
                  {state.missions.map((mission, index) => (
                    <article className={`quest-node ${mission.done ? "complete" : ""}`} key={mission.id}>
                      <div className="path-line" />
                      <button className="quest-seal" disabled={mission.done || busy === mission.id} onClick={() => act({ type: "complete", id: mission.id })} aria-label={`Completar ${mission.title}`}><span>{mission.done ? "✓" : mission.icon}</span><small>{mission.done ? "HECHO" : `+${mission.xp}`}</small></button>
                      <div className="quest-copy"><span>ETAPA {index + 1} · {mission.area}</span><h4>{mission.title}</h4><p>{mission.detail} · {mission.minutes} min</p><div><b>✦ {mission.xp} XP</b><b>● {mission.coins}</b></div></div>
                    </article>
                  ))}
                </div>
              </section>

              <section className={`daily-chest ${chestReady ? "ready" : ""}`}>
                <span className="chest-art">{state.chestClaimedDate === today() ? "✅" : "🎁"}</span>
                <div><p className="eyebrow">COFRE DEL DÍA</p><h4>{state.chestClaimedDate === today() ? "Tesoro reclamado" : chestReady ? "¡Tu cofre está listo!" : `${Math.min(dailySteps, chestGoal)}/${chestGoal} acciones`}</h4><div className="chest-pips">{Array.from({ length: chestGoal }, (_, index) => <i key={index} className={index < dailySteps ? "filled" : ""} />)}</div></div>
                <button disabled={!chestReady || busy === "claimChest"} onClick={() => act({ type: "claimChest" })}>{state.chestClaimedDate === today() ? "✓" : chestReady ? "Abrir" : "🔒"}</button>
              </section>
            </>
          )}

          {tab === "habits" && (
            <section className="page-section ritual-page">
              <div className="page-hero-copy"><p className="eyebrow">ENTRENAMIENTO DIARIO</p><h3>Rituales del héroe</h3><p>Constancia visible, sin castigos por descansar.</p></div>
              <div className="ritual-summary"><div><span>🔥</span><p><strong>{state.streak}</strong><small>días de aventura</small></p></div><div><span>✓</span><p><strong>{habitsDone}/{state.habits.length}</strong><small>rituales de hoy</small></p></div></div>
              <div className="week-labels"><span /><span /><div>{week.map((day) => <b key={day.key}>{day.label}</b>)}</div></div>
              <div className="ritual-list">
                {state.habits.map((habit) => {
                  const done = habit.history.includes(today());
                  const streak = habitStreak(habit.history);
                  return <article className={`ritual-card ${done ? "done" : ""}`} key={habit.id}>
                    <button className="ritual-check" disabled={done || busy === habit.id} onClick={() => act({ type: "completeHabit", id: habit.id })} aria-label={`Registrar ${habit.title}`}>{done ? "✓" : habit.icon}</button>
                    <div className="ritual-name"><span>{habit.area}</span><h4>{habit.title}</h4><small>{streak ? `🔥 ${streak} días seguidos` : "Empieza hoy"} · +{habit.xp} XP</small></div>
                    <div className="habit-week">{week.map((day) => <i key={day.key} className={habit.history.includes(day.key) ? "hit" : day.key === today() ? "today" : ""}>{habit.history.includes(day.key) ? "✓" : ""}</i>)}</div>
                  </article>;
                })}
              </div>
              <button className="add-ritual" onClick={() => { setCaptureMode("habit"); setCaptureOpen(true); }}>＋ Crear nuevo ritual</button>
              <div className="kind-note"><span>🛡</span><p><b>Regla de la aventura</b><br />Un día sin marcar no borra lo que ya construiste. Mañana puedes retomar.</p></div>
            </section>
          )}

          {tab === "hero" && (
            <section className="page-section hero-page game-hero-page">
              <div className="page-hero-copy"><p className="eyebrow">IDENTIDAD EN PROGRESO</p><h3>Tu héroe interior</h3><p>Cada atributo cuenta una parte de tu vida.</p></div>
              <div className="hero-stage"><div className="hero-aura" /><div className={`avatar avatar-large stage-${stage.index}`} /><div className="hero-title"><span>NIVEL {level}</span><b>{stage.label}</b></div></div>
              <div className="hero-stats"><div><strong>{state.totalQuests}</strong><small>misiones</small></div><div><strong>{state.streak}</strong><small>racha</small></div><div><strong>{state.coins}</strong><small>monedas</small></div></div>
              <div className="attribute-list">
                {[{n:"Enfoque",i:"⚡",v:Math.min(96,54+state.totalQuests*2)},{n:"Vitalidad",i:"🌿",v:Math.min(94,42+state.habits.filter(h=>h.area==="Vitalidad").flatMap(h=>h.history).length*3)},{n:"Sabiduría",i:"📚",v:61},{n:"Orden",i:"◇",v:Math.min(90,44+habitsDone*3)},{n:"Valentía",i:"🛡",v:57}].map(attribute => <div className="attribute" key={attribute.n}><span>{attribute.i}</span><div><b>{attribute.n}</b><i><em style={{width:`${attribute.v}%`}} /></i></div><strong>{attribute.v}</strong></div>)}
              </div>
              <div className="next-stage"><span>🔓</span><div><b>Siguiente evolución: nivel {stage.next}</b><p>Nueva armadura, aura y título para tu héroe.</p></div></div>
            </section>
          )}

          {tab === "camp" && (
            <section className="page-section camp-page">
              <div className="page-hero-copy"><p className="eyebrow">CAMPAMENTO</p><h3>Descansa, mira y elige</h3><p>Tu base reúne botín, bitácora y ajustes.</p></div>
              <div className="camp-tabs"><button className={campView === "rewards" ? "active" : ""} onClick={() => setCampView("rewards")}>🎒 Botín</button><button className={campView === "progress" ? "active" : ""} onClick={() => setCampView("progress")}>📜 Bitácora</button></div>
              {campView === "rewards" ? <>
                <div className="camp-wallet"><span>Bolsa del aventurero</span><strong>● {state.coins}</strong></div>
                <div className="loot-list">{state.rewards.map((reward) => <article className="loot-card" key={reward.id}><span>{reward.icon}</span><div><h4>{reward.title}</h4><p>{reward.detail}{reward.timesRedeemed ? ` · ${reward.timesRedeemed} canje${reward.timesRedeemed > 1 ? "s" : ""}` : ""}</p></div><button disabled={state.coins < reward.cost || busy === reward.id} onClick={() => act({ type: "redeem", id: reward.id })}>● {reward.cost}</button></article>)}</div>
                <div className="campfire-card"><span>🔥</span><div><b>La fogata de recompensas</b><p>Elige descansos que realmente disfrutes. No son premios por “portarte bien”; son decisiones conscientes.</p></div></div>
              </> : <>
                <div className="score-card"><div className="score-ring" style={{"--score": `${balance * 3.6}deg`} as React.CSSProperties}><span>{balance}</span><small>balance</small></div><div><b>{balance >= 70 ? "Jornada poderosa" : "La ruta está abierta"}</b><p>{dailySteps} acciones registradas hoy.</p></div></div>
                <div className="event-list"><b>Crónica reciente</b>{state.events.slice(0,6).map((event) => <div key={event.id}><span>{event.icon}</span><p>{event.text}<small>{event.at}</small></p></div>)}</div>
              </>}
              <button className="install-game-card" onClick={() => setInstallOpen(true)}><span>⬇</span><div><b>Invocar NIVEL en tu teléfono</b><p>Instálala y entra como cualquier juego.</p></div><strong>›</strong></button>
            </section>
          )}
        </div>

        <nav className="bottom-nav game-nav" aria-label="Navegación principal">
          {tabs.slice(0, 2).map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}
          <button className="capture-button" onClick={() => setCaptureOpen(true)} aria-label="Registro rápido"><span>＋</span><small>Registrar</small></button>
          {tabs.slice(2).map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}
        </nav>
      </section>

      {plannerOpen && <div className="modal-backdrop" role="presentation" onClick={() => setPlannerOpen(false)}><section className="modal forge-modal" role="dialog" aria-modal="true" aria-labelledby="planner-title" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setPlannerOpen(false)}>×</button><span className="modal-symbol">⚒</span><p className="eyebrow">FORJA DE MISIONES</p><h3 id="planner-title">Crea una ruta posible</h3><p>Tres misiones calibradas para la energía y el tiempo que realmente tienes.</p><label>Energía<select value={energy} onChange={(event) => setEnergy(event.target.value)}><option value="baja">🌙 Suave — hoy necesito cuidarme</option><option value="media">☀️ Media — un ritmo equilibrado</option><option value="alta">⚡ Alta — quiero avanzar fuerte</option></select></label><label>Tiempo disponible<select value={minutes} onChange={(event) => setMinutes(event.target.value)}><option value="30">30 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option></select></label><button className="primary" disabled={busy === "generate"} onClick={async () => { if (await act({ type: "generate", energy, minutes })) setPlannerOpen(false); }}>{busy === "generate" ? "Forjando…" : "Forjar mi ruta ⚒"}</button></section></div>}

      {captureOpen && <div className="modal-backdrop" role="presentation" onClick={() => setCaptureOpen(false)}><section className="modal capture-modal" role="dialog" aria-modal="true" aria-labelledby="capture-title" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setCaptureOpen(false)}>×</button><span className="modal-symbol">＋</span><p className="eyebrow">REGISTRO RÁPIDO</p><h3 id="capture-title">¿Qué quieres añadir?</h3><div className="capture-tabs"><button className={captureMode === "mission" ? "active" : ""} onClick={() => setCaptureMode("mission")}>⚔ Misión</button><button className={captureMode === "habit" ? "active" : ""} onClick={() => setCaptureMode("habit")}>↻ Ritual</button></div><form onSubmit={submitCapture}><label>Nombre<input autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={60} placeholder={captureMode === "mission" ? "Ej. Enviar la propuesta" : "Ej. Preparar ropa mañana"} /></label><div className="form-row"><label>Símbolo<select value={newIcon} onChange={(event) => setNewIcon(event.target.value)}>{["⚡","🌿","📚","◇","🛡","🏃","🌙","⏱","💧","🧘"].map(icon => <option key={icon}>{icon}</option>)}</select></label><label>Atributo<select value={newArea} onChange={(event) => setNewArea(event.target.value)}>{["Enfoque","Vitalidad","Sabiduría","Orden","Descanso"].map(area => <option key={area}>{area}</option>)}</select></label></div><button className="primary" disabled={!newTitle.trim() || busy === (captureMode === "mission" ? "addMission" : "addHabit")}>{captureMode === "mission" ? "Añadir al mapa" : "Crear ritual"}</button></form></section></div>}

      {installOpen && <div className="modal-backdrop" role="presentation" onClick={() => setInstallOpen(false)}><section className="modal install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setInstallOpen(false)}>×</button><span className="modal-symbol">⬇</span><h3 id="install-title">Lleva tu aventura contigo</h3><div className="install-step"><b>Android · Chrome</b><p>Menú ⋮ → <strong>Instalar aplicación</strong>.</p></div><div className="install-step"><b>iPhone · Safari</b><p>Compartir □↑ → <strong>Añadir a pantalla de inicio</strong>.</p></div><button className="primary" onClick={() => setInstallOpen(false)}>Entendido</button></section></div>}

      {checkIn && tab === "map" && <div className="mood-dock"><span>Ánimo</span>{moods.map((mood) => <button key={mood} className={checkIn.mood === mood ? "selected" : ""} disabled={busy === "checkin"} onClick={() => act({ type: "checkin", energy: checkIn.energy, mood })}>{mood}</button>)}</div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
