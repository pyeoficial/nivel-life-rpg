import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { playerStates } from "../../../db/schema";

type Mission = { id: string; title: string; detail: string; area: string; icon: string; xp: number; coins: number; minutes: number; done: boolean };
type Habit = { id: string; title: string; icon: string; area: string; xp: number; coins: number; history: string[] };
type Reward = { id: string; title: string; detail: string; icon: string; cost: number; timesRedeemed: number; redeemed?: boolean };
type CheckIn = { date: string; energy: string; mood: string };
type GameState = {
  name: string; xp: number; coins: number; missions: Mission[]; habits: Habit[]; rewards: Reward[];
  events: { id: string; text: string; icon: string; at: string }[]; checkIns: CheckIn[];
  streak: number; activeDays: string[]; lastActiveDate: string; chestClaimedDate: string; totalQuests: number;
};

const COOKIE = "nivel_session";
const allowedAreas = new Set(["Enfoque", "Vitalidad", "Sabiduría", "Orden", "Descanso"]);
const allowedIcons = new Set(["⚡", "🌿", "📚", "◇", "🛡", "🏃", "🌙", "⏱", "💧", "🧘"]);
const today = () => new Date().toISOString().slice(0, 10);

function seedActiveDays() {
  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (3 - index));
    return date.toISOString().slice(0, 10);
  });
}

function defaults(): GameState {
  return {
    name: "Ale", xp: 176, coins: 42, streak: 4, activeDays: seedActiveDays(), lastActiveDate: today(), chestClaimedDate: "", totalQuests: 7,
    missions: [
      { id: "focus", title: "Cerrar la prioridad clave", detail: "Una sesión sin interrupciones", area: "Enfoque", icon: "⚡", xp: 25, coins: 12, minutes: 45, done: false },
      { id: "body", title: "Activar el cuerpo", detail: "Movimiento breve y consciente", area: "Vitalidad", icon: "🌿", xp: 10, coins: 5, minutes: 15, done: false },
      { id: "read", title: "Lectura con intención", detail: "Lee y registra una idea", area: "Sabiduría", icon: "📚", xp: 10, coins: 5, minutes: 20, done: false },
    ],
    habits: [
      { id: "exercise", title: "Mover mi cuerpo", icon: "🏃", area: "Vitalidad", xp: 8, coins: 3, history: [] },
      { id: "sleep", title: "Dormir a tiempo", icon: "🌙", area: "Descanso", xp: 8, coins: 3, history: [] },
      { id: "punctual", title: "Llegar a tiempo", icon: "⏱", area: "Orden", xp: 8, coins: 3, history: [] },
      { id: "read-habit", title: "Leer 10 minutos", icon: "📚", area: "Sabiduría", xp: 8, coins: 3, history: [] },
    ],
    rewards: [
      { id: "coffee", title: "Café especial", detail: "Disfrútalo sin culpa", icon: "☕", cost: 50, timesRedeemed: 0 },
      { id: "game", title: "90 min de videojuegos", detail: "Tiempo libre elegido", icon: "🎮", cost: 90, timesRedeemed: 0 },
      { id: "food", title: "Comida fuera", detail: "Tu capricho favorito", icon: "🍜", cost: 140, timesRedeemed: 0 },
    ],
    events: [{ id: "welcome", text: "Tu aventura comenzó", icon: "✨", at: "Hoy" }], checkIns: [],
  };
}

function normalize(raw: Partial<GameState> & { rewards?: Reward[] }) {
  const base = defaults();
  const hadDate = typeof raw.lastActiveDate === "string" && raw.lastActiveDate.length === 10;
  const newDay = hadDate && raw.lastActiveDate !== today();
  const missions = Array.isArray(raw.missions) ? raw.missions.map((mission) => ({ ...mission, done: newDay ? false : Boolean(mission.done) })) : base.missions;
  return {
    ...base,
    ...raw,
    name: typeof raw.name === "string" ? raw.name.slice(0, 30) : base.name,
    xp: Number.isFinite(raw.xp) ? Math.max(0, Number(raw.xp)) : base.xp,
    coins: Number.isFinite(raw.coins) ? Math.max(0, Number(raw.coins)) : base.coins,
    missions,
    habits: Array.isArray(raw.habits) ? raw.habits.map((habit) => ({ ...habit, history: Array.isArray(habit.history) ? habit.history.slice(-120) : [] })) : base.habits,
    rewards: Array.isArray(raw.rewards) ? raw.rewards.map((reward) => ({ ...reward, timesRedeemed: Number(reward.timesRedeemed ?? (reward.redeemed ? 1 : 0)) })) : base.rewards,
    events: Array.isArray(raw.events) ? raw.events.slice(0, 50) : base.events,
    checkIns: Array.isArray(raw.checkIns) ? raw.checkIns.slice(-60) : [],
    streak: Number.isFinite(raw.streak) ? Math.max(0, Number(raw.streak)) : base.streak,
    activeDays: Array.isArray(raw.activeDays) ? raw.activeDays.filter((day) => typeof day === "string").slice(-120) : base.activeDays,
    lastActiveDate: today(),
    chestClaimedDate: typeof raw.chestClaimedDate === "string" ? raw.chestClaimedDate : "",
    totalQuests: Number.isFinite(raw.totalQuests) ? Math.max(0, Number(raw.totalQuests)) : base.totalQuests,
  } satisfies GameState;
}

function sessionFrom(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  const found = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  return found?.slice(COOKIE.length + 1) || crypto.randomUUID();
}

function response(body: unknown, session: string, status = 200, request?: Request) {
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  const secure = request ? new URL(request.url).protocol === "https:" : true;
  headers.append("set-cookie", `${COOKIE}=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure ? "; Secure" : ""}`);
  return new Response(JSON.stringify(body), { status, headers });
}

async function readState(session: string) {
  const db = getDb();
  const [row] = await db.select().from(playerStates).where(eq(playerStates.sessionId, session)).limit(1);
  if (!row) {
    const state = defaults();
    await db.insert(playerStates).values({ sessionId: session, payload: JSON.stringify(state) });
    return state;
  }
  const state = normalize(JSON.parse(row.payload) as Partial<GameState>);
  await db.update(playerStates).set({ payload: JSON.stringify(state), updatedAt: new Date().toISOString() }).where(eq(playerStates.sessionId, session));
  return state;
}

async function saveState(session: string, state: GameState) {
  await getDb().update(playerStates).set({ payload: JSON.stringify(state), updatedAt: new Date().toISOString() }).where(eq(playerStates.sessionId, session));
}

function addEvent(state: GameState, text: string, icon: string) {
  state.events.unshift({ id: crypto.randomUUID(), text, icon, at: "Ahora" });
  state.events = state.events.slice(0, 50);
}

function touchActivity(state: GameState) {
  if (!state.activeDays.includes(today())) state.activeDays.push(today());
  state.activeDays = state.activeDays.slice(-120);
  const active = new Set(state.activeDays);
  const cursor = new Date();
  let streak = 0;
  for (let index = 0; index < 120; index += 1) {
    if (!active.has(cursor.toISOString().slice(0, 10))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  state.streak = streak;
}

function cleanText(value: unknown, max = 60) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Error inesperado";
  return message.includes("no such table") ? "La base de progreso todavía se está preparando. Inténtalo de nuevo en un momento." : message;
}

export async function GET(request: Request) {
  const session = sessionFrom(request);
  try { return response({ state: await readState(session) }, session, 200, request); }
  catch (error) { return response({ error: errorMessage(error) }, session, 500, request); }
}

export async function POST(request: Request) {
  const session = sessionFrom(request);
  try {
    const input = await request.json() as Record<string, unknown>;
    const state = await readState(session);
    const type = cleanText(input.type, 30);
    let message = "Progreso actualizado";

    if (type === "complete") {
      const mission = state.missions.find((item) => item.id === input.id);
      if (!mission) return response({ error: "Misión no encontrada" }, session, 404, request);
      if (!mission.done) {
        const oldLevel = Math.floor(state.xp / 100) + 1;
        mission.done = true; state.xp += mission.xp; state.coins += mission.coins; state.totalQuests += 1;
        const newLevel = Math.floor(state.xp / 100) + 1;
        addEvent(state, `Superaste: ${mission.title}`, mission.icon);
        message = newLevel > oldLevel ? `¡Evolución! Alcanzaste el nivel ${newLevel}` : `Misión superada · +${mission.xp} XP · +${mission.coins} monedas`;
      } else message = "Esa misión ya forma parte de tu historia";
    } else if (type === "completeHabit") {
      const habit = state.habits.find((item) => item.id === input.id);
      if (!habit) return response({ error: "Ritual no encontrado" }, session, 404, request);
      if (habit.history.includes(today())) message = "Ese ritual ya está registrado hoy";
      else {
        habit.history.push(today()); habit.history = habit.history.slice(-120); state.xp += habit.xp; state.coins += habit.coins;
        addEvent(state, `Ritual cumplido: ${habit.title}`, habit.icon);
        message = `Ritual registrado · +${habit.xp} XP`;
      }
    } else if (type === "checkin") {
      const energy = ["baja", "media", "alta"].includes(String(input.energy)) ? String(input.energy) : "media";
      const mood = ["😌", "🙂", "🔥", "😵‍💫"].includes(String(input.mood)) ? String(input.mood) : "🙂";
      const existing = state.checkIns.find((item) => item.date === today());
      if (existing) { existing.energy = energy; existing.mood = mood; message = "Estado del héroe actualizado"; }
      else { state.checkIns.push({ date: today(), energy, mood }); state.xp += 2; addEvent(state, "Registraste cómo te sientes", mood); message = "Check-in guardado · +2 XP"; }
    } else if (type === "claimChest") {
      const completed = state.missions.filter((mission) => mission.done).length;
      const habits = state.habits.filter((habit) => habit.history.includes(today())).length;
      if (state.chestClaimedDate === today()) message = "El cofre de hoy ya fue reclamado";
      else if (completed + habits < 5) return response({ error: "Completa cinco acciones para abrir el cofre" }, session, 400, request);
      else { state.xp += 30; state.coins += 15; state.chestClaimedDate = today(); addEvent(state, "Abriste el Cofre del Día", "🎁"); message = "¡Cofre abierto! +30 XP · +15 monedas"; }
    } else if (type === "redeem") {
      const reward = state.rewards.find((item) => item.id === input.id);
      if (!reward) return response({ error: "Recompensa no encontrada" }, session, 404, request);
      if (state.coins < reward.cost) return response({ error: "Aún no tienes suficientes monedas" }, session, 400, request);
      state.coins -= reward.cost; reward.timesRedeemed += 1; addEvent(state, `Elegiste: ${reward.title}`, reward.icon); message = `¡Disfruta tu ${reward.title.toLowerCase()}!`;
    } else if (type === "addMission") {
      const title = cleanText(input.title);
      if (title.length < 2) return response({ error: "Dale un nombre breve a tu misión" }, session, 400, request);
      if (state.missions.length >= 8) return response({ error: "Tu mapa ya tiene 8 misiones; completa alguna antes de añadir más" }, session, 400, request);
      const area = allowedAreas.has(String(input.area)) ? String(input.area) : "Enfoque";
      const icon = allowedIcons.has(String(input.icon)) ? String(input.icon) : "⚡";
      const minutes = Math.max(5, Math.min(120, Number(input.minutes) || 20));
      const xp = minutes >= 45 ? 25 : minutes >= 20 ? 15 : 10;
      state.missions.push({ id: crypto.randomUUID(), title, detail: "Misión creada por ti", area, icon, xp, coins: Math.max(4, Math.round(xp / 2)), minutes, done: false });
      addEvent(state, `Nueva misión: ${title}`, "🗺"); message = "Misión añadida a tu mapa";
    } else if (type === "addHabit") {
      const title = cleanText(input.title);
      if (title.length < 2) return response({ error: "Dale un nombre breve a tu ritual" }, session, 400, request);
      if (state.habits.length >= 10) return response({ error: "Diez rituales son suficientes para mantener el foco" }, session, 400, request);
      const area = allowedAreas.has(String(input.area)) ? String(input.area) : "Vitalidad";
      const icon = allowedIcons.has(String(input.icon)) ? String(input.icon) : "🌿";
      state.habits.push({ id: crypto.randomUUID(), title, area, icon, xp: 8, coins: 3, history: [] });
      addEvent(state, `Nuevo ritual: ${title}`, "↻"); message = "Ritual listo para entrenar mañana y hoy";
    } else if (type === "generate") {
      const total = Math.max(30, Math.min(120, Number(input.minutes) || 60));
      const energyKey = ["baja", "media", "alta"].includes(String(input.energy)) ? String(input.energy) : "media";
      const energy = energyKey === "baja" ? "Suave" : energyKey === "alta" ? "Intensa" : "Equilibrada";
      const slice = Math.max(10, Math.floor(total / 3));
      const stamp = Date.now().toString(36);
      state.missions = [
        { id: `focus-${stamp}`, title: energy === "Suave" ? "Un avance esencial" : "Bloque de trabajo profundo", detail: "Define una victoria concreta", area: "Enfoque", icon: "⚡", xp: energyKey === "alta" ? 30 : 20, coins: 10, minutes: slice, done: false },
        { id: `body-${stamp}`, title: "Recarga tu energía", detail: "Movimiento, agua y una pausa", area: "Vitalidad", icon: "🌿", xp: 10, coins: 5, minutes: slice, done: false },
        { id: `order-${stamp}`, title: "Cierra un ciclo pequeño", detail: "Libera un poco de espacio mental", area: "Orden", icon: "◇", xp: 15, coins: 7, minutes: Math.max(5, total - slice * 2), done: false },
      ];
      addEvent(state, `Ruta ${energy.toLowerCase()} forjada`, "⚒"); message = "Tu mapa tiene tres nuevas misiones";
    } else return response({ error: "Acción no válida" }, session, 400, request);

    touchActivity(state);
    await saveState(session, state);
    return response({ state, message }, session, 200, request);
  } catch (error) { return response({ error: errorMessage(error) }, session, 500, request); }
}
