const STORE_KEY = "habbit-tracker-v2";
const OLD_STORE_KEY = "habbit-tracker-v1";
const CLOUD_CONFIG_KEY = "bittracker-cloud-sync-config-v1";
const DEFAULT_CLOUD_ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbxbs5_ucjo9cf_iSsxYEEfXl75m8gUvb5EbyRh86cwWbdaMXAa7h4Bkr4OG6NBqlzjJ/exec";
const DEFAULT_CLOUD_SYNC_TOKEN = "bt_2026_mi_token_largo_cambialo";
const today = startOfDay(new Date());
let cloudConfig = loadCloudConfig();
let cloudSyncTimer = null;
let cloudRestoreChecked = false;
let quickTimerState = {
  scheme: "5D",
  rounds: 5,
  holdSeconds: 0,
  running: false,
  remainingSeconds: 0,
  currentRound: 1,
  startedAt: null,
  intervalId: null,
  metronome: false,
  audioContext: null,
};
let cloudSyncStatus = {
  state: "idle",
  text: cloudConfig.enabled && cloudConfig.endpointUrl && cloudConfig.token ? "Cloud sync listo." : "Cloud sync sin configurar.",
};

const statCatalog = [
  { id: "soul", name: "Soul", icon: "sparkles", color: "#bd8bff", hint: "presencia, calma, familia, móvil fuera" },
  { id: "mind", name: "Mind", icon: "brain", color: "#79aaff", hint: "foco, sueño, lectura, planificación" },
  { id: "body", name: "Body", icon: "heart-pulse", color: "#8bd9eb", hint: "entreno, movilidad, salud física" },
  { id: "strg", name: "Strg", icon: "sword", color: "#57c6a1", hint: "tareas duras, disciplina, carácter" },
  { id: "coin", name: "Coin", icon: "coins", color: "#ffd166", hint: "trabajo, dinero, output profesional" },
];

const habitIconOptions = [
  { icon: "sunrise", label: "Despertar", hint: "mañana, 07:00, rutina AM" },
  { icon: "dumbbell", label: "Entreno", hint: "fuerza, gimnasio, calistenia" },
  { icon: "briefcase-business", label: "Trabajo", hint: "deep work, dinero, proyectos" },
  { icon: "moon", label: "Noche", hint: "sin móvil, descanso, cierre" },
  { icon: "target", label: "Foco", hint: "FROG, tarea dura, prioridad" },
  { icon: "heart-handshake", label: "Familia", hint: "quality time, presencia" },
  { icon: "activity", label: "Movilidad", hint: "cadera, respiración, reset" },
  { icon: "bed", label: "Sueño", hint: "sleep log, descanso" },
  { icon: "book-open-check", label: "Estudio", hint: "lectura, curso, aprendizaje" },
  { icon: "flame", label: "Racha", hint: "hábito intenso, streak" },
  { icon: "shield-check", label: "Defensa", hint: "no negociable, protección" },
  { icon: "zap", label: "Energía", hint: "activación, acción rápida" },
];

const habitColorOptions = [
  { color: "#79aaff", label: "Azul focus", hint: "mente, mañana, claridad" },
  { color: "#68d66f", label: "Verde win", hint: "cumplimiento, salud, avance" },
  { color: "#e4af54", label: "Oro work", hint: "trabajo, recompensa, output" },
  { color: "#bd8bff", label: "Violeta soul", hint: "calma, noche, presencia" },
  { color: "#57c6a1", label: "Teal discipline", hint: "FROG, fuerza mental" },
  { color: "#ffd166", label: "Amarillo family", hint: "familia, calidad, calor" },
  { color: "#8bd9eb", label: "Cian body", hint: "movilidad, cardio, recovery" },
  { color: "#ff7c9e", label: "Rosa recovery", hint: "sueño, cuidado, energía" },
  { color: "#f87171", label: "Rojo danger", hint: "reto duro, límite, urgencia" },
  { color: "#a3e635", label: "Lima cyber", hint: "neón, win, gamificado" },
];

const qualityCatalog = [
  { id: "min", label: "mínimo", mult: 0.75 },
  { id: "base", label: "base", mult: 1 },
  { id: "heroic", label: "heroico", mult: 1.25 },
];

const denseNatureOptions = [
  ["weighted", "Weighted · carga externa"],
  ["weighted_calisthenics", "Weighted calisthenics · BW + lastre"],
  ["assisted", "Assisted · BW − contrapeso"],
  ["bodyweight", "Bodyweight · reps/min"],
  ["banded", "Banded · asistencia/resistencia"],
  ["conditioning", "Conditioning · motor"],
  ["plyometrics", "Plyometrics · potencia"],
  ["skill", "Skill · técnica/hold"],
  ["active_recovery", "Active recovery · restaurativo"],
];

const denseEffortOptions = [
  ["VE", "VE · muy fácil"],
  ["E", "E · fácil"],
  ["N", "N · normal"],
  ["H", "H · duro"],
  ["VH", "VH · muy duro"],
  ["fallo", "fallo/no llego"],
];

const denseEffortFactors = {
  VE: 1.08,
  E: 1.04,
  N: 1,
  H: 0.97,
  VH: 0.94,
  fallo: 0.9,
  no_llego: 0.9,
};

const denseEffortValues = {
  VE: 2,
  E: 3,
  N: 5,
  H: 7,
  VH: 9,
  fallo: 10,
  no_llego: 10,
};

const bodyweightMultipliers = {
  "2D": 0.9,
  "5D": 0.6,
  "10D": 0.33,
  "20D": 0.27,
};

const denseWorkingPct = {
  "2D5": 0.778,
  "2D10": 0.535,
  "2D20": 0.404,
  "5D1": 0.893,
  "5D3": 0.794,
  "5D5": 0.688,
  "5D10": 0.445,
  "5D20": 0.314,
  "10D1": 0.864,
  "10D3": 0.767,
  "10D5": 0.665,
  "10D10": 0.431,
  "10D20": 0.304,
  "10D1-2-3": 0.803,
  "10D2-3-5": 0.753,
  "20D1": 0.834,
  "20D3": 0.741,
  "20D5": 0.643,
  "20D10": 0.416,
  "20D20": 0.294,
};

const dcCnsZones = [
  { max: 20, color: "#5fd1e8", label: "Easy 0–20" },
  { max: 40, color: "#57c6a1", label: "Light 20–40" },
  { max: 60, color: "#93e84b", label: "Moderate 40–60" },
  { max: 80, color: "#e9b84e", label: "Hard 60–80" },
  { max: 101, color: "#ff7c9e", label: "Spike 80–100" },
];

// ── Universal converter (Fase 1 del motor de transferencia) ─────────────
// denseWorkingPct, reorganized as a continuous rep-max curve per dense base:
// points of (reps/min, %1RM system). Interpolated log-linearly in reps, it
// converts any relative intensity into reps for ANY scheme, and back.
const denseBaseCurve = {
  "2D": [[5, 0.778], [10, 0.535], [20, 0.404]],
  "5D": [[1, 0.893], [3, 0.794], [5, 0.688], [10, 0.445], [20, 0.314]],
  "10D": [[1, 0.864], [3, 0.767], [5, 0.665], [10, 0.431], [20, 0.304]],
  "20D": [[1, 0.834], [3, 0.741], [5, 0.643], [10, 0.416], [20, 0.294]],
};

// Endurance specificity: a heavy/short test says less about long/light schemes
// (and vice versa). Damped by distance between bases.
const denseBaseOrder = { "2D": 0, "5D": 1, "10D": 2, "20D": 3 };

function denseEnduranceFactor(fromBase, toBase) {
  const gap = Math.abs((denseBaseOrder[toBase] ?? 0) - (denseBaseOrder[fromBase] ?? 0));
  return [1, 0.95, 0.87, 0.78][gap] ?? 0.78;
}

// %1RM sustainable at `reps`/min on a dense base (log-linear, edge-extrapolated)
function densePctForReps(base, reps) {
  const curve = denseBaseCurve[base];
  if (!curve) return 0;
  const lr = Math.log(clamp(Number(reps) || 0.5, 0.5, 40));
  const pts = curve.map(([x, y]) => [Math.log(x), y]);
  let i = 0;
  while (i < pts.length - 2 && lr > pts[i + 1][0]) i += 1;
  const [x0, y0] = pts[i];
  const [x1, y1] = pts[i + 1];
  return clamp(y0 + ((y1 - y0) * (lr - x0)) / (x1 - x0), 0.12, 0.95);
}

// Inverse: reps/min sustainable at a relative intensity (load / e1RM system)
function denseRepsForPct(base, pct) {
  const curve = denseBaseCurve[base];
  if (!curve) return 0;
  const p = clamp(Number(pct) || 0, 0.12, 0.95);
  const pts = curve.map(([x, y]) => [Math.log(x), y]);
  let i = 0;
  while (i < pts.length - 2 && p < pts[i + 1][1]) i += 1;
  const [x0, y0] = pts[i];
  const [x1, y1] = pts[i + 1];
  return clamp(Math.exp(x0 + ((x1 - x0) * (p - y0)) / (y1 - y0)), 0.5, 40);
}

const bodyweightSchemes = ["2D", "5D", "10D", "20D"];

// ── Phase 5: calibration kit ─────────────────────────────────────────────
// Six anchor tests that unlock ~80% of the transfer engine. Each anchors a
// pattern latent and pins sigma low on its exercise.
const denseCalibrationKit = [
  { id: "pull_up", scheme: "5D", why: "ancla tirón vertical + eje reps" },
  { id: "pull_up", scheme: "2D5", why: "tu curva carga↔reps de tirón (con lastre)" },
  { id: "ring_row", scheme: "5D", why: "ancla tirón horizontal" },
  { id: "ring_push_up", scheme: "5D", why: "ancla empuje horizontal" },
  { id: "pike_push_up", scheme: "5D", why: "ancla empuje vertical" },
  { id: "pistol_squat", scheme: "10D", why: "ancla pierna / unilateral" },
];

// Optional barbell anchors: heavy bilateral lifts define absolute strength
// levels with exact loads (low-noise e1RM) and radiate wide transfer.
const denseCalibrationKitBarbell = [
  { id: "back_squat", scheme: "5D5", why: "ancla fuerza absoluta de pierna" },
  { id: "deadlift", scheme: "5D3", why: "ancla cadena posterior / bisagra" },
  { id: "bench_press", scheme: "5D5", why: "ancla empuje horizontal con carga" },
  { id: "military_press", scheme: "2D5", why: "ancla empuje vertical con carga" },
];

const weightedSchemes = Object.keys(denseWorkingPct);
const allDenseSchemes = [...bodyweightSchemes, ...weightedSchemes];

const denseExerciseCategories = [
  ["all", "Todos"],
  ["push", "Empujón"],
  ["pull", "Tirón"],
  ["legs", "Piernas"],
  ["core", "Core"],
  ["skills", "Skills"],
  ["mobility", "Movilidad"],
];

const denseExerciseSortOptions = [
  ["recent", "Recientes"],
  ["used", "Más usados"],
  ["abandoned", "Abandonados"],
  ["favorite", "Favoritos"],
  ["az", "A-Z"],
];

const DENSE_RECOVERY_MIN_WELLNESS = 3;
const DENSE_DELOAD_STREAK = 4;
// Unified biomechanics: exercises that can carry extra load are a SINGLE
// exercise with a modality selector (bodyweight ↔ weighted_calisthenics), not
// two catalog entries. These legacy 'weighted_*' twins are aliased to their
// base id; historical marks are migrated (normalizeState) and any lingering
// reference resolves through denseExerciseById.
const denseExerciseAliases = {
  weighted_pull_up: "pull_up",
  weighted_ring_dip: "ring_dip",
  weighted_parallel_bar_dip: "parallel_bar_dip",
  weighted_atg_split_squat: "atg_split_squat",
};
// Leverage factor of lever progressions (torque relative to the full lay) and
// the endurance exponent used to cross-estimate between difficulty levels:
// capacity_target = capacity_source × (level_source / level_target)^EXP.
// The same semantics generalize to `progressionLevel` on non-lever catalog
// entries (harder sibling = higher level, hardest of the family ≈ 1).
const denseLeverProgressionLevel = { tuck: 0.35, one_quarter: 0.45, adv_tuck: 0.5, one_leg: 0.6, straddle: 0.7, half: 0.75, three_quarter: 0.85, full: 1 };
const DENSE_LEVER_ENDURANCE_EXP = 2.2;
// A weekly test slot is only worth suggesting when at least one boost source
// has a genuinely strong relationship with the target exercise.
const DENSE_TEST_MIN_PAIR_C = 0.35;
// Fase 2 §3.2 — asymmetric transfer: strength moves DOWN a progression almost
// fully but UP with a discount (same-family upward damp exponent).
const DENSE_TRANSFER_ASYM_EXP = 1.5;
// Extra damp when a non-barbell source feeds a pure "weighted" lift: % gains
// on bodyweight skills don't move an absolutely-loaded bar as much.
const DENSE_TRANSFER_TO_BARBELL = 0.8;
// Fase 2 §3.3 — learned per-family endurance exponent (from direct sibling
// tests) replaces the generic 2.2 once the family has real paired evidence.
let denseLevelExpCache = null;
// A dense round is one minute: hold targets are capped below it (transition
// margin included). TDZ: lives here because render-path helpers read it.
const DENSE_MAX_HOLD_PER_ROUND = 55;
// Fase 4 — aprendizaje: mínimo de observaciones para usar sigma empírica y
// clamp del bias de pendiente de la curva personal por ejercicio.
const DENSE_CALIBRATION_MIN_OBS = 4;
const DENSE_CURVE_BIAS_CLAMP = 0.15;
let denseCalibrationCache = null;
const trainingAnalyticsTabs = [
  ["progress", "Progreso", "trending-up"],
  ["volume", "Volumen", "bar-chart-3"],
  ["strength", "Fuerza", "trophy"],
  ["recovery", "Recovery", "heart-pulse"],
  ["balance", "Balance", "scale"],
];

const trainingAnalyticsWindows = [
  ["7", "7d"],
  ["30", "30d"],
  ["70", "70d"],
  ["180", "180d"],
  ["all", "All"],
];

const trainingModeTabs = [
  ["workout", "Workout", "calendar-days"],
  ["analytics", "Analytics", "activity"],
  ["dashboard", "Dashboard", "layout-dashboard"],
];

const denseExerciseCatalog = [
  {
    id: "pull_up",
    name: "Dominadas",
    category: "pull",
    family: "strict_pull",
    nature: "bodyweight",
    // "assisted" = máquina de dominadas asistidas / contrapeso (S1)
    allowedNatures: ["bodyweight", "weighted_calisthenics", "assisted"],
    bodyweightContributionPct: 100,
    progressionLevel: 1,
    tonnageFactor: 1,
    alpha: 0.15,
    icon: "arrow-up-to-line",
  },
  {
    id: "ring_dip",
    name: "Dips en anillas",
    category: "push",
    family: "strict_dip",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 95,
    tonnageFactor: 1,
    alpha: 0.14,
    icon: "arrow-down-to-line",
  },
  {
    id: "ring_push_up",
    name: "Flexiones en anillas",
    category: "push",
    family: "ring_push",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 74,
    tonnageFactor: 1,
    alpha: 0.14,
    icon: "arrow-up-from-line",
  },
  {
    id: "ring_row",
    name: "Remo horizontal en anillas",
    category: "pull",
    family: "horizontal_pull",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "banded"],
    bodyweightContributionPct: 70,
    progressionLevel: 1,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "arrow-left-to-line",
  },
  {
    id: "floor_push_up",
    name: "Flexiones en suelo",
    category: "push",
    family: "pushup",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 64,
    progressionLevel: 0.75,
    tonnageFactor: 1,
    alpha: 0.12,
    icon: "arrow-up-from-line",
  },
  {
    id: "tiptoe_squat",
    name: "Sentadilla en puntillas",
    category: "legs",
    family: "mobility_strength",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted"],
    bodyweightContributionPct: 75,
    tonnageFactor: 0.8,
    alpha: 0.1,
    icon: "footprints",
  },
  {
    id: "pistol_squat",
    name: "Pistol squat",
    category: "legs",
    family: "single_leg_squat",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 85,
    progressionLevel: 0.9,
    tonnageFactor: 1,
    repsPerSide: true,
    alpha: 0.13,
    icon: "person-standing",
  },
  {
    id: "seated_bent_leg_good_morning",
    name: "Good morning sentado pierna flexionada",
    category: "mobility",
    family: "mobility_strength",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted"],
    bodyweightContributionPct: 45,
    tonnageFactor: 0.75,
    transferIn: "none",
    milestones: [
      { label: "⅓ × peso corporal en 5D10", note: "especialización del patrón" },
      { label: "½ × peso corporal en 5D10", note: "nivelazo" },
    ],
    alpha: 0.1,
    icon: "fold-horizontal",
  },
  {
    id: "single_leg_good_morning",
    name: "Good morning a una pierna",
    category: "legs",
    family: "hinge_bodyweight",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted"],
    bodyweightContributionPct: 55,
    progressionLevel: 0.45,
    tonnageFactor: 0.85,
    repsPerSide: true,
    alpha: 0.11,
    icon: "fold-horizontal",
  },
  {
    id: "bridge_push_up",
    name: "Bridge Push Ups",
    category: "mobility",
    family: "bridge",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "skill"],
    bodyweightContributionPct: 55,
    progressionLevel: 0.7,
    tonnageFactor: 0.7,
    alpha: 0.11,
    icon: "rainbow",
  },
  {
    id: "bridge_isometric",
    name: "Bridge Isometrico",
    category: "mobility",
    family: "bridge",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 55,
    progressionLevel: 0.55,
    tonnageFactor: 0.7,
    alpha: 0.1,
    icon: "rainbow",
  },
  {
    id: "bridge_walkover",
    name: "Bridge Walkover",
    category: "skills",
    family: "bridge",
    nature: "skill",
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 65,
    progressionLevel: 0.95,
    tonnageFactor: 0.8,
    alpha: 0.12,
    icon: "refresh-ccw",
  },
  {
    id: "headstand_push_up",
    name: "HeSPU nariz al suelo",
    category: "skills",
    family: "hspu",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics", "skill"],
    bodyweightContributionPct: 92,
    progressionLevel: 0.85,
    tonnageFactor: 1,
    alpha: 0.16,
    icon: "arrow-big-up",
  },
  {
    id: "full_rom_hspu",
    name: "HSPU full ROM",
    category: "skills",
    family: "hspu",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics", "skill"],
    bodyweightContributionPct: 95,
    progressionLevel: 1,
    tonnageFactor: 1,
    alpha: 0.17,
    icon: "arrow-big-up",
  },
  {
    id: "straight_handstand",
    name: "Straight Handstand",
    category: "skills",
    family: "handstand",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 95,
    progressionLevel: 1,
    tonnageFactor: 1,
    alpha: 0.16,
    icon: "person-standing",
  },
  {
    id: "straddle_handstand",
    name: "Straddle Handstand",
    category: "skills",
    family: "handstand",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 95,
    progressionLevel: 0.9,
    tonnageFactor: 1,
    alpha: 0.15,
    icon: "person-standing",
  },
  {
    id: "press_to_handstand",
    name: "Press To Handstand",
    category: "skills",
    family: "handstand",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "skill"],
    bodyweightContributionPct: 90,
    tonnageFactor: 1,
    alpha: 0.17,
    icon: "arrow-up-from-line",
  },
  {
    id: "natural_leg_extension",
    name: "Natural Leg Extension",
    category: "legs",
    family: "knee_dominant",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 60,
    progressionLevel: 0.6,
    tonnageFactor: 0.9,
    alpha: 0.13,
    icon: "unfold-horizontal",
  },
  {
    id: "air_squat",
    name: "Sentadillas sin peso",
    category: "legs",
    family: "squat_bodyweight",
    nature: "bodyweight",
    allowedNatures: ["bodyweight"],
    bodyweightContributionPct: 75,
    tonnageFactor: 1,
    alpha: 0.1,
    icon: "chevrons-down",
  },
  {
    id: "back_squat",
    name: "Back Squat",
    category: "legs",
    family: "squat_weighted",
    nature: "weighted",
    allowedNatures: ["weighted"],
    bodyweightContributionPct: 0,
    tonnageFactor: 1,
    alpha: 0.18,
    icon: "chevrons-down",
  },
  {
    id: "sissy_squat",
    name: "Sissy Squat",
    category: "legs",
    family: "knee_dominant",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 70,
    progressionLevel: 0.85,
    tonnageFactor: 0.9,
    alpha: 0.12,
    icon: "chevrons-down",
  },
  {
    id: "back_extension",
    name: "Back Extension",
    category: "legs",
    family: "posterior_chain",
    nature: "weighted_calisthenics",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 50,
    tonnageFactor: 0.85,
    alpha: 0.12,
    icon: "fold-horizontal",
  },
  {
    id: "clap_push_up",
    name: "Flexiones con palmadas",
    category: "push",
    family: "pushup",
    nature: "bodyweight",
    allowedNatures: ["bodyweight"],
    bodyweightContributionPct: 64,
    progressionLevel: 0.9,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "arrow-up-from-line",
  },
  {
    id: "deficit_push_up",
    name: "Flexiones con déficit",
    category: "push",
    family: "pushup",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 68,
    progressionLevel: 0.85,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "arrow-up-from-line",
  },
  {
    id: "parallel_bar_dip",
    name: "Dips en paralelas",
    category: "push",
    family: "parallel_dip",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 90,
    tonnageFactor: 1,
    alpha: 0.14,
    icon: "arrow-down-to-line",
  },
  {
    id: "bench_press",
    name: "Press banca",
    category: "push",
    family: "bench_press",
    nature: "weighted",
    allowedNatures: ["weighted"],
    bodyweightContributionPct: 0,
    tonnageFactor: 1,
    alpha: 0.2,
    icon: "dumbbell",
  },
  {
    id: "machine_leg_extension",
    name: "Leg Extension máquina",
    category: "legs",
    family: "knee_isolation",
    nature: "weighted",
    allowedNatures: ["weighted"],
    bodyweightContributionPct: 0,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "unfold-horizontal",
  },
  {
    id: "machine_leg_curl",
    name: "Curl Isquiosural máquina",
    category: "legs",
    family: "hamstring_isolation",
    nature: "weighted",
    allowedNatures: ["weighted"],
    bodyweightContributionPct: 0,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "fold-horizontal",
  },
  {
    id: "atg_split_squat",
    name: "ATG Split Squat",
    category: "legs",
    family: "atg_split_squat",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 80,
    tonnageFactor: 1,
    repsPerSide: true,
    alpha: 0.12,
    icon: "person-standing",
  },
  {
    id: "toes_to_bar_strict",
    name: "Toes to Bar estrictos",
    category: "core",
    family: "toes_to_bar",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 60,
    progressionLevel: 0.85,
    tonnageFactor: 1,
    alpha: 0.14,
    icon: "move-up",
  },
  {
    id: "toes_to_bar_kip",
    name: "Toes to Bar con Kip",
    category: "core",
    family: "toes_to_bar",
    nature: "bodyweight",
    allowedNatures: ["bodyweight"],
    bodyweightContributionPct: 55,
    progressionLevel: 0.65,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "move-up",
  },
  {
    id: "cuelgue_passive_bilateral",
    name: "Cuelgue pasivo bilateral",
    category: "pull",
    family: "cuelgue",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 100,
    progressionLevel: 0.4,
    tonnageFactor: 1,
    alpha: 0.1,
    icon: "grip-horizontal",
    video: "https://www.youtube.com/watch?v=gUcP3jabEG4",
  },
  {
    id: "cuelgue_active",
    name: "Cuelgue activo",
    category: "pull",
    family: "cuelgue",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 100,
    progressionLevel: 0.55,
    tonnageFactor: 1,
    alpha: 0.12,
    icon: "grip-horizontal",
    video: "https://www.youtube.com/watch?v=u_l2NdCKsq8",
  },
  {
    id: "cuelgue_active_ig",
    name: "Cuelgue activo (tutorial Instagram)",
    category: "pull",
    family: "cuelgue",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 100,
    progressionLevel: 0.55,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "grip-horizontal",
    video: "https://youtu.be/ikeMnaKCcEw",
  },
  {
    id: "cuelgue_passive_one_hand",
    name: "Cuelgue pasivo a una mano",
    category: "pull",
    family: "cuelgue",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 100,
    progressionLevel: 0.7,
    tonnageFactor: 1,
    alpha: 0.15,
    icon: "grip-horizontal",
    video: "https://www.youtube.com/watch?v=HTeehUuV_6c",
  },
  {
    id: "cuelgue_active_one_hand",
    name: "Cuelgue activo a una mano",
    category: "pull",
    family: "cuelgue",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 100,
    progressionLevel: 0.9,
    tonnageFactor: 1,
    alpha: 0.17,
    icon: "grip-horizontal",
    video: "https://www.youtube.com/watch?v=5NuxVKK5PVk",
  },
  ...leverSkillExercises("front_lever", "Front Lever", 88),
  ...leverSkillExercises("back_lever", "Back Lever", 88),
  {
    id: "chin_up",
    name: "Dominada supina",
    category: "pull",
    family: "strict_pull",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics", "assisted"],
    bodyweightContributionPct: 100,
    progressionLevel: 0.95,
    milestones: [
      { label: "+⅙ × peso corporal de lastre", note: "puerta a archer chin-up" },
      { label: "+⅓ × peso corporal de lastre", note: "paralelo a negativas de OAC" },
    ],
    tonnageFactor: 1,
    alpha: 0.14,
    icon: "arrow-up-to-line",
    video: "https://www.youtube.com/watch?v=Lxhx-AF0D-E",
  },
  {
    id: "military_press",
    name: "Press militar",
    category: "push",
    family: "accessory",
    nature: "weighted",
    allowedNatures: ["weighted"],
    bodyweightContributionPct: 0,
    tonnageFactor: 1,
    alpha: 0.12,
    icon: "arrow-big-up",
    video: "https://www.youtube.com/watch?v=P16eQ_IK_y8",
  },
  {
    id: "pike_push_up",
    name: "Pike push-up",
    category: "push",
    family: "hspu",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 60,
    progressionLevel: 0.55,
    tonnageFactor: 1,
    alpha: 0.12,
    icon: "triangle",
    video: "https://youtu.be/hHs5dVqlDEs",
  },
  {
    id: "deadlift",
    name: "Peso muerto",
    category: "legs",
    family: "hinge_weighted",
    nature: "weighted",
    allowedNatures: ["weighted"],
    bodyweightContributionPct: 0,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "anchor",
    video: "https://www.youtube.com/watch?v=zdnjH0qB9yo",
  },
  {
    id: "front_squat",
    name: "Front squat",
    category: "legs",
    family: "squat_weighted",
    nature: "weighted",
    allowedNatures: ["weighted"],
    bodyweightContributionPct: 0,
    tonnageFactor: 1,
    alpha: 0.12,
    icon: "chevrons-down",
    video: "https://www.youtube.com/watch?v=MhT5fWWlQuw",
  },
  {
    id: "bulgarian_split_squat",
    name: "Bulgarian split squat",
    category: "legs",
    family: "single_leg_squat",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics", "weighted"],
    bodyweightContributionPct: 85,
    progressionLevel: 0.6,
    tonnageFactor: 1,
    repsPerSide: true,
    alpha: 0.12,
    icon: "person-standing",
    video: "https://www.youtube.com/watch?v=EkG378TU8yg",
  },
  {
    id: "nordic_curl",
    name: "Nordic hamstring curl",
    category: "legs",
    family: "hinge_bodyweight",
    nature: "bodyweight",
    allowedNatures: ["bodyweight"],
    bodyweightContributionPct: 70,
    progressionLevel: 0.95,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "fold-horizontal",
    video: "https://www.youtube.com/watch?v=0imUR6DoLqg",
  },
  {
    id: "cossack_squat",
    name: "Cossack squat",
    category: "legs",
    family: "mobility_strength",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted"],
    bodyweightContributionPct: 80,
    tonnageFactor: 1,
    repsPerSide: true,
    alpha: 0.11,
    icon: "move-diagonal",
    video: "https://youtu.be/sZyBSETOO2M",
  },
  {
    id: "l_sit",
    name: "L-Sit",
    category: "core",
    family: "l_sit",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 45,
    progressionLevel: 0.72,
    tonnageFactor: 1,
    alpha: 0.12,
    icon: "armchair",
    video: "https://youtu.be/G8zK_GAxz4U",
  },
  {
    id: "hollow_body_hold",
    name: "Hollow body hold",
    category: "core",
    family: "hollow",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 35,
    tonnageFactor: 1,
    alpha: 0.1,
    icon: "moon",
    video: "https://youtu.be/otSr5PZ5Amo",
  },
  {
    id: "jefferson_curl",
    name: "Jefferson curl",
    category: "mobility",
    family: "mobility_strength",
    nature: "weighted",
    allowedNatures: ["weighted", "bodyweight"],
    bodyweightContributionPct: 30,
    tonnageFactor: 0.7,
    // Movilidad de columna bajo carga: escalada progresiva SIEMPRE, sin
    // atajos por transferencia de otros ejercicios (decisión del usuario).
    transferIn: "none",
    milestones: [
      { label: "⅓ × peso corporal en 5D10", note: "especialización del patrón" },
      { label: "½ × peso corporal en 5D10", note: "nivelazo" },
    ],
    alpha: 0.1,
    icon: "fold-vertical",
    video: "https://youtu.be/3viTkX-WR9I",
  },
  {
    id: "straddle_good_morning",
    name: "Straddle good morning",
    category: "mobility",
    family: "pancake",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted"],
    bodyweightContributionPct: 45,
    tonnageFactor: 0.75,
    alpha: 0.1,
    icon: "fold-horizontal",
    video: "https://youtu.be/Ttc6IpMf3S4",
  },
  {
    id: "seated_db_overhead_press",
    name: "Press militar sentado mancuernas",
    category: "push",
    family: "accessory",
    nature: "weighted",
    allowedNatures: ["weighted"],
    bodyweightContributionPct: 0,
    tonnageFactor: 1,
    loadPattern: "dumbbell_pair",
    alpha: 0.11,
    icon: "dumbbell",
  },
  // ── Ring arm work at ~45º (feet braced, body as the lever) ─────────────
  {
    id: "ring_biceps_curl_45",
    name: "Curl de bíceps en anillas 45º",
    category: "pull",
    family: "ring_curl",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 55,
    tonnageFactor: 1,
    alpha: 0.12,
    icon: "biceps-flexed",
  },
  {
    id: "ring_triceps_extension_45",
    name: "Extensión de tríceps en anillas 45º",
    category: "push",
    family: "ring_extension",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 55,
    tonnageFactor: 1,
    alpha: 0.12,
    icon: "unfold-horizontal",
  },
  // ── One Arm Chin-up progressions (family "one_arm_chin") ───────────────
  {
    id: "archer_chin_up",
    name: "Archer chin-up",
    category: "pull",
    family: "one_arm_chin",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 95,
    progressionLevel: 0.65,
    tonnageFactor: 1,
    repsPerSide: true,
    alpha: 0.13,
    icon: "move-up-right",
    video: "https://www.youtube.com/watch?v=qq-oeyCqemk",
  },
  {
    id: "oac_negative",
    name: "Negativa de OAC",
    category: "pull",
    family: "one_arm_chin",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 100,
    progressionLevel: 0.8,
    tonnageFactor: 1,
    repsPerSide: true,
    alpha: 0.14,
    icon: "arrow-down-to-line",
    video: "https://www.youtube.com/watch?v=NoDx88aYK_Q",
  },
  {
    id: "oac_assisted",
    name: "OAC asistida (goma/polea)",
    category: "pull",
    family: "one_arm_chin",
    nature: "assisted",
    allowedNatures: ["assisted"],
    bodyweightContributionPct: 100,
    tonnageFactor: 1,
    repsPerSide: true,
    alpha: 0.15,
    icon: "chevrons-up",
    video: "https://www.youtube.com/watch?v=UBI_h9cpPgg",
  },
  {
    id: "one_arm_chin_up",
    name: "One Arm Chin-up (OAC)",
    category: "pull",
    family: "one_arm_chin",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 100,
    progressionLevel: 1,
    tonnageFactor: 1,
    repsPerSide: true,
    alpha: 0.16,
    icon: "arrow-up-to-line",
    video: "https://www.youtube.com/watch?v=_9G4cSG9smk",
  },
  // ── L-Sit progressions (grouped under family "l_sit") ──────────────────
  {
    id: "l_sit_tuck",
    name: "Tuck L-Sit",
    category: "core",
    family: "l_sit",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 40,
    progressionLevel: 0.5,
    tonnageFactor: 1,
    alpha: 0.1,
    icon: "armchair",
    video: "https://youtu.be/VkkxVjPgLDM",
  },
  {
    id: "l_sit_one_leg",
    name: "One Leg L-Sit",
    category: "core",
    family: "l_sit",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 43,
    progressionLevel: 0.62,
    tonnageFactor: 1,
    alpha: 0.11,
    icon: "armchair",
    video: "https://youtu.be/delQ8GDuQHY",
  },
  {
    id: "l_sit_straddle",
    name: "Straddle L-Sit",
    category: "core",
    family: "l_sit",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 48,
    progressionLevel: 0.82,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "armchair",
    video: "https://youtu.be/P-2Dz3Nht3k",
  },
  {
    id: "v_sit",
    name: "V-Sit",
    category: "core",
    family: "l_sit",
    nature: "skill",
    isometric: true,
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 55,
    progressionLevel: 1,
    tonnageFactor: 1,
    alpha: 0.14,
    icon: "armchair",
    video: "https://youtu.be/Iq0DksHSakA",
  },
  // ── Side Split progressions (family "side_split") ──────────────────────
  {
    id: "frog_stretch",
    name: "Frog stretch",
    category: "mobility",
    family: "side_split",
    nature: "bodyweight",
    isometric: true,
    allowedNatures: ["bodyweight"],
    bodyweightContributionPct: 100,
    tonnageFactor: 0.5,
    alpha: 0.1,
    icon: "chevrons-left-right",
    video: "https://youtu.be/ePrJitAbIZU",
  },
  {
    id: "horse_stance_hold",
    name: "Horse stance",
    category: "mobility",
    family: "side_split",
    nature: "bodyweight",
    isometric: true,
    allowedNatures: ["bodyweight", "weighted"],
    bodyweightContributionPct: 90,
    tonnageFactor: 0.6,
    alpha: 0.11,
    icon: "chevrons-left-right",
    video: "https://youtu.be/Syk-uSSAgwA",
  },
  {
    id: "side_split_squat",
    name: "Side split squat",
    category: "mobility",
    family: "side_split",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted"],
    bodyweightContributionPct: 80,
    tonnageFactor: 0.8,
    alpha: 0.12,
    icon: "chevrons-left-right",
    video: "https://youtu.be/KF5Xn0a5RiA",
  },
  {
    id: "side_split_iso",
    name: "Isometric side split",
    category: "mobility",
    family: "side_split",
    nature: "bodyweight",
    isometric: true,
    allowedNatures: ["bodyweight"],
    bodyweightContributionPct: 100,
    tonnageFactor: 0.5,
    alpha: 0.14,
    icon: "chevrons-left-right",
    video: "https://youtu.be/FNAblqH_tYc",
  },
  // ── Pancake progressions (family "pancake") ────────────────────────────
  {
    id: "pancake_hold",
    name: "Pancake hold",
    category: "mobility",
    family: "pancake",
    nature: "bodyweight",
    isometric: true,
    allowedNatures: ["bodyweight"],
    bodyweightContributionPct: 100,
    tonnageFactor: 0.5,
    alpha: 0.11,
    icon: "fold-horizontal",
    video: "https://www.youtube.com/watch?v=3Fc9ZSbugKY",
  },
  {
    id: "pancake_good_morning",
    name: "Pancake good morning",
    category: "mobility",
    family: "pancake",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted"],
    bodyweightContributionPct: 45,
    tonnageFactor: 0.75,
    alpha: 0.12,
    icon: "fold-horizontal",
    video: "https://youtu.be/aXDNVyPQsso",
  },
  {
    id: "straddle_jefferson_curl",
    name: "Straddle Jefferson curl",
    category: "mobility",
    family: "pancake",
    nature: "weighted",
    allowedNatures: ["weighted", "bodyweight"],
    bodyweightContributionPct: 30,
    tonnageFactor: 0.7,
    transferIn: "none",
    alpha: 0.13,
    icon: "fold-vertical",
    video: "https://youtu.be/xuKeTXLtHtM",
  },
  // ── S1 Tirón vertical (fase 3, sesión de patrón — jul 2026) ─────────────
  {
    id: "scapular_pull",
    name: "Dominada escapular",
    category: "pull",
    family: "strict_pull",
    nature: "bodyweight",
    allowedNatures: ["bodyweight"],
    bodyweightContributionPct: 100,
    progressionLevel: 0.25,
    tonnageFactor: 0.5,
    alpha: 0.08,
    icon: "grip-horizontal",
    video: "https://www.youtube.com/watch?v=u_l2NdCKsq8",
  },
  {
    id: "pull_up_feet_assisted",
    name: "Dominada asistida con pies en suelo",
    category: "pull",
    family: "strict_pull",
    nature: "bodyweight",
    allowedNatures: ["bodyweight"],
    bodyweightContributionPct: 45,
    progressionLevel: 0.35,
    tonnageFactor: 0.8,
    alpha: 0.1,
    icon: "footprints",
    video: "https://www.youtube.com/watch?v=YX_OQ6zg05w",
  },
  {
    id: "pull_up_band_assisted",
    name: "Dominada asistida con goma",
    category: "pull",
    family: "strict_pull",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "banded"],
    bodyweightContributionPct: 70,
    progressionLevel: 0.5,
    tonnageFactor: 0.9,
    alpha: 0.11,
    icon: "arrow-up-to-line",
    video: "https://www.youtube.com/watch?v=LCy9HntgIAg",
  },
  {
    id: "pull_up_negative",
    name: "Dominada negativa",
    category: "pull",
    family: "strict_pull",
    nature: "bodyweight",
    allowedNatures: ["bodyweight"],
    bodyweightContributionPct: 100,
    progressionLevel: 0.6,
    tonnageFactor: 0.9,
    alpha: 0.12,
    icon: "arrow-down-to-line",
    video: "https://youtu.be/1dFqq5BmgD4",
  },
  {
    id: "l_pull_up",
    name: "L-Pull-up",
    category: "pull",
    family: "strict_pull",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 100,
    progressionLevel: 1.1,
    tonnageFactor: 1,
    alpha: 0.15,
    icon: "armchair",
  },
  {
    id: "incline_row",
    name: "Remo inclinado",
    category: "pull",
    family: "horizontal_pull",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "banded"],
    bodyweightContributionPct: 50,
    progressionLevel: 0.6,
    tonnageFactor: 0.9,
    alpha: 0.11,
    icon: "arrow-left-to-line",
    video: "https://www.youtube.com/watch?v=nZQEnke3QTs",
  },
  {
    id: "lat_pulldown",
    name: "Jalón al pecho (polea)",
    category: "pull",
    family: "lat_pulldown",
    nature: "weighted",
    allowedNatures: ["weighted"],
    bodyweightContributionPct: 0,
    tonnageFactor: 1,
    alpha: 0.12,
    icon: "arrow-down-to-line",
  },
  {
    id: "oac_finger_assisted",
    name: "OAC con dedos de asistencia",
    category: "pull",
    family: "one_arm_chin",
    nature: "bodyweight",
    allowedNatures: ["bodyweight"],
    bodyweightContributionPct: 100,
    progressionLevel: 0.88,
    tonnageFactor: 1,
    repsPerSide: true,
    alpha: 0.15,
    icon: "hand",
  },
];

function leverSkillExercises(prefix, label, bodyweightContributionPct) {
  const progressions = [
    ["tuck", "Tuck"],
    ["one_quarter", "1/4"],
    ["adv_tuck", "Adv Tuck"],
    ["one_leg", "Con una pierna"],
    ["straddle", "Straddle"],
    ["half", "1/2"],
    ["three_quarter", "3/4"],
    ["full", "Full"],
  ];

  return progressions.flatMap(([id, name], index) => {
    const alpha = roundTo(0.1 + index * 0.01, 2);
    const base = {
      category: "skills",
      family: prefix,
      bodyweightContributionPct,
      tonnageFactor: 1,
      leverLevel: denseLeverProgressionLevel[id] || 0,
      alpha,
      icon: prefix === "front_lever" ? "move-horizontal" : "rotate-ccw",
    };
    return [
      {
        ...base,
        id: `${prefix}_${id}`,
        name: `${label} ${name}`,
        nature: "skill",
        isometric: true,
        allowedNatures: ["skill", "bodyweight"],
        allowedSchemes: bodyweightSchemes,
      },
      {
        ...base,
        id: `${prefix}_${id}_pull`,
        name: `${label} ${name} Pull`,
        family: `${prefix}_pull`,
        nature: "bodyweight",
        allowedNatures: ["bodyweight", "skill"],
        allowedSchemes: bodyweightSchemes,
      },
    ];
  });
}

// ── Fase 2 §3.1: progression graph ───────────────────────────────────────
// Declarative, typed edges over the catalog. "progresa": the natural next
// step on the same branch. "paralela": a different branch attacking the same
// pattern goal (sissy ∥ NLE hacia fuerza de rodilla) — strong transfer but
// each branch keeps its own difficulty level; never a 1:1 target estimate.
// UI-only for now (Ruta de progresión); the transfer engine stays vector-based.
function leverChainEdges(prefix) {
  const order = ["tuck", "one_quarter", "adv_tuck", "one_leg", "straddle", "half", "three_quarter", "full"];
  const edges = [];
  for (let i = 0; i < order.length - 1; i++) {
    edges.push([`${prefix}_${order[i]}`, `${prefix}_${order[i + 1]}`, "progresa"]);
    edges.push([`${prefix}_${order[i]}_pull`, `${prefix}_${order[i + 1]}_pull`, "progresa"]);
  }
  order.forEach((id) => edges.push([`${prefix}_${id}`, `${prefix}_${id}_pull`, "paralela"]));
  return edges;
}

const denseProgressionEdges = [
  // Tren inferior
  ["air_squat", "bulgarian_split_squat", "progresa"],
  ["bulgarian_split_squat", "pistol_squat", "progresa"],
  ["natural_leg_extension", "sissy_squat", "paralela"],
  ["machine_leg_extension", "natural_leg_extension", "paralela"],
  ["machine_leg_curl", "nordic_curl", "paralela"],
  ["single_leg_good_morning", "nordic_curl", "paralela"],
  ["single_leg_good_morning", "back_extension", "paralela"],
  ["back_squat", "front_squat", "paralela"],
  ["pistol_squat", "back_squat", "paralela"],
  // Empuje
  ["floor_push_up", "deficit_push_up", "progresa"],
  ["floor_push_up", "clap_push_up", "progresa"],
  ["floor_push_up", "ring_push_up", "progresa"],
  ["deficit_push_up", "clap_push_up", "paralela"],
  ["parallel_bar_dip", "ring_dip", "progresa"],
  ["pike_push_up", "headstand_push_up", "progresa"],
  ["headstand_push_up", "full_rom_hspu", "progresa"],
  ["military_press", "headstand_push_up", "paralela"],
  ["bench_press", "floor_push_up", "paralela"],
  ["straddle_handstand", "straight_handstand", "progresa"],
  ["straight_handstand", "press_to_handstand", "progresa"],
  // Tirón (S1: cadena completa con veredicto del usuario, jul 2026)
  ["scapular_pull", "pull_up_feet_assisted", "progresa"],
  ["scapular_pull", "cuelgue_active", "paralela"],
  ["incline_row", "ring_row", "progresa"],
  ["ring_row", "pull_up_feet_assisted", "progresa"],
  ["pull_up_feet_assisted", "pull_up_band_assisted", "progresa"],
  ["pull_up_band_assisted", "pull_up_negative", "progresa"],
  ["pull_up_negative", "chin_up", "progresa"],
  // El eje del usuario son las CHIN-UPS; las pronas son rama paralela que le
  // gusta menos (suele dar más problemas). Hitos de lastre en chin_up.
  ["chin_up", "pull_up", "paralela"],
  ["lat_pulldown", "chin_up", "paralela"],
  ["chin_up", "l_pull_up", "paralela"],
  // hito antes de archer: chin-up lastrada ≈ +BW/6 (modalidad, no nodo);
  // +BW/3 de chin lastrada corre en paralelo a las negativas de OAC.
  ["chin_up", "archer_chin_up", "progresa"],
  ["pull_up", "archer_chin_up", "progresa"],
  ["archer_chin_up", "oac_negative", "progresa"],
  ["oac_negative", "oac_finger_assisted", "paralela"],
  ["oac_finger_assisted", "one_arm_chin_up", "progresa"],
  ["oac_negative", "one_arm_chin_up", "progresa"],
  ["oac_assisted", "one_arm_chin_up", "progresa"],
  ["oac_assisted", "oac_negative", "paralela"],
  ["pull_up", "front_lever_tuck", "progresa"],
  // Cuelgues
  ["cuelgue_passive_bilateral", "cuelgue_active", "progresa"],
  ["cuelgue_passive_bilateral", "cuelgue_passive_one_hand", "progresa"],
  ["cuelgue_active", "cuelgue_active_one_hand", "progresa"],
  ["cuelgue_passive_one_hand", "cuelgue_active_one_hand", "progresa"],
  ["cuelgue_active_ig", "cuelgue_active", "paralela"],
  // Core
  ["toes_to_bar_kip", "toes_to_bar_strict", "progresa"],
  ["hollow_body_hold", "l_sit_tuck", "progresa"],
  ["l_sit_tuck", "l_sit_one_leg", "progresa"],
  ["l_sit_one_leg", "l_sit", "progresa"],
  ["l_sit", "l_sit_straddle", "progresa"],
  ["l_sit_straddle", "v_sit", "progresa"],
  // Puente
  ["bridge_isometric", "bridge_push_up", "progresa"],
  ["bridge_push_up", "bridge_walkover", "progresa"],
  ...leverChainEdges("front_lever"),
  ...leverChainEdges("back_lever"),
];

function denseProgressionLinks(exercise) {
  const id = exercise?.id;
  if (!id) return { prev: [], next: [], parallel: [] };
  const prev = [];
  const next = [];
  const parallel = [];
  denseProgressionEdges.forEach(([a, b, type]) => {
    if (type === "progresa") {
      if (a === id) next.push(b);
      if (b === id) prev.push(a);
    } else {
      if (a === id) parallel.push(b);
      else if (b === id) parallel.push(a);
    }
  });
  const resolve = (list) => [...new Set(list)].map((xid) => denseExerciseById(xid)).filter(Boolean);
  return { prev: resolve(prev), next: resolve(next), parallel: resolve(parallel) };
}

// Validator (self-tested): ids resolve, no self-edges, "progresa" is acyclic,
// and within a family a "progresa" edge always climbs in level.
function denseProgressionGraphIssues() {
  const issues = [];
  const adjacency = {};
  denseProgressionEdges.forEach(([a, b, type]) => {
    const ea = denseExerciseById(a);
    const eb = denseExerciseById(b);
    if (!ea || !eb) issues.push(`id desconocido: ${!ea ? a : b}`);
    if (a === b) issues.push(`self-edge: ${a}`);
    if (type !== "progresa" && type !== "paralela") issues.push(`tipo raro: ${type}`);
    if (type === "progresa" && ea && eb) {
      (adjacency[a] ||= []).push(b);
      if (ea.family === eb.family) {
        const la = denseProgressionLevelOf(ea);
        const lb = denseProgressionLevelOf(eb);
        if (la && lb && lb <= la) issues.push(`progresa no sube nivel: ${a}→${b}`);
      }
    }
  });
  const visiting = new Set();
  const done = new Set();
  const walk = (node) => {
    if (done.has(node)) return;
    if (visiting.has(node)) {
      issues.push(`ciclo en progresa: ${node}`);
      return;
    }
    visiting.add(node);
    (adjacency[node] || []).forEach(walk);
    visiting.delete(node);
    done.add(node);
  };
  Object.keys(adjacency).forEach(walk);
  return issues;
}

// ── Transfer engine phase 2: pattern/muscle vectors + propagation ────────
// Metadata lives per FAMILY (with per-id overrides) so the whole catalog is
// covered without touching every entry. Muscles axes: lats, upper_back,
// biceps, chest, front_delt, triceps, quads, glutes_hams, core_flex,
// core_ext, forearms_grip, scap.
const denseTransferFamilyMeta = {
  strict_pull: { patterns: { vertical_pull: 1 }, muscles: { lats: 0.9, upper_back: 0.5, biceps: 0.6, forearms_grip: 0.5, core_flex: 0.15 }, specificity: 0.25 },
  one_arm_chin: { patterns: { vertical_pull: 1 }, muscles: { lats: 0.9, biceps: 0.85, forearms_grip: 0.7, upper_back: 0.5, core_flex: 0.35 }, specificity: 0.5 },
  horizontal_pull: { patterns: { horizontal_pull: 1 }, muscles: { upper_back: 0.9, lats: 0.5, biceps: 0.5, scap: 0.45 }, specificity: 0.2 },
  strict_dip: { patterns: { vertical_push: 0.8, horizontal_push: 0.4 }, muscles: { chest: 0.7, triceps: 0.8, front_delt: 0.6, scap: 0.3 }, specificity: 0.25 },
  ring_push: { patterns: { horizontal_push: 1 }, muscles: { chest: 0.85, triceps: 0.6, front_delt: 0.5, core_ext: 0.25, scap: 0.4 }, specificity: 0.25 },
  pushup: { patterns: { horizontal_push: 1 }, muscles: { chest: 0.8, triceps: 0.6, front_delt: 0.5, core_ext: 0.2, scap: 0.3 }, specificity: 0.15 },
  hspu: { patterns: { vertical_push: 1 }, muscles: { front_delt: 0.9, triceps: 0.7, scap: 0.5, upper_back: 0.2 }, specificity: 0.45 },
  handstand: { patterns: { vertical_push: 0.5, straight_arm: 0.4 }, muscles: { front_delt: 0.6, triceps: 0.4, scap: 0.8, forearms_grip: 0.15 }, specificity: 0.7 },
  press_to_handstand: { patterns: { vertical_push: 0.6, straight_arm: 0.5, core_compression: 0.5 }, muscles: { front_delt: 0.7, scap: 0.7, core_flex: 0.6 }, specificity: 0.65 },
  front_lever: { patterns: { straight_arm: 0.8, core_anti_ext: 0.7, vertical_pull: 0.4 }, muscles: { lats: 0.8, core_flex: 0.6, scap: 0.7, upper_back: 0.4 }, specificity: 0.6 },
  front_lever_pull: { patterns: { vertical_pull: 0.6, straight_arm: 0.6, core_anti_ext: 0.5 }, muscles: { lats: 0.85, core_flex: 0.5, scap: 0.6, biceps: 0.4 }, specificity: 0.55 },
  back_lever: { patterns: { straight_arm: 0.8, core_ext: 0.5 }, muscles: { chest: 0.5, front_delt: 0.5, scap: 0.7, core_ext: 0.5 }, specificity: 0.6 },
  back_lever_pull: { patterns: { straight_arm: 0.7, core_ext: 0.4, vertical_pull: 0.3 }, muscles: { lats: 0.55, scap: 0.7, biceps: 0.3, front_delt: 0.2, core_ext: 0.45 }, specificity: 0.55 },
  cuelgue: { patterns: { vertical_pull: 0.3, straight_arm: 0.3 }, muscles: { forearms_grip: 0.9, scap: 0.6, lats: 0.3 }, specificity: 0.3 },
  single_leg_squat: { patterns: { squat: 0.8 }, muscles: { quads: 0.85, glutes_hams: 0.6 }, specificity: 0.35 },
  squat_bodyweight: { patterns: { squat: 1 }, muscles: { quads: 0.85, glutes_hams: 0.55 }, specificity: 0.12 },
  squat_weighted: { patterns: { squat: 1 }, muscles: { quads: 0.9, glutes_hams: 0.6, core_ext: 0.3 }, specificity: 0.25 },
  hinge_weighted: { patterns: { hinge: 1 }, muscles: { glutes_hams: 0.9, core_ext: 0.6, forearms_grip: 0.3, quads: 0.3 }, specificity: 0.25 },
  hinge_bodyweight: { patterns: { hinge: 0.9 }, muscles: { glutes_hams: 0.9, core_ext: 0.4 }, specificity: 0.3 },
  atg_split_squat: { patterns: { squat: 0.7, range_strength: 0.5 }, muscles: { quads: 0.9, glutes_hams: 0.5 }, specificity: 0.35 },
  toes_to_bar: { patterns: { core_compression: 1 }, muscles: { core_flex: 0.9, lats: 0.3, forearms_grip: 0.3 }, specificity: 0.3 },
  l_sit: { patterns: { core_compression: 0.9, straight_arm: 0.3 }, muscles: { core_flex: 0.85, triceps: 0.3, scap: 0.4 }, specificity: 0.45 },
  hollow: { patterns: { core_anti_ext: 0.8, core_compression: 0.4 }, muscles: { core_flex: 0.85 }, specificity: 0.15 },
  bridge: { patterns: { core_ext: 0.6, range_strength: 0.8 }, muscles: { core_ext: 0.6, front_delt: 0.4, glutes_hams: 0.4 }, specificity: 0.5 },
  mobility_strength: { patterns: { range_strength: 1 }, muscles: { glutes_hams: 0.4, quads: 0.3, core_ext: 0.3 }, specificity: 0.3 },
  side_split: { patterns: { range_strength: 1 }, muscles: { glutes_hams: 0.45, quads: 0.2 }, specificity: 0.4 },
  pancake: { patterns: { range_strength: 1, hinge: 0.3 }, muscles: { glutes_hams: 0.6, core_ext: 0.3 }, specificity: 0.4 },
  // Arm isolation on rings: muscle-driven transfer (biceps/triceps), barely
  // any movement-pattern overlap with the big pulls/pushes.
  ring_curl: { patterns: { horizontal_pull: 0.35 }, muscles: { biceps: 0.95, forearms_grip: 0.35 }, specificity: 0.15 },
  ring_extension: { patterns: { horizontal_push: 0.35 }, muscles: { triceps: 0.95, scap: 0.2 }, specificity: 0.15 },
  accessory: { patterns: { vertical_push: 0.9 }, muscles: { front_delt: 0.85, triceps: 0.6, scap: 0.3 }, specificity: 0.2 },
};

const denseTransferIdMeta = {
  bench_press: { patterns: { horizontal_push: 1 }, muscles: { chest: 0.9, triceps: 0.6, front_delt: 0.5 }, specificity: 0.2 },
  back_extension: { patterns: { hinge: 0.7, core_ext: 0.6 }, muscles: { glutes_hams: 0.7, core_ext: 0.8 }, specificity: 0.15 },
  machine_leg_extension: { patterns: { squat: 0.4 }, muscles: { quads: 0.95 }, specificity: 0.1 },
  lat_pulldown: { patterns: { vertical_pull: 0.6 }, muscles: { lats: 0.9, biceps: 0.5, upper_back: 0.4 }, specificity: 0.1 },
  machine_leg_curl: { patterns: { hinge: 0.4 }, muscles: { glutes_hams: 0.9 }, specificity: 0.1 },
  natural_leg_extension: { patterns: { squat: 0.5, range_strength: 0.3 }, muscles: { quads: 0.95 }, specificity: 0.3 },
  sissy_squat: { patterns: { squat: 0.5, range_strength: 0.4 }, muscles: { quads: 0.95 }, specificity: 0.3 },
  clap_push_up: { patterns: { horizontal_push: 0.9 }, muscles: { chest: 0.8, triceps: 0.6, front_delt: 0.5 }, specificity: 0.35 },
};


const denseCategoryFallbackMeta = {
  push: { patterns: { horizontal_push: 0.7, vertical_push: 0.4 }, muscles: { chest: 0.6, triceps: 0.5, front_delt: 0.5 }, specificity: 0.3 },
  pull: { patterns: { vertical_pull: 0.6, horizontal_pull: 0.4 }, muscles: { lats: 0.6, upper_back: 0.5, biceps: 0.4 }, specificity: 0.3 },
  legs: { patterns: { squat: 0.7, hinge: 0.3 }, muscles: { quads: 0.7, glutes_hams: 0.5 }, specificity: 0.3 },
  core: { patterns: { core_compression: 0.7 }, muscles: { core_flex: 0.8 }, specificity: 0.3 },
  skills: { patterns: { straight_arm: 0.6 }, muscles: { scap: 0.6, front_delt: 0.4 }, specificity: 0.6 },
  mobility: { patterns: { range_strength: 1 }, muscles: { glutes_hams: 0.4, core_ext: 0.3 }, specificity: 0.3 },
};

function denseMetaFor(exercise) {
  if (!exercise) return denseCategoryFallbackMeta.skills;
  return (
    denseTransferIdMeta[exercise.id] ||
    denseTransferFamilyMeta[exercise.family] ||
    denseCategoryFallbackMeta[exercise.category] ||
    denseCategoryFallbackMeta.skills
  );
}

function denseVecCos(a = {}, b = {}) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.forEach((key) => {
    const va = a[key] || 0;
    const vb = b[key] || 0;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  });
  if (!na || !nb) return 0;
  return dot / Math.sqrt(na * nb);
}

function denseModalityFactor(e, f) {
  if (Boolean(e.isometric) !== Boolean(f.isometric)) return 0.6;
  if (e.nature !== f.nature) return 0.9;
  return 1;
}

// Hand-tuned overrides for pairs the vectors can't fully capture
const densePairOverrides = {
  "pull_up>chin_up": 0.8,
  "chin_up>pull_up": 0.8,
  "bench_press>military_press": 0.5,
  "military_press>bench_press": 0.45,
  "military_press>full_rom_hspu": 0.55,
  // Barbell anchors: squat<->hinge transfer is stronger than the disjoint
  // pattern vectors suggest (shared posterior chain + axial loading).
  "back_squat>deadlift": 0.45,
  "deadlift>back_squat": 0.45,
  "front_squat>deadlift": 0.35,
  "deadlift>front_squat": 0.35,
};

// Family-level caps for pairs the vectors overstate. Matched by family (so it
// covers every exercise in the family) after the per-id overrides. A handstand
// and a hang share scapular + straight-arm loading on paper, but a handstand
// does not build your hang and vice versa — cap it low instead of ~0.4.
const denseFamilyPairOverrides = {
  "handstand>cuelgue": 0.1,
  "cuelgue>handstand": 0.1,
};

// Dominant pattern of an exercise (for the learned pair multipliers)
function densePrimaryPattern(exercise) {
  const patterns = denseMetaFor(exercise)?.patterns || {};
  return Object.entries(patterns).sort(([, a], [, b]) => b - a)[0]?.[0] || "other";
}

// Personal multiplier learned by reconciliation (phase 4), keyed by
// source-pattern > target-pattern. 1 = generic; learned within [0.3, 2].
function densePairK(e, f) {
  const key = `${densePrimaryPattern(e)}>${densePrimaryPattern(f)}`;
  return clamp(Number(state.transfer?.pairK?.[key]) || 1, 0.3, 2);
}

// Mobility work only transfers within its own family (pancake progressions
// between themselves, side-split progressions between themselves...). Any
// cross-family pair that involves a mobility exercise is zeroed — in BOTH
// directions: a side split does not build your back squat, a bridge does not
// feed back-lever pulls, and a deadlift PR should not inflate pancake
// estimates. The generic `range_strength`/shared-muscle cosines suggested
// otherwise (409 spurious pairs ≥0.15 audited). A clearly-justified pair can
// still be whitelisted via densePairOverrides, which bypasses this guard.
function denseIsSpuriousMobilityPair(e, f) {
  return (e.category === "mobility" || f.category === "mobility") && e.family !== f.family;
}

// §3.2 — difficulty asymmetry (formula path only; hand-tuned overrides are
// already directional). Same family: damp by relative level when the target
// is HARDER. Any non-barbell source into a pure "weighted" lift gets an extra
// damp — a pistol PR barely moves a 175 kg deadlift.
function denseDifficultyAsymmetry(e, f) {
  let factor = 1;
  const le = denseProgressionLevelOf(e);
  const lf = denseProgressionLevelOf(f);
  if (e.family && e.family === f.family && le && lf && lf > le) factor *= Math.pow(le / lf, DENSE_TRANSFER_ASYM_EXP);
  if (f.nature === "weighted" && e.nature !== "weighted") factor *= DENSE_TRANSFER_TO_BARBELL;
  return factor;
}

function denseTransferCoefficient(e, f) {
  // Progressive-escalation exercises (loaded spine mobility) accept NO
  // incoming transfer, ever — not even from their own family or overrides.
  if (f.transferIn === "none") return 0;
  const override = densePairOverrides[`${e.id}>${f.id}`];
  if (override != null) return clamp(override * densePairK(e, f), 0, 0.9);
  const famOverride = denseFamilyPairOverrides[`${e.family}>${f.family}`];
  if (famOverride != null) return clamp(famOverride * densePairK(e, f), 0, 0.9);
  if (denseIsSpuriousMobilityPair(e, f)) return 0;
  const A = denseMetaFor(e);
  const B = denseMetaFor(f);
  // Patterns and muscles both carry transfer: disjoint patterns (vertical vs
  // horizontal pull) still transfer through shared musculature.
  const pat = denseVecCos(A.patterns, B.patterns);
  const mus = denseVecCos(A.muscles, B.muscles);
  const c = (0.55 * pat + 0.45 * mus) * denseModalityFactor(e, f) * (1 - (B.specificity ?? 0.3) * 0.7) * densePairK(e, f) * denseDifficultyAsymmetry(e, f);
  return clamp(roundTo(c, 3), 0, 0.9);
}

let denseNeighborCache = null;

// Progression families move together: boosting one boosts its siblings.
const denseProgressionFamilies = new Set(["front_lever", "front_lever_pull", "back_lever", "back_lever_pull", "hspu", "handstand", "cuelgue"]);

function denseTransferNeighbors(exercise) {
  denseNeighborCache ||= {};
  if (denseNeighborCache[exercise.id]) return denseNeighborCache[exercise.id];
  // One representative per family so progressions don't crowd out other
  // movement families in the top-K.
  const byFamily = {};
  denseExerciseCatalog.forEach((other) => {
    if (other.id === exercise.id) return;
    const c = denseTransferCoefficient(exercise, other);
    if (c < 0.15) return;
    const key = other.family && other.family !== exercise.family ? other.family : other.id;
    if (!byFamily[key] || c > byFamily[key].c) byFamily[key] = { exercise: other, c };
  });
  const neighbors = Object.values(byFamily)
    .sort((a, b) => b.c - a.c)
    .slice(0, 8);
  denseNeighborCache[exercise.id] = neighbors;
  return neighbors;
}

// ── Phase 3: technical mastery (T) ───────────────────────────────────────
// Skills express strength only through practiced technique. T is derived
// from history (deterministic, re-derivable): saturating growth with distinct
// practice days of the exercise's family, slow decay with time away.
function denseTechMasteryInfo(exercise) {
  const spec = denseMetaFor(exercise)?.specificity ?? 0.3;
  if (spec < 0.45) return { t: 1, sessions: 0, technical: false };
  const key = exercise.family && denseProgressionFamilies.has(exercise.family) ? exercise.family : null;
  const relevant = getDenseEntries().filter((entry) => {
    if (key) return denseExerciseById(entry.exercise_id)?.family === key;
    return entry.exercise_id === exercise.id;
  });
  const days = new Set(relevant.map((entry) => entry.date).filter(Boolean));
  const sessions = days.size;
  if (!sessions) return { t: 0.35, sessions: 0, technical: true };
  const lastDate = [...days].sort().pop();
  const weeks = Math.max(0, (today.getTime() - parseDate(lastDate).getTime()) / (7 * 86400000));
  const t = clamp((1 - 0.65 * Math.pow(0.93, sessions)) * Math.pow(0.995, weeks), 0.3, 1);
  return { t: roundTo(t, 3), sessions, technical: true };
}

function denseTechMastery(exercise) {
  return denseTechMasteryInfo(exercise).t;
}

// Cumulative indirect boost applied to an exercise's estimates (capped 12%)
function denseTransferBoost(exerciseId) {
  return clamp(Number(state.transfer?.boosts?.[exerciseId]?.pct) || 0, 0, 0.12);
}

function denseBoosted(exerciseId, value) {
  return value ? value * (1 + denseTransferBoost(exerciseId)) : value;
}

function denseTransferQuality(entry) {
  if (entry.failed || entry.effort === "fallo") return 0.6;
  if (entry.effort === "VH") return 0.85;
  if (entry.readiness === "low") return 0.8;
  return 1;
}

// Phase 4: when an exercise that carried an indirect boost is finally tested,
// compare predicted vs observed improvement and adjust the personal
// pattern-pair multipliers (starts generic, learns YOUR transfer rates).
// Score axis of an entry: deltas only compare within the same axis, so a
// modality switch (weighted e1RM ~198 vs bodyweight capacity ~13) can never
// fake a giant improvement.
function denseScoreType(entry) {
  if (Number(entry.e1rm_kg) > 0) return "e1rm";
  if (entry.total_hold_seconds || entry.isometric_capacity) return "iso";
  if (entry.bodyweight_capacity || entry.reps_per_min) return "cap";
  return "other";
}

// Reconcile predictions resolved by a direct test. Noise-robust: needs a
// meaningful prediction (>=2%) and averages TWO observations per pattern-pair
// before moving the personal multiplier k.
function denseReconcileTransfers(entry, rawDelta) {
  const slot = state.transfer.boosts[entry.exercise_id];
  const predicted = clamp(Number(slot?.pct) || 0, 0, 0.12);
  if (predicted < 0.02) return;
  const targetExercise = denseExerciseById(entry.exercise_id);
  const ratio = clamp(clamp(rawDelta, -0.1, 0.3) / predicted, 0, 2);
  const pending = state.transfer.events.filter(
    (event) => !event.reconciled && (event.target === entry.exercise_id || (event.family && targetExercise?.family === event.family)),
  );
  if (!pending.length) return;
  state.transfer.pairK ||= {};
  state.transfer.pendingK ||= {};
  new Set(pending.map((event) => event.source)).forEach((sourceId) => {
    const source = denseExerciseById(sourceId);
    if (!source) return;
    const key = `${densePrimaryPattern(source)}>${densePrimaryPattern(targetExercise)}`;
    const queue = (state.transfer.pendingK[key] ||= []);
    queue.push(roundTo(ratio, 3));
    if (queue.length < 2) return; // wait for a second observation
    const avgRatio = average(queue);
    state.transfer.pendingK[key] = [];
    const k = clamp(Number(state.transfer.pairK[key]) || 1, 0.3, 2);
    state.transfer.pairK[key] = roundTo(clamp(k * (1 + 0.25 * (avgRatio - 1)), 0.3, 2), 3);
    denseNeighborCache = null; // coefficients changed for this user
  });
  pending.forEach((event) => {
    event.reconciled = true;
    event.ratio = roundTo(ratio, 2);
  });
}

// One fold step: process `entry` against the entries strictly before it.
// Returns the top boosts applied (for the toast) or null.
function denseTransferStep(entry, priorEntries) {
  const exercise = denseExerciseById(entry.exercise_id);
  const score = denseEntryScore(entry);
  if (!exercise || !score) return null;
  state.transfer ||= { boosts: {}, events: [], pairK: {}, pendingK: {} };
  const type = denseScoreType(entry);
  const prior = Math.max(
    0,
    ...priorEntries
      .filter((item) => item.exercise_id === entry.exercise_id && denseScoreType(item) === type)
      .map((item) => denseEntryScore(item) || 0),
  );
  if (!prior) {
    delete state.transfer.boosts[entry.exercise_id];
    return null; // first mark on this axis = calibration, not improvement
  }
  const rawDelta = (score - prior) / prior;
  // Learn from the prediction this test resolves, then absorb the boost.
  denseReconcileTransfers(entry, rawDelta);
  delete state.transfer.boosts[entry.exercise_id];
  if (rawDelta <= 0.004) return null;
  const delta = Math.min(rawDelta, 0.25) * denseTransferQuality(entry);
  const stamp = entry.created_at || entry.date || new Date().toISOString();
  const applied = [];
  denseTransferNeighbors(exercise).forEach(({ exercise: target, c }) => {
    // Technical targets only absorb transfer through practiced technique.
    const gate = 0.4 + 0.6 * denseTechMastery(target);
    const gain = clamp(delta * c * 0.5 * gate, 0, 0.03);
    if (gain < 0.005) return;
    // Progression families receive the boost as a block (shared latent).
    const members =
      target.family && denseProgressionFamilies.has(target.family)
        ? denseExerciseCatalog.filter((item) => item.family === target.family && item.id !== entry.exercise_id)
        : [target];
    let appliedAny = 0;
    members.forEach((member) => {
      const slot = (state.transfer.boosts[member.id] ||= { pct: 0, from: [] });
      const add = Math.min(gain, Math.max(0, 0.12 - slot.pct));
      if (add <= 0.002) return;
      slot.pct = roundTo(slot.pct + add, 4);
      slot.updatedAt = stamp;
      slot.from = [{ name: exercise.name, date: entry.date }, ...(slot.from || [])].slice(0, 3);
      appliedAny = Math.max(appliedAny, add);
    });
    if (!appliedAny) return;
    applied.push({ id: target.id, name: members.length > 1 ? `${target.name.split(" ").slice(0, 2).join(" ")} (familia)` : target.name, pct: appliedAny });
    state.transfer.events.push({ at: stamp, source: entry.exercise_id, sourceEntry: entry.id, target: target.id, family: members.length > 1 ? target.family : null, delta: appliedAny, reconciled: false });
  });
  if (state.transfer.events.length > 150) state.transfer.events = state.transfer.events.slice(-150);
  return applied.sort((a, b) => b.pct - a.pct).slice(0, 3);
}

// Rebuild the WHOLE transfer state as a deterministic fold over history.
// Editing or deleting any mark re-derives boosts, events and learned pairK —
// no ghost state can survive. Returns the resulting boosts snapshot.
function rebuildTransferState({ excludeId = null } = {}) {
  denseLevelExpCache = null; // history changed → learned exponents change
  state.transfer = { boosts: {}, events: [], pairK: {}, pendingK: {} };
  const sorted = [...getDenseEntries()]
    .filter((entry) => entry.id !== excludeId)
    .sort((a, b) => String(a.created_at || a.date || "").localeCompare(String(b.created_at || b.date || "")));
  sorted.forEach((entry, index) => denseTransferStep(entry, sorted.slice(0, index)));
  return JSON.parse(JSON.stringify(state.transfer.boosts));
}

// Save-time wrapper: rebuild without/with the new entry and diff the boosts,
// so the toast reports exactly what THIS mark improved.
function runTransferEngine(entry) {
  const before = rebuildTransferState({ excludeId: entry.id });
  const after = rebuildTransferState();
  const applied = Object.entries(after)
    .map(([id, slot]) => ({ id, name: denseExerciseById(id)?.name || id, pct: roundTo((slot.pct || 0) - (before[id]?.pct || 0), 4) }))
    .filter((row) => row.pct >= 0.005)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);
  return applied.length ? applied : null;
}

const habitDefaults = [
  {
    id: "wake",
    name: "07:00",
    detail: "Despertar pronto en verano",
    icon: "sunrise",
    color: "#79aaff",
    stat: "mind",
    tolerance: 88,
    target: "Antes de 07:10",
    xp: 18,
    core: true,
  },
  {
    id: "train-am",
    name: "Entrenar AM",
    detail: "Entreno antes de que el día se coma la agenda",
    icon: "dumbbell",
    color: "#68d66f",
    stat: "body",
    tolerance: 76,
    target: "Primer bloque físico",
    xp: 26,
    core: true,
  },
  {
    id: "work-am",
    name: "Trabajo AM",
    detail: "Bloque de trabajo profundo si no toca entrenar primero",
    icon: "briefcase-business",
    color: "#e4af54",
    stat: "coin",
    tolerance: 74,
    target: "Primer bloque serio",
    xp: 22,
    core: true,
  },
  {
    id: "nophone",
    name: "NOPHONE",
    detail: "Sin móvil una vez cae el sol",
    icon: "moon",
    color: "#bd8bff",
    stat: "soul",
    tolerance: 72,
    target: "Sunset en adelante",
    xp: 24,
    core: true,
  },
  {
    id: "frog",
    name: "FROG",
    detail: "La tarea dura del día hecha sin procrastinar",
    icon: "target",
    color: "#57c6a1",
    stat: "strg",
    tolerance: 82,
    target: "Antes de negociar contigo",
    xp: 30,
    core: true,
  },
  {
    id: "family",
    name: "Familia",
    detail: "2h de calidad con el móvil lejos",
    icon: "heart-handshake",
    color: "#ffd166",
    stat: "soul",
    tolerance: 92,
    target: "2h presente",
    xp: 28,
    core: true,
  },
  {
    id: "mobility",
    name: "Movilidad",
    detail: "Cadera, tobillo, T-spine y respiración",
    icon: "activity",
    color: "#8bd9eb",
    stat: "body",
    tolerance: 70,
    target: "10-15 min",
    xp: 12,
    core: false,
  },
  {
    id: "sleep-log",
    name: "Sleep log",
    detail: "Apuntar hora de sueño y energía",
    icon: "bed",
    color: "#ff7c9e",
    stat: "mind",
    tolerance: 62,
    target: "30s de honestidad",
    xp: 10,
    core: false,
  },
];

const mesocycleDefault = {
  id: "summer-base-1",
  name: "Verano Base 07:00",
  startDate: dateKey(today),
  goal: "Rutina AM sólida, fuerza sin grindear y energía familiar al final del día.",
  weeks: [
    {
      id: "w1",
      label: "Semana 1",
      focus: "Base técnica",
      intent: "Repeticiones limpias, sueño estable, cero ego.",
      load: 68,
      sessions: [
        {
          id: "w1-a",
          title: "Lower Foundation",
          slot: "AM",
          type: "Fuerza base",
          readiness: "RIR 3",
          exercises: [
            ex("sq", "Sentadilla", "4", "6", "72.5 kg", "RIR 3", "+2.5 kg si vuela", "Bracing antes de bajar"),
            ex("rdl", "Peso muerto rumano", "3", "8", "70 kg", "RIR 3", "+1 rep total", "Bisagra larga"),
            ex("split", "Split squat", "3", "10", "18 kg", "RIR 2", "Mantener", "Rodilla viaja"),
            ex("calves", "Gemelo", "4", "12", "BW", "RIR 2", "+2 reps", "Pausa arriba"),
          ],
        },
        {
          id: "w1-b",
          title: "Upper Foundation",
          slot: "AM",
          type: "Fuerza base",
          readiness: "RIR 3",
          exercises: [
            ex("bench", "Press banca", "4", "6", "62.5 kg", "RIR 3", "+1 rep total", "Escápulas fijas"),
            ex("row", "Remo barra", "3", "8", "55 kg", "RIR 2", "Pausa 1s", "Tirar con codos"),
            ex("ohp", "Press militar", "3", "6", "37.5 kg", "RIR 3", "+1.25 kg", "Costillas abajo"),
            ex("pull", "Dominadas", "4", "5", "BW", "RIR 2", "+1 rep", "Mentón claro"),
          ],
        },
        {
          id: "w1-c",
          title: "Zone 2 + Mobility",
          slot: "PM",
          type: "Recuperación",
          readiness: "Suave",
          exercises: [
            ex("z2", "Zona 2", "1", "25 min", "135-145 ppm", "Fácil", "+5 min", "Respirar nasal"),
            ex("hips", "Movilidad cadera", "2", "8 min", "BW", "Libre", "Mantener", "Sin prisa"),
            ex("tspine", "T-spine", "2", "8/8", "BW", "Libre", "Mantener", "Abrir costillas"),
          ],
        },
      ],
    },
    {
      id: "w2",
      label: "Semana 2",
      focus: "Volumen útil",
      intent: "Añadir trabajo sin perder la mañana.",
      load: 76,
      sessions: [
        {
          id: "w2-a",
          title: "Lower Volume",
          slot: "AM",
          type: "Acumulación",
          readiness: "RIR 2",
          exercises: [
            ex("sq", "Sentadilla", "5", "5", "75 kg", "RIR 2", "+1 serie", "Misma técnica"),
            ex("dead", "Peso muerto", "3", "4", "100 kg", "RIR 2", "+2.5 kg", "Velocidad"),
            ex("lunge", "Zancadas", "3", "10", "22 kg", "RIR 2", "+2 reps", "Control"),
            ex("carry", "Farmer walk", "4", "30 m", "30 kg", "Duro", "+5 m", "Postura alta"),
          ],
        },
        {
          id: "w2-b",
          title: "Upper Volume",
          slot: "AM",
          type: "Acumulación",
          readiness: "RIR 2",
          exercises: [
            ex("bench", "Press banca", "5", "5", "65 kg", "RIR 2", "+1 serie", "Bar path igual"),
            ex("pull", "Dominadas", "4", "6", "BW", "RIR 2", "Lastre si sobra", "Rango completo"),
            ex("incline", "Press inclinado", "3", "8", "24 kg", "RIR 2", "+1 rep", "Pecho arriba"),
            ex("face", "Face pull", "3", "15", "Banda", "RIR 2", "Mantener", "Hombros felices"),
          ],
        },
        {
          id: "w2-c",
          title: "Engine",
          slot: "Flexible",
          type: "Condición",
          readiness: "RPE 6",
          exercises: [
            ex("z2", "Zona 2", "1", "35 min", "135-145 ppm", "Fácil", "+5 min", "Conversacional"),
            ex("sled", "Trineo / bici", "6", "40s", "Moderado", "RPE 7", "+1 ronda", "No morir"),
            ex("mob", "Reset movilidad", "1", "12 min", "BW", "Libre", "Mantener", "Cerrar bien"),
          ],
        },
      ],
    },
    {
      id: "w3",
      label: "Semana 3",
      focus: "Intensidad",
      intent: "Top sets honestos; si hay grind, se baja.",
      load: 86,
      sessions: [
        {
          id: "w3-a",
          title: "Strength Lower",
          slot: "AM",
          type: "Realización",
          readiness: "RIR 1",
          exercises: [
            ex("sq", "Sentadilla", "1+3", "4/5", "82.5 kg", "RIR 1", "Top set", "Cortar si se tuerce"),
            ex("dead", "Peso muerto", "3", "3", "110 kg", "RIR 2", "+2.5 kg", "Salida rápida"),
            ex("front", "Front squat", "3", "5", "62.5 kg", "RIR 2", "Mantener", "Torso alto"),
            ex("core", "Anti-rotación", "3", "12/12", "Cable", "RIR 2", "+control", "Costillas quietas"),
          ],
        },
        {
          id: "w3-b",
          title: "Strength Upper",
          slot: "AM",
          type: "Realización",
          readiness: "RIR 1",
          exercises: [
            ex("bench", "Press banca", "1+3", "4/5", "70 kg", "RIR 1", "Top set", "Sin grind"),
            ex("row", "Remo pecho apoyado", "4", "8", "30 kg", "RIR 2", "+2 reps", "Escápulas"),
            ex("ohp", "Press militar", "3", "5", "42.5 kg", "RIR 2", "+1.25 kg", "Glúteo firme"),
            ex("curl", "Curl + tríceps", "3", "12", "Ligero", "RIR 2", "Bombeo", "Codos sanos"),
          ],
        },
        {
          id: "w3-c",
          title: "Capacity Check",
          slot: "Flexible",
          type: "Test suave",
          readiness: "RPE 7",
          exercises: [
            ex("z2", "Zona 2", "1", "40 min", "135-145 ppm", "Fácil", "Sostener", "Sin mirar móvil"),
            ex("walk", "Caminata", "1", "45 min", "Libre", "Fácil", "Familia", "Si encaja"),
            ex("breath", "Respiración", "1", "8 min", "BW", "Libre", "Mantener", "Bajar revoluciones"),
          ],
        },
      ],
    },
    {
      id: "w4",
      label: "Semana 4",
      focus: "Descarga",
      intent: "Salir con hambre del próximo bloque.",
      load: 52,
      sessions: [
        {
          id: "w4-a",
          title: "Deload Lower",
          slot: "AM",
          type: "Resensibilización",
          readiness: "RIR 4",
          exercises: [
            ex("sq", "Sentadilla", "3", "5", "60 kg", "RIR 4", "Reset", "Explosiva"),
            ex("rdl", "RDL", "2", "8", "55 kg", "RIR 4", "Reset", "Suave"),
            ex("mob", "Movilidad", "1", "15 min", "BW", "Libre", "Mantener", "Calidad"),
          ],
        },
        {
          id: "w4-b",
          title: "Deload Upper",
          slot: "AM",
          type: "Resensibilización",
          readiness: "RIR 4",
          exercises: [
            ex("bench", "Press banca", "3", "5", "50 kg", "RIR 4", "Reset", "Rápida"),
            ex("pull", "Dominadas", "3", "5", "BW", "RIR 4", "Perfectas", "Sin lastre"),
            ex("row", "Remo", "2", "10", "Ligero", "RIR 4", "Reset", "Sangre"),
          ],
        },
        {
          id: "w4-c",
          title: "Review + Next Block",
          slot: "Libre",
          type: "Revisión",
          readiness: "Honesto",
          exercises: [
            ex("review", "Review mesociclo", "1", "20 min", "Diario", "Honesto", "Decidir", "Qué repetir"),
            ex("z2", "Zona 2", "1", "30 min", "Suave", "Fácil", "Reset", "Soltar"),
            ex("plan", "Plan siguiente", "1", "15 min", "Notas", "Claro", "Bloque nuevo", "Una prioridad"),
          ],
        },
      ],
    },
  ],
};

let state = loadState();
let selectedDate = parseDate(state.settings.selectedDate || dateKey(today));
cleanAccidentalFormUrl();

const nodes = {
  seasonLabel: document.querySelector("#seasonLabel"),
  todayChip: document.querySelector("#todayChip"),
  openBackup: document.querySelector("#openBackup"),
  heroPanel: document.querySelector("#heroPanel"),
  questPanel: document.querySelector("#questPanel"),
  dayPanel: document.querySelector("#dayPanel"),
  calendarPanel: document.querySelector("#calendarPanel"),
  trainingCardPanel: document.querySelector("#trainingCardPanel"),
  habitEditorPanel: document.querySelector("#habitEditorPanel"),
  habitAnalyticsPanel: document.querySelector("#habitAnalyticsPanel"),
  trainingModePanel: document.querySelector("#trainingModePanel"),
  mesocyclePanel: document.querySelector("#mesocyclePanel"),
  sessionPanel: document.querySelector("#sessionPanel"),
  denseTrainingPanel: document.querySelector("#denseTrainingPanel"),
  trainingAnalyticsPanel: document.querySelector("#trainingAnalyticsPanel"),
  densePrPanel: document.querySelector("#densePrPanel"),
  logbookPanel: document.querySelector("#logbookPanel"),
  reviewPanel: document.querySelector("#reviewPanel"),
  dataPanel: document.querySelector("#dataPanel"),
  modal: document.querySelector("#appModal"),
  modalCard: document.querySelector("#modalCard"),
  modalEyebrow: document.querySelector("#modalEyebrow"),
  modalTitle: document.querySelector("#modalTitle"),
  modalBody: document.querySelector("#modalBody"),
};

document.addEventListener("click", handleClick);
document.addEventListener("change", handleChange);
document.addEventListener("input", handleInput);
document.addEventListener("submit", handleSubmit);

// ── Swipe-to-delete on workout cards (iOS-style) ─────────────────────────
const SWIPE_REST = 82; // resting reveal when snapped open
const SWIPE_OPEN_TRIGGER = 52; // drag past this snaps open
const SWIPE_FULL_FRACTION = 0.45; // drag past this fraction of width deletes
const CARD_DELETE_EDGE = 68; // delete-swipe must start within this many px of the card's right edge
let swipeGesture = null;

function closeAllSwipes(except) {
  document.querySelectorAll(".swipe-wrap.is-open").forEach((wrap) => {
    if (wrap === except) return;
    wrap.classList.remove("is-open");
    const card = wrap.querySelector(".today-workout-card");
    if (card) card.style.transform = "";
  });
}

// ── View swipe: change day (Workout) / analytics tab, on non-card areas ──
const VIEW_SWIPE_THRESHOLD = 58;
const VIEW_SWIPE_FLICK_VELOCITY = 0.5; // px/ms — a quick flick navigates even on short drags
const VIEW_SWIPE_FLICK_MIN_DX = 24;
// Buttons/links are NOT excluded: taps still work because we only hijack the
// gesture after clear horizontal movement (axis gating + click swallow).
const VIEW_SWIPE_IGNORE = "input, select, textarea, details, summary, .training-mode-tabs, .weekday-strip, .analytics-tab-strip, .quick-timer, dialog, .modal";
let viewSwipe = null;
let viewSwipeLock = false; // ignore new view swipes while a transition is playing

// Returns the navigate function for a swipe direction, or null if it would be a
// no-op (e.g. already at the first/last analytics tab).
function resolveViewSwipe(dir) {
  const mode = state.settings.trainingMode || "workout";
  if (mode === "workout") return () => shiftDay(dir);
  if (mode === "analytics") {
    const tabs = trainingAnalyticsTabs.map((tab) => tab[0]);
    const index = tabs.indexOf(state.settings.trainingAnalyticsTab || "progress");
    const next = clamp(index + dir, 0, tabs.length - 1);
    if (next === index) return null;
    return () => setTrainingAnalyticsTab(tabs[next]);
  }
  return null;
}

// Slide the current panel out while the freshly-rendered one slides in from the
// opposite side — a real carousel transition instead of a hard jump.
function slidePanelTransition(panel, dir, navigate, dragDx = 0) {
  const parent = panel?.parentElement;
  if (!parent) {
    navigate();
    return;
  }
  const width = parent.getBoundingClientRect().width || window.innerWidth || 1;
  const prevPos = parent.style.position;
  parent.style.position = "relative";
  const ghost = panel.cloneNode(true);
  Object.assign(ghost.style, {
    position: "absolute",
    top: `${panel.offsetTop}px`,
    left: `${panel.offsetLeft}px`,
    width: `${panel.offsetWidth}px`,
    margin: "0",
    transform: `translateX(${dragDx}px)`,
    transition: "transform 0.3s var(--ease-out), opacity 0.3s var(--ease-out)",
    pointerEvents: "none",
    zIndex: "3",
  });
  parent.appendChild(ghost);
  navigate(); // re-renders the real panel with the new day/tab
  panel.style.transition = "none";
  panel.style.transform = `translateX(${dir * width}px)`;
  requestAnimationFrame(() => {
    ghost.style.transform = `translateX(${-dir * width}px)`;
    ghost.style.opacity = "0";
    panel.style.transition = "transform 0.3s var(--ease-out)";
    panel.style.transform = "translateX(0)";
  });
  setTimeout(() => {
    ghost.remove();
    panel.style.transition = "";
    panel.style.transform = "";
    parent.style.position = prevPos;
  }, 340);
}

function snapViewPanelBack(panel) {
  if (!panel) return;
  panel.style.transition = "transform 0.24s var(--ease-out)";
  panel.style.transform = "translateX(0)";
  setTimeout(() => {
    panel.style.transition = "";
    panel.style.transform = "";
  }, 260);
}

function onSwipePointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const card = event.target.closest(".swipe-wrap > .today-workout-card");
  // Only grab the delete gesture when the swipe starts from the card's right
  // edge (or the card is already open). The middle stays free for day/tab swipes.
  if (card) {
    const wrap = card.parentElement;
    const rect = card.getBoundingClientRect();
    const fromEdge = event.clientX >= rect.right - CARD_DELETE_EDGE;
    if (fromEdge || wrap.classList.contains("is-open")) {
      swipeGesture = {
        card,
        wrap,
        startX: event.clientX,
        startY: event.clientY,
        base: wrap.classList.contains("is-open") ? -SWIPE_REST : 0,
        axis: null,
        offset: 0,
        id: event.pointerId,
      };
      return;
    }
  }
  closeAllSwipes();
  // Start a view-level swipe when the touch lands on neutral training area.
  if (viewSwipeLock) return;
  const mode = state.settings.trainingMode || "workout";
  const base = { startX: event.clientX, startY: event.clientY, axis: null, dx: 0, effDx: 0, id: event.pointerId, samples: [[event.clientX, performance.now()]] };
  if (mode === "workout") {
    // Gesture can start anywhere in the workout panel (summary included) so an
    // empty day is still easy to page — but only the exercise carousel slides.
    const panel = event.target.closest('[data-training-section="workout"]');
    const carousel = nodes.mesocyclePanel?.querySelector(".day-carousel");
    const track = carousel?.querySelector(".day-carousel-track");
    if (panel && track && !event.target.closest(VIEW_SWIPE_IGNORE)) {
      const slides = [...track.children];
      viewSwipe = {
        ...base,
        kind: "carousel",
        track,
        carousel,
        heights: slides.map((slide) => slide.offsetHeight || 0),
        width: carousel.getBoundingClientRect().width || window.innerWidth || 1,
        canPrev: true,
        canNext: true,
      };
    }
  } else if (mode === "analytics" && event.target.closest("#view-training") && !event.target.closest(VIEW_SWIPE_IGNORE)) {
    const tabs = trainingAnalyticsTabs.map((tab) => tab[0]);
    const index = tabs.indexOf(state.settings.trainingAnalyticsTab || "progress");
    viewSwipe = { ...base, kind: "panel", panel: nodes.trainingAnalyticsPanel, canPrev: index > 0, canNext: index < tabs.length - 1 };
  }
}

function onSwipePointerMove(event) {
  if (swipeGesture && event.pointerId === swipeGesture.id) {
    const dx = event.clientX - swipeGesture.startX;
    const dy = event.clientY - swipeGesture.startY;
    if (!swipeGesture.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      swipeGesture.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (swipeGesture.axis === "x") swipeGesture.wrap.classList.add("is-dragging");
    }
    if (swipeGesture.axis !== "x") {
      swipeGesture = null; // vertical intent -> let the page scroll
      return;
    }
    const offset = Math.max(-swipeGesture.card.offsetWidth, Math.min(0, swipeGesture.base + dx));
    swipeGesture.offset = offset;
    swipeGesture.card.style.transform = `translateX(${offset}px)`;
    event.preventDefault();
    return;
  }
  if (viewSwipe && event.pointerId === viewSwipe.id) {
    const dx = event.clientX - viewSwipe.startX;
    const dy = event.clientY - viewSwipe.startY;
    if (!viewSwipe.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      viewSwipe.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? "x" : "y";
    }
    if (viewSwipe.axis !== "x") {
      viewSwipe = null; // vertical intent -> let the page scroll
      return;
    }
    viewSwipe.samples.push([event.clientX, performance.now()]);
    if (viewSwipe.samples.length > 8) viewSwipe.samples.shift();
    // Rubber-band when dragging past an edge (first/last analytics tab).
    const blocked = (dx > 0 && !viewSwipe.canPrev) || (dx < 0 && !viewSwipe.canNext);
    const effDx = blocked ? dx * 0.3 : dx;
    viewSwipe.dx = dx;
    viewSwipe.effDx = effDx;
    const el = viewSwipe.kind === "carousel" ? viewSwipe.track : viewSwipe.panel;
    if (el) {
      el.style.transition = "none";
      el.style.transform = `translateX(${effDx}px)`;
    }
    // Morph the carousel height toward the incoming day so taller neighbors
    // are never clipped and shorter ones don't leave a hole.
    if (viewSwipe.kind === "carousel" && viewSwipe.carousel) {
      const cur = viewSwipe.heights[1];
      const tgt = dx < 0 ? viewSwipe.heights[2] : viewSwipe.heights[0];
      const progress = Math.min(1, Math.abs(effDx) / viewSwipe.width);
      viewSwipe.carousel.style.transition = "none";
      viewSwipe.carousel.style.height = `${Math.round(cur + (tgt - cur) * progress)}px`;
    }
    event.preventDefault();
  }
}

function onSwipePointerUp(event) {
  if (viewSwipe && event.pointerId === viewSwipe.id) {
    const swipe = viewSwipe;
    viewSwipe = null;
    if (swipe.axis !== "x") return;
    const dir = swipe.dx < 0 ? 1 : -1;
    // Velocity over the most recent samples: a quick flick counts as intent
    // even when the drag distance stays under the threshold.
    const recent = swipe.samples.slice(-4);
    const [x0, t0] = recent[0];
    const [x1, t1] = recent[recent.length - 1];
    const velocity = t1 > t0 ? (x1 - x0) / (t1 - t0) : 0;
    const flick = Math.abs(velocity) >= VIEW_SWIPE_FLICK_VELOCITY && Math.abs(swipe.dx) >= VIEW_SWIPE_FLICK_MIN_DX && Math.sign(velocity) === Math.sign(swipe.dx);
    const wantsNavigate = Math.abs(swipe.dx) >= VIEW_SWIPE_THRESHOLD || flick;
    const navigate = wantsNavigate ? resolveViewSwipe(dir) : null;
    if (swipe.kind === "carousel") {
      if (navigate) {
        window.__swipeJustSwiped = true;
        viewSwipeLock = true;
        setTimeout(() => {
          window.__swipeJustSwiped = false;
        }, 80);
        // Slide fully onto the preloaded neighbor (compensating the 12px slide
        // gap) while the container height eases to the incoming day's height,
        // then re-render centered on the new day.
        swipe.track.style.transition = "transform 0.3s var(--ease-out)";
        swipe.track.style.transform = dir > 0 ? "translateX(calc(-100% - 12px))" : "translateX(calc(100% + 12px))";
        if (swipe.carousel) {
          swipe.carousel.style.transition = "height 0.3s var(--ease-out)";
          swipe.carousel.style.height = `${swipe.heights[dir > 0 ? 2 : 0]}px`;
        }
        setTimeout(() => {
          navigate();
          viewSwipeLock = false;
        }, 300);
      } else {
        swipe.track.style.transition = "transform 0.24s var(--ease-out)";
        swipe.track.style.transform = "translateX(0)";
        if (swipe.carousel) {
          swipe.carousel.style.transition = "height 0.24s var(--ease-out)";
          swipe.carousel.style.height = `${swipe.heights[1]}px`;
        }
        setTimeout(() => {
          swipe.track.style.transition = "";
          swipe.track.style.transform = "";
          if (swipe.carousel) {
            swipe.carousel.style.transition = "";
            swipe.carousel.style.height = "";
          }
        }, 260);
      }
    } else if (navigate) {
      window.__swipeJustSwiped = true;
      viewSwipeLock = true;
      setTimeout(() => {
        window.__swipeJustSwiped = false;
      }, 80);
      slidePanelTransition(swipe.panel, dir, navigate, swipe.effDx);
      setTimeout(() => {
        viewSwipeLock = false;
      }, 350);
    } else {
      snapViewPanelBack(swipe.panel);
    }
    return;
  }
  if (!swipeGesture || event.pointerId !== swipeGesture.id) return;
  const gesture = swipeGesture;
  swipeGesture = null;
  gesture.wrap.classList.remove("is-dragging");
  if (gesture.axis !== "x") return;
  // Swallow the click this drag would otherwise fire on the card.
  window.__swipeJustSwiped = true;
  setTimeout(() => {
    window.__swipeJustSwiped = false;
  }, 80);
  const width = gesture.card.offsetWidth || 1;
  if (gesture.offset <= -width * SWIPE_FULL_FRACTION) {
    const del = gesture.wrap.querySelector(".swipe-delete-bg");
    if (del?.dataset.action?.startsWith("confirm-delete")) {
      gesture.wrap.classList.remove("is-open");
      gesture.card.style.transform = "";
      gesture.card.style.opacity = "";
      setTimeout(() => del.click(), 90);
      return;
    }
    gesture.card.style.transform = "translateX(-110%)";
    gesture.card.style.opacity = "0";
    setTimeout(() => del?.click(), 190);
    return;
  }
  if (gesture.offset <= -SWIPE_OPEN_TRIGGER) {
    closeAllSwipes(gesture.wrap);
    gesture.wrap.classList.add("is-open");
    gesture.card.style.transform = `translateX(-${SWIPE_REST}px)`;
  } else {
    gesture.wrap.classList.remove("is-open");
    gesture.card.style.transform = "";
  }
}

document.addEventListener("pointerdown", onSwipePointerDown, { passive: true });
document.addEventListener("pointermove", onSwipePointerMove, { passive: false });
document.addEventListener("pointerup", onSwipePointerUp);
document.addEventListener("pointercancel", onSwipePointerUp);
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((registration) => registration.update()).catch(() => {});
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (window.__bitTrackerReloading) return;
    window.__bitTrackerReloading = true;
    window.location.reload();
  });
}
nodes.todayChip.addEventListener("click", () => {
  selectedDate = startOfDay(new Date());
  state.settings.selectedDate = dateKey(selectedDate);
  saveAndRender("Hoy");
});
nodes.openBackup.addEventListener("click", () => {
  if (TRAINING_ONLY) openCloudToolsModal();
  else switchView("review");
});

// ── Self-test suite (open with ?selftest=1) ─────────────────────────────
// Guards the transfer engine against regressions: curve math, coefficient
// matrix, mastery, propagation, gating, cross-modality and reconciliation.
function runDenseSelfTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      results.push({ name, ok: Boolean(fn()) });
    } catch (error) {
      results.push({ name, ok: false, error: String(error) });
    }
  };
  const savedEntries = state.denseTrainingEntries;
  state.denseTrainingEntries = [];
  rebuildTransferState();
  const add = (over) => state.denseTrainingEntries.push({ nature: "bodyweight", bodyweight_kg: 80, effort: "N", ...over });

  test("curva: round-trip pct↔reps", () => Math.abs(densePctForReps("5D", denseRepsForPct("5D", 0.5)) - 0.5) < 0.001);
  test("curva: monótona", () => denseRepsForPct("5D", 0.7) < denseRepsForPct("5D", 0.4));
  test("curva: 2D10 106kg → e1RM≈198", () => Math.abs(106 / densePctForReps("2D", 10) - 198.1) < 1.5);
  test("curva: factor resistencia 2D→20D", () => denseEnduranceFactor("2D", "20D") === 0.78);

  const C = (a, b) => denseTransferCoefficient(denseExerciseById(a), denseExerciseById(b));
  test("coef: pull→chin = 0.8", () => C("pull_up", "chin_up") === 0.8);
  test("coef: pull→bench ≈ 0", () => C("pull_up", "bench_press") < 0.05);
  test("coef: squat↔deadlift = 0.45", () => C("back_squat", "deadlift") === 0.45 && C("deadlift", "back_squat") === 0.45);
  test("coef: FL hold recibe menos que FL pull", () => C("pull_up", "front_lever_tuck") < C("pull_up", "front_lever_tuck_pull"));
  test("coef: movilidad cruzada no transfiere (bridge→side split)", () => C("bridge_push_up", "side_split_iso") === 0 && C("side_split_iso", "bridge_push_up") === 0);
  test("coef: movilidad misma familia sí transfiere", () => C("frog_stretch", "side_split_iso") > 0);
  test("coef: movilidad no toca fuerza ni skills (ambos sentidos)", () => C("jefferson_curl", "deadlift") === 0 && C("deadlift", "straddle_jefferson_curl") === 0 && C("bridge_push_up", "back_lever_tuck_pull") === 0 && C("side_split_squat", "back_squat") === 0);
  test("coef: curl de anillas transfiere a dominadas por bíceps", () => C("ring_biceps_curl_45", "chin_up") > 0.1 && C("ring_biceps_curl_45", "bench_press") < C("ring_triceps_extension_45", "bench_press"));
  test("coef: back lever pull no fuga a empuje pero sí a tirón", () => C("back_lever_tuck_pull", "bench_press") < 0.1 && C("back_lever_tuck_pull", "floor_push_up") < 0.15 && C("back_lever_tuck_pull", "pull_up") > 0.25);
  test("coef: handstand no construye cuelgue (cap familiar)", () => C("straight_handstand", "cuelgue_passive_bilateral") <= 0.12 && C("straight_handstand", "military_press") > 0.3);

  // ROM de movilidad (decoulado del motor de fuerza)
  add({ id: "rom1", exercise_id: "pancake_hold", exercise_name: "Pancake", scheme: "10D", date: "2026-06-01", created_at: "2026-06-01T10:00:00Z", nature: "bodyweight", rom_cm: 20, total_hold_seconds: 30, effort: "E" });
  add({ id: "rom2", exercise_id: "pancake_hold", exercise_name: "Pancake", scheme: "10D", date: "2026-06-10", created_at: "2026-06-10T10:00:00Z", nature: "bodyweight", rom_cm: 14, total_hold_seconds: 30, effort: "N" });
  test("ROM: mejor = el menor cm", () => denseBestRom("pancake_hold") === 14);
  test("ROM: PR = acercarse al suelo", () => denseEntryIsPr(getDenseEntries().find((e) => e.id === "rom2")) && !denseEntryIsPr(getDenseEntries().find((e) => e.id === "rom1")));
  test("ROM: sugerencia se acerca desde la última (normal → -0.5)", () => { const s = denseRomSuggestion(denseExerciseById("pancake_hold")); return s && s.target === 13.5 && s.best === 14; });
  test("ROM: no alimenta el motor (score/transfer intactos)", () => denseEntryScore(getDenseEntries().find((e) => e.id === "rom2")) === 30 && denseParseRom("") === null && denseParseRom("12.5") === 12.5);

  // OAC asistida: el contrapeso se resta del peso corporal
  const oacAssist6 = computeDenseEntry({ id: "oac6", exercise_id: "oac_assisted", nature: "assisted", scheme: "5D1", total_reps: 5, bodyweight_kg: 80, bodyweight_contribution_pct: 100, assist_load_kg: 6 });
  const oacAssist2 = computeDenseEntry({ id: "oac2", exercise_id: "oac_assisted", nature: "assisted", scheme: "5D1", total_reps: 5, bodyweight_kg: 80, bodyweight_contribution_pct: 100, assist_load_kg: 2 });
  test("OAC asistida: carga = bw − contrapeso (80−6 → 74)", () => Math.abs(oacAssist6.total_system_load_kg - 74) < 0.01);
  test("OAC asistida: menos contrapeso = e1RM más alto", () => oacAssist2.e1rm_kg > oacAssist6.e1rm_kg && oacAssist6.e1rm_kg > 0);
  add({ ...oacAssist6, date: "2026-06-15", created_at: "2026-06-15T10:00:00Z", effort: "E" });
  test("OAC asistida: progresión baja el contrapeso", () => { const s = denseProgressionSuggestion(denseExerciseById("oac_assisted"), "normal", "5D1"); return s && s.type === "assist" && Number(s.assistLoadKg) < 6; });


  test("técnica: no-técnico expresa 1", () => denseTechMasteryInfo(denseExerciseById("air_squat")).t === 1);
  test("técnica: skill sin historial 0.35", () => denseTechMasteryInfo(denseExerciseById("front_lever_full")).t === 0.35);

  add({ id: "t1", exercise_id: "pull_up", exercise_name: "Dominadas", scheme: "5D", date: "2026-06-01", created_at: "2026-06-01T10:00:00Z", total_reps: 35, reps_per_min: 7, bodyweight_capacity: 11.7 });
  add({ id: "c1", exercise_id: "chin_up", exercise_name: "Dominada supina", scheme: "5D", date: "2026-06-02", created_at: "2026-06-02T10:00:00Z", total_reps: 33, reps_per_min: 6.6, bodyweight_capacity: 11 });
  add({ id: "t2", exercise_id: "pull_up", exercise_name: "Dominadas", scheme: "5D", date: "2026-06-10", created_at: "2026-06-10T10:00:00Z", total_reps: 40, reps_per_min: 8, bodyweight_capacity: 13.3 });
  rebuildTransferState();
  test("propagación: chin-up recibe boost ≥2%", () => denseTransferBoost("chin_up") >= 0.02);
  test("propagación: bench no recibe nada", () => denseTransferBoost("bench_press") === 0);
  test("gating: FL hold < chin-up", () => denseTransferBoost("front_lever_tuck") < denseTransferBoost("chin_up"));

  const chinBoostBefore = denseTransferBoost("chin_up");
  add({ id: "t3", exercise_id: "pull_up", exercise_name: "Dominadas", scheme: "2D10", date: "2026-06-15", created_at: "2026-06-15T10:00:00Z", nature: "weighted_calisthenics", e1rm_kg: 198, total_reps: 20, reps_per_min: 10 });
  rebuildTransferState();
  test("cross-modalidad: 1ª marca lastrada no propaga (calibración)", () => Math.abs(denseTransferBoost("chin_up") - chinBoostBefore) < 0.001);

  add({ id: "c2", exercise_id: "chin_up", exercise_name: "Dominada supina", scheme: "5D", date: "2026-06-20", created_at: "2026-06-20T10:00:00Z", total_reps: 33.3, reps_per_min: 6.67, bodyweight_capacity: 11.11 });
  rebuildTransferState();
  test("reconciliación: 1ª observación no mueve k", () => !state.transfer.pairK["vertical_pull>vertical_pull"]);
  add({ id: "t4", exercise_id: "pull_up", exercise_name: "Dominadas", scheme: "5D", date: "2026-06-25", created_at: "2026-06-25T10:00:00Z", total_reps: 44, reps_per_min: 8.8, bodyweight_capacity: 14.6 });
  add({ id: "c3", exercise_id: "chin_up", exercise_name: "Dominada supina", scheme: "5D", date: "2026-06-28", created_at: "2026-06-28T10:00:00Z", total_reps: 33.6, reps_per_min: 6.73, bodyweight_capacity: 11.22 });
  rebuildTransferState();
  test("reconciliación: 2ª observación baja k (<1)", () => {
    const k = state.transfer.pairK["vertical_pull>vertical_pull"];
    return k > 0.3 && k < 1;
  });
  test("boost aplicado a estimaciones", () => denseBoosted("chin_up", 100) > 100 || denseTransferBoost("chin_up") === 0);

  // e1RM efectivo: el e1RM sale de la densidad real hecha, no del % nominal.
  const okBench = computeDenseEntry({ id: "e1", exercise_id: "bench_press", nature: "weighted", scheme: "5D5", external_load_kg: 92.8, total_reps: 25 });
  const failBench = computeDenseEntry({ id: "e2", exercise_id: "bench_press", nature: "weighted", scheme: "5D5", external_load_kg: 92.8, total_reps: 15, failed: true, effort: "fallo" });
  test("e1RM efectivo: esquema completado = nominal", () => Math.abs(okBench.e1rm_kg - 92.8 / 0.688) < 0.5);
  test("e1RM efectivo: fallo (15/25 reps) baja e1RM ~13%", () => failBench.e1rm_kg < okBench.e1rm_kg * 0.9 && failBench.e1rm_kg > okBench.e1rm_kg * 0.8);
  test("e1RM efectivo: sin reps registradas cae a nominal", () => Math.abs(computeDenseEntry({ id: "e3", exercise_id: "bench_press", nature: "weighted", scheme: "5D5", external_load_kg: 92.8, total_reps: 0 }).e1rm_kg - 92.8 / 0.688) < 0.5);
  add({ ...failBench, date: "2026-06-29", created_at: "2026-06-29T10:00:00Z" });
  test("fallo lastrado: siguiente carga ≤ lo que tu e1RM real sostiene", () => {
    const s = denseProgressionSuggestion(denseExerciseById("bench_press"), "normal", "5D5");
    return s && s.type === "load" && Number(s.externalLoadKg) <= denseRoundLoad(failBench.e1rm_kg * 0.688);
  });
  // Fase 2: plan v2, modo test, deload y rangos
  test("plan v2: normaliza strings y objetos", () => {
    const a = densePlanItem("pull_up");
    const b = densePlanItem({ exercise_id: "bench_press", is_test: true, scheme: "5D5" });
    return a.exercise_id === "pull_up" && a.source === "manual" && b.is_test === true && b.scheme === "5D5" && densePlanItem(null) === null;
  });
  add({ id: "ft1", exercise_id: "bench_press", exercise_name: "Press banca", nature: "weighted", scheme: "5D5", date: dateKey(today), created_at: new Date().toISOString(), external_load_kg: 90, total_reps: 25, effort: "H", is_test: true, bodyweight_kg: 80 });
  test("test suaviza fatiga: back-off a la mitad", () => {
    const warning = denseGroupFatigueWarning(denseExerciseById("ring_dip"), dateKey(today));
    return warning && Math.abs(warning.reduction - 0.05) < 0.001;
  });
  ["d1", "d2", "d3", "d4"].forEach((id, i) => {
    add({ id, exercise_id: "front_squat", exercise_name: "Front Squat", nature: "weighted", scheme: "5D5", date: "2026-06-0" + (i + 1), created_at: "2026-06-0" + (i + 1) + "T10:00:00Z", external_load_kg: 90, e1rm_kg: 130.8, total_reps: 25, effort: "H", bodyweight_kg: 80 });
  });
  add({ id: "d0", exercise_id: "front_squat", exercise_name: "Front Squat", nature: "weighted", scheme: "5D5", date: "2026-05-01", created_at: "2026-05-01T10:00:00Z", external_load_kg: 100, e1rm_kg: 145.3, total_reps: 25, effort: "N", bodyweight_kg: 80 });
  test("deload: 4 duras sin PR fuerzan bajada", () => {
    const s = denseProgressionSuggestion(denseExerciseById("front_squat"), "normal", "5D5");
    return s && s.deload === true && s.direction === "down" && Number(s.externalLoadKg) < 90;
  });
  test("rango estimado en tarjeta: 5D5 desde 5D10", () => {
    const bench = denseExerciseById("bench_press");
    const saved2 = state.denseTrainingEntries;
    state.denseTrainingEntries = [computeDenseEntry({ id: "r10", exercise_id: "bench_press", nature: "weighted", scheme: "5D10", date: "2026-06-20", created_at: "2026-06-20T10:00:00Z", external_load_kg: 60, total_reps: 50, bodyweight_kg: 80 })];
    const src2 = denseTargetSource(bench, "5D5");
    const range = densePlannedTargetRange(bench, "5D5", src2);
    state.denseTrainingEntries = saved2;
    return src2.kind === "block" && src2.sigma > 0 && /kg/.test(range) && range.includes("–");
  });

  // Levers: la palanca escala capacidad entre progresiones de la misma skill
  add({ id: "lv1", exercise_id: "front_lever_tuck", exercise_name: "FL Tuck", nature: "skill", scheme: "10D", date: "2026-06-20", created_at: "2026-06-20T10:00:00Z", total_hold_seconds: 300, hold_seconds_per_round: 30, isometric_capacity: 90.9, effort: "N" });
  test("levers: tuck 30s estima adv tuck menos y monótono hasta full", () => {
    const hold = (id) => Number(denseFormTargetHoldPerRound(denseExerciseById(id), "10D", null)) || 0;
    const tuck = hold("front_lever_tuck");
    const adv = hold("front_lever_adv_tuck");
    const straddle = hold("front_lever_straddle");
    const full = hold("front_lever_full");
    return adv > 0 && adv < tuck && straddle < adv && full <= straddle && full >= 2;
  });
  test("levers: fuente de la tarjeta = familia (Desde ... palanca)", () => {
    const src3 = denseTargetSource(denseExerciseById("front_lever_straddle"), "10D");
    return src3.kind === "family" && src3.sigma > 0 && /Desde/.test(src3.label);
  });
  test("levers: sugerencia estimada explica la palanca y es test", () => {
    const s = denseEstimatedBodySuggestion(denseExerciseById("front_lever_straddle"), "10D");
    return s && /palanca/.test(s.reason) && s.estimated === true;
  });
  add({ id: "lv2", exercise_id: "front_lever_tuck_pull", exercise_name: "FL Tuck Pull", nature: "bodyweight", scheme: "10D", date: "2026-06-21", created_at: "2026-06-21T10:00:00Z", total_reps: 80, reps_per_min: 8, bodyweight_capacity: 24.2, effort: "N" });
  test("levers: pull dinámico también escala (adv tuck pull < tuck pull)", () => {
    const reps = (id) => Number(denseFormTargetRepsPerSet(denseExerciseById(id), "10D", null)) || 0;
    return reps("front_lever_adv_tuck_pull") > 0 && reps("front_lever_adv_tuck_pull") < reps("front_lever_tuck_pull");
  });

  // Fase 4: la app aprende su propio error (calibración + curva personal)
  [["floor_push_up", 9], ["ring_row", 9], ["air_squat", 8], ["parallel_bar_dip", 7]].forEach(([ex, rpm], i) => {
    add({ id: `cal${i}a`, exercise_id: ex, exercise_name: ex, scheme: "5D", date: `2026-05-1${i}`, created_at: `2026-05-1${i}T10:00:00Z`, total_reps: 30, reps_per_min: 6 });
    add({ id: `cal${i}b`, exercise_id: ex, exercise_name: ex, scheme: "2D", date: `2026-05-2${i}`, created_at: `2026-05-2${i}T10:00:00Z`, target_reps_per_min: 10, reps_per_min: rpm, total_reps: rpm * 2 });
  });
  denseCalibrationCache = null;
  test("calibración: primeras marcas en esquema generan observaciones cross", () => {
    const obs = denseCalibrationObservations().filter((o) => o.kind === "cross");
    return obs.length === 4 && obs.some((o) => Math.abs(o.error - 0.3) < 0.001);
  });
  test("sigma empírica: percentil 80 de TUS errores (0.3, n=4)", () => {
    const emp = denseEmpiricalSigma("estimated");
    return emp && emp.n === 4 && Math.abs(emp.sigma - 0.3) < 0.001;
  });
  test("fuente estimada usa sigma empírica en la tarjeta", () => {
    const src4 = denseTargetSource(denseExerciseById("floor_push_up"), "20D");
    return src4.kind === "estimated" && src4.empirical && src4.empirical.n === 4 && Math.abs(src4.sigma - 0.3) < 0.001;
  });
  add({ ...computeDenseEntry({ id: "cb10", exercise_id: "bench_press", exercise_name: "Press banca", nature: "weighted", scheme: "5D10", external_load_kg: 60, total_reps: 50, bodyweight_kg: 80 }), date: "2026-06-25", created_at: "2026-06-25T10:00:00Z", effort: "N" });
  denseCalibrationCache = null;
  test("curva personal: pendiente positiva aprendida del caso 5D10 vs 5D5", () => {
    const slope = denseCurveSlopeBias("bench_press");
    return slope > 0.08 && slope <= DENSE_CURVE_BIAS_CLAMP;
  });
  test("curva personal: la estimación a pocas reps baja respecto a la ingenua", () => {
    const s = denseEstimatedLoadSuggestion(denseExerciseById("bench_press"), "2D5");
    if (!s) return false;
    const naive = denseBestWeightedE1rmSource("bench_press").e1rm * denseWorkingPct["2D5"];
    return Number(s.externalLoadKg) < roundTo(naive, 1) - 1 && /curva personal/.test(s.reason);
  });

  // Unificación de gemelos con lastre (Dominadas = una sola, modalidad dentro)
  test("alias: weighted_pull_up resuelve a pull_up", () => denseExerciseById("weighted_pull_up").id === "pull_up" && findDenseExerciseById("weighted_pull_up").id === "pull_up");
  test("alias: el gemelo ya no está en el catálogo", () => !denseExerciseCatalog.some((e) => e.id === "weighted_pull_up"));
  test("migración: marca weighted_pull_up se reescribe a pull_up", () => {
    const migrated = denseMigrateUnifiedExercises({ denseTrainingEntries: [{ id: "m1", exercise_id: "weighted_pull_up", nature: "weighted_calisthenics", added_load_kg: 20 }], denseDayPlans: { "2026-07-01": ["weighted_ring_dip"] }, denseExerciseFavorites: ["weighted_pull_up", "pull_up"], denseEstimates: { weighted_pull_up: { e1rm_kg: 150 } } });
    const e = migrated.denseTrainingEntries[0];
    return e.exercise_id === "pull_up" && e.nature === "weighted_calisthenics" && e.added_load_kg === 20 && migrated.denseDayPlans["2026-07-01"][0].exercise_id === "ring_dip" && migrated.denseExerciseFavorites.length === 1 && !migrated.denseEstimates.weighted_pull_up;
  });
  test("estimación de lastre desde historial BW (no queda vacía)", () => {
    add({ ...computeDenseEntry({ id: "bwpu", exercise_id: "pull_up", exercise_name: "Dominadas", nature: "bodyweight", scheme: "5D", total_reps: 60, bodyweight_kg: 80, bodyweight_contribution_pct: 100 }), date: "2026-06-20", created_at: "2026-06-20T10:00:00Z" });
    rebuildDenseEstimates();
    const s = denseEstimatedLoadSuggestion({ ...denseExerciseById("pull_up"), nature: "weighted_calisthenics" }, "5D5");
    return s && s.type === "load" && s.addedLoadKg !== "" && Number(s.addedLoadKg) >= 0;
  });

  // Recovery real: recPct sale de la tendencia de readiness, no de 0 hardcodeado.
  test("recovery: sin baseline previo = 0, y sube ~50% cuando mejora la readiness", () => {
    const mk = (offset, readiness) => add({ exercise_id: "pull_up", date: dateKey(addDays(today, -offset)), readiness });
    // solo la ventana reciente poblada → no hay baseline anterior → 0 (no +100%)
    mk(0, "high"); mk(1, "high"); mk(2, "high");
    const flat = denseRecoveryTrendPct(3);
    // ahora la ventana anterior con peor readiness → la reciente debe subir
    mk(3, "low"); mk(4, "low"); mk(5, "low");
    const up = denseRecoveryTrendPct(3);
    return flat === 0 && up > 0 && Math.abs(up - 50) < 1;
  });

  // Niveles de progresión: dificultad relativa dentro de cada familia (no solo levers)
  add({ id: "nle1", exercise_id: "natural_leg_extension", exercise_name: "Natural Leg Extension", scheme: "5D", date: "2026-06-20", created_at: "2026-06-20T10:00:00Z", total_reps: 75, reps_per_min: 15, bodyweight_capacity: 15 });
  test("niveles: sissy hereda de NLE escalado por dificultad (~46%)", () => {
    const sibling = denseLeverSiblingEstimate(denseExerciseById("sissy_squat"), "bodyweight_capacity");
    const expected = 15 * Math.pow(0.6 / 0.85, DENSE_LEVER_ENDURANCE_EXP);
    return sibling && sibling.from.id === "natural_leg_extension" && Math.abs(sibling.value - expected) < 0.05;
  });
  test("niveles: objetivo sissy < objetivo NLE (mismo esquema)", () => {
    const reps = (id) => Number(denseFormTargetRepsPerSet(denseExerciseById(id), "5D", null)) || 0;
    return reps("sissy_squat") > 0 && reps("sissy_squat") < reps("natural_leg_extension");
  });
  test("niveles: defaults en frío escalan (OAC < archer · 1 mano < bilateral · v-sit < tuck)", () => {
    const rpm = (id) => denseDefaultRpm(denseExerciseById(id), "5D");
    const hold = (id) => Number(denseDefaultHoldPerRound(denseExerciseById(id), "10D")) || 0;
    return (
      rpm("one_arm_chin_up") < rpm("archer_chin_up") &&
      hold("cuelgue_active_one_hand") < hold("cuelgue_passive_bilateral") &&
      hold("v_sit") < hold("l_sit_tuck")
    );
  });
  test("niveles: default monótono en todas las familias niveladas", () => {
    const families = [...new Set(denseExerciseCatalog.filter((item) => denseProgressionLevelOf(item) > 0).map((item) => item.family))];
    return families.every((family) => {
      const members = denseExerciseCatalog.filter((item) => item.family === family && denseProgressionLevelOf(item) > 0);
      return members.every((a) =>
        members.every((b) => denseProgressionLevelOf(a) > denseProgressionLevelOf(b) || denseDefaultRpm(a, "5D") >= denseDefaultRpm(b, "5D")),
      );
    });
  });
  // Inversión de dificultad: manda la hermana de nivel más cercano, no la optimista
  add({ id: "ch1", exercise_id: "cuelgue_active", exercise_name: "Cuelgue activo", scheme: "10D", date: "2026-06-24", created_at: "2026-06-24T10:00:00Z", nature: "skill", total_hold_seconds: 120, hold_seconds_per_round: 12, isometric_capacity: 36 });
  add({ id: "ch2", exercise_id: "cuelgue_passive_one_hand", exercise_name: "Cuelgue pasivo a una mano", scheme: "10D", date: "2026-06-26", created_at: "2026-06-26T10:00:00Z", nature: "skill", total_hold_seconds: 30, hold_seconds_per_round: 3, isometric_capacity: 9, effort: "VH" });
  test("niveles: hermana más cercana manda (activo 1 mano ≤ pasivo 1 mano)", () => {
    const sibling = denseLeverSiblingEstimate(denseExerciseById("cuelgue_active_one_hand"), "isometric_capacity");
    const hold = (id) => Number(denseFormTargetHoldPerRound(denseExerciseById(id), "10D", null)) || 0;
    return sibling && sibling.from.id === "cuelgue_passive_one_hand" && hold("cuelgue_active_one_hand") <= hold("cuelgue_passive_one_hand");
  });
  test("tarjeta test: débil fuera, hermana nivelada fuera, cruzada fuerte dentro", () => {
    const savedTransfer = state.transfer;
    try {
      state.transfer = {
        boosts: {
          front_lever_full: { pct: 0.05, from: [{ name: "Sentadillas sin peso", date: "2026-06-01" }] },
          sissy_squat: { pct: 0.04, from: [{ name: "Natural Leg Extension", date: "2026-06-20" }] },
          military_press: { pct: 0.05, from: [{ name: "Press banca", date: "2026-06-01" }] },
          ring_push_up: { pct: 0.04, from: [{ name: "Flexiones en suelo", date: "2026-06-01" }] },
        },
        events: [],
        pairK: {},
        pendingK: {},
      };
      const suggestions = denseTestSuggestions();
      const ids = suggestions.map((s) => s.exercise.id);
      const ring = suggestions.find((s) => s.exercise.id === "ring_push_up");
      const military = suggestions.find((s) => s.exercise.id === "military_press");
      return (
        ids.includes("military_press") &&
        ids.includes("ring_push_up") &&
        !ids.includes("front_lever_full") &&
        !ids.includes("sissy_squat") &&
        Boolean(ring) && ring.firstTest === true && /–/.test(ring.range || "") &&
        Boolean(military) && !/objetivo -/.test(denseTestSuggestionRow(military))
      );
    } finally {
      state.transfer = savedTransfer;
    }
  });

  // Fase 2: grafo de progresión, asimetría por dificultad y exponente aprendido
  test("grafo: validador sin issues (ids, ciclos, niveles)", () => denseProgressionGraphIssues().length === 0);
  test("grafo: sissy ∥ NLE y cadena L-sit correcta", () => {
    const sissy = denseProgressionLinks(denseExerciseById("sissy_squat"));
    const lsit = denseProgressionLinks(denseExerciseById("l_sit"));
    return (
      sissy.parallel.some((ex) => ex.id === "natural_leg_extension") &&
      lsit.prev.some((ex) => ex.id === "l_sit_one_leg") &&
      lsit.next.some((ex) => ex.id === "l_sit_straddle")
    );
  });
  test("asimetría: subir cuesta (NLE→sissy < sissy→NLE) y skill→barra descuenta", () => {
    return (
      C("natural_leg_extension", "sissy_squat") < C("sissy_squat", "natural_leg_extension") &&
      C("pistol_squat", "deadlift") < C("deadlift", "pistol_squat")
    );
  });
  test("exponente aprendido: pares directos de cuelgue lo empinan (clamp 3.4), sin pares = 2.2", () => {
    denseLevelExpCache = null;
    return (
      Math.abs(denseFamilyEnduranceExp("cuelgue", "isometric_capacity") - 3.4) < 0.01 &&
      denseFamilyEnduranceExp("knee_dominant", "bodyweight_capacity") === DENSE_LEVER_ENDURANCE_EXP
    );
  });

  // S1 Tirón vertical: regresiones niveladas + camino OAC + modalidad asistida
  test("S1: cadena de dominadas nivelada y monótona (escapular→pies→goma→negativa→supina→prona→L)", () => {
    const level = (id) => denseProgressionLevelOf(denseExerciseById(id));
    const chain = ["scapular_pull", "pull_up_feet_assisted", "pull_up_band_assisted", "pull_up_negative", "chin_up", "pull_up", "l_pull_up"];
    return chain.every((id, index) => index === 0 || level(chain[index - 1]) < level(id));
  });
  test("S1: OAC dedos entre negativa y OAC · pull_up admite asistida · jalón cubierto", () => {
    const finger = denseProgressionLevelOf(denseExerciseById("oac_finger_assisted"));
    return (
      finger > denseProgressionLevelOf(denseExerciseById("oac_negative")) &&
      finger < denseProgressionLevelOf(denseExerciseById("one_arm_chin_up")) &&
      denseExerciseById("pull_up").allowedNatures.includes("assisted") &&
      denseTransferCoefficient(denseExerciseById("lat_pulldown"), denseExerciseById("pull_up")) > 0.2
    );
  });
  test("S1: el suelo del factor de dificultad protege el default de pull_up", () => {
    return denseFamilyDifficultyFactor(denseExerciseById("pull_up")) >= 0.25 && denseDefaultRpm(denseExerciseById("pull_up"), "5D") >= 1;
  });

  // Feedback de uso real (13 jul): bridge iso, caps de hold, columna protegida, hitos
  test("bridge isométrico ES isométrico y su objetivo va en segundos capados (≤55s/ronda)", () => {
    const bridge = denseExerciseById("bridge_isometric");
    add({ id: "bi1", exercise_id: "bridge_isometric", exercise_name: "Bridge Isometrico", scheme: "10D", date: "2026-06-27", created_at: "2026-06-27T10:00:00Z", nature: "skill", total_hold_seconds: 300, hold_seconds_per_round: 30, isometric_capacity: 250 });
    const hold = Number(denseFormTargetHoldPerRound(bridge, "2D", null)) || 0;
    return denseIsIsometric(bridge) && hold > 0 && hold <= 55;
  });
  test("columna protegida: jefferson/seated GM sin transferencia entrante (ni de su familia)", () => {
    return (
      C("tiptoe_squat", "jefferson_curl") === 0 &&
      C("cossack_squat", "seated_bent_leg_good_morning") === 0 &&
      C("jefferson_curl", "straddle_jefferson_curl") === 0 &&
      C("jefferson_curl", "deadlift") === 0
    );
  });
  test("strength levels honestos: sin marca no hay tabla; con e1RM va en kg; hitos declarados", () => {
    return (
      denseExerciseLevels(denseExerciseById("sissy_squat"), null).length === 0 &&
      denseExerciseLevels(denseExerciseById("bench_press"), { e1rm_kg: 100 })[1].value.includes("kg") &&
      denseExerciseById("chin_up").milestones.length === 2 &&
      denseExerciseById("jefferson_curl").milestones.length === 2
    );
  });

  state.denseTrainingEntries = savedEntries;
  denseNeighborCache = null;
  rebuildTransferState();
  const passed = results.filter((row) => row.ok).length;
  console.table(results);
  toast(`Self-test motor: ${passed}/${results.length} OK`);
  return { passed, total: results.length, results };
}

if (new URLSearchParams(window.location.search).has("selftest")) {
  setTimeout(() => runDenseSelfTests(), 600);
}

// Temporary: run the app as a training-only tool (habits/panel/review hidden).
// Flip to false to bring the habit tracker back.
const TRAINING_ONLY = true;

// Transfer state is a pure cache: re-derive it from history on every load so
// synced/edited marks can never leave stale boosts behind.
try {
  rebuildTransferState();
} catch (error) {
  console.warn("transfer rebuild failed", error);
}

render();
queueInitialCloudRestore();

function render() {
  let activeView = state.settings.view || "dashboard";
  if (TRAINING_ONLY && activeView !== "training") activeView = "training";
  document.documentElement.classList.toggle("training-only", TRAINING_ONLY);
  document.body.dataset.density = state.settings.uiDensity || "normal";
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${activeView}`);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === activeView);
  });

  nodes.seasonLabel.textContent = TRAINING_ONLY ? "Training" : `BitTracker · ${activeHabits().length} hábitos activos`;
  nodes.todayChip.textContent = formatShortDate(selectedDate);
  document.querySelectorAll("[data-action='toggle-density']").forEach((button) => {
    const compact = (state.settings.uiDensity || "normal") === "compact";
    button.classList.toggle("is-hot", compact);
    button.title = compact ? "Modo normal" : "Modo compacto";
    button.setAttribute("aria-label", button.title);
    button.innerHTML = `<i data-lucide="${compact ? "maximize-2" : "minimize-2"}"></i>`;
  });
  document.querySelectorAll("[data-action='set-density']").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.density === (state.settings.uiDensity || "normal"));
  });

  renderHero();
  renderQuests();
  renderDay();
  renderCalendar();
  renderTrainingCard();
  renderHabitEditor();
  renderHabitAnalytics();
  renderTrainingMode();
  renderMesocycle();
  renderDenseTraining();
  renderTrainingAnalytics();
  renderDensePrs();
  renderLogbook();
  renderReview();
  renderData();
  refreshIcons();
}

function renderHero() {
  const weekDays = rangeDays(addDays(selectedDate, -6), selectedDate);
  const monthDays = rangeDays(addDays(selectedDate, -29), selectedDate);
  const cycleDays = rangeDays(parseDate(state.mesocycle.startDate), addDays(parseDate(state.mesocycle.startDate), 27));
  const xp = totalXp();
  const level = levelFromXp(xp);
  const nextXp = xpForLevel(level + 1);
  const prevXp = xpForLevel(level);
  const xpPct = pct(xp - prevXp, nextXp - prevXp);
  const rank = rankFor(level);
  const avatar = avatarForLevel(level);
  const dailyForm = dailyAvatarForm(selectedDate);
  const streak = currentStreak();

  nodes.heroPanel.innerHTML = `
    <div class="hero-layout">
      <div
        class="avatar-stage avatar-tier-${avatar.tier} daily-form-${dailyForm.id}"
        style="--avatar-primary:${avatar.primary}; --avatar-secondary:${avatar.secondary}; --avatar-glow:${dailyForm.glow}; --daily-color:${dailyForm.color}"
      >
        <span class="rank-badge">${rank} · Lv ${level}</span>
        <span class="daily-form-badge">${escapeHtml(dailyForm.label)}</span>
        <div class="pullup-rig" aria-hidden="true"></div>
        <div class="pixel-aura" aria-hidden="true"></div>
        <div class="daily-pixel-buff" aria-hidden="true"></div>
        <div class="pixel-ranger tier-${avatar.tier}" aria-hidden="true"></div>
        <div class="avatar-plate">
          <strong>${escapeHtml(avatar.title)}</strong>
          <span>${escapeHtml(dailyForm.subtitle)}</span>
        </div>
      </div>
      <div class="hero-stats">
        <div class="score-row">
          ${scoreBox("Ayer", `${scoreForDate(addDays(selectedDate, -1))}%`, "history")}
          ${scoreBox("Semana", `${averageScore(weekDays)}%`, "calendar-days")}
          ${scoreBox("Mes", `${averageScore(monthDays)}%`, "calendar-range")}
          ${scoreBox("Racha", `${streak}d`, "flame")}
        </div>
        <div class="xp-meter">
          <div class="xp-label"><span>${xp} XP acumulado</span><span>${nextXp - xp} XP para Lv ${level + 1}</span></div>
          <div class="meter"><span style="--value:${xpPct}%; --meter-color: var(--green)"></span></div>
        </div>
        <div class="stat-bars">
          ${statCatalog.map((stat) => statRow(stat, monthDays)).join("")}
        </div>
        <div class="evolution-track">
          ${avatarEvolution(level)
            .map(
              (stage) => `
                <div class="evolution-node ${stage.current ? "is-current" : ""} ${stage.unlocked ? "is-unlocked" : ""}">
                  <span>${stage.level}</span>
                  <strong>${escapeHtml(stage.name)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
        <div class="section-meta">BitTracker local · hábitos, marcas reales y progresión por ejercicio.</div>
      </div>
    </div>
  `;
}

function renderQuests() {
  const key = dateKey(selectedDate);
  const day = state.dayNotes[key] || {};
  const amDone = habitDone(key, "train-am") || habitDone(key, "work-am");
  const quests = [
    {
      label: "Arranque 07:00",
      detail: habitDone(key, "wake") ? "El día empezó con ventaja." : "Levantar el ancla de verano.",
      icon: "sunrise",
      color: "#79aaff",
      done: habitDone(key, "wake"),
      reward: "+18",
    },
    {
      label: "Primer bloque",
      detail: amDone ? "Entreno o trabajo pronto: cumplido." : "Elegir: hierro primero o deep work.",
      icon: "route",
      color: "#e4af54",
      done: amDone,
      reward: "+24",
    },
    {
      label: "FROG",
      detail: day.frogTask ? day.frogTask : "La tarea dura todavía necesita nombre.",
      icon: "target",
      color: "#57c6a1",
      done: habitDone(key, "frog"),
      reward: "+30",
    },
    {
      label: "Casa sin pantalla",
      detail: habitDone(key, "family") ? "2h presentes, móvil fuera." : "Calidad familiar como cierre del día.",
      icon: "heart-handshake",
      color: "#ffd166",
      done: habitDone(key, "family"),
      reward: "+28",
    },
  ];

  nodes.questPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Misiones</p>
        <h2>${formatLongDate(selectedDate)}</h2>
      </div>
      <button class="icon-button" type="button" data-action="open-day-note" title="Notas del día" aria-label="Notas del día">
        <i data-lucide="notebook-pen"></i>
      </button>
    </div>
    <div class="quest-stack">
      ${quests
        .map(
          (quest) => `
            <article class="quest-box" style="--item-color:${quest.color}">
              <div class="quest-icon"><i data-lucide="${quest.icon}"></i></div>
              <div>
                <h3>${escapeHtml(quest.label)}</h3>
                <p>${escapeHtml(quest.detail)}</p>
              </div>
              <span class="mini-tag ${quest.done ? "is-green" : "is-amber"}">
                <i data-lucide="${quest.done ? "check" : "sparkles"}"></i>${quest.done ? "done" : quest.reward}
              </span>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderDay() {
  const key = dateKey(selectedDate);
  const day = state.dayNotes[key] || {};

  nodes.dayPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Ritual diario</p>
        <h2>${formatShortDate(selectedDate)}</h2>
        <span class="section-meta">${day.energy ? `Energía ${day.energy}/5` : "Sin energía registrada"} · ${scoreForDate(selectedDate)}% del día</span>
      </div>
      <div class="date-nav">
        <button class="icon-button" type="button" data-action="shift-day" data-shift="-1" title="Día anterior" aria-label="Día anterior"><i data-lucide="chevron-left"></i></button>
        <button class="date-chip" type="button" data-action="go-today">Hoy</button>
        <button class="icon-button" type="button" data-action="shift-day" data-shift="1" title="Día siguiente" aria-label="Día siguiente"><i data-lucide="chevron-right"></i></button>
        <button class="icon-button is-danger" type="button" data-action="reset-day" title="Reiniciar día" aria-label="Reiniciar día"><i data-lucide="rotate-ccw"></i></button>
      </div>
    </div>
    <div class="ritual-grid">
      ${activeHabits()
        .map((habit) => {
          const entry = getHabitEntry(key, habit.id);
          const done = Boolean(entry.done);
          return `
            <article class="ritual-card ${done ? "is-done" : ""}" style="--item-color:${habit.color}">
              <div class="habit-icon"><i data-lucide="${habit.icon}"></i></div>
              <div>
                <h3>${escapeHtml(habit.name)}</h3>
                <p>${escapeHtml(done ? doneCopy(entry.quality) : habit.target)}</p>
                <div class="quality-row">
                  ${qualityCatalog
                    .map(
                      (quality) => `
                        <button
                          class="quality-button ${entry.quality === quality.id ? "is-active" : ""}"
                          type="button"
                          data-action="set-quality"
                          data-habit="${habit.id}"
                          data-quality="${quality.id}"
                          style="--item-color:${habit.color}"
                        >${quality.label}</button>
                      `,
                    )
                    .join("")}
                </div>
              </div>
              <button
                class="check-button"
                type="button"
                data-action="toggle-habit"
                data-habit="${habit.id}"
                aria-pressed="${done}"
                style="--item-color:${habit.color}"
                title="${done ? "Quitar" : "Completar"} ${escapeAttr(habit.name)}"
                aria-label="${done ? "Quitar" : "Completar"} ${escapeAttr(habit.name)}"
              >
                <i data-lucide="${done ? "check" : "plus"}"></i>
              </button>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderCalendar() {
  const anchor = parseDate(state.settings.calendarAnchor || monthKey(selectedDate));
  const days = monthGridDays(anchor);
  const key = dateKey(selectedDate);
  const monthHabits = activeHabits();
  const monthDates = rangeDays(monthStart(anchor), monthEnd(anchor));
  const monthScore = averageScore(monthDates);

  nodes.calendarPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Mapa de campaña</p>
        <h2>${formatMonth(anchor)} · ${monthScore}% mes</h2>
        <span class="section-meta">${formatLongDate(selectedDate)} · ${scoreForDate(selectedDate)}% seleccionado</span>
      </div>
      <div class="inline-actions">
        <button class="icon-button" type="button" data-action="shift-calendar-month" data-shift="-1" title="Mes anterior" aria-label="Mes anterior"><i data-lucide="chevron-left"></i></button>
        <button class="date-chip" type="button" data-action="calendar-today">Hoy</button>
        <button class="icon-button" type="button" data-action="shift-calendar-month" data-shift="1" title="Mes siguiente" aria-label="Mes siguiente"><i data-lucide="chevron-right"></i></button>
      </div>
    </div>
    <div class="calendar-scroll">
      <div class="calendar-grid">
        <div class="cal-head"></div>
        ${days
          .map(
            (day) => `
              <button
                class="cal-head cal-day-button ${sameMonth(day, anchor) ? "" : "is-outside"} ${dateKey(day) === key ? "is-selected" : ""}"
                type="button"
                data-action="select-calendar-date"
                data-date="${dateKey(day)}"
                title="${escapeAttr(formatLongDate(day))}"
              >${day.getDate()}</button>
            `,
          )
          .join("")}
        ${monthHabits
          .map(
            (habit) => `
              <div class="cal-label" style="--item-color:${habit.color}">
                <i data-lucide="${habit.icon}"></i><span>${escapeHtml(habit.name)}</span>
              </div>
              ${days.map((day) => calendarCell(day, habit, anchor)).join("")}
            `,
          )
          .join("")}
      </div>
    </div>
    <div class="calendar-legend">
      <span><i class="legend-dot done"></i>hecho</span>
      <span><i class="legend-dot heroic"></i>heroico</span>
      <span><i class="legend-dot missed"></i>fallo</span>
      <span><i class="legend-dot selected"></i>${key}</span>
    </div>
  `;
}

function renderTrainingCard() {
  const summary = denseDaySummary(dateKey(selectedDate));
  const latest = latestDenseEntry();
  const prCount = densePrRows().length;
  const latestLine = latest
    ? `${latest.exercise_name} · ${latest.scheme} · ${denseEntryValue(latest)}`
    : "Elige ejercicio, esquema y guarda la primera marca real.";

  nodes.trainingCardPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Training</p>
        <h2>Marcas reales</h2>
        <span class="section-meta">${escapeHtml(latestLine)}</span>
      </div>
      <button class="text-button is-hot" type="button" data-action="switch-view" data-view="training">
        <i data-lucide="arrow-right"></i>Entrar
      </button>
    </div>
    <div class="training-card">
      <div class="training-split">
        ${trainingMetric("Hoy", `${summary.count}`, "clipboard-check")}
        ${trainingMetric("PRs", `${prCount}`, "trophy")}
        ${trainingMetric("Reps", `${summary.totalReps}`, "activity")}
      </div>
      <div class="xp-meter">
        <div class="xp-label"><span>${summary.count ? "Día registrado en entrenamiento" : "Sin marcas Dense en el día seleccionado"}</span><span>${summary.count ? `${Math.min(100, summary.count * 25)}%` : "0%"}</span></div>
        <div class="meter"><span style="--value:${Math.min(100, summary.count * 25)}%; --meter-color: var(--cyan)"></span></div>
      </div>
    </div>
  `;
}

function renderHabitEditor() {
  nodes.habitEditorPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Habit cockpit</p>
        <h2>Reglas del sistema</h2>
      </div>
      <button class="text-button is-hot" type="button" data-action="open-habit-modal" data-id="new">
        <i data-lucide="plus"></i>Hábito
      </button>
    </div>
    <div class="habit-editor-list">
      ${state.habits
        .map((habit) => {
          const month = rangeDays(addDays(selectedDate, -29), selectedDate);
          const completed = countHabit(habit.id, month);
          const active = month.filter((day) => state.records[dateKey(day)]).length || 1;
          return `
            <article class="habit-editor-card" style="--item-color:${habit.color}; opacity:${habit.archived ? 0.48 : 1}">
              <div class="tiny-icon"><i data-lucide="${habit.icon}"></i></div>
              <div class="habit-title">
                <div>
                  <strong>${escapeHtml(habit.name)}</strong>
                  <span>${escapeHtml(habit.detail)}</span>
                </div>
              </div>
              <div class="habit-state">
                <span class="mini-tag ${habit.core ? "is-green" : ""}">${habit.core ? "core" : "extra"}</span>
                <span class="mini-tag">${Math.round((completed / active) * 100)}%</span>
                <button class="icon-button" type="button" data-action="open-habit-modal" data-id="${habit.id}" title="Editar" aria-label="Editar ${escapeAttr(habit.name)}"><i data-lucide="settings-2"></i></button>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderHabitAnalytics() {
  const month = rangeDays(addDays(selectedDate, -29), selectedDate);
  const hardest = [...activeHabits()].sort((a, b) => countHabit(a.id, month) - countHabit(b.id, month))[0];
  const strongest = [...activeHabits()].sort((a, b) => countHabit(b.id, month) - countHabit(a.id, month))[0];
  const coreScore = averageCoreScore(month);

  nodes.habitAnalyticsPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Analítica</p>
        <h2>Señales del mes</h2>
      </div>
    </div>
    <div class="analytics-grid">
      ${reviewCard("Core", `${coreScore}%`, "shield-check", "Promedio de hábitos no negociables")}
      ${reviewCard("Más sólido", strongest?.name || "n/a", strongest?.icon || "star", strongest ? `${countHabit(strongest.id, month)} checks` : "")}
      ${reviewCard("Cuello", hardest?.name || "n/a", hardest?.icon || "wrench", hardest ? `${countHabit(hardest.id, month)} checks` : "")}
      ${reviewCard("AM", amScore(month) + "%", "sunrise", "07:00 + primer bloque")}
    </div>
  `;
}

function renderTrainingMode() {
  // Guard against a stale saved section (e.g. the removed "icons" tab).
  const savedMode = state.settings.trainingMode || "workout";
  const activeMode = trainingModeTabs.some(([mode]) => mode === savedMode) ? savedMode : "workout";
  document.querySelectorAll("[data-training-section]").forEach((section) => {
    section.classList.toggle("is-hidden", section.dataset.trainingSection !== activeMode);
  });
  if (!nodes.trainingModePanel) return;
  nodes.trainingModePanel.innerHTML = `
    <nav class="training-mode-tabs" aria-label="Training sections">
      ${trainingModeTabs
        .map(
          ([mode, label, icon]) => `
            <button class="training-mode-tab ${activeMode === mode ? "is-active" : ""}" type="button" data-action="set-training-mode" data-mode="${mode}">
              <i data-lucide="${icon}"></i>
              <span>${label}</span>
            </button>
          `,
        )
        .join("")}
    </nav>
  `;
}

// Total tonnage moved per calendar day (bodyweight counts via contribution %).
function denseTonnageByDate() {
  const map = {};
  getDenseEntries().forEach((entry) => {
    if (!entry.date) return;
    map[entry.date] = (map[entry.date] || 0) + (Number(entry.tonnage_kg) || 0);
  });
  return map;
}

// Rolling daily tonnage goal: average of your recent real training days, so the
// bar reads "did I move a typical solid day's load" and self-adjusts as you grow.
function denseTonnageGoal(excludeDate) {
  const map = denseTonnageByDate();
  const recent = Object.entries(map)
    .filter(([day, tonnage]) => tonnage > 0 && day !== excludeDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 10)
    .map(([, tonnage]) => tonnage);
  if (!recent.length) return 0;
  return Math.round(recent.reduce((sum, tonnage) => sum + tonnage, 0) / recent.length);
}

// Which movement groups were taken to failure this week (dense wants ~1 failure
// test per pattern per week — enough to calibrate without grinding).
function denseWeeklyFailureStatus(weekDayKeys) {
  const status = { push: false, pull: false, legs: false };
  getDenseEntries().forEach((entry) => {
    if (!weekDayKeys.includes(entry.date)) return;
    if (!(entry.failed || entry.effort === "fallo")) return;
    denseGroupKeys(denseExerciseById(entry.exercise_id)).forEach((group) => {
      if (group in status) status[group] = true;
    });
  });
  return status;
}

// Weekly test nudges: every boosted-but-unverified exercise, most-boosted
// first. The card shows the top one and folds the rest into a dropdown so a
// pending test never scrolls out of reach when the ranking shifts.
// Strongest transfer coefficient between the boost's sources and the target.
// Sources come from the event log (ids) plus the slot's `from` names; a boost
// accumulated only from weak drips (c < DENSE_TEST_MIN_PAIR_C) is real for
// estimates but not worth burning a test session on.
function denseTestSourceStrength(exercise, slot) {
  const sourceIds = new Set(
    (state.transfer?.events || [])
      .filter((event) => event.target === exercise.id || (event.family && event.family === exercise.family))
      .map((event) => event.source),
  );
  (slot?.from || []).forEach((from) => {
    const source = denseExerciseCatalog.find((item) => item.name === from.name);
    if (source) sourceIds.add(source.id);
  });
  let max = 0;
  let crossMax = 0;
  sourceIds.forEach((sourceId) => {
    const source = denseExerciseById(sourceId);
    if (!source || source.id === exercise.id) return;
    const c = denseTransferCoefficient(source, exercise);
    max = Math.max(max, c);
    if (!source.family || source.family !== exercise.family) crossMax = Math.max(crossMax, c);
  });
  return { max, crossMax };
}

function denseTestSuggestions() {
  const suggestions = Object.entries(state.transfer?.boosts || {})
    .map(([id, slot]) => {
      const exercise = denseExerciseById(id);
      if (!exercise || !(slot?.pct >= 0.03)) return null;
      const strength = denseTestSourceStrength(exercise, slot);
      // A leveled exercise boosted only by its own family carries no test-worthy
      // news: the deterministic sibling estimate already tracks that progress.
      // It needs a strong CROSS-family source to justify burning a session.
      const gate = denseProgressionLevelOf(exercise) > 0 ? strength.crossMax : strength.max;
      if (gate < DENSE_TEST_MIN_PAIR_C) return null;
      const last = [...getDenseEntries()]
        .filter((entry) => entry.exercise_id === id)
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
      const days = last ? Math.round((today.getTime() - parseDate(last.date).getTime()) / 86400000) : 999;
      if (days < 14) return null;
      const scheme = denseDefaultScheme(exercise);
      return {
        exercise,
        pct: slot.pct,
        days,
        from: slot.from?.[0]?.name || "",
        scheme,
        target: densePlannedTargetValue(exercise, scheme),
        // First direct test of an estimated exercise: surface the range and
        // tell the user to start from its low end, not the central estimate.
        firstTest: !last,
        range: densePlannedTargetRange(exercise, scheme),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct);
  // One suggestion per family (highest boost wins) — four hang variants at
  // once is noise, not a plan.
  const seenFamilies = new Set();
  return suggestions.filter((item) => {
    const key = item.exercise.family || item.exercise.id;
    if (seenFamilies.has(key)) return false;
    seenFamilies.add(key);
    return true;
  });
}

function denseTestSuggestion() {
  return denseTestSuggestions()[0] || null;
}

function denseTestSuggestionRow(suggestion, { lead = false } = {}) {
  const daysLabel = suggestion.days >= 999 ? "sin test directo" : `${suggestion.days}d sin test`;
  const title = `${lead ? "Testea esta semana: " : ""}${suggestion.exercise.name} · ${suggestion.scheme}`;
  return `
    <div class="test-suggestion-card">
      <span class="tiny-icon"><i data-lucide="flask-conical"></i></span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>Estimación +${roundTo(suggestion.pct * 100, 1)}%${suggestion.from ? ` por transferencia de ${escapeHtml(suggestion.from)}` : ""} sin verificar${(() => {
          if (suggestion.firstTest && suggestion.range) return ` · objetivo ${escapeHtml(suggestion.range)} (primer test: empieza por abajo)`;
          return suggestion.target && suggestion.target !== "-" ? ` · objetivo ${escapeHtml(suggestion.target)}` : "";
        })()} · ${daysLabel}</span>
      </div>
      <button class="dc-badge calibration-add" type="button" data-action="add-planned-exercise" data-exercise="${escapeAttr(suggestion.exercise.id)}" data-test="1" data-scheme="${escapeAttr(suggestion.scheme)}">+ hoy</button>
    </div>
  `;
}

function renderTestSuggestionCard() {
  const suggestions = denseTestSuggestions();
  if (!suggestions.length) return "";
  const [top, ...rest] = suggestions;
  return `
    ${denseTestSuggestionRow(top, { lead: true })}
    ${
      rest.length
        ? `<details class="test-suggestion-extra">
            <summary class="text-button"><i data-lucide="list-checks"></i>Ver ${rest.length} test${rest.length === 1 ? "" : "s"} pendiente${rest.length === 1 ? "" : "s"} más por prioridad</summary>
            ${rest.map((suggestion) => denseTestSuggestionRow(suggestion)).join("")}
          </details>`
        : ""
    }
  `;
}

// Equivalent sets per movement group across the given week — the day summary
// headline (audit #3): pattern balance drives decisions, global tonnage does not.
function denseWeekPatternSets(weekDayKeys) {
  const acc = { push: 0, pull: 0, legs: 0 };
  getDenseEntries().forEach((entry) => {
    if (!weekDayKeys.includes(entry.date)) return;
    const sets = denseEquivalentSets(entry);
    denseGroupKeys(denseExerciseById(entry.exercise_id)).forEach((group) => {
      if (group in acc) acc[group] += sets;
    });
  });
  return acc;
}

function densePatternSplitHtml(weekDayKeys) {
  const sets = denseWeekPatternSets(weekDayKeys);
  const max = Math.max(sets.push, sets.pull, sets.legs, 1);
  const cells = [
    ["push", "Empuje"],
    ["pull", "Tirón"],
    ["legs", "Pierna"],
  ]
    .map(([key, label]) => {
      const value = roundTo(sets[key], 1);
      return `<div class="pattern-split" style="--item-color:${denseCategoryColor(key === "legs" ? "legs" : key)}">
        <div class="pattern-split-bar"><i style="width:${Math.max(4, (sets[key] / max) * 100)}%"></i></div>
        <span>${label}</span><b>${value}</b>
      </div>`;
    })
    .join("");
  return `<div class="pattern-split-row">${cells}</div>`;
}

function renderWeeklyFailureCard(weekDayKeys, isCurrentWeek) {
  const status = denseWeeklyFailureStatus(weekDayKeys);
  const groups = [
    ["push", "Empuje"],
    ["pull", "Tirón"],
    ["legs", "Pierna"],
  ];
  const pending = groups.filter(([key]) => !status[key]).length;
  const headNote = pending === 0 ? "completado" : isCurrentWeek ? `${pending} por retar` : `${pending} sin fallo`;
  return `
    <div class="weekly-failure-card ${pending === 0 ? "is-complete" : ""}">
      <div class="weekly-failure-head">
        <span><i data-lucide="target"></i>Fallo semanal</span>
        <small>${headNote}</small>
      </div>
      <div class="weekly-failure-grid">
        ${groups
          .map(
            ([key, label]) => `
              <button class="failure-chip ${status[key] ? "is-done" : "is-pending"}" type="button" data-action="open-failure-set-picker" data-group="${key}" title="${status[key] ? "Añadir otro set al fallo de" : "Registrar set al fallo de"} ${escapeAttr(label)}">
                <i data-lucide="${status[key] ? "check" : "flame"}"></i>${escapeHtml(label)}
              </button>`,
          )
          .join("")}
      </div>
    </div>
  `;
}

const denseFailureGroupLabels = { push: "Empuje", pull: "Tirón", legs: "Pierna" };

// Featured basics per movement group for a quick "set to failure": the moves
// that make sense to push to failure (dynamic, compound). Anything else in the
// group still appears below, sorted by how often you use it.
const denseFailureFeatured = {
  push: ["parallel_bar_dip", "ring_dip", "floor_push_up", "ring_push_up", "pike_push_up", "bench_press"],
  pull: ["pull_up", "chin_up", "ring_row"],
  legs: ["pistol_squat", "air_squat", "bulgarian_split_squat", "cossack_squat", "back_squat"],
};

function denseFailureSetCandidates(group) {
  const featured = (denseFailureFeatured[group] || []).map((id) => denseExerciseById(id)).filter(Boolean);
  const featuredIds = new Set(featured.map((exercise) => exercise.id));
  const rest = denseExerciseCatalog
    .filter(
      (exercise) =>
        !featuredIds.has(exercise.id) &&
        !denseIsIsometric(exercise) &&
        exercise.nature !== "skill" &&
        exercise.category !== "mobility" &&
        exercise.category !== "skills" &&
        !denseProgressionFamilies.has(exercise.family) &&
        denseGroupKeys(exercise).includes(group),
    )
    .sort((a, b) => denseExerciseStats(b.id).count - denseExerciseStats(a.id).count || a.name.localeCompare(b.name));
  return [...featured, ...rest].slice(0, 10);
}

// Fire chip → pick a basic for that pattern → the set form opens pre-set as a
// failure set (effort "fallo", capacity-based rep target). "Aquí va mi set al
// fallo de la semana" in three taps.
function openFailureSetPicker(group) {
  const candidates = denseFailureSetCandidates(group);
  const label = denseFailureGroupLabels[group] || group;
  nodes.modalCard.dataset.modalKind = "failure-set-picker";
  nodes.modalEyebrow.textContent = "Set al fallo";
  nodes.modalTitle.textContent = `Fallo semanal · ${label}`;
  nodes.modalBody.innerHTML = `
    <div class="failure-set-picker">
      <p class="tiny-copy">Elige un básico de ${escapeHtml(label.toLowerCase())} para tu set al fallo de la semana. Después eliges los minutos según tu tiempo y BitTracker te propone las reps objetivo estimadas.</p>
      <div class="exercise-picker-list">
        ${candidates.length ? candidates.map((exercise) => denseExercisePickCard(exercise, "", "pick-failure-exercise")).join("") : '<article class="exercise-pick-empty">No hay básicos de este patrón todavía.</article>'}
      </div>
    </div>
  `;
  openModal();
}

// The exercise stack for a single day (logged + planned + add). Used to build the
// prev/current/next slides of the day carousel.
function daySlideContent(date) {
  const key = dateKey(date);
  const entries = denseEntriesForDate(key).sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  const planned = plannedExercisesForDate(date);
  const loggedCounts = {};
  entries.forEach((entry) => {
    loggedCounts[entry.exercise_id] = (loggedCounts[entry.exercise_id] || 0) + 1;
  });
  const fulfilledCounts = {};
  const visiblePlanned = planned.filter((exercise) => {
    const logged = loggedCounts[exercise.id] || 0;
    const used = fulfilledCounts[exercise.id] || 0;
    if (used < logged) {
      fulfilledCounts[exercise.id] = used + 1;
      return false;
    }
    return true;
  });
  return `${entries.map((entry) => todayWorkoutCard(entry)).join("")}${visiblePlanned.map((exercise) => plannedWorkoutCard(exercise)).join("")}${addWorkoutCard()}`;
}

function renderMesocycle() {
  const entries = denseEntriesForDate(dateKey(selectedDate)).sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  const weekDays = trainingWeekDays(selectedDate);
  const weekIndex = Math.min(52, trainingWeekIndex(selectedDate));
  const currentWeekIndex = Math.min(52, trainingWeekIndex(today));
  const isCurrentWeek = selectedDate.getFullYear() === today.getFullYear() && weekIndex === currentWeekIndex;
  const planned = plannedExercisesForDate(selectedDate);
  const loggedCounts = {};
  entries.forEach((entry) => {
    loggedCounts[entry.exercise_id] = (loggedCounts[entry.exercise_id] || 0) + 1;
  });
  const fulfilledCounts = {};
  const visiblePlanned = planned.filter((exercise) => {
    const logged = loggedCounts[exercise.id] || 0;
    const used = fulfilledCounts[exercise.id] || 0;
    if (used < logged) {
      fulfilledCounts[exercise.id] = used + 1;
      return false;
    }
    return true;
  });
  const totalReps = entries.reduce((sum, entry) => sum + (entry.total_reps || 0), 0);
  const volume = entries.reduce((sum, entry) => sum + (entry.tonnage_kg || 0), 0);
  const blocks = entries.reduce((sum, entry) => sum + denseEquivalentSets(entry), 0);
  const totalMinutes = entries.reduce((sum, entry) => sum + (Number(entry.duration_minutes) || 0), 0);
  const totalHold = entries.reduce((sum, entry) => sum + (Number(entry.total_hold_seconds) || 0), 0);
  const tonnageGoal = denseTonnageGoal(dateKey(selectedDate));
  const dayNumber = ((selectedDate.getDay() + 6) % 7) + 1;
  const tonnageLabel = entries.length
    ? tonnageGoal
      ? `${roundTo(volume / 1000, 1)} / ${roundTo(tonnageGoal / 1000, 1)} T`
      : `${roundTo(volume / 1000, 1)} T`
    : planned.length
      ? "PLANNED"
      : "EMPTY";
  const statusTone = entries.length ? "is-green" : planned.length ? "is-amber" : "";
  const weekDayKeys = weekDays.map((day) => dateKey(day));
  nodes.mesocyclePanel.innerHTML = `
    <div class="workout-widget-stack">
      <section class="workout-widget workout-summary-card" aria-label="Resumen del día">
        <div class="workout-day-head">
          <h2 class="workout-day-title">${capitalize(formatWeekday(selectedDate))} <span>${formatMonthDay(selectedDate)}</span></h2>
          <div class="workout-day-badges">
            <span class="workout-score"><strong>${entries.length}</strong><small>sets</small></span>
            <button class="icon-button" type="button" data-action="go-today" title="Hoy" aria-label="Hoy"><i data-lucide="calendar-clock"></i></button>
            <button class="icon-button" type="button" data-action="open-quick-timer" title="Tools" aria-label="Tools"><i data-lucide="timer"></i></button>
          </div>
        </div>

        <div class="week-viewer-widget">
          <div class="week-selector-row">
            <button class="week-edge-button" type="button" data-action="shift-day" data-shift="-7" title="Semana anterior" aria-label="Semana anterior">
              <i data-lucide="chevron-left"></i>
            </button>
            <details class="week-selector">
              <summary class="week-chip">
                <i data-lucide="calendar-days"></i>
                <span>
                  <strong>Week ${weekIndex} of 52</strong>
                  <em>${isCurrentWeek ? "CURRENT" : selectedDate.getFullYear()}</em>
                </span>
              </summary>
              <div class="week-menu">
                ${yearWeekOptions(weekIndex, currentWeekIndex)}
              </div>
            </details>
            <button class="week-edge-button" type="button" data-action="shift-day" data-shift="7" title="Semana siguiente" aria-label="Semana siguiente">
              <i data-lucide="chevron-right"></i>
            </button>
          </div>
          <div class="weekday-strip">
            ${weekDays.map((day) => workoutDayButton(day)).join("")}
          </div>
        </div>

        <div class="workout-progress">
          <div class="workout-progress-head">
            <span class="workout-progress-label"><i data-lucide="${entries.length ? "scale" : planned.length ? "clipboard-list" : "calendar-plus"}"></i>Patrones · semana · Day ${dayNumber}</span>
            <span class="workout-progress-time ${statusTone}">${tonnageLabel}</span>
          </div>
          ${densePatternSplitHtml(weekDayKeys)}
        </div>

        <div class="workout-metric-row">
          ${workoutSummaryMetric(totalReps || "-", "reps")}
          ${workoutSummaryMetric(roundTo(blocks, 1), "blocks")}
          ${workoutSummaryMetric(totalHold ? `${totalHold}s` : "-", "tut")}
        </div>

        ${renderWeeklyFailureCard(weekDayKeys, isCurrentWeek)}
        ${renderTestSuggestionCard()}
      </section>

      <div class="day-carousel" data-day-carousel>
        <div class="day-carousel-track">
          <div class="day-slide is-prev">${daySlideContent(addDays(selectedDate, -1))}</div>
          <div class="day-slide">${daySlideContent(selectedDate)}</div>
          <div class="day-slide is-next">${daySlideContent(addDays(selectedDate, 1))}</div>
        </div>
      </div>
    </div>
  `;
}

function renderSession() {
  if (!nodes.sessionPanel) return;
  const selected = denseExerciseById(state.settings.denseSelectedExerciseId || "pull_up");
  const schemes = denseAllowedSchemes(selected);
  const stats = denseExerciseStats(selected.id);
  const suggestion = denseProgressionSuggestion(selected);

  nodes.sessionPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Siguiente registro</p>
        <h2>${escapeHtml(selected.name)}</h2>
        <span class="section-meta">${escapeHtml(denseCategoryLabel(selected.category))} · ${stats.count ? `${stats.count} marcas previas` : "sin histórico todavía"}</span>
      </div>
    </div>
    <div class="selected-exercise-panel" style="--item-color:${denseCategoryColor(selected.category)}">
      <span class="tiny-icon"><i data-lucide="${selected.icon || "dumbbell"}"></i></span>
      <div>
        <strong>${escapeHtml(selected.name)}</strong>
        <span>${escapeHtml(denseNatureLabel(selected.nature))} · ${schemes.length} esquemas disponibles</span>
      </div>
      <button class="text-button" type="button" data-action="focus-dense-register"><i data-lucide="edit-3"></i>Registrar</button>
    </div>
    ${renderDenseProgressionSuggestion(selected, suggestion)}
  `;
}

// The old inline "register" panel is gone — all logging happens through the
// set modal now. Kept as a guarded no-op so its (harmless) callers don't break.
function renderDenseTraining() {
  if (nodes.denseTrainingPanel) nodes.denseTrainingPanel.innerHTML = "";
}

function denseReadinessField(selected = "normal") {
  return `
    <fieldset class="readiness-field">
      <legend>¿Cómo estás hoy?</legend>
      <div class="readiness-grid">
        ${denseReadinessLevels
          .map(
            ([value, label]) => `
              <label class="readiness-option ${selected === value ? "is-selected" : ""}" data-readiness="${value}">
                <input type="radio" name="readiness" value="${value}" ${selected === value ? "checked" : ""} />
                <span>${escapeHtml(label)}</span>
              </label>`,
          )
          .join("")}
      </div>
    </fieldset>
  `;
}

function denseTestToggleHtml() {
  return `<label class="transfer-note dense-test-toggle"><input type="checkbox" name="isTest" checked /><i data-lucide="flask-conical"></i><span>Sesión test: el objetivo es estimado. Explóralo — si no sale, recalibra sin penalizar tu semana.</span></label>`;
}

function denseTrainingFormMarkup(defaults, { includePicker = false, modal = false, submitLabel = "Guardar marca Dense" } = {}) {
  const exercise = denseExerciseById(defaults.exerciseId);
  // The chosen modality drives which fields (reps / hold / load) and schemes
  // appear. `activeExercise` is a shallow clone with that nature so every
  // helper below reflects the selection without special-casing.
  const allowedNatures = exercise.allowedNatures?.length ? exercise.allowedNatures : [exercise.nature];
  const nature = defaults.nature && allowedNatures.includes(defaults.nature) ? defaults.nature : exercise.nature;
  const activeExercise = { ...exercise, nature };
  const allowedSchemes = denseAllowedSchemes(activeExercise);
  const readiness = defaults.readiness || "normal";
  const suggestion = denseProgressionSuggestion(activeExercise, readiness, defaults.scheme);
  return `
    <form id="denseTrainingForm" class="dense-training-form ${modal ? "is-modal-form" : ""}">
      ${includePicker ? denseExercisePicker(defaults) : ""}
      ${modal ? denseSetModalSummary(activeExercise, defaults) : ""}
      ${renderDenseFatigueWarning(activeExercise, defaults)}
      ${denseReadinessField(readiness)}
      ${denseNatureSelectorMarkup(exercise, nature)}
      ${denseFailureSetMode ? `<p class="transfer-note"><i data-lucide="flame"></i>Set al fallo de la semana: elige los minutos según tu tiempo; las reps de abajo son tu objetivo estimado al fallo. Haz el set, apunta las reps reales y marca cómo fue.</p>` : ""}
      ${defaults.isTest && !denseFailureSetMode ? denseTestToggleHtml() : ""}
      ${suggestion ? `<div class="dense-recommendation-wrap" data-recommendation>${renderDenseProgressionSuggestion(activeExercise, suggestion)}</div>` : ""}
      <div class="dense-form-grid">
        ${field("Peso corporal kg", "bodyweightKg", defaults.bodyweightKg, "number")}
        <input type="hidden" name="exerciseId" value="${escapeAttr(defaults.exerciseId)}" />
        <input type="hidden" name="nature" value="${escapeAttr(nature)}" />
        <fieldset class="scheme-picker-field is-full">
          <legend>${modal ? "Scheme completed" : "Esquema Dense"}</legend>
          <div class="scheme-option-grid">
            ${allowedSchemes.map((scheme) => denseSchemeOption(scheme, defaults.scheme)).join("")}
          </div>
        </fieldset>
        ${denseRomField(activeExercise, defaults)}
        ${denseRepPerSetFields(activeExercise, defaults)}
        ${denseIsIsometric(activeExercise) ? "" : field("Reps totales", "totalReps", defaults.totalReps, "number")}
        ${denseHoldFields(activeExercise, defaults)}
        ${denseLoadFields(activeExercise, defaults)}
        <fieldset class="effort-picker-field is-full">
          <legend>Effort</legend>
          <div class="effort-option-grid">
            ${denseEffortOptions.map(([value, label]) => denseEffortOption(value, label, defaults.effort, modal)).join("")}
          </div>
        </fieldset>
        <label class="field is-full">
          <span>Notes ${modal ? "(optional)" : ""}</span>
          <textarea name="notes" placeholder="${modal ? "Any thoughts on this session..." : "ROM, tempo, anillas altas, pies elevados, molestias, si las reps son por lado..."}">${escapeHtml(defaults.notes || "")}</textarea>
        </label>
      </div>
      <div class="dense-actions">
        <div class="dense-form-hint">
          <strong>${escapeHtml(denseNatureLabel(nature))}</strong>
          <span>${escapeHtml(denseExerciseHint(activeExercise))}</span>
        </div>
        <button class="text-button is-hot" type="submit"><i data-lucide="save"></i>${escapeHtml(submitLabel)}</button>
      </div>
    </form>
  `;
}

function denseSetModalSummary(exercise, defaults) {
  const total = Number(defaults.totalReps || 0);
  const bodyweight = Number(defaults.bodyweightKg || 0);
  const volume = total && bodyweight ? `${Math.round(total * bodyweight)} kg volume` : denseExerciseHint(exercise);
  return `
    <div class="dense-set-modal-summary">
      <span class="mini-tag is-green">${escapeHtml(denseNatureLabel(exercise.nature).split("·")[0].trim())}</span>
      <span class="mini-tag"><i data-lucide="edit-3"></i>${state.settings.denseDraftEntryId ? "editing" : "new"} · ${escapeHtml(formatMonthDay(selectedDate))}</span>
      <strong>${escapeHtml(defaults.scheme)} · ${escapeHtml(defaults.repsPerSet ? `${defaults.repsPerSet}/min` : "objetivo")}</strong>
      <small>${escapeHtml(total ? `${total} reps · ${volume}` : volume)}</small>
    </div>
  `;
}

// Recovery only makes sense with wellness input (readiness / session fatigue).
// With fewer than DENSE_RECOVERY_MIN_WELLNESS such marks the score is noise, so
// hide the tab entirely.
function denseAnalyticsTabs() {
  const showRecovery = denseWellnessCount() >= DENSE_RECOVERY_MIN_WELLNESS;
  return trainingAnalyticsTabs.filter(([value]) => value !== "recovery" || showRecovery);
}

function renderTrainingAnalytics() {
  if (!nodes.trainingAnalyticsPanel) return;
  const tabs = denseAnalyticsTabs();
  let activeTab = state.settings.trainingAnalyticsTab || "progress";
  if (!tabs.some(([value]) => value === activeTab)) activeTab = "progress";
  const activeWindow = state.settings.trainingAnalyticsWindow || "70";
  const entries = trainingAnalyticsEntries(activeWindow);
  const totalSets = entries.reduce((sum, entry) => sum + denseEquivalentSets(entry), 0);
  const uniqueDays = new Set(entries.map((entry) => entry.date)).size;

  nodes.trainingAnalyticsPanel.innerHTML = `
    <header class="info-header">
      <h2 class="info-title"><i data-lucide="activity"></i>Analytics</h2>
      <p class="info-subtitle">Volumen, fuerza y balance estructural</p>
      <span class="info-meta">${entries.length ? `${entries.length} marcas · ${roundTo(totalSets, 1)} sets eq · ${uniqueDays} días` : "Empieza a logear para activar tendencias."}</span>
    </header>
    <nav class="analytics-tab-strip" role="tablist" aria-label="Training analytics">
      ${tabs
        .map(
          ([value, label]) => `
            <button class="analytics-tab ${activeTab === value ? "is-active" : ""}" type="button" role="tab" aria-selected="${activeTab === value}" data-action="set-training-analytics-tab" data-tab="${value}">${escapeHtml(label)}</button>
          `,
        )
        .join("")}
    </nav>
    <div class="analytics-window-strip" aria-label="Ventana">
      ${trainingAnalyticsWindows
        .map(
          ([value, label]) => `
            <button class="seg-button ${activeWindow === value ? "is-active" : ""}" type="button" data-action="set-training-analytics-window" data-window="${value}">${label}</button>
          `,
        )
        .join("")}
    </div>
    <div class="training-analytics-body">
      ${renderTrainingAnalyticsTab(activeTab, entries)}
    </div>
  `;
}

function renderTrainingAnalyticsTab(tab, entries) {
  if (!entries.length) return renderEmptyAnalytics();
  if (tab === "progress") return renderProgressAnalytics(entries);
  if (tab === "volume") return renderVolumeAnalytics(entries);
  if (tab === "strength") return renderStrengthAnalytics(entries);
  if (tab === "recovery") return renderRecoveryAnalytics(entries);
  return renderBalanceAnalytics(entries);
}

function renderEmptyAnalytics() {
  return `
    <div class="analytics-empty">
      <i data-lucide="activity"></i>
      <strong>Sin datos en esta ventana</strong>
      <span>Guarda el primer DenseTraining y esta zona empezará a mostrar volumen, PRs, recovery y balance de patrones.</span>
    </div>
  `;
}

function renderProgressAnalytics(entries) {
  const chartDays = denseWindowChartDays();
  const tonnage = entries.reduce((sum, entry) => sum + (entry.tonnage_kg || 0), 0);
  const tonnagePct = denseTrendPct((entry) => entry.tonnage_kg || 0, chartDays);
  const uniqueDays = new Set(entries.map((entry) => entry.date)).size;
  const prEvents = densePrEventEntries(entries);
  const movers = denseStrengthMovers(entries);
  const easier = denseEffortEasierRows(entries);
  const cns = denseCnsSeries(chartDays);
  const cnsAvg = Math.round(average(cns.map((p) => p.value).filter(Boolean)) || 0);
  const recovery = denseRecoverySeries(chartDays);
  const recAvg = Math.round(average(recovery.map((p) => p.value).filter(Boolean)) || 0);
  const recPct = denseRecoveryTrendPct(chartDays);
  const bw = latestKnownBodyweight() || 0;
  // Momentum phrase, DENSE-style
  const phrase = uniqueDays < 3
    ? ["Arrancando", "Sigue registrando y las tendencias se rellenan solas."]
    : tonnagePct > 15 && prEvents.length
      ? ["Construyendo momentum", `Tonelaje ${tonnagePct > 0 ? "+" : ""}${tonnagePct}% y ${prEvents.length} PR${prEvents.length === 1 ? "" : "s"} en la ventana.`]
      : tonnagePct < -20
        ? ["Semana ligera", "Menos carga que el periodo anterior — bien si es descarga planificada."]
        : ["Ritmo estable", "Volumen consistente. Busca un patrón para retar al fallo esta semana."];
  return `
    <article class="analytics-card dc-phrase">
      <strong>${escapeHtml(phrase[0])}</strong>
      <span>${escapeHtml(phrase[1])}</span>
      <small>Llevas <b>${uniqueDays}</b> día${uniqueDays === 1 ? "" : "s"} con marcas en esta ventana.</small>
    </article>

    <div class="dc-section-head"><strong>Training volume</strong></div>
    <div class="analytics-stat-grid is-two">
      <article class="analytics-stat-card">
        <span><i data-lucide="weight"></i>Force</span>
        <strong>${roundTo(tonnage / 1000, 1)} t ${dcTrendBadge(tonnagePct)}</strong>
        <small>tonelaje</small>
      </article>
      <article class="analytics-stat-card">
        <span><i data-lucide="blocks"></i>Blocks</span>
        <strong>${roundTo(entries.reduce((sum, entry) => sum + denseEquivalentSets(entry), 0), 1)}</strong>
        <small>bloques dense</small>
      </article>
    </div>

    <div class="dc-section-head"><strong>Strength momentum</strong></div>
    ${
      movers.length
        ? `<div class="dc-mover-list">${movers.map((row) => `<div class="dc-mover"><strong>${escapeHtml(row.name)}</strong>${dcTrendBadge(row.pct)}</div>`).join("")}</div>`
        : `<p class="dc-empty-note">Sin mejoras medibles en esta ventana todavía.</p>`
    }

    <div class="dc-section-head"><strong>Transferencias recientes</strong><span>marcas que movieron otras estimaciones</span></div>
    ${(() => {
      const events = [...(state.transfer?.events || [])].slice(-6).reverse();
      if (!events.length) return `<p class="dc-empty-note">Aún nada: cuando una mejora real propague a ejercicios relacionados, aparecerá aquí.</p>`;
      return `<article class="analytics-card">${events
        .map((event) => {
          const source = denseExerciseById(event.source)?.name || event.source;
          const target = event.family ? `${denseExerciseById(event.target)?.name.split(" ").slice(0, 2).join(" ") || event.target} (familia)` : denseExerciseById(event.target)?.name || event.target;
          return `<div class="dc-pr-row"><div><strong>${escapeHtml(source)} → ${escapeHtml(target)}</strong><small>${event.reconciled ? "reconciliada" : "pendiente de test"}</small></div><b>+${roundTo(event.delta * 100, 1)}%</b><span>${escapeHtml(String(event.at || "").slice(5, 10))}</span></div>`;
        })
        .join("")}</article>`;
    })()}

    ${dcCollapse("trophy", "Personal records", "toca para ver", `${prEvents.length}`, prEvents.length ? prEvents.slice(0, 8).map(dcPrRow).join("") : `<p class="dc-empty-note">Sin PRs en esta ventana.</p>`)}
    ${dcCollapse("zap", "Effort — easier than before", "misma marca o mejor, menos esfuerzo", `${easier.length}`, easier.length ? easier.map((row) => `<div class="dc-pr-row"><div><strong>${escapeHtml(row.name)}</strong><small><em>Dense</em> ${escapeHtml(row.scheme)}</small></div><span>${escapeHtml(String(row.date || "").slice(5))}</span></div>`).join("") : `<p class="dc-empty-note">Aún nada aquí: repite una marca con menos esfuerzo y aparecerá.</p>`)}

    <div class="dc-section-head"><strong>Health</strong></div>
    <div class="analytics-stat-grid is-two">
      <article class="analytics-stat-card">
        <span><i data-lucide="heart-pulse"></i>Recovery</span>
        <strong>${recAvg || "—"} ${recAvg ? dcTrendBadge(recPct) : ""}</strong>
        <small>readiness 0–100</small>
      </article>
      <article class="analytics-stat-card">
        <span><i data-lucide="gauge"></i>Exertion</span>
        <strong>${cnsAvg || "—"}</strong>
        <small>carga 0–100</small>
      </article>
      <article class="analytics-stat-card">
        <span><i data-lucide="scale"></i>Bodyweight</span>
        <strong>${bw ? `${roundTo(bw, 1)} kg` : "—"}</strong>
        <small>último registro</small>
      </article>
    </div>

    <div class="dc-section-head"><strong>Level-ups</strong></div>
    ${
      prEvents.length
        ? `<div class="dc-collapse-body is-open">${prEvents.slice(0, 5).map(dcPrRow).join("")}</div>`
        : `<p class="dc-empty-note">Sin level-ups en esta ventana. Cambia a “All” para ver los históricos.</p>`
    }

    ${denseConsistencySectionHtml()}
  `;
}

function renderVolumeAnalytics(entries) {
  const chartDays = denseWindowChartDays();
  const windowKey = state.settings.trainingAnalyticsWindow || "70";
  const windowDays = windowKey === "all" ? 70 : Number(windowKey) || 70;
  const tonnage = entries.reduce((sum, entry) => sum + (entry.tonnage_kg || 0), 0);
  const totalSets = entries.reduce((sum, entry) => sum + denseEquivalentSets(entry), 0);
  const cns = denseCnsSeries(chartDays);
  const cnsToday = cns[cns.length - 1]?.value || 0;
  const cnsAvg = Math.round(average(cns.map((p) => p.value).filter(Boolean)) || 0);
  // Sets per category, expressed as weekly rate for the zone bands
  const catSets = {};
  const catReps = {};
  entries.forEach((entry) => {
    const category = denseExerciseById(entry.exercise_id)?.category || "other";
    catSets[category] = (catSets[category] || 0) + denseEquivalentSets(entry);
    catReps[category] = (catReps[category] || 0) + (entry.total_reps || 0);
  });
  const catRows = Object.entries(catSets)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([category, sets]) => dcZoneVolumeRow(denseCategoryLabel(category), (sets / windowDays) * 7))
    .join("");
  // Weekly stacked history (last 4 weeks, by category)
  const weeks = [];
  for (let w = 3; w >= 0; w -= 1) {
    const start = addDays(today, -7 * w - 6);
    const end = addDays(today, -7 * w);
    const startKey = dateKey(start);
    const endKey = dateKey(end);
    const bucket = {};
    getDenseEntries().forEach((entry) => {
      if (!entry.date || entry.date < startKey || entry.date > endKey) return;
      const category = denseExerciseById(entry.exercise_id)?.category || "other";
      bucket[category] = (bucket[category] || 0) + denseEquivalentSets(entry);
    });
    weeks.push({ label: `${end.getMonth() + 1}/${end.getDate()}`, bucket });
  }
  const historyMax = Math.max(...weeks.map((week) => Object.values(week.bucket).reduce((sum, v) => sum + v, 0)), 1);
  const historyCats = [...new Set(weeks.flatMap((week) => Object.keys(week.bucket)))];
  const historyCols = weeks
    .map((week) => {
      const total = Object.values(week.bucket).reduce((sum, v) => sum + v, 0);
      const segs = historyCats
        .map((category) => {
          const value = week.bucket[category] || 0;
          if (!value) return "";
          return `<i style="height:${(value / historyMax) * 100}%; background:${denseCategoryColorHex(category)}" title="${escapeAttr(`${denseCategoryLabel(category)}: ${roundTo(value, 1)} sets`)}"></i>`;
        })
        .join("");
      return `<div class="dc-stack-col" title="${escapeAttr(`${roundTo(total, 1)} sets`)}"><div class="dc-stack-bar">${segs}</div><em>${escapeHtml(week.label)}</em></div>`;
    })
    .join("");
  // Time-based volume (absorbed from the old Conditioning tab)
  const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
  const totalTut = Math.round(entries.reduce((sum, entry) => sum + (entry.total_hold_seconds || 0), 0));
  const condCount = entries.filter((entry) => entry.nature === "conditioning" || entry.movement_pattern === "conditioning").length;
  return `
    ${dcBarTrendCard("Tonnage trend", `${roundTo(tonnage / 1000, 1)}t`, denseTrendPct((entry) => entry.tonnage_kg || 0, chartDays), denseDailyTrend((entry) => (entry.tonnage_kg || 0) / 1000, chartDays), "t")}
    ${dcBarTrendCard("Dense blocks", roundTo(totalSets, 1), denseTrendPct((entry) => denseEquivalentSets(entry), chartDays), denseDailyTrend((entry) => denseEquivalentSets(entry), chartDays), "")}

    <div class="analytics-stat-grid">
      ${analyticsStatCard("Dense minutes", totalMinutes, "minutos registrados", "clock-3")}
      ${analyticsStatCard("TUT", `${totalTut}s`, "isométricos y holds", "pause-circle")}
      ${analyticsStatCard("Conditioning", condCount, "sesiones en ventana", "zap")}
    </div>

    <div class="dc-section-head"><strong>CNS load</strong><span>carga diaria 0–100 · 50 ≈ día típico</span></div>
    <article class="analytics-card">
      <div class="dc-cns-head">
        <div><strong style="color:${dcZoneColor(cnsToday)}">${cnsToday}</strong><span>/ 100</span><em style="color:${dcZoneColor(cnsToday)}">${dcZoneName(cnsToday)}</em></div>
        <div class="dc-cns-avg"><span>${chartDays}D AVG</span><strong>${cnsAvg}</strong></div>
      </div>
      ${dcLineChart(cns)}
    </article>

    <div class="dc-section-head"><strong>Volume per category</strong><span>zonas: mantenimiento · productivo · exceso</span></div>
    <article class="analytics-card">${catRows || `<p class="dc-empty-note">Sin volumen en esta ventana.</p>`}</article>

    <div class="dc-section-head"><strong>Volume history</strong><span>últimas 4 semanas</span></div>
    <article class="analytics-card">
      <div class="dc-stack-chart">${historyCols}</div>
      <div class="dc-zone-legend">${historyCats.map((category) => `<span><i style="background:${denseCategoryColorHex(category)}"></i>${escapeHtml(denseCategoryLabel(category))}</span>`).join("")}</div>
    </article>
  `;
}

// Solid hex per category (SVG/stacked segments can't use CSS var() tints reliably)
function denseCategoryColorHex(category) {
  return { push: "#ff7c9e", pull: "#7cb0ff", legs: "#93e84b", skills: "#c08bff", core: "#e9b84e", mobility: "#57c6a1" }[category] || "#989b8f";
}

function renderStrengthAnalytics(entries) {
  const chartDays = denseWindowChartDays();
  const prEvents = densePrEventEntries(entries);
  const prByDay = denseDailyTrend((entry) => (densePrEventEntries([entry]).length ? 1 : 0), chartDays);
  // Relative strength: best score per exercise vs bodyweight
  const bw = latestKnownBodyweight() || 0;
  const relRows = Object.values(
    entries.reduce((map, entry) => {
      if (!entry.e1rm_kg && !entry.relative_strength) return map;
      const row = (map[entry.exercise_id] ||= { name: entry.exercise_name, e1rm: 0, rel: 0 });
      row.e1rm = Math.max(row.e1rm, entry.e1rm_kg || 0);
      row.rel = Math.max(row.rel, entry.relative_strength || (bw ? (entry.e1rm_kg || 0) / bw : 0));
      return map;
    }, {}),
  )
    .sort((a, b) => b.rel - a.rel)
    .slice(0, 5);
  // Per-exercise progression: exercises with >= 2 marks, chips + score line
  const counts = {};
  getDenseEntries().forEach((entry) => {
    counts[entry.exercise_id] = (counts[entry.exercise_id] || 0) + 1;
  });
  const progressable = Object.entries(counts)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([id]) => denseExerciseById(id))
    .filter(Boolean);
  const selectedId = state.settings.analyticsExerciseId && progressable.some((exercise) => exercise.id === state.settings.analyticsExerciseId)
    ? state.settings.analyticsExerciseId
    : progressable[0]?.id;
  let progressionChart = `<p class="dc-empty-note">Registra un ejercicio 2+ veces para ver su tendencia.</p>`;
  if (selectedId) {
    const history = getDenseEntries()
      .filter((entry) => entry.exercise_id === selectedId)
      .sort((a, b) => String(a.created_at || a.date || "").localeCompare(String(b.created_at || b.date || "")))
      .slice(-12);
    const maxScore = Math.max(...history.map((entry) => denseEntryScore(entry) || 0), 1);
    const points = history.map((entry) => ({ short: String(entry.date || "").slice(5), value: Math.round(((denseEntryScore(entry) || 0) / maxScore) * 100) }));
    const latest = history[history.length - 1];
    // The line is normalized 0–100 to draw; anchor it to real units so the
    // scale is legible — peak (best) mark in its own unit (e1RM/reps/s/cm).
    const bestEntry = history.reduce((best, entry) => ((denseEntryScore(entry) || 0) > (denseEntryScore(best) || 0) ? entry : best), history[0]);
    progressionChart = `
      <div class="dc-cns-head">
        <div><strong>${escapeHtml(denseEntryValue(latest))}</strong><span>última marca</span></div>
        <div class="dc-cns-avg"><span>pico</span><strong>${escapeHtml(denseEntryValue(bestEntry))}</strong></div>
      </div>
      ${dcLineChart(points, { legend: false })}
    `;
  }
  const effortSeries = [];
  for (let i = chartDays - 1; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const key = dateKey(day);
    const dayEntries = getDenseEntries().filter((entry) => entry.date === key);
    const avgEffort = average(dayEntries.map((entry) => entry.effort_value).filter(Boolean));
    effortSeries.push({ short: `${day.getMonth() + 1}/${day.getDate()}`, value: avgEffort ? Math.round(avgEffort * 10) : 0 });
  }
  return `
    ${dcBarTrendCard("Personal records", prEvents.length, 0, prByDay, "")}

    <div class="dc-section-head"><strong>Relative strength</strong><span>PR / peso corporal</span></div>
    <article class="analytics-card">
      ${
        relRows.length
          ? relRows.map((row) => `<div class="dc-pr-row"><div><strong>${escapeHtml(row.name)}</strong><small>e1RM ${formatKg(row.e1rm)}</small></div><b>${roundTo(row.rel, 2)}×BW</b></div>`).join("")
          : `<p class="dc-empty-note">Sin PRs con carga y peso corporal todavía.</p>`
      }
    </article>

    <div class="dc-section-head"><strong>Per-exercise progression</strong><span>tendencia de tu mejor señal</span></div>
    <article class="analytics-card">
      <div class="dc-chip-row">
        ${progressable.map((exercise) => `<button class="dc-chip ${exercise.id === selectedId ? "is-active" : ""}" type="button" data-action="set-analytics-exercise" data-exercise="${escapeAttr(exercise.id)}">${escapeHtml(exercise.name)}</button>`).join("")}
      </div>
      ${progressionChart}
    </article>

    <div class="dc-section-head"><strong>Effort progress</strong><span>esfuerzo medio diario (RPE ×10)</span></div>
    <article class="analytics-card">${dcLineChart(effortSeries, { legend: false })}</article>
  `;
}

function renderRecoveryAnalytics(entries) {
  const chartDays = denseWindowChartDays();
  const wellness = denseWellnessCount();
  const recovery = denseRecoverySeries(chartDays);
  const cns = denseCnsSeries(chartDays);
  const cnsToday = cns[cns.length - 1]?.value || 0;
  const cnsAvg = Math.round(average(cns.map((p) => p.value).filter(Boolean)) || 0);
  // Recovery load: 7-day cost = average CNS across the last 7 days (rest included)
  const cns7 = denseCnsSeries(7);
  const cost = roundTo(cns7.reduce((sum, p) => sum + p.value, 0) / 7, 2);
  const costBadge = cost < 25 ? ["LIGHT", "is-good"] : cost < 60 ? ["BUILDING", "is-warn"] : cost < 90 ? ["HEAVY", "is-warn"] : ["OVERLOAD", "is-bad"];
  const catBreakdown = {};
  const cutoff = dateKey(addDays(today, -6));
  getDenseEntries().forEach((entry) => {
    if (!entry.date || entry.date < cutoff) return;
    const category = denseExerciseById(entry.exercise_id)?.category || "other";
    catBreakdown[category] = (catBreakdown[category] || 0) + denseEquivalentSets(entry);
  });
  const bodyweightRows = bodyweightTrendRows(Math.max(chartDays, 14));
  const dualChart = wellness >= 7
    ? dcDualLineChart(recovery, cns, "Recovery", "Exertion", "Ambas escalas 0–100. 50 ≈ día típico. Si la línea ámbar supera la lima, la carga superó tu recuperación ese día.")
    : `
      <div class="dc-locked">
        <span class="tiny-icon"><i data-lucide="lock"></i></span>
        <strong>${7 - wellness} check-ins más para desbloquear</strong>
        <span>Rellena el feedback post-entreno (fatiga / cómo fue) tras cada sesión. Con 7, el motor construye tu curva de recuperación personalizada.</span>
        <div class="dc-progress"><i style="width:${(wellness / 7) * 100}%"></i></div>
        <small>${wellness} / 7</small>
      </div>`;
  return `
    <div class="dc-section-head"><strong>Daily recovery vs exertion</strong></div>
    <article class="analytics-card">${dualChart}</article>

    <div class="dc-section-head"><strong>Total CNS load</strong><span>carga nerviosa diaria 0–100 (50 ≈ día típico)</span></div>
    <article class="analytics-card">
      <div class="dc-cns-head">
        <div><strong style="color:${dcZoneColor(cnsToday)}">${cnsToday}</strong><span>/ 100</span><em style="color:${dcZoneColor(cnsToday)}">${dcZoneName(cnsToday)}</em></div>
        <div class="dc-cns-avg"><span>${chartDays}D AVG</span><strong>${cnsAvg}</strong></div>
      </div>
      ${dcLineChart(cns)}
    </article>

    <div class="dc-section-head"><strong>Recovery load</strong><span>coste de recuperación 7 días</span></div>
    <article class="analytics-card">
      <div class="dc-cost-head"><strong>${cost}</strong><span class="dc-badge ${costBadge[1]}">${costBadge[0]}</span></div>
      <div class="dc-cost-scale">
        <i style="left:${clamp((cost / 110) * 100, 0, 98)}%"></i>
        <em style="left:${(25 / 110) * 100}%">25</em>
        <em style="left:${(60 / 110) * 100}%">60</em>
        <em style="left:${(90 / 110) * 100}%">90</em>
      </div>
      <div class="dc-cost-breakdown">
        ${Object.entries(catBreakdown).sort(([, a], [, b]) => b - a).map(([category, sets]) => `<div><span>${escapeHtml(denseCategoryLabel(category))}</span><b>${roundTo(sets, 1)}</b></div>`).join("") || `<p class="dc-empty-note">Sin sets en los últimos 7 días.</p>`}
      </div>
    </article>

    <div class="dc-section-head"><strong>Recovery thresholds</strong></div>
    <article class="analytics-card">
      <div class="dc-thresholds-note"><span class="mini-tag">GLOBAL DEFAULT</span><small>Umbrales base por edad de entrenamiento. Se personalizan con 7 check-ins de bienestar (llevas ${wellness}).</small></div>
      <div class="threshold-grid">
        <div class="dc-threshold"><span>≤ steady</span><strong class="is-good">25</strong></div>
        <div class="dc-threshold"><span>≤ building</span><strong class="is-warn">60</strong></div>
        <div class="dc-threshold"><span>≤ overload</span><strong class="is-bad">90</strong></div>
      </div>
    </article>

    <div class="dc-section-head"><strong>Bodyweight trend</strong></div>
    <article class="analytics-card">
      ${
        bodyweightRows.length
          ? `<div class="dc-cns-head"><div><strong>${roundTo(bodyweightRows[bodyweightRows.length - 1].value, 1)} kg</strong><span>${roundTo(bodyweightRows[bodyweightRows.length - 1].value - bodyweightRows[0].value, 1)} kg en ventana</span></div></div>
             ${dcLineChart(
               bodyweightRows.map((row) => ({ short: String(row.date).slice(5), value: row.range > 0 ? Math.round(((row.value - row.min) / row.range) * 80) + 10 : 50 })),
               { legend: false, height: 90 },
             )}`
          : `<p class="dc-empty-note">Registra peso corporal para ver la tendencia.</p>`
      }
    </article>
  `;
}

const denseRatioPairs = [
  { name: "Push-Pull Balance", sub: "empuje / tirón", a: "push", b: "pull", target: 1.0 },
  { name: "Vertical Balance", sub: "empuje vertical / tirón vertical", a: "vertical_push", b: "vertical_pull", target: 0.9 },
  { name: "Horizontal Balance", sub: "empuje horizontal / tirón horizontal", a: "horizontal_push", b: "horizontal_pull", target: 1.0 },
  { name: "Squat-Hinge Balance", sub: "squat / bisagra de cadera", a: "squat", b: "hinge", target: 1.1 },
  { name: "Unilateral Ratio", sub: "pierna unilateral / squat", a: "unilateral_leg", b: "squat", target: 0.45 },
];

function dcRatioCard(pair, patternMap) {
  const aSets = patternMap[pair.a]?.sets || 0;
  const bSets = patternMap[pair.b]?.sets || 0;
  const ratio = aSets && bSets ? aSets / bSets : 0;
  const hasData = Boolean(aSets && bSets);
  const badge = !hasData
    ? `<span class="dc-badge">NO DATA</span>`
    : Math.abs(ratio - pair.target) / pair.target <= 0.25
      ? `<span class="dc-badge is-good">${roundTo(ratio, 2)}</span>`
      : `<span class="dc-badge is-warn">${roundTo(ratio, 2)}</span>`;
  const scaleMax = pair.target * 2;
  return `
    <article class="dc-ratio-card">
      <div class="dc-ratio-head"><div><strong>${escapeHtml(pair.name)}</strong><small>${escapeHtml(pair.sub)}</small></div>${badge}</div>
      <div class="dc-ratio-track">
        ${hasData ? `<i style="left:${clamp((ratio / scaleMax) * 100, 1, 99)}%"></i>` : ""}
        <em style="left:50%" title="target ${pair.target}"></em>
      </div>
      <div class="dc-ratio-foot"><span>target ${pair.target}</span><span>${hasData ? `${patternLabel(pair.a)} ${roundTo(aSets, 1)} · ${patternLabel(pair.b)} ${roundTo(bSets, 1)}` : "datos insuficientes"}</span></div>
    </article>
  `;
}

function renderBalanceAnalytics(entries) {
  const patternMap = densePatternMap(entries);
  const catSets = {};
  const catReps = {};
  entries.forEach((entry) => {
    const category = denseExerciseById(entry.exercise_id)?.category || "other";
    catSets[category] = (catSets[category] || 0) + denseEquivalentSets(entry);
    catReps[category] = (catReps[category] || 0) + (entry.total_reps || 0);
  });
  const upperSets = (catSets.push || 0) + (catSets.pull || 0);
  const upperReps = (catReps.push || 0) + (catReps.pull || 0);
  const rows = densePatternRows(entries).slice(0, 8);
  const maxSets = Math.max(...rows.map((row) => row.sets), 1);
  return `
    <div class="dc-section-head"><strong>Current ratios</strong><span>sets equivalentes en la ventana</span></div>
    ${denseRatioPairs.map((pair) => dcRatioCard(pair, patternMap)).join("")}

    <div class="dc-section-head"><strong>Movement pattern balance</strong></div>
    ${dcBipolarCard("Push vs Pull", "Push", patternMap.push?.sets || 0, patternMap.push?.reps || 0, "Pull", patternMap.pull?.sets || 0, patternMap.pull?.reps || 0, 1.0)}
    ${dcBipolarCard("Squat vs Hinge", "Squat", patternMap.squat?.sets || 0, patternMap.squat?.reps || 0, "Hinge", patternMap.hinge?.sets || 0, patternMap.hinge?.reps || 0, 1.1)}
    ${dcBipolarCard("Superior vs Inferior", "Superior", upperSets, upperReps, "Inferior", catSets.legs || 0, catReps.legs || 0, 1.2)}

    ${dcCollapse("bar-chart-3", "Pattern breakdown", "sets por patrón", `${rows.length}`, `<div class="analytics-bars">${rows.map((row) => analyticsBar(patternLabel(row.pattern), row.sets, maxSets, `${roundTo(row.reps, 0)} reps`)).join("")}</div>`)}
  `;
}

// Streak + heatmap + engagement, now embedded at the end of Progreso
// (the Consistency tab was folded into it — audit fase 3).
function denseConsistencySectionHtml() {
  const todayKey = dateKey(today);
  // Engagement over the last 28 days: planned exercises logged + planned days trained
  let plannedDays = 0;
  let trainedPlannedDays = 0;
  let plannedExercises = 0;
  let loggedPlannedExercises = 0;
  for (let i = 27; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const key = dateKey(day);
    if (key > todayKey) continue;
    const plan = plannedExercisesForDate(day);
    const dayEntries = denseEntriesForDate(key);
    if (plan.length) {
      plannedDays += 1;
      plannedExercises += plan.length;
      if (dayEntries.length) trainedPlannedDays += 1;
      const loggedIds = new Set(dayEntries.map((entry) => entry.exercise_id));
      loggedPlannedExercises += plan.filter((exercise) => loggedIds.has(exercise.id)).length;
    }
  }
  const actionPct = plannedExercises ? Math.round((loggedPlannedExercises / plannedExercises) * 100) : null;
  const completionPct = plannedDays ? Math.round((trainedPlannedDays / plannedDays) * 100) : null;
  const currentStreak = trainingCurrentStreak(consistencyDays(28));
  // Weekly heatmap: last 4 weeks, Mon-Sun
  const weekRows = [];
  for (let w = 3; w >= 0; w -= 1) {
    const weekDays = trainingWeekDays(addDays(today, -7 * w));
    let trained = 0;
    let assigned = 0;
    const cells = weekDays
      .map((day) => {
        const key = dateKey(day);
        const isFuture = key > todayKey;
        const hasPlan = plannedExercisesForDate(day).length > 0;
        const hasEntries = denseEntriesForDate(key).length > 0;
        if (hasPlan) assigned += 1;
        if (hasEntries) trained += 1;
        let cls = "";
        if (!isFuture) {
          if (hasEntries && hasPlan) cls = "is-trained";
          else if (hasEntries) cls = "is-extra";
          else if (hasPlan) cls = "is-missed";
        }
        return `<span class="${cls}" title="${escapeAttr(`${key}${hasEntries ? " · entrenado" : hasPlan ? " · plan sin completar" : ""}`)}"></span>`;
      })
      .join("");
    const weekPct = assigned ? Math.round((weekDays.filter((day) => dateKey(day) <= todayKey && plannedExercisesForDate(day).length && denseEntriesForDate(dateKey(day)).length).length / assigned) * 100) : trained ? Math.round((trained / 7) * 100) : 0;
    weekRows.push(`<div class="dc-heat-row"><small>${dateKey(weekDays[0]).slice(5)}</small>${cells}<b>${weekPct}%</b></div>`);
  }
  const weekdayLabels = ["L", "M", "X", "J", "V", "S", "D"];
  // Genuinely abandoned = trained before but not lately. Never-used exercises
  // aren't "skipped", they're just not in your rotation — showing them is noise
  // while the base is still filling up.
  const skipped = denseExerciseLibrary({ sort: "abandoned" })
    .filter((exercise) => denseExerciseStats(exercise.id).count > 0)
    .slice(0, 5);
  return `
    <div class="dc-section-head"><strong>Consistencia</strong><span>últimos 28 días</span></div>
    <div class="analytics-stat-grid">
      ${analyticsStatCard("Action", actionPct === null ? "—" : `${actionPct}%`, "% de ejercicios planificados registrados", "activity")}
      ${analyticsStatCard("Completion", completionPct === null ? "—" : `${completionPct}%`, "% de días con plan completados", "circle-check-big")}
      ${analyticsStatCard("Streak", currentStreak, "días seguidos entrenando", "flame")}
    </div>

    <div class="dc-section-head"><strong>Training heatmap</strong><span>últimas 4 semanas</span></div>
    <article class="analytics-card">
      <div class="dc-heat-head"><small></small>${weekdayLabels.map((label) => `<span>${label}</span>`).join("")}<b></b></div>
      ${weekRows.join("")}
      <div class="dc-zone-legend">
        <span><i style="background:var(--lime)"></i>Entrenado</span>
        <span><i style="background:#a8352d"></i>Plan fallado</span>
        <span><i style="background:#7cb0ff"></i>Extra</span>
        <span><i style="background:#2a2b27"></i>Descanso</span>
      </div>
    </article>

    ${
      skipped.length
        ? dcCollapse("corner-down-right", "Ejercicios abandonados", "entrenados antes, no últimamente", `${skipped.length}`, `<div class="analytics-detail-list is-in-card">${skipped.map((exercise) => analyticsDetailRow(exercise.name, denseCategoryLabel(exercise.category), `${denseExerciseStats(exercise.id).count} marcas · retomar`, "corner-down-right")).join("")}</div>`)
        : ""
    }
  `;
}

function denseCalibrationRows(kit, staleDays) {
  return kit.map((test) => {
    const exercise = denseExerciseById(test.id);
    const last = [...getDenseEntries()]
      .filter((entry) => entry.exercise_id === test.id)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
    const days = last ? Math.round((today.getTime() - parseDate(last.date).getTime()) / 86400000) : null;
    const status = !last ? "pending" : days <= staleDays ? "fresh" : "stale";
    return { test, exercise, last, days, status };
  });
}

function denseCalibrationRowHtml({ test, exercise, days, status }) {
  return `
    <div class="calibration-row">
      <div class="calibration-row-main">
        <strong>${escapeHtml(exercise?.name || test.id)} <small>${escapeHtml(test.scheme)}</small></strong>
        <span>${escapeHtml(test.why)}</span>
      </div>
      ${
        status === "fresh"
          ? `<span class="dc-badge is-good">anclado · ${days}d</span>`
          : status === "stale"
            ? `<button class="dc-badge is-warn calibration-add" type="button" data-action="add-planned-exercise" data-exercise="${escapeAttr(test.id)}" data-test="1" data-scheme="${escapeAttr(test.scheme)}">re-test (${days}d)</button>`
            : `<button class="dc-badge calibration-add" type="button" data-action="add-planned-exercise" data-exercise="${escapeAttr(test.id)}" data-test="1" data-scheme="${escapeAttr(test.scheme)}">+ programar</button>`
      }
    </div>`;
}

function renderCalibrationCard() {
  const rows = denseCalibrationRows(denseCalibrationKit, 28);
  // Barbell anchors stay valid longer: strength there moves slowly.
  const barbellRows = denseCalibrationRows(denseCalibrationKitBarbell, 45);
  const done = rows.filter((row) => row.status === "fresh").length;
  return `
    <article class="calibration-card">
      <div class="calibration-head">
        <div>
          <strong>Calibración del motor</strong>
          <small>${done}/6 anclas frescas — cada test fija un patrón y afina las transferencias</small>
        </div>
        <div class="dc-progress"><i style="width:${(done / 6) * 100}%"></i></div>
      </div>
      ${rows.map(denseCalibrationRowHtml).join("")}
      <div class="calibration-tier"><span>Anclas de barra</span><small>opcionales · definen fuerza absoluta</small></div>
      ${barbellRows.map(denseCalibrationRowHtml).join("")}
    </article>
  `;
}

// PRs per week over the last N weeks — the timeline in PR lab.
function densePrWeeklyTimeline(weeksBack = 12) {
  const prDates = getDenseEntries()
    .filter((entry) => entry.date && denseEntryIsPr(entry))
    .map((entry) => entry.date);
  const rows = [];
  for (let w = weeksBack - 1; w >= 0; w -= 1) {
    const startKey = dateKey(addDays(today, -7 * w - 6));
    const endKey = dateKey(addDays(today, -7 * w));
    rows.push({ label: endKey.slice(5), count: prDates.filter((d) => d >= startKey && d <= endKey).length });
  }
  return rows;
}

function renderDensePrs() {
  if (!nodes.densePrPanel) return;
  const entries = [...getDenseEntries()];
  const prs = densePrRows();
  const latest = entries.sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
  const estimateCards = latest ? renderDenseEstimateCards(latest) : "";

  nodes.densePrPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">PR lab</p>
        <h2>PRs y estimaciones cruzadas</h2>
        <span class="section-meta">Cada ejercicio aprende por esfuerzo: 70% histórico + 30% observación ajustada.</span>
      </div>
      <span class="mini-tag ${entries.length ? "is-green" : "is-amber"}">${entries.length ? `${entries.length} marks` : "esperando datos"}</span>
    </div>
    ${renderCalibrationCard()}
    ${(() => {
      const weeks = densePrWeeklyTimeline(12);
      const total = weeks.reduce((sum, w) => sum + w.count, 0);
      if (!total) return "";
      const max = Math.max(...weeks.map((w) => w.count), 1);
      return `
        <div class="dc-section-head"><strong>PR timeline</strong><span>${total} PRs · 12 semanas</span></div>
        <article class="analytics-card">
          <div class="recovery-sparkline is-pr-timeline">
            ${weeks.map((w) => `<span style="height:${w.count ? Math.max(14, (w.count / max) * 100) : 4}%" title="${escapeAttr(`sem ${w.label}: ${w.count} PR${w.count === 1 ? "" : "s"}`)}"></span>`).join("")}
          </div>
          <div class="dc-timeline-foot"><span>${escapeHtml(weeks[0].label)}</span><span>hoy</span></div>
        </article>`;
    })()}
    <div class="dense-pr-layout">
      <div class="dense-pr-table">
        <div class="section-subhead"><strong>PRs reales</strong><span>marcas registradas y testeadas</span></div>
        <div class="table-head dense-pr-row">
          <span>Ejercicio</span>
          <span>Esquema</span>
          <span>PR</span>
          <span>Rel.</span>
          <span>Fecha</span>
        </div>
        ${
          prs.length
            ? prs
                .slice(0, 12)
                .map(
                  (row) => `
                    <article class="dense-pr-row">
                      <span>${escapeHtml(row.exerciseName)}</span>
                      <span>${escapeHtml(row.scheme)}</span>
                      <strong>${escapeHtml(row.value)}</strong>
                      <span>${escapeHtml(row.relative)}</span>
                      <span>${escapeHtml(row.date)}</span>
                    </article>
                  `,
                )
                .join("")
            : `<article class="dense-pr-row is-empty"><span>Sin PRs todavía</span><span>Guarda una marca real</span><strong>-</strong><span>-</span><span>-</span></article>`
        }
      </div>
      <div class="dense-estimate-panel">
        <div class="section-subhead">
          <strong>Estimado · no testeado</strong>
          <span>${latest ? `${escapeHtml(latest.exercise_name)} · rangos con confianza` : "sin entrada base"}</span>
        </div>
        <div class="dense-estimate-grid">
          ${estimateCards || `<article class="dense-estimate-card"><strong>Esperando señal</strong><span>Las equivalencias aparecerán al guardar la primera marca.</span></article>`}
        </div>
      </div>
    </div>
  `;
}

function renderLogbook() {
  if (!nodes.logbookPanel) return;
  const entries = [...getDenseEntries()]
    .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))
    .slice(0, 8);

  nodes.logbookPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Logbook</p>
        <h2>Últimas marcas reales</h2>
      </div>
    </div>
    <div class="logbook-list">
      ${
        entries.length
          ? entries
              .map(
                (entry) => `
                  <article class="log-entry">
                    <strong>${escapeHtml(entry.exercise_name)}</strong>
                    <span>${escapeHtml(entry.date)} · ${escapeHtml(entry.scheme)} · ${denseEntryValue(entry)}</span>
                    <p class="tiny-copy">${escapeHtml(entry.notes || `${entry.reps_per_min ? `${entry.reps_per_min} rpm` : ""}${entry.relative_strength ? ` · ${entry.relative_strength}x BW` : ""}` || "Sin nota")}</p>
                  </article>
                `,
              )
              .join("")
          : `<article class="log-entry"><strong>Sin marcas todavía</strong><span>El historial empieza cuando guardas una marca Dense.</span></article>`
      }
    </div>
  `;
}

function renderReview() {
  const week = rangeDays(addDays(selectedDate, -6), selectedDate);
  const dayNote = state.dayNotes[dateKey(selectedDate)] || {};
  const reviewItems = [
    { title: "Score semanal", value: `${averageScore(week)}%`, icon: "gauge", detail: "Promedio total de los últimos 7 días" },
    { title: "Core semanal", value: `${averageCoreScore(week)}%`, icon: "shield", detail: "07:00, primer bloque, NOPHONE, FROG y familia" },
    { title: "Entreno", value: `${denseTrainingWeekScore()}%`, icon: "dumbbell", detail: "Días con marcas reales en los últimos 7 días" },
    { title: "FROG de hoy", value: dayNote.frogTask || "pendiente", icon: "target", detail: "Tarea dura declarada" },
  ];

  nodes.reviewPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Review</p>
        <h2>Lectura honesta</h2>
      </div>
      <button class="text-button" type="button" data-action="open-day-note"><i data-lucide="notebook-pen"></i>Día</button>
    </div>
    <div class="review-stack">
      ${reviewItems.map((item) => reviewCard(item.title, item.value, item.icon, item.detail)).join("")}
      <article class="review-card">
        <strong>Nota</strong>
        <span>${escapeHtml(dayNote.note || "Sin nota del día seleccionado")}</span>
      </article>
    </div>
  `;
}

function renderData() {
  const syncEnabled = Boolean(cloudConfig.enabled && cloudConfig.endpointUrl);
  nodes.dataPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Data</p>
        <h2>Control privado</h2>
      </div>
    </div>
    <div class="backup-grid">
      <article class="backup-box">
        <strong>Backup</strong>
        <p class="tiny-copy">${Object.keys(state.records).length} días · ${totalXp()} XP · ${getDenseEntries().length} marcas Dense</p>
        <div class="inline-actions" style="justify-content:flex-start; margin-top:10px">
          <button class="text-button" type="button" data-action="export-json"><i data-lucide="download"></i>JSON</button>
          <button class="text-button" type="button" data-action="copy-json"><i data-lucide="copy"></i>Copiar</button>
        </div>
      </article>
      <article class="backup-box">
        <strong>Import</strong>
        <p class="tiny-copy">Acepta backups generados por esta app.</p>
        <div class="import-row">
          <input id="importFile" type="file" accept="application/json" />
        </div>
      </article>
      <article class="backup-box">
        <strong>Reset</strong>
        <p class="tiny-copy">Reinicia datos locales y vuelve al sistema base.</p>
        <div class="inline-actions" style="justify-content:flex-start; margin-top:10px">
          <button class="text-button is-danger" type="button" data-action="factory-reset"><i data-lucide="trash-2"></i>Reset</button>
        </div>
      </article>
      <article class="backup-box">
        <strong>Storage</strong>
        <p class="tiny-copy">${new Blob([JSON.stringify(state)]).size} bytes en este navegador. ${syncEnabled ? "La nube queda como fuente de verdad configurada." : "Activa Cloud para sacar los datos de local."}</p>
      </article>
      <article class="backup-box is-wide">
        <strong>Cloud / Google Sheets</strong>
        <p class="tiny-copy" data-last-backup><i data-lucide="shield-check"></i> ${escapeHtml(denseLastBackupText())}</p>
        <p class="tiny-copy">Pega aqui la URL del Web App de Apps Script. La app enviara cada cambio como snapshot y puede restaurar el ultimo RawState.</p>
        <form id="cloudSyncForm" class="cloud-sync-form">
          <label class="field">
            <span>Endpoint URL</span>
            <input name="endpointUrl" type="url" value="${escapeAttr(cloudConfig.endpointUrl || "")}" placeholder="https://script.google.com/macros/s/.../exec" />
          </label>
          <label class="field">
            <span>Token privado</span>
            <input name="token" type="password" value="${escapeAttr(cloudConfig.token || "")}" placeholder="Mismo token que en Apps Script" />
          </label>
          <label class="check-line">
            <input name="enabled" type="checkbox" ${cloudConfig.enabled ? "checked" : ""} />
            <span>Sincronizar automaticamente al guardar</span>
          </label>
          <div class="inline-actions" style="justify-content:flex-start; margin-top:10px">
            <button class="text-button is-hot" type="submit"><i data-lucide="save"></i>Guardar cloud</button>
            <button class="text-button" type="button" data-action="sync-now"><i data-lucide="refresh-cw"></i>Sync ahora</button>
            <button class="text-button" type="button" data-action="restore-cloud"><i data-lucide="cloud-download"></i>Restaurar Cloud</button>
          </div>
          <p class="tiny-copy" id="cloudSyncStatus" data-cloud-sync-status>${escapeHtml(cloudSyncStatus.text)}</p>
        </form>
      </article>
    </div>
  `;
}

function openCloudToolsModal() {
  const localStats = stateDataSummary(state);
  nodes.modalCard.dataset.modalKind = "cloud-tools";
  nodes.modalEyebrow.textContent = "Backup";
  nodes.modalTitle.textContent = "Cloud / Datos";
  nodes.modalBody.innerHTML = `
    <div class="backup-grid">
      <article class="backup-box">
        <strong>Este dispositivo</strong>
        <p class="tiny-copy">${escapeHtml(localStats)}</p>
        <div class="inline-actions" style="justify-content:flex-start; margin-top:10px">
          <button class="text-button" type="button" data-action="export-json"><i data-lucide="download"></i>JSON</button>
          <button class="text-button" type="button" data-action="copy-json"><i data-lucide="copy"></i>Copiar</button>
        </div>
      </article>
      <article class="backup-box is-wide">
        <strong>Google Sheets</strong>
        <p class="tiny-copy" data-last-backup><i data-lucide="shield-check"></i> ${escapeHtml(denseLastBackupText())}</p>
        <p class="tiny-copy">Restaura el ultimo snapshot guardado en RawState. Util para la app instalada cuando arranca sin datos locales.</p>
        <div class="inline-actions" style="justify-content:flex-start; margin-top:10px">
          <button class="text-button is-hot" type="button" data-action="restore-cloud"><i data-lucide="cloud-download"></i>Restaurar Cloud</button>
          <button class="text-button" type="button" data-action="sync-now"><i data-lucide="refresh-cw"></i>Sync ahora</button>
        </div>
        <p class="tiny-copy" data-cloud-sync-status>${escapeHtml(cloudSyncStatus.text)}</p>
      </article>
    </div>
  `;
  openModal();
}

function handleClick(event) {
  // A horizontal swipe just fired a synthetic click on the card — ignore it.
  if (window.__swipeJustSwiped) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  // Tapping an open (swiped) card anywhere but the reveal closes it.
  const openWrap = event.target.closest(".swipe-wrap.is-open");
  if (openWrap && !event.target.closest(".swipe-delete-bg")) {
    closeAllSwipes();
    return;
  }

  const viewTarget = event.target.closest(".tab-button[data-view]");
  if (viewTarget) {
    switchView(viewTarget.dataset.view);
    return;
  }

  const target = event.target.closest("[data-action]");
  if (!target) {
    if (!event.target.closest(".choice-field")) closeChoicePopovers();
    return;
  }

  const { action } = target.dataset;
  if (action === "close-modal") closeModal();
  if (action === "toggle-choice-popover") toggleChoicePopover(target);
  if (action === "set-choice-value") setChoiceValue(target);
  if (action === "switch-view") switchView(target.dataset.view);
  if (action === "toggle-density") toggleUiDensity();
  if (action === "set-density") setUiDensity(target.dataset.density);
  if (action === "set-training-mode") setTrainingMode(target.dataset.mode);
  if (action === "set-training-analytics-tab") setTrainingAnalyticsTab(target.dataset.tab);
  if (action === "set-training-analytics-window") setTrainingAnalyticsWindow(target.dataset.window);
  if (action === "set-analytics-exercise") {
    state.settings.analyticsExerciseId = target.dataset.exercise;
    renderTrainingAnalytics();
    refreshIcons();
  }
  if (action === "shift-day") shiftDay(Number(target.dataset.shift));
  if (action === "select-year-week") selectYearWeek(Number(target.dataset.week));
  if (action === "go-today") goToday();
  if (action === "shift-calendar-month") shiftCalendarMonth(Number(target.dataset.shift));
  if (action === "calendar-today") goToday();
  if (action === "select-calendar-date") selectDate(target.dataset.date);
  if (action === "reset-day") resetDay();
  if (action === "toggle-habit") toggleHabit(target.dataset.habit);
  if (action === "set-quality") setQuality(target.dataset.habit, target.dataset.quality);
  if (action === "open-habit-modal") openHabitModal(target.dataset.id);
  if (action === "open-day-note") openDayModal();
  if (action === "open-quick-timer") openQuickTimerModal();
  if (action === "start-exercise-timer") startExerciseTimer(target.dataset.exercise);
  if (action === "quick-timer-scheme") setQuickTimerScheme(target.dataset.scheme);
  if (action === "quick-timer-hold") setQuickTimerHold(Number(target.dataset.seconds));
  if (action === "quick-timer-start") startQuickTimer();
  if (action === "quick-timer-pause") pauseQuickTimer();
  if (action === "quick-timer-reset") resetQuickTimer();
  if (action === "quick-timer-metronome") toggleQuickTimerMetronome();
  if (action === "apply-timer-hold") applyTimerHoldToDenseForm();
  if (action === "apply-soft-target") applySoftTarget(target);
  if (action === "select-week") selectWeek(target.dataset.week);
  if (action === "select-session") selectSession(target.dataset.session);
  if (action === "toggle-exercise") toggleExercise(target.dataset.session, target.dataset.exercise);
  if (action === "load-dense-entry") loadDenseEntry(target.dataset.entry);
  if (action === "open-dense-entry-modal") openDenseTrainingModal({ entryId: target.dataset.entry });
  if (action === "open-dense-exercise-modal") openDenseTrainingModal({ exerciseId: target.dataset.exercise });
  if (action === "open-workout-exercise-picker") openWorkoutExercisePickerModal();
  if (action === "add-planned-exercise") addPlannedExerciseToSelectedDate(target.dataset.exercise, { isTest: target.dataset.test === "1", scheme: target.dataset.scheme || "" });
  if (action === "open-failure-set-picker") openFailureSetPicker(target.dataset.group);
  if (action === "pick-failure-exercise") openDenseTrainingModal({ exerciseId: target.dataset.exercise, failure: true });
  if (action === "toggle-exercise-group") toggleExerciseGroup(target.dataset.group);
  if (action === "toggle-exercise-video") toggleExerciseVideo(target.dataset.exercise);
  if (action === "open-dense-exercise-detail") openDenseExerciseDetailModal(target.dataset.exercise);
  if (action === "confirm-delete-dense-entry") openDenseDeleteConfirm(target.dataset.entry);
  if (action === "delete-dense-entry") deleteDenseEntry(target.dataset.entry);
  if (action === "confirm-delete-planned-exercise") openPlannedExerciseDeleteConfirm(Number(target.dataset.planIndex));
  if (action === "delete-planned-exercise") deletePlannedExercise(Number(target.dataset.planIndex));
  if (action === "pick-dense-exercise") pickDenseExercise(target.dataset.exercise);
  if (action === "toggle-dense-favorite") toggleDenseFavorite(target.dataset.exercise);
  if (action === "focus-dense-register") openDenseTrainingModal({ exerciseId: state.settings.denseSelectedExerciseId });
  if (action === "export-json") exportJson();
  if (action === "copy-json") copyJson();
  if (action === "sync-now") syncCloudState("manual");
  if (action === "restore-cloud") restoreCloudState({ reason: "manual" });
  if (action === "open-cloud-tools") openCloudToolsModal();
  if (action === "factory-reset") factoryReset();
}

function handleChange(event) {
  if (event.target.matches("#importFile")) importJson(event.target.files?.[0]);
  if (event.target.matches("#denseTrainingForm input[name='natureChoice']")) updateDenseNatureSelection(event.target);
  if (event.target.matches("#denseTrainingForm input[name='scheme']")) updateDenseSchemeSelection(event.target);
  if (event.target.matches("#denseTrainingForm input[name='readiness']")) updateDenseReadinessSelection(event.target);
  if (event.target.matches("#denseTrainingForm input[name='effort']")) updateDenseEffortSelection(event.target);
  if (event.target.matches("[data-action-input='session-note']")) {
    const sessionId = event.target.dataset.session;
    const log = getSessionLog(sessionId);
    log.note = event.target.value;
    log.updatedAt = new Date().toISOString();
    saveAndRender("Nota guardada");
  }
  if (event.target.matches("[data-action-input='dense-exercise-category']")) {
    state.settings.denseExerciseCategory = event.target.value;
    refreshDenseExercisePickerSurface();
  }
  if (event.target.matches("[data-action-input='dense-exercise-sort']")) {
    state.settings.denseExerciseSort = event.target.value;
    refreshDenseExercisePickerSurface();
  }
}

function handleInput(event) {
  if (event.target.matches("[data-action-input='dense-exercise-search']")) {
    state.settings.denseExerciseSearch = event.target.value;
    applyDenseExerciseSearch(event.target.value);
  }
  if (event.target.matches("#denseTrainingForm [name='repsPerSet']")) {
    updateDenseTotalFromRepsPerSet(event.target);
  }
  if (event.target.matches("[data-action-input='quick-timer-rounds']")) {
    setQuickTimerRoundsLive(event.target.value);
  }
  if (event.target.matches("[data-action-input='quick-timer-hold-custom']")) {
    setQuickTimerHoldLive(event.target.value);
  }
  if (event.target.matches("#denseTrainingForm [name='holdSecondsPerRound'], #denseTrainingForm [name='rounds']")) {
    updateDenseHoldEstimate(event.target.closest("#denseTrainingForm"));
  }
}

function handleSubmit(event) {
  if (event.target.id === "habitForm") {
    event.preventDefault();
    saveHabitForm(event.target);
  }
  if (event.target.id === "dayForm") {
    event.preventDefault();
    saveDayForm(event.target);
  }
  if (event.target.id === "cloudSyncForm") {
    event.preventDefault();
    saveCloudSyncForm(event.target);
  }
  if (event.target.id === "denseTrainingForm") {
    event.preventDefault();
    saveDenseTrainingForm(event.target);
  }
  if (event.target.id === "denseFeedbackForm") {
    event.preventDefault();
    saveDenseFeedbackForm(event.target);
  }
}

function switchView(view) {
  state.settings.view = view;
  saveAndRender();
}

function persistUiOnly() {
  state.settings.selectedDate = dateKey(selectedDate);
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  render();
}

function toggleUiDensity() {
  state.settings.uiDensity = (state.settings.uiDensity || "normal") === "compact" ? "normal" : "compact";
  persistUiOnly();
  toast(state.settings.uiDensity === "compact" ? "Modo compacto" : "Modo normal");
}

function setUiDensity(density) {
  if (!["normal", "compact"].includes(density)) return;
  state.settings.uiDensity = density;
  persistUiOnly();
}

function setTrainingAnalyticsTab(tab) {
  if (!trainingAnalyticsTabs.some(([value]) => value === tab)) return;
  state.settings.trainingAnalyticsTab = tab;
  persistUiOnly();
}

function setTrainingMode(mode) {
  if (!trainingModeTabs.some(([value]) => value === mode)) return;
  state.settings.trainingMode = mode;
  persistUiOnly();
}

function setTrainingAnalyticsWindow(windowKey) {
  if (!trainingAnalyticsWindows.some(([value]) => value === windowKey)) return;
  state.settings.trainingAnalyticsWindow = windowKey;
  persistUiOnly();
}

function shiftDay(amount) {
  selectedDate = addDays(selectedDate, amount);
  state.settings.selectedDate = dateKey(selectedDate);
  state.settings.calendarAnchor = monthKey(selectedDate);
  saveAndRender();
}

function selectYearWeek(weekNumber) {
  const week = clamp(Math.round(weekNumber || 1), 1, 52);
  const weekdayIndex = (selectedDate.getDay() + 6) % 7;
  selectedDate = addDays(yearWeekStart(selectedDate.getFullYear(), week), weekdayIndex);
  state.settings.selectedDate = dateKey(selectedDate);
  state.settings.calendarAnchor = monthKey(selectedDate);
  saveAndRender(`Week ${week}`);
}

function goToday() {
  selectedDate = startOfDay(new Date());
  state.settings.selectedDate = dateKey(selectedDate);
  state.settings.calendarAnchor = monthKey(selectedDate);
  saveAndRender();
}

function selectDate(key) {
  selectedDate = parseDate(key);
  state.settings.selectedDate = dateKey(selectedDate);
  state.settings.calendarAnchor = monthKey(selectedDate);
  saveAndRender("Fecha seleccionada");
}

function shiftCalendarMonth(amount) {
  const anchor = parseDate(state.settings.calendarAnchor || monthKey(selectedDate));
  state.settings.calendarAnchor = monthKey(addMonths(anchor, amount));
  saveAndRender();
}

function resetDay() {
  state.records[dateKey(selectedDate)] = {};
  saveAndRender("Día reiniciado");
}

function toggleHabit(habitId) {
  const key = dateKey(selectedDate);
  state.records[key] ||= {};
  const entry = getHabitEntry(key, habitId);
  state.records[key][habitId] = {
    done: !entry.done,
    quality: entry.done ? entry.quality : entry.quality || "base",
    completedAt: entry.done ? null : new Date().toISOString(),
  };
  saveAndRender(entry.done ? "Quitado" : "+XP");
}

function setQuality(habitId, quality) {
  const key = dateKey(selectedDate);
  state.records[key] ||= {};
  const entry = getHabitEntry(key, habitId);
  state.records[key][habitId] = {
    ...entry,
    done: true,
    quality,
    completedAt: entry.completedAt || new Date().toISOString(),
  };
  saveAndRender("Calidad actualizada");
}

function openHabitModal(id) {
  const habit = id === "new" ? defaultNewHabit() : state.habits.find((item) => item.id === id);
  if (!habit) return;

  nodes.modalEyebrow.textContent = id === "new" ? "Nuevo hábito" : "Editar hábito";
  nodes.modalTitle.textContent = habit.name;
  nodes.modalBody.innerHTML = `
    <form id="habitForm" method="dialog">
      <input type="hidden" name="id" value="${escapeAttr(habit.id)}" />
      <div class="field-grid">
        ${field("Nombre (cómo lo verás en la tarjeta)", "name", habit.name)}
        ${field("Objetivo corto (lo que cuenta como hecho)", "target", habit.target)}
        ${habitChoiceField("icon", "Icono (pulsa para elegir uno visual)", habit.icon)}
        ${habitChoiceField("color", "Color (pulsa para elegir tono)", habit.color)}
        ${habitChoiceField("stat", "Stat (qué atributo sube)", habit.stat)}
        ${field("XP base (recompensa; 10 fácil, 30 duro)", "xp", habit.xp, "number")}
        ${field("Tolerancia (0-100; margen del hábito)", "tolerance", habit.tolerance, "number")}
        <label class="field">
          <span>Tipo (core suma al score serio; extra es opcional)</span>
          <select name="core">
            <option value="true" ${habit.core ? "selected" : ""}>Core - no negociable</option>
            <option value="false" ${!habit.core ? "selected" : ""}>Extra - bonus/hábito de apoyo</option>
          </select>
        </label>
        <label class="field is-full">
          <span>Descripción (contexto personal, regla o intención)</span>
          <textarea name="detail">${escapeHtml(habit.detail)}</textarea>
        </label>
      </div>
      <div class="modal-actions">
        ${id !== "new" ? `<button class="text-button is-danger" type="button" data-action="archive-habit-inline" data-id="${habit.id}"><i data-lucide="archive"></i>${habit.archived ? "Activar" : "Archivar"}</button>` : ""}
        <button class="text-button is-hot" type="submit"><i data-lucide="save"></i>Guardar</button>
      </div>
    </form>
  `;
  nodes.modalBody.querySelector("[data-action='archive-habit-inline']")?.addEventListener("click", () => {
    const item = state.habits.find((entry) => entry.id === habit.id);
    item.archived = !item.archived;
    closeModal();
    saveAndRender(item.archived ? "Archivado" : "Activado");
  });
  openModal();
}

function openDayModal() {
  const key = dateKey(selectedDate);
  const note = state.dayNotes[key] || {};

  nodes.modalEyebrow.textContent = "Día";
  nodes.modalTitle.textContent = formatLongDate(selectedDate);
  nodes.modalBody.innerHTML = `
    <form id="dayForm">
      <div class="field-grid">
        ${field("Energía 1-5", "energy", note.energy || "", "number")}
        ${field("Sueño", "sleep", note.sleep || "")}
        <label class="field is-full">
          <span>FROG</span>
          <textarea name="frogTask">${escapeHtml(note.frogTask || "")}</textarea>
        </label>
        <label class="field is-full">
          <span>Familia</span>
          <textarea name="familyNote">${escapeHtml(note.familyNote || "")}</textarea>
        </label>
        <label class="field is-full">
          <span>Nota</span>
          <textarea name="note">${escapeHtml(note.note || "")}</textarea>
        </label>
      </div>
      <div class="modal-actions">
        <button class="text-button is-hot" type="submit"><i data-lucide="save"></i>Guardar</button>
      </div>
    </form>
  `;
  openModal();
}

function openQuickTimerModal() {
  syncQuickTimerFromForm();
  nodes.modalEyebrow.textContent = "Tools";
  nodes.modalTitle.textContent = "Quick Timer";
  renderQuickTimerModalBody();
  openModal();
}

// Open the timer pre-configured for a planned exercise (scheme, rounds, hold)
function startExerciseTimer(exerciseId) {
  const exercise = findDenseExerciseById(exerciseId);
  if (!exercise) {
    toast("Ejercicio no válido");
    return;
  }
  const scheme = densePlannedScheme(exercise);
  const suggestion = denseProgressionSuggestion(exercise, "normal", scheme);
  const base = denseSchemeBase(scheme);
  if (bodyweightSchemes.includes(base)) quickTimerState.scheme = base;
  quickTimerState.rounds = Number(suggestion?.rounds) || denseSchemeMinutes(scheme) || quickTimerState.rounds || 5;
  // Match the recommended hold (e.g. 5D23s) rather than a generic default.
  const suggestedHold = suggestion?.type === "hold" ? Number(suggestion.holdSecondsPerRound) : Number(denseFormTargetHoldPerRound(exercise, scheme, suggestion));
  quickTimerState.holdSeconds = denseIsIsometric(exercise) ? suggestedHold || Number(denseDefaultHoldPerRound(exercise, scheme)) || quickTimerState.holdSeconds || 0 : 0;
  state.settings.denseSelectedExerciseId = exercise.id;
  resetQuickTimer(false);
  nodes.modalEyebrow.textContent = "Tools";
  nodes.modalTitle.textContent = `Cronómetro · ${exercise.name}`;
  renderQuickTimerModalBody();
  openModal();
}

function renderQuickTimerModalBody() {
  const totalSeconds = quickTimerTotalSeconds();
  const remaining = quickTimerState.remainingSeconds || totalSeconds;
  const holdTotal = quickTimerState.holdSeconds ? quickTimerState.holdSeconds * quickTimerState.rounds : 0;
  nodes.modalBody.innerHTML = `
    <div class="quick-timer">
      <div class="quick-timer-display">
        <strong>${formatTimerSeconds(remaining)}</strong>
        <span>Round ${Math.min(quickTimerState.currentRound, quickTimerState.rounds)} / ${quickTimerState.rounds}${quickTimerState.holdSeconds ? ` · ${quickTimerState.holdSeconds}s hold` : ""}</span>
      </div>
      <section>
        <p class="timer-label">Choose scheme</p>
        <div class="timer-option-grid">
          ${bodyweightSchemes.map((scheme) => timerOptionButton("quick-timer-scheme", scheme, scheme, quickTimerState.scheme === scheme)).join("")}
        </div>
      </section>
      <label class="field">
        <span>Custom rounds</span>
        <input data-action-input="quick-timer-rounds" type="number" min="1" max="120" value="${escapeAttr(quickTimerState.rounds)}" />
      </label>
      <section>
        <p class="timer-label">Hold per round</p>
        <div class="timer-option-grid is-hold">
          ${[0, 5, 10, 20, 30, 40, 60].map((seconds) => timerOptionButton("quick-timer-hold", seconds, seconds ? `${seconds}s` : "Off", quickTimerState.holdSeconds === seconds)).join("")}
        </div>
        <label class="field timer-custom-hold">
          <span>Hold custom (s)</span>
          <input data-action-input="quick-timer-hold-custom" type="number" min="0" max="600" step="1" value="${escapeAttr(quickTimerState.holdSeconds || "")}" placeholder="ej. 23" />
        </label>
      </section>
      <div class="quick-timer-summary">
        <span>${quickTimerState.rounds} rondas</span>
        <span>${quickTimerState.holdSeconds ? `${holdTotal}s TUT objetivo` : "modo reps/EMOM"}</span>
      </div>
      <div class="timer-actions">
        ${
          quickTimerState.running
            ? `<button class="text-button is-hot" type="button" data-action="quick-timer-pause"><i data-lucide="pause"></i>Pausar</button>`
            : `<button class="text-button is-hot" type="button" data-action="quick-timer-start"><i data-lucide="play"></i>Start timer</button>`
        }
        <button class="text-button" type="button" data-action="quick-timer-reset"><i data-lucide="rotate-ccw"></i>Reset</button>
      </div>
      <button class="text-button timer-wide-button ${quickTimerState.metronome ? "is-hot" : ""}" type="button" data-action="quick-timer-metronome">
        <i data-lucide="music"></i>${quickTimerState.metronome ? "Metronome on" : "Use metronome instead"}
      </button>
      <button class="text-button timer-wide-button" type="button" data-action="apply-timer-hold">
        <i data-lucide="clipboard-check"></i>Aplicar hold al registro
      </button>
    </div>
  `;
  refreshIcons();
}

function timerOptionButton(action, value, label, selected) {
  return `
    <button class="timer-option ${selected ? "is-selected" : ""}" type="button" data-action="${action}" data-${action === "quick-timer-hold" ? "seconds" : "scheme"}="${escapeAttr(value)}">
      ${escapeHtml(label)}
    </button>
  `;
}

function syncQuickTimerFromForm() {
  const form = document.querySelector("#denseTrainingForm");
  const scheme = form?.querySelector("input[name='scheme']:checked")?.value;
  const rounds = positiveNumber(form?.querySelector("[name='rounds']")?.value);
  const hold = positiveNumber(form?.querySelector("[name='holdSecondsPerRound']")?.value);
  if (scheme && bodyweightSchemes.includes(denseSchemeBase(scheme))) {
    quickTimerState.scheme = denseSchemeBase(scheme);
  }
  quickTimerState.rounds = rounds || denseSchemeMinutes(quickTimerState.scheme) || 5;
  quickTimerState.holdSeconds = hold || quickTimerState.holdSeconds || 0;
  if (!quickTimerState.running) {
    quickTimerState.remainingSeconds = quickTimerTotalSeconds();
    quickTimerState.currentRound = 1;
  }
}

function setQuickTimerScheme(scheme) {
  quickTimerState.scheme = scheme;
  quickTimerState.rounds = denseSchemeMinutes(scheme) || quickTimerState.rounds;
  resetQuickTimer(false);
  renderQuickTimerModalBody();
}

function setQuickTimerRounds(value) {
  quickTimerState.rounds = clamp(Math.round(Number(value) || denseSchemeMinutes(quickTimerState.scheme) || 1), 1, 120);
  resetQuickTimer(false);
  renderQuickTimerModalBody();
}

function setQuickTimerHold(seconds) {
  quickTimerState.holdSeconds = Math.max(0, Number(seconds) || 0);
  resetQuickTimer(false);
  renderQuickTimerModalBody();
}

// Live update from a number input: patch the readout without rebuilding the
// inputs (so multi-digit typing like "23" doesn't lose focus after each key).
function setQuickTimerRoundsLive(value) {
  quickTimerState.rounds = clamp(Math.round(Number(value) || 1), 1, 120);
  if (!quickTimerState.running) {
    quickTimerState.remainingSeconds = quickTimerTotalSeconds();
    quickTimerState.currentRound = 1;
  }
  patchQuickTimerReadout();
}

function setQuickTimerHoldLive(value) {
  quickTimerState.holdSeconds = clamp(Math.round(Number(value) || 0), 0, 600);
  if (!quickTimerState.running) quickTimerState.remainingSeconds = quickTimerTotalSeconds();
  patchQuickTimerReadout();
}

function patchQuickTimerReadout() {
  const body = nodes.modalBody;
  if (!body || !body.querySelector(".quick-timer")) return;
  const remaining = quickTimerState.remainingSeconds || quickTimerTotalSeconds();
  const disp = body.querySelector(".quick-timer-display strong");
  const sub = body.querySelector(".quick-timer-display span");
  const summary = body.querySelector(".quick-timer-summary");
  if (disp) disp.textContent = formatTimerSeconds(remaining);
  if (sub) {
    sub.textContent = `Round ${Math.min(quickTimerState.currentRound, quickTimerState.rounds)} / ${quickTimerState.rounds}${quickTimerState.holdSeconds ? ` · ${quickTimerState.holdSeconds}s hold` : ""}`;
  }
  if (summary) {
    const holdTotal = quickTimerState.holdSeconds ? quickTimerState.holdSeconds * quickTimerState.rounds : 0;
    summary.innerHTML = `<span>${quickTimerState.rounds} rondas</span><span>${quickTimerState.holdSeconds ? `${holdTotal}s TUT objetivo` : "modo reps/EMOM"}</span>`;
  }
}

function quickTimerTotalSeconds() {
  return Math.max(1, quickTimerState.rounds || denseSchemeMinutes(quickTimerState.scheme) || 1) * 60;
}

function startQuickTimer() {
  if (quickTimerState.running) return;
  if (!quickTimerState.remainingSeconds) quickTimerState.remainingSeconds = quickTimerTotalSeconds();
  quickTimerState.running = true;
  quickTimerState.startedAt = Date.now();
  clearInterval(quickTimerState.intervalId);
  quickTimerState.intervalId = setInterval(tickQuickTimer, 1000);
  // Cue the start of the first hold so the beeps mark the full first TUT window.
  playTimerBeep(quickTimerState.holdSeconds > 0 ? 780 : 880);
  renderQuickTimerModalBody();
}

function tickQuickTimer() {
  quickTimerState.remainingSeconds = Math.max(0, quickTimerState.remainingSeconds - 1);
  const elapsed = quickTimerTotalSeconds() - quickTimerState.remainingSeconds;
  quickTimerState.currentRound = clamp(Math.floor(elapsed / 60) + 1, 1, quickTimerState.rounds);
  const hold = quickTimerState.holdSeconds;
  const secIntoRound = elapsed % 60;
  const atRoundBoundary = secIntoRound === 0;
  if (quickTimerState.metronome) {
    playTimerBeep(440);
  } else if (hold > 0 && quickTimerState.remainingSeconds > 0) {
    // Isometric mode: cue the start and the end of each hold (TUT window).
    if (hold < 60 && secIntoRound === hold) playTimerBeep(1180); // end of hold
    else if (atRoundBoundary) playTimerBeep(780); // next hold starts
  } else if (atRoundBoundary) {
    playTimerBeep(880); // round boundary (reps/EMOM)
  }
  if (quickTimerState.remainingSeconds <= 0) {
    pauseQuickTimer(false);
    playTimerBeep(1180);
  }
  if (nodes.modal.open && nodes.modalBody.querySelector(".quick-timer")) renderQuickTimerModalBody();
}

function pauseQuickTimer(renderBody = true) {
  quickTimerState.running = false;
  clearInterval(quickTimerState.intervalId);
  quickTimerState.intervalId = null;
  if (renderBody && nodes.modal.open) renderQuickTimerModalBody();
}

function resetQuickTimer(renderBody = true) {
  pauseQuickTimer(false);
  quickTimerState.remainingSeconds = quickTimerTotalSeconds();
  quickTimerState.currentRound = 1;
  if (renderBody && nodes.modal.open) renderQuickTimerModalBody();
}

function toggleQuickTimerMetronome() {
  quickTimerState.metronome = !quickTimerState.metronome;
  if (quickTimerState.metronome) playTimerBeep(660);
  renderQuickTimerModalBody();
}

function applyTimerHoldToDenseForm() {
  const form = document.querySelector("#denseTrainingForm");
  if (!form) {
    toast("Abre Training > Workout para aplicar el hold");
    return;
  }
  const holdInput = form.querySelector("[name='holdSecondsPerRound']");
  const roundsInput = form.querySelector("[name='rounds']");
  if (holdInput) holdInput.value = quickTimerState.holdSeconds || "";
  if (roundsInput) roundsInput.value = quickTimerState.rounds || "";
  updateDenseHoldEstimate(form);
  closeModal();
  toast("Hold aplicado al registro");
}

function updateDenseHoldEstimate(form) {
  if (!form) return;
  const hold = positiveNumber(form.querySelector("[name='holdSecondsPerRound']")?.value);
  const rounds = positiveNumber(form.querySelector("[name='rounds']")?.value);
  const preview = form.querySelector("[data-hold-preview]");
  if (!preview) return;
  if (!hold || !rounds) {
    preview.textContent = "Hold off";
    preview.classList.remove("is-active");
    return;
  }
  preview.textContent = `${hold * rounds}s TUT objetivo · ${rounds} rondas x ${hold}s`;
  preview.classList.add("is-active");
}

function playTimerBeep(frequency = 660) {
  try {
    quickTimerState.audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const ctx = quickTimerState.audioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.14);
  } catch {
    // Audio can be blocked until the user interacts; the visual timer still works.
  }
}

function saveHabitForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const id = data.id === "new" ? slugify(data.name) : data.id;
  const habit = {
    id,
    name: data.name.trim() || "Hábito",
    detail: data.detail.trim(),
    icon: data.icon.trim() || "circle",
    color: data.color || "#68d66f",
    stat: data.stat,
    target: data.target.trim(),
    xp: clamp(Number(data.xp) || 10, 1, 100),
    tolerance: clamp(Number(data.tolerance) || 70, 0, 100),
    core: data.core === "true",
    archived: false,
  };

  const index = state.habits.findIndex((item) => item.id === data.id || item.id === id);
  if (index >= 0) state.habits[index] = { ...state.habits[index], ...habit };
  else state.habits.push(habit);

  closeModal();
  saveAndRender("Hábito guardado");
}

function saveDayForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const key = dateKey(selectedDate);
  state.dayNotes[key] = {
    energy: data.energy ? clamp(Number(data.energy), 1, 5) : "",
    sleep: data.sleep.trim(),
    frogTask: data.frogTask.trim(),
    familyNote: data.familyNote.trim(),
    note: data.note.trim(),
  };
  closeModal();
  saveAndRender("Día guardado");
}

// Transient in-form modality choice (allowedNatures). Reset every time the set
// modal opens fresh so it never leaks across exercises.
let denseFormNatureOverride = null;
let denseSetModalContext = { includePicker: false, editing: false };
// True while logging a weekly "set to failure" so the form pre-selects fallo.
let denseFailureSetMode = false;

function denseSetModalBodyHtml() {
  return `
    <div class="dense-set-modal-shell">
      ${denseTrainingFormMarkup(denseFormDefaults(), {
        includePicker: denseSetModalContext.includePicker,
        modal: true,
        submitLabel: denseSetModalContext.editing ? "Update set" : "Save set",
      })}
    </div>
  `;
}

function openDenseTrainingModal({ exerciseId = "", entryId = "", failure = false } = {}) {
  const entry = entryId ? getDenseEntries().find((item) => item.id === entryId) : null;
  const exercise = entry ? denseExerciseById(entry.exercise_id) : denseExerciseById(exerciseId || state.settings.denseSelectedExerciseId || "pull_up");
  if (!exercise) return;

  state.settings.denseSelectedExerciseId = exercise.id;
  if (entry) state.settings.denseDraftEntryId = entry.id;
  else delete state.settings.denseDraftEntryId;

  denseFormNatureOverride = null;
  denseFailureSetMode = failure && !entry;
  denseSetModalContext = { includePicker: !entry && !exerciseId, editing: Boolean(entry) };
  nodes.modalCard.dataset.modalKind = "dense-set";
  nodes.modalEyebrow.textContent = denseSetModalContext.editing ? "Editing set" : denseFailureSetMode ? "Set al fallo" : "New set";
  nodes.modalTitle.textContent = exercise.name;
  nodes.modalBody.innerHTML = denseSetModalBodyHtml();
  openModal();
  updateDenseHoldEstimate(nodes.modalBody.querySelector("#denseTrainingForm"));
}

// Re-render the set form after a modality switch, preserving the fields that
// carry across modalities (bodyweight, effort, readiness, notes).
function updateDenseNatureSelection(input) {
  const form = input.closest("#denseTrainingForm");
  if (!form) return;
  const preserve = {
    bodyweightKg: form.querySelector("[name='bodyweightKg']")?.value,
    notes: form.querySelector("[name='notes']")?.value,
    romCm: form.querySelector("[name='romCm']")?.value,
    effort: form.querySelector("input[name='effort']:checked")?.value,
    readiness: form.querySelector("input[name='readiness']:checked")?.value,
  };
  denseFormNatureOverride = input.value;
  nodes.modalBody.innerHTML = denseSetModalBodyHtml();
  const next = nodes.modalBody.querySelector("#denseTrainingForm");
  if (next) {
    const bw = next.querySelector("[name='bodyweightKg']");
    if (bw && preserve.bodyweightKg) bw.value = preserve.bodyweightKg;
    const notes = next.querySelector("[name='notes']");
    if (notes && preserve.notes) notes.value = preserve.notes;
    const rom = next.querySelector("[name='romCm']");
    if (rom && preserve.romCm) rom.value = preserve.romCm;
    ["effort", "readiness"].forEach((name) => {
      if (!preserve[name]) return;
      const radio = next.querySelector(`input[name='${name}'][value='${preserve[name]}']`);
      if (!radio) return;
      radio.checked = true;
      const optionClass = name === "effort" ? ".effort-option" : ".readiness-option";
      next.querySelectorAll(optionClass).forEach((option) => option.classList.toggle("is-selected", option.contains(radio)));
    });
  }
  refreshIcons();
  updateDenseHoldEstimate(next);
}

function openWorkoutExercisePickerModal() {
  nodes.modalCard.dataset.modalKind = "workout-exercise-picker";
  nodes.modalEyebrow.textContent = "Programar";
  nodes.modalTitle.textContent = "Elegir ejercicio";
  nodes.modalBody.innerHTML = `
    <div class="workout-exercise-picker-modal">
      ${workoutExercisePickerMarkup()}
    </div>
  `;
  openModal();
}

// Exercise families shown as a collapsible group of progressions in the picker.
const denseExerciseGroupConfig = {
  front_lever: { label: "Front Lever", icon: "move-horizontal" },
  back_lever: { label: "Back Lever", icon: "rotate-ccw" },
  front_lever_pull: { label: "Front Lever Pull", icon: "move-horizontal" },
  back_lever_pull: { label: "Back Lever Pull", icon: "rotate-ccw" },
  cuelgue: { label: "Cuelgue", icon: "grip-horizontal" },
  l_sit: { label: "L-Sit", icon: "armchair" },
  side_split: { label: "Side Split", icon: "move-horizontal" },
  pancake: { label: "Pancake", icon: "fold-horizontal" },
};
const expandedExerciseGroups = new Set();
let expandedVideoExerciseId = null;

function denseVideoEmbedUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    let id = "";
    if (parsed.hostname.includes("youtu.be")) id = parsed.pathname.slice(1);
    else if (parsed.searchParams.get("v")) id = parsed.searchParams.get("v");
    else if (parsed.pathname.includes("/embed/")) id = parsed.pathname.split("/embed/")[1];
    id = (id || "").split(/[?&/]/)[0];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
  } catch {
    return "";
  }
}

function toggleExerciseVideo(exerciseId) {
  expandedVideoExerciseId = expandedVideoExerciseId === exerciseId ? null : exerciseId;
  refreshDenseExercisePickerSurface();
}

function workoutExercisePickerMarkup() {
  const category = state.settings.denseExerciseCategory || "all";
  const sort = state.settings.denseExerciseSort || "recent";
  const search = state.settings.denseExerciseSearch || "";
  const exercises = denseExerciseLibrary({ category, sort, search });
  return `
    <section class="dense-exercise-picker is-workout-picker">
      <div class="exercise-picker-controls">
        <label class="field exercise-search-field">
          <span>Buscar</span>
          <i data-lucide="search" class="exercise-search-icon" aria-hidden="true"></i>
          <input data-action-input="dense-exercise-search" type="search" value="${escapeAttr(search)}" placeholder="front lever, dominadas, hspu..." />
        </label>
        <label class="field">
          <span>Grupo</span>
          <select data-action-input="dense-exercise-category" aria-label="Grupo">
            ${denseExerciseCategories.map(([value, label]) => `<option value="${value}" ${category === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Orden</span>
          <select data-action-input="dense-exercise-sort" aria-label="Orden">
            ${denseExerciseSortOptions.map(([value, label]) => `<option value="${value}" ${sort === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="picker-meta"><span>${exercises.length} ejercicio${exercises.length === 1 ? "" : "s"}</span><small>se añade como tarjeta del día</small></div>
      <div class="exercise-picker-list">
        ${denseWorkoutPickerListMarkup(exercises, search.trim().toLowerCase())}
      </div>
    </section>
  `;
}

function denseWorkoutPickerListMarkup(exercises, query) {
  if (!exercises.length) return `<article class="exercise-pick-empty">No hay ejercicios con ese filtro.</article>`;
  const items = [];
  const groups = {};
  exercises.forEach((exercise) => {
    const cfg = denseExerciseGroupConfig[exercise.family];
    if (cfg) {
      if (!groups[exercise.family]) {
        groups[exercise.family] = { family: exercise.family, ...cfg, children: [] };
        items.push({ type: "group", group: groups[exercise.family] });
      }
      groups[exercise.family].children.push(exercise);
    } else {
      items.push({ type: "exercise", exercise });
    }
  });
  return items
    .map((item) => {
      if (item.type === "exercise") return denseExercisePickCard(item.exercise, "", "add-planned-exercise");
      const group = item.group;
      const children = [...group.children].sort((a, b) => (a.alpha || 0) - (b.alpha || 0));
      const expanded = expandedExerciseGroups.has(group.family) || Boolean(query);
      const color = denseCategoryColor(children[0].category);
      return `
        <div class="exercise-group ${expanded ? "is-open" : ""}">
          <button class="exercise-group-head" type="button" data-action="toggle-exercise-group" data-group="${escapeAttr(group.family)}" aria-expanded="${expanded}">
            <span class="tiny-icon" style="--item-color:${color}"><i data-lucide="${group.icon}"></i></span>
            <span class="exercise-group-text">
              <strong>${escapeHtml(group.label)}</strong>
              <small>${children.length} progresiones</small>
            </span>
            <i class="exercise-group-chevron" data-lucide="${expanded ? "chevron-up" : "chevron-down"}"></i>
          </button>
          ${expanded ? `<div class="exercise-group-children">${children.map((exercise) => denseExercisePickCard(exercise, "", "add-planned-exercise")).join("")}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

function refreshDenseExercisePickerSurface() {
  if (nodes.modal.open && nodes.modalCard.dataset.modalKind === "workout-exercise-picker") {
    const shell = nodes.modalBody.querySelector(".workout-exercise-picker-modal");
    if (shell) {
      shell.innerHTML = `
        <p class="tiny-copy">Añade un ejercicio al día. Luego aparecerá como tarjeta programada para rellenarlo cuando entrenes.</p>
        ${workoutExercisePickerMarkup()}
      `;
      refreshIcons();
      return;
    }
  }
  renderDenseTraining();
  refreshIcons();
}

function toggleExerciseGroup(family) {
  if (!family) return;
  if (expandedExerciseGroups.has(family)) expandedExerciseGroups.delete(family);
  else expandedExerciseGroups.add(family);
  refreshDenseExercisePickerSurface();
}

// denseDayPlans v2: each planned item is an object { exercise_id, source,
// scheme?, is_test? }. Old plans stored bare exercise-id strings — this
// normalizer lets every reader handle both without a data migration.
function densePlanItem(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return { exercise_id: raw, source: "manual" };
  return raw.exercise_id ? raw : null;
}

function densePlanItemsForDate(day) {
  return (state.denseDayPlans?.[dateKey(day)] || []).map(densePlanItem).filter(Boolean);
}

function addPlannedExerciseToSelectedDate(exerciseId, { isTest = false, scheme = "" } = {}) {
  const exercise = findDenseExerciseById(exerciseId);
  if (!exercise) {
    toast("Ejercicio no válido");
    return;
  }
  const key = dateKey(selectedDate);
  state.denseDayPlans ||= {};
  const plan = state.denseDayPlans[key] || [];
  const item = { exercise_id: exercise.id, source: isTest ? "suggestion" : "manual" };
  if (isTest) item.is_test = true;
  if (scheme) item.scheme = scheme;
  state.denseDayPlans[key] = [...plan, item];
  state.settings.denseSelectedExerciseId = exercise.id;
  closeModal();
  saveAndRender(isTest ? `${exercise.name} añadido como test` : `${exercise.name} añadido`);
}

function openDenseDeleteConfirm(entryId) {
  closeAllSwipes();
  const entry = getDenseEntries().find((item) => item.id === entryId);
  if (!entry) {
    toast("No encuentro esa marca");
    return;
  }
  nodes.modalCard.dataset.modalKind = "confirm-delete";
  nodes.modalEyebrow.textContent = "Eliminar";
  nodes.modalTitle.textContent = "¿Eliminar entreno?";
  nodes.modalBody.innerHTML = `
    <div class="confirm-box">
      <span class="tiny-icon" style="--item-color:var(--red)"><i data-lucide="trash-2"></i></span>
      <div>
        <strong>${escapeHtml(entry.exercise_name)}</strong>
        <span>${escapeHtml(entry.date)} · ${escapeHtml(entry.scheme)} · ${escapeHtml(denseEntryValue(entry))}</span>
      </div>
    </div>
    <p class="tiny-copy">Esto quitará la marca de la app y se sincronizará con Google en el siguiente sync.</p>
    <div class="modal-actions">
      <button class="text-button" type="button" data-action="close-modal"><i data-lucide="x"></i>Cancelar</button>
      <button class="text-button is-danger" type="button" data-action="delete-dense-entry" data-entry="${escapeAttr(entry.id)}"><i data-lucide="trash-2"></i>Eliminar</button>
    </div>
  `;
  openModal();
}

function openPlannedExerciseDeleteConfirm(planIndex) {
  closeAllSwipes();
  const key = dateKey(selectedDate);
  const exercise = findDenseExerciseById(densePlanItem(state.denseDayPlans?.[key]?.[planIndex])?.exercise_id);
  if (!exercise) return;
  nodes.modalCard.dataset.modalKind = "confirm-delete";
  nodes.modalEyebrow.textContent = "Quitar";
  nodes.modalTitle.textContent = "¿Quitar ejercicio del día?";
  nodes.modalBody.innerHTML = `
    <div class="confirm-box">
      <span class="tiny-icon" style="--item-color:${denseCategoryColor(exercise.category)}"><i data-lucide="${exercise.icon || "dumbbell"}"></i></span>
      <div>
        <strong>${escapeHtml(exercise.name)}</strong>
        <span>${escapeHtml(formatLongDate(selectedDate))} · programado sin marca</span>
      </div>
    </div>
    <p class="tiny-copy">Sólo se quitará de la planificación de este día. No borra marcas ya guardadas.</p>
    <div class="modal-actions">
      <button class="text-button" type="button" data-action="close-modal"><i data-lucide="x"></i>Cancelar</button>
      <button class="text-button is-danger" type="button" data-action="delete-planned-exercise" data-plan-index="${planIndex}"><i data-lucide="trash-2"></i>Quitar</button>
    </div>
  `;
  openModal();
}

function deletePlannedExercise(planIndex) {
  const key = dateKey(selectedDate);
  const plan = state.denseDayPlans?.[key];
  if (!Array.isArray(plan) || !Number.isInteger(planIndex) || planIndex < 0 || planIndex >= plan.length) {
    closeModal();
    return;
  }
  plan.splice(planIndex, 1);
  if (!plan.length) delete state.denseDayPlans[key];
  closeModal();
  saveAndRender("Ejercicio quitado");
}

function deleteDenseEntry(entryId) {
  const index = state.denseTrainingEntries?.findIndex((entry) => entry.id === entryId) ?? -1;
  if (index < 0) {
    closeModal();
    toast("No encuentro esa marca");
    return;
  }
  state.denseTrainingEntries.splice(index, 1);
  rebuildDenseEstimates();
  rebuildTransferState();
  closeModal();
  saveAndRender("Entreno eliminado");
}

function openDenseExerciseDetailModal(exerciseId) {
  const exercise = denseExerciseById(exerciseId);
  if (!exercise) return;
  const entries = selectedExerciseLogEntries(exercise.id, 8);
  const best = entries.length ? [...entries].sort((a, b) => denseEntryScore(b) - denseEntryScore(a))[0] : null;
  const suggestion = denseProgressionSuggestion(exercise);
  const videoEmbed = denseVideoEmbedUrl(exercise.video);
  const predictionCards = best ? renderDenseEstimateCards(best) : "";
  nodes.modalCard.dataset.modalKind = "exercise-detail";
  nodes.modalEyebrow.textContent = denseNatureLabel(exercise.nature).split("·")[0].trim();
  nodes.modalTitle.textContent = exercise.name;
  nodes.modalBody.innerHTML = `
    <div class="exercise-detail-modal">
      <div class="exercise-detail-hero">
        <div class="exercise-detail-tags">
          <span class="mini-tag is-blue">${escapeHtml(denseNatureLabel(exercise.nature).split("·")[0].trim())}</span>
          <span class="mini-tag is-green">BEST ${escapeHtml(best ? denseEntryValue(best) : "sin marca")}</span>
        </div>
        <p>${escapeHtml(denseExerciseHint(exercise))}</p>
      </div>
      ${
        videoEmbed
          ? `<div class="exercise-detail-video"><iframe src="${escapeAttr(videoEmbed)}" title="Vídeo ${escapeAttr(exercise.name)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
          : ""
      }
      ${renderDenseProgressionSuggestion(exercise, suggestion)}
      ${renderRomProgressCard(exercise)}
      ${
        predictionCards
          ? `<section class="exercise-detail-section">
              <div class="section-subhead"><strong>Objetivo por densidad</strong><span>según tu capacidad</span></div>
              <div class="dense-estimate-grid">${predictionCards}</div>
              ${
                denseTransferBoost(exercise.id) > 0
                  ? `<p class="transfer-note"><i data-lucide="git-merge"></i>Incluye +${roundTo(denseTransferBoost(exercise.id) * 100, 1)}% por transferencia de ${escapeHtml([...new Set((state.transfer?.boosts?.[exercise.id]?.from || []).map((f) => f.name))].slice(0, 2).join(" y ") || "ejercicios relacionados")} — estimación indirecta, falta test.</p>`
                  : ""
              }
              ${(() => {
                const tech = denseTechMasteryInfo(exercise);
                if (!tech.technical || tech.t >= 0.55) return "";
                return `<p class="transfer-note is-warn"><i data-lucide="brain"></i>Confianza reducida por falta de práctica específica — técnica ${Math.round(tech.t * 100)}% (${tech.sessions} sesión${tech.sessions === 1 ? "" : "es"} de la familia). La fuerza está, el patrón hay que engrasarlo.</p>`;
              })()}
            </section>`
          : ""
      }
      ${denseProgressionSectionHtml(exercise)}
      <section class="exercise-detail-section">
        <div class="section-subhead">
          <strong>Mis marcas</strong>
          <span>${entries.length ? `${entries.length} recientes` : "sin histórico"}</span>
        </div>
        <div class="exercise-detail-list">
          ${
            entries.length
              ? entries.map((entry, index) => exerciseDetailRow(entry, index)).join("")
              : `<article class="dense-selected-log-empty"><span class="tiny-icon"><i data-lucide="${exercise.icon || "dumbbell"}"></i></span><div><strong>No ranked yet</strong><span>Registra una marca y aparecerá aquí.</span></div></article>`
          }
        </div>
      </section>
      ${denseMilestonesSectionHtml(exercise)}
      ${(() => {
        const levels = denseExerciseLevels(exercise, best);
        if (!levels.length) return "";
        return `<section class="exercise-detail-levels">
          <strong>Strength levels</strong>
          ${levels.map((item) => `<div><span>${escapeHtml(item.label)}</span><b>${escapeHtml(item.value)}</b></div>`).join("")}
        </section>`;
      })()}
      <div class="modal-actions">
        <button class="text-button" type="button" data-action="open-dense-exercise-modal" data-exercise="${escapeAttr(exercise.id)}"><i data-lucide="plus"></i>Registrar</button>
      </div>
    </div>
  `;
  openModal();
}

// Fase 2 §3.4 — Ruta de progresión: where you come from, where you're going,
// and the parallel branches, each with its best evidence (direct mark → best
// value; leveled sibling → estimate; otherwise "sin datos"). Nodes navigate.
function denseProgressionNodeChip(exercise) {
  const entries = getDenseEntries().filter((entry) => entry.exercise_id === exercise.id && !entry.deleted_at);
  let status = "sin datos";
  let cls = "";
  if (entries.length) {
    const best = [...entries].sort((a, b) => denseEntryScore(b) - denseEntryScore(a))[0];
    status = denseEntryValue(best);
    cls = "is-direct";
  } else {
    const sibling = denseLeverSiblingEstimate(exercise, denseIsIsometric(exercise) ? "isometric_capacity" : "bodyweight_capacity");
    if (sibling) {
      status = denseIsIsometric(exercise) ? `≈ ${Math.max(1, Math.floor(sibling.value))}s est.` : `≈ ${roundTo(sibling.value, 1)}/min est.`;
      cls = "is-estimated";
    }
  }
  return `
    <button class="progression-node ${cls}" type="button" data-action="open-dense-exercise-detail" data-exercise="${escapeAttr(exercise.id)}">
      <strong>${escapeHtml(exercise.name)}</strong>
      <span>${escapeHtml(status)}</span>
    </button>
  `;
}

function denseProgressionSectionHtml(exercise) {
  const links = denseProgressionLinks(exercise);
  if (!links.prev.length && !links.next.length && !links.parallel.length) return "";
  const group = (label, icon, list) =>
    list.length
      ? `<div class="progression-group">
          <span class="progression-group-label"><i data-lucide="${icon}"></i>${label}</span>
          <div class="progression-node-list">${list.map(denseProgressionNodeChip).join("")}</div>
        </div>`
      : "";
  return `
    <section class="exercise-detail-section progression-map">
      <div class="section-subhead"><strong>Ruta de progresión</strong><span>de dónde vienes y a dónde vas</span></div>
      ${group("Vienes de", "corner-left-up", links.prev)}
      ${group("Siguiente paso", "corner-right-up", links.next)}
      ${group("Ramas paralelas", "git-branch", links.parallel)}
    </section>
  `;
}

function exerciseDetailRow(entry, index) {
  const medal = index < 3 ? `#${index + 1}` : `${index + 1}`;
  return `
    <article class="exercise-detail-row ${index < 3 ? "is-podium" : ""}">
      <span class="exercise-rank">${escapeHtml(medal)}</span>
      <div>
        <strong>${escapeHtml(entry.scheme)} · ${escapeHtml(denseEntryValue(entry))}</strong>
        <span>${escapeHtml(entry.date)} · ${escapeHtml(entry.effort || "N")}</span>
      </div>
      <b>${escapeHtml(denseEntryScore(entry) ? `${roundTo(denseEntryScore(entry), 1)} pts` : "-")}</b>
    </article>
  `;
}

// Honest v1 (revisión jul 2026): only with a DIRECT best mark, and on the
// right axis per nature — e1RM kg for loaded work, seconds for holds, reps
// otherwise. Without data the old generic ladder was nonsense on most
// exercises; a deeper benchmark-based redesign is pending with the user.
function denseExerciseLevels(exercise, best) {
  if (!best) return [];
  let base;
  let unit;
  let steps;
  if (Number(best.e1rm_kg) > 0) {
    base = Number(best.e1rm_kg);
    unit = "kg e1RM";
    steps = [0.85, 1, 1.1, 1.25];
  } else if (best.total_hold_seconds) {
    base = Number(best.total_hold_seconds);
    unit = "s";
    steps = [0.7, 1, 1.2, 1.45];
  } else if (best.total_reps) {
    base = Number(best.total_reps);
    unit = "reps";
    steps = [0.7, 1, 1.2, 1.45];
  } else {
    return [];
  }
  const labels = ["Lv 1 Base", "Lv 2 Solid", "Lv 3 Strong", "Lv 4 Elite"];
  return steps.map((step, index) => ({ label: labels[index], value: `${Math.max(1, Math.round(base * step))} ${unit}` }));
}

// "Hitos del patrón" declared on catalog entries (e.g. chin-up +BW/6 antes de
// archer; jefferson curl ⅓×BW en 5D10) — shown in the detail modal.
function denseMilestonesSectionHtml(exercise) {
  const milestones = exercise.milestones || [];
  if (!milestones.length) return "";
  return `
    <section class="exercise-detail-section">
      <div class="section-subhead"><strong>Hitos del patrón</strong><span>criterios de paso</span></div>
      <div class="exercise-detail-list">
        ${milestones
          .map(
            (milestone) => `
              <article class="exercise-detail-row">
                <span class="tiny-icon"><i data-lucide="flag"></i></span>
                <div><strong>${escapeHtml(milestone.label)}</strong><span>${escapeHtml(milestone.note || "")}</span></div>
                <b></b>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function saveDenseTrainingForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const exercise = findDenseExerciseById(data.exerciseId);
  if (!exercise) {
    toast("Ejercicio Dense no válido");
    return;
  }

  // Modality chosen in the form (allowedNatures) drives how the entry is
  // computed; falls back to the exercise default if the value is unexpected.
  const allowedNatures = exercise.allowedNatures?.length ? exercise.allowedNatures : [exercise.nature];
  const activeNature = allowedNatures.includes(data.nature) ? data.nature : exercise.nature;
  const activeExercise = { ...exercise, nature: activeNature };

  const bodyweightKg = positiveNumber(data.bodyweightKg);
  const weightPerDumbbellKg = positiveNumber(data.weightPerDumbbellKg);
  const externalLoadFromPair = exercise.loadPattern === "dumbbell_pair" && weightPerDumbbellKg ? weightPerDumbbellKg * 2 : 0;
  const isometric = denseIsIsometric(exercise);
  const scheme = data.scheme || (activeNature === "bodyweight" || isometric ? "10D" : "10D5");
  const durationMinutes = denseSchemeMinutes(scheme) || 0;
  const targetRepsPerMin = isometric
    ? 0
    : denseIsLoadExercise(activeExercise)
      ? denseDefaultRepsPerSet(activeExercise, scheme) || 0
      : positiveNumber(data.repsPerSet) || denseSchemePrescriptionAverage(scheme) || 0;
  const targetTotalReps = isometric ? 0 : denseTotalFromRepsPerSet(targetRepsPerMin, scheme) || 0;
  const totalReps = isometric ? 0 : positiveNumber(data.totalReps);
  const rounds = positiveNumber(data.rounds) || durationMinutes || null;
  const holdSecondsPerRound = positiveNumber(data.holdSecondsPerRound);
  const targetTotalHoldSeconds = holdSecondsPerRound && rounds ? holdSecondsPerRound * rounds : 0;
  const totalHoldSeconds = positiveNumber(data.totalHoldSeconds) || targetTotalHoldSeconds;
  const usesHold = isometric || Boolean(holdSecondsPerRound && rounds);
  const failed = data.effort === "fallo" || (!usesHold && targetTotalReps > 0 && totalReps > 0 && totalReps < targetTotalReps);
  const editingEntryId = state.settings.denseDraftEntryId || "";
  const existingEntry = editingEntryId ? getDenseEntries().find((entry) => entry.id === editingEntryId) : null;
  const now = new Date().toISOString();
  const raw = {
    id: existingEntry?.id || `dense-${Date.now()}`,
    version: 1,
    schema_version: 3,
    is_test: data.isTest === "on",
    date: data.date || dateKey(selectedDate),
    created_at: existingEntry?.created_at || now,
    updated_at: now,
    exercise_id: exercise.id,
    exercise_name: exercise.name,
    exercise_family_id: exercise.family,
    family: exercise.family,
    variant_id: exercise.id,
    nature: activeNature,
    movement_pattern: exercise.category,
    load_pattern: exercise.loadPattern || "",
    scheme,
    scheme_base: denseSchemeBase(scheme),
    scheme_target: denseSchemeTarget(scheme),
    scheme_type: usesHold ? "dense_hold" : denseSchemeType(exercise, scheme),
    duration_minutes: durationMinutes,
    target_reps_per_min: targetRepsPerMin,
    target_total_reps: targetTotalReps,
    reps_per_set: targetRepsPerMin,
    total_reps: usesHold ? 0 : totalReps,
    total_reps_is_manual: true,
    hold_seconds_per_round: holdSecondsPerRound,
    total_hold_seconds: totalHoldSeconds,
    target_total_hold_seconds: targetTotalHoldSeconds,
    ladder_sequence_planned: denseLadderSequence(scheme),
    ladder_sequence_actual: null,
    rounds,
    external_load_kg: positiveNumber(data.externalLoadKg) || externalLoadFromPair,
    added_load_kg: positiveNumber(data.addedLoadKg),
    weight_per_dumbbell_kg: weightPerDumbbellKg,
    dumbbell_count: exercise.loadPattern === "dumbbell_pair" && weightPerDumbbellKg ? 2 : null,
    rom_cm: denseUsesRom(exercise) ? denseParseRom(data.romCm) : null,
    assist_load_kg: activeNature === "assisted" ? positiveNumber(data.assistLoadKg) : 0,
    bodyweight_kg: bodyweightKg,
    bodyweight_source: state.bodyweightLogs?.[dateKey(selectedDate)] ? "daily_snapshot" : bodyweightKg ? "manual" : "default",
    effort: data.effort || "N",
    effort_value: denseEffortValues[data.effort] || 5,
    readiness: data.readiness || "normal",
    failed,
    missed_reps: usesHold ? 0 : Math.max(0, targetTotalReps - totalReps),
    session_fatigue: existingEntry?.session_fatigue || "",
    expected_comparison: existingEntry?.expected_comparison || "",
    session_notes: existingEntry?.session_notes || "",
    notes: (data.notes || "").trim(),
    bodyweight_contribution_pct: exercise.bodyweightContributionPct ?? 0,
    tonnage_factor: exercise.tonnageFactor ?? 1,
    reps_per_side: Boolean(exercise.repsPerSide),
    source: "manual",
    deleted_at: null,
  };

  const entry = computeDenseEntry(raw);
  state.denseTrainingEntries ||= [];
  const existingIndex = existingEntry ? state.denseTrainingEntries.findIndex((item) => item.id === existingEntry.id) : -1;
  if (existingIndex >= 0) {
    state.denseTrainingEntries[existingIndex] = entry;
    rebuildDenseEstimates();
  } else {
    state.denseTrainingEntries.push(entry);
    updateDenseEstimate(entry);
  }
  if (entry.bodyweight_kg) state.bodyweightLogs[entry.date] = entry.bodyweight_kg;
  // Transfer engine: a genuine improvement lifts related estimates a notch.
  // Edits also re-derive the whole fold, so corrections can't leave ghosts.
  const transferBoosts = runTransferEngine(entry);
  delete state.settings.denseDraftEntryId;
  const savedFromModal = nodes.modal.open && nodes.modalBody.contains(form);
  form.reset();
  if (savedFromModal) closeModal();
  saveAndRender(existingIndex >= 0 ? "Marca Dense actualizada" : "Marca Dense guardada");
  if (transferBoosts?.length) {
    const summary = transferBoosts.map((boost) => `${boost.name} +${roundTo(boost.pct * 100, 1)}%`).join(" · ");
    setTimeout(() => toast(`Esta marca mejora estimaciones: ${summary}`), 1500);
  }
  if (existingIndex < 0) setTimeout(() => openDenseFeedbackModal(entry.id), 0);
}

function openDenseFeedbackModal(entryId) {
  const entry = getDenseEntries().find((item) => item.id === entryId);
  if (!entry) return;
  nodes.modalEyebrow.textContent = "Post set";
  nodes.modalTitle.textContent = "How did that session go?";
  nodes.modalBody.innerHTML = `
    <form id="denseFeedbackForm" class="dense-feedback-form">
      <input type="hidden" name="entryId" value="${escapeAttr(entry.id)}" />
      <div class="feedback-entry-summary">
        <span class="tiny-icon"><i data-lucide="${denseExerciseById(entry.exercise_id)?.icon || "dumbbell"}"></i></span>
        <div>
          <strong>${escapeHtml(entry.exercise_name)}</strong>
          <span>${escapeHtml(entry.scheme)} · ${escapeHtml(denseEntryValue(entry))}</span>
        </div>
      </div>
      <label class="field is-full">
        <span>Fatigue level</span>
        <input name="sessionFatigue" type="range" min="1" max="10" value="${escapeAttr(entry.session_fatigue || 5)}" />
      </label>
      <div class="feedback-scale">
        <span>1</span>
        <strong>${escapeHtml(String(entry.session_fatigue || 5))} / 10</strong>
        <span>10</span>
      </div>
      <fieldset class="feedback-picker-field">
        <legend>Compared to what was expected</legend>
        <div class="feedback-option-grid">
          ${feedbackOption("easier", "Easier than expected", entry.expected_comparison)}
          ${feedbackOption("as_expected", "As expected", entry.expected_comparison || "as_expected")}
          ${feedbackOption("harder", "Harder than expected", entry.expected_comparison)}
        </div>
      </fieldset>
      <label class="field is-full">
        <span>Notes</span>
        <textarea name="sessionNotes" placeholder="Fatiga, molestias, sueño, técnica, si tocó cortar reps...">${escapeHtml(entry.session_notes || "")}</textarea>
      </label>
      <div class="modal-actions">
        <button class="text-button" type="button" data-action="close-modal"><i data-lucide="x"></i>Luego</button>
        <button class="text-button is-hot" type="submit"><i data-lucide="save"></i>Guardar feedback</button>
      </div>
    </form>
  `;
  const range = nodes.modalBody.querySelector("[name='sessionFatigue']");
  const output = nodes.modalBody.querySelector(".feedback-scale strong");
  range?.addEventListener("input", () => {
    output.textContent = `${range.value} / 10`;
  });
  openModal();
}

function feedbackOption(value, label, currentValue) {
  const selected = value === currentValue;
  return `
    <label class="feedback-option ${selected ? "is-selected" : ""}">
      <input type="radio" name="expectedComparison" value="${escapeAttr(value)}" ${selected ? "checked" : ""} />
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function saveDenseFeedbackForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const entry = getDenseEntries().find((item) => item.id === data.entryId);
  if (!entry) {
    closeModal();
    toast("No encuentro esa marca");
    return;
  }
  entry.session_fatigue = clamp(Number(data.sessionFatigue) || 5, 1, 10);
  entry.expected_comparison = data.expectedComparison || "as_expected";
  entry.session_notes = (data.sessionNotes || "").trim();
  entry.updated_at = new Date().toISOString();
  closeModal();
  saveAndRender("Feedback guardado");
}

function selectWeek(weekId) {
  state.settings.selectedWeekId = weekId;
  const week = state.mesocycle.weeks.find((item) => item.id === weekId);
  state.settings.selectedSessionId = week?.sessions[0]?.id || state.settings.selectedSessionId;
  saveAndRender();
}

function selectSession(sessionId) {
  state.settings.selectedSessionId = sessionId;
  saveAndRender();
}

function toggleExercise(sessionId, exerciseId) {
  const log = getSessionLog(sessionId);
  log.exercises ||= {};
  log.exercises[exerciseId] = !log.exercises[exerciseId];
  log.updatedAt = new Date().toISOString();
  saveAndRender(log.exercises[exerciseId] ? "+training" : "Ajustado");
}

function pickDenseExercise(exerciseId) {
  const exercise = findDenseExerciseById(exerciseId);
  if (!exercise) return;
  state.settings.denseSelectedExerciseId = exercise.id;
  delete state.settings.denseDraftEntryId;
  if (nodes.modal.open && nodes.modalCard.dataset.modalKind === "dense-set") {
    openDenseTrainingModal({ exerciseId: exercise.id });
    return;
  }
  renderSession();
  renderDenseTraining();
  renderDensePrs();
  refreshIcons();
  openDenseTrainingModal({ exerciseId: exercise.id });
}

function loadDenseEntry(entryId) {
  const entry = getDenseEntries().find((item) => item.id === entryId);
  if (!entry) {
    toast("No encuentro esa marca Dense");
    return;
  }
  state.settings.denseSelectedExerciseId = entry.exercise_id;
  state.settings.denseDraftEntryId = entry.id;
  openDenseTrainingModal({ entryId: entry.id });
  toast("Marca Dense cargada");
}

function toggleDenseFavorite(exerciseId) {
  state.denseExerciseFavorites ||= [];
  const index = state.denseExerciseFavorites.indexOf(exerciseId);
  const nowFavorite = index < 0;
  if (index >= 0) state.denseExerciseFavorites.splice(index, 1);
  else state.denseExerciseFavorites.push(exerciseId);
  saveState();
  // Update the star in place so the list keeps its scroll position instead of
  // re-rendering the whole picker (which also lost focus on the search field).
  const exercise = denseExerciseById(exerciseId);
  const label = `${nowFavorite ? "Quitar favorito" : "Marcar favorito"} ${exercise?.name || ""}`.trim();
  document.querySelectorAll(`.exercise-fav[data-exercise="${CSS.escape(exerciseId)}"]`).forEach((btn) => {
    btn.classList.toggle("is-hot", nowFavorite);
    btn.title = nowFavorite ? "Quitar favorito" : "Marcar favorito";
    btn.setAttribute("aria-label", label);
  });
  // If the current sort is "favoritos", order changed — re-render that surface.
  if (state.settings.denseExerciseSort === "favorite") refreshDenseExercisePickerSurface();
  refreshIcons();
  toast(nowFavorite ? "Favorito guardado" : "Favorito quitado");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `habbit-tracker-${dateKey(today)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Backup descargado");
}

async function copyJson() {
  await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
  toast("Backup copiado");
}

function importJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(reader.result);
      state = normalizeState(parsed);
      selectedDate = parseDate(state.settings.selectedDate || dateKey(today));
      saveAndRender("Backup importado");
    } catch {
      toast("Backup no válido");
    }
  });
  reader.readAsText(file);
}

function factoryReset() {
  state = createInitialState();
  selectedDate = today;
  saveAndRender("Reset completo");
}

function loadState() {
  const saved = localStorage.getItem(STORE_KEY);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORE_KEY);
    }
  }

  const old = localStorage.getItem(OLD_STORE_KEY);
  if (old) {
    try {
      return migrateV1(JSON.parse(old));
    } catch {
      localStorage.removeItem(OLD_STORE_KEY);
    }
  }

  return createInitialState();
}

function createInitialState() {
  const records = {};
  rangeDays(addDays(today, -31), addDays(today, -1)).forEach((day, index) => {
    const key = dateKey(day);
    records[key] = {};
    habitDefaults.forEach((habit, habitIndex) => {
      const rhythm = (index + habitIndex * 3) % 10;
      const done = rhythm !== 0 && rhythm !== 6 && !(habit.id === "nophone" && rhythm === 4);
      if (done) records[key][habit.id] = { done: true, quality: rhythm === 2 ? "heroic" : rhythm === 8 ? "min" : "base" };
    });
  });
  records[dateKey(today)] = {};

  return normalizeState({
    version: 2,
    settings: {
      view: "dashboard",
      selectedDate: dateKey(today),
      calendarAnchor: monthKey(today),
      selectedWeekId: mesocycleDefault.weeks[getCurrentCycleWeek()].id,
      selectedSessionId: mesocycleDefault.weeks[getCurrentCycleWeek()].sessions[0].id,
      uiDensity: "normal",
      trainingAnalyticsTab: "progress",
      trainingAnalyticsWindow: "70",
      trainingMode: "workout",
    },
    habits: habitDefaults,
    records,
    dayNotes: {
      [dateKey(today)]: {
        frogTask: "Definir la tarea incómoda antes de abrir el móvil.",
        familyNote: "",
        note: "",
        energy: "",
        sleep: "",
      },
    },
    mesocycle: mesocycleDefault,
    trainingLogs: {},
    denseTrainingEntries: [],
    denseDayPlans: {},
    bodyweightLogs: {},
    denseEstimates: {},
    denseExerciseFavorites: [],
  });
}

function normalizeState(input) {
  const base = {
    version: 2,
    settings: {},
    habits: habitDefaults,
    records: {},
    dayNotes: {},
    mesocycle: mesocycleDefault,
    trainingLogs: {},
    denseTrainingEntries: [],
    denseDayPlans: {},
    bodyweightLogs: {},
    denseEstimates: {},
    denseExerciseFavorites: [],
  };
  const merged = { ...base, ...input };
  merged.settings = {
    view: "dashboard",
    selectedDate: dateKey(today),
    calendarAnchor: monthKey(today),
    selectedWeekId: mesocycleDefault.weeks[getCurrentCycleWeek()].id,
    selectedSessionId: mesocycleDefault.weeks[getCurrentCycleWeek()].sessions[0].id,
    denseExerciseCategory: "all",
    denseExerciseSort: "recent",
    denseExerciseSearch: "",
    denseSelectedExerciseId: "pull_up",
    uiDensity: "normal",
    trainingAnalyticsTab: "progress",
    trainingAnalyticsWindow: "70",
    trainingMode: "workout",
    ...(input.settings || {}),
  };
  merged.habits = (merged.habits?.length ? merged.habits : habitDefaults).map((habit) => ({ ...habit, id: habit.id || slugify(habit.name) }));
  merged.mesocycle = merged.mesocycle?.weeks ? merged.mesocycle : mesocycleDefault;
  merged.records ||= {};
  merged.dayNotes ||= {};
  merged.trainingLogs ||= {};
  merged.denseTrainingEntries = Array.isArray(merged.denseTrainingEntries || merged.trainingEntries) ? merged.denseTrainingEntries || merged.trainingEntries : [];
  merged.denseDayPlans = merged.denseDayPlans && typeof merged.denseDayPlans === "object" ? merged.denseDayPlans : {};
  merged.bodyweightLogs ||= {};
  merged.denseEstimates ||= {};
  merged.denseExerciseFavorites = Array.isArray(merged.denseExerciseFavorites) ? merged.denseExerciseFavorites : [];
  denseMigrateUnifiedExercises(merged);
  return merged;
}

// Rewrite the legacy 'weighted_*' twin ids onto their unified base id (keeping
// each mark's own nature/loads). Idempotent — safe to run on every load.
function denseMigrateUnifiedExercises(merged) {
  merged.denseTrainingEntries = merged.denseTrainingEntries.map((entry) => {
    const baseId = denseExerciseAliases[entry.exercise_id];
    if (!baseId) return entry;
    const base = denseExerciseCatalog.find((exercise) => exercise.id === baseId);
    return {
      ...entry,
      exercise_id: baseId,
      exercise_name: base?.name || entry.exercise_name,
      exercise_family_id: base?.family || entry.exercise_family_id,
      family: base?.family || entry.family,
      variant_id: baseId,
      nature: entry.nature || "weighted_calisthenics",
    };
  });
  Object.keys(merged.denseDayPlans || {}).forEach((day) => {
    merged.denseDayPlans[day] = (merged.denseDayPlans[day] || []).map((raw) => {
      const item = typeof raw === "string" ? { exercise_id: raw } : { ...raw };
      const baseId = denseExerciseAliases[item.exercise_id];
      if (baseId) {
        item.exercise_id = baseId;
        item.nature = item.nature || "weighted_calisthenics";
      }
      return item;
    });
  });
  if (Array.isArray(merged.denseExerciseFavorites)) {
    merged.denseExerciseFavorites = [...new Set(merged.denseExerciseFavorites.map((id) => denseExerciseAliases[id] || id))];
  }
  // Estimates are re-derivable; drop aliased keys so rebuildDenseEstimates
  // regenerates them under the unified id.
  Object.keys(merged.denseEstimates || {}).forEach((id) => {
    if (denseExerciseAliases[id]) delete merged.denseEstimates[id];
  });
  return merged;
}

function migrateV1(old) {
  const fresh = createInitialState();
  if (old.records) {
    Object.entries(old.records).forEach(([day, record]) => {
      fresh.records[day] = {};
      Object.entries(record || {}).forEach(([habitId, value]) => {
        fresh.records[day][habitId] = typeof value === "object" ? value : { done: Boolean(value), quality: "base" };
      });
    });
  }
  if (old.trainingNotes) {
    Object.entries(old.trainingNotes).forEach(([weekId, note]) => {
      const firstSession = fresh.mesocycle.weeks.find((week) => week.id === weekId)?.sessions[0]?.id;
      if (firstSession) fresh.trainingLogs[firstSession] = { exercises: {}, note, updatedAt: new Date().toISOString() };
    });
  }
  return fresh;
}

function stateHasTrainingData(candidate = state) {
  return Boolean(
    (candidate.denseTrainingEntries || candidate.trainingEntries || []).length ||
      Object.keys(candidate.denseDayPlans || {}).length ||
      Object.keys(candidate.bodyweightLogs || {}).length ||
      Object.keys(candidate.denseEstimates || {}).length ||
      (candidate.denseExerciseFavorites || []).length,
  );
}

function stateDataSummary(candidate = state) {
  return `${(candidate.denseTrainingEntries || candidate.trainingEntries || []).length} marcas Dense · ${Object.keys(candidate.denseDayPlans || {}).length} dias planificados · ${Object.keys(candidate.bodyweightLogs || {}).length} pesos`;
}

function queueInitialCloudRestore() {
  if (cloudRestoreChecked || stateHasTrainingData(state) || !cloudConfig.enabled || !cloudConfig.endpointUrl) return;
  cloudRestoreChecked = true;
  window.setTimeout(() => restoreCloudState({ reason: "startup", silent: true }), 600);
}

function saveAndRender(message) {
  saveState();
  render();
  if (message) toast(message);
}

let denseSaveErrorNotified = false;
function saveState() {
  denseCalibrationCache = null;
  state.settings.selectedDate = dateKey(selectedDate);
  state.settings.lastSavedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    denseSaveErrorNotified = false;
  } catch (error) {
    // iOS evicts / caps localStorage aggressively (QuotaExceededError, or
    // SecurityError in private mode). Never lose the session silently: warn
    // once and force an immediate cloud push so the data leaves the device.
    console.warn("saveState failed", error);
    if (!denseSaveErrorNotified) {
      denseSaveErrorNotified = true;
      toast("No se pudo guardar en el móvil — enviando a la nube");
    }
    if (cloudConfig.enabled && cloudConfig.endpointUrl) {
      clearTimeout(cloudSyncTimer);
      syncCloudState("save-error");
    }
    return;
  }
  scheduleCloudSync("auto");
}

function loadCloudConfig() {
  const defaults = { enabled: true, endpointUrl: DEFAULT_CLOUD_ENDPOINT_URL, token: DEFAULT_CLOUD_SYNC_TOKEN };
  try {
    const saved = JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY));
    return saved
      ? {
          ...defaults,
          ...saved,
          // An explicit "off" must survive reloads even if endpoint/token are
          // empty — refilling defaults used to silently re-enable auto-sync.
          enabled: saved.enabled !== false,
          endpointUrl: saved.endpointUrl || DEFAULT_CLOUD_ENDPOINT_URL,
          token: saved.token || DEFAULT_CLOUD_SYNC_TOKEN,
        }
      : defaults;
  } catch {
    return defaults;
  }
}

function saveCloudSyncForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  cloudConfig = {
    enabled: data.enabled === "on",
    endpointUrl: (data.endpointUrl || "").trim(),
    token: (data.token || "").trim(),
  };
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cloudConfig));
  cloudSyncStatus = cloudConfig.enabled && cloudConfig.endpointUrl ? { state: "idle", text: "Cloud sync configurado." } : { state: "idle", text: "Cloud sync desactivado." };
  saveAndRender("Cloud actualizado");
  if (cloudConfig.enabled && cloudConfig.endpointUrl) {
    clearTimeout(cloudSyncTimer);
    syncCloudState("config-save");
  }
}

function scheduleCloudSync(reason) {
  if (!cloudConfig.enabled || !cloudConfig.endpointUrl) return;
  if (reason === "auto" && !stateHasTrainingData(state)) {
    queueInitialCloudRestore();
    cloudSyncStatus = { state: "idle", text: "Cloud protegido: restaura antes de sincronizar vacio." };
    updateCloudSyncStatus();
    return;
  }
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => syncCloudState(reason), 900);
}

function cloudPullUrl(extraParams = {}) {
  const url = new URL(cloudConfig.endpointUrl);
  url.searchParams.set("action", "latest");
  if (cloudConfig.token) url.searchParams.set("token", cloudConfig.token);
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value != null && value !== "") url.searchParams.set(key, value);
  });
  return url.toString();
}

async function fetchCloudSnapshot() {
  try {
    const response = await fetch(cloudPullUrl(), { method: "GET", cache: "no-store" });
    const text = await response.text();
    let result = {};
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error("Respuesta Cloud no JSON");
    }
    if (!response.ok || result.ok === false) throw new Error(result.error || `HTTP ${response.status}`);
    return result.snapshot || null;
  } catch (error) {
    const corsLike = error instanceof TypeError || /failed to fetch|networkerror|cors/i.test(error.message || "");
    if (!corsLike) throw error;
    const result = await fetchCloudSnapshotJsonp();
    if (result.ok === false) throw new Error(result.error || "Cloud restore fallo");
    return result.snapshot || null;
  }
}

function fetchCloudSnapshotJsonp() {
  return new Promise((resolve, reject) => {
    const callback = `__bitTrackerCloudPull_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      delete window[callback];
      script.remove();
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Cloud restore timeout"));
    }, 12000);
    window[callback] = (result) => {
      window.clearTimeout(timer);
      cleanup();
      resolve(result || {});
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new Error("Cloud restore no pudo cargar JSONP"));
    };
    script.src = cloudPullUrl({ callback });
    document.head.appendChild(script);
  });
}

async function restoreCloudState({ reason = "manual", silent = false } = {}) {
  if (!cloudConfig.endpointUrl) {
    cloudSyncStatus = { state: "error", text: "Falta endpoint de Cloud." };
    updateCloudSyncStatus();
    if (!silent) toast("Falta endpoint Cloud");
    return false;
  }

  cloudSyncStatus = { state: "syncing", text: "Restaurando desde Cloud..." };
  updateCloudSyncStatus();

  try {
    const snapshot = await fetchCloudSnapshot();
    if (!snapshot?.state) {
      cloudSyncStatus = { state: "idle", text: "Cloud sin snapshots para restaurar." };
      updateCloudSyncStatus();
      if (!silent) toast("Cloud sin datos");
      return false;
    }

    const restored = normalizeState(snapshot.state);
    state = restored;
    selectedDate = parseDate(state.settings.selectedDate || snapshot.selectedDate || dateKey(today));
    state.settings.selectedDate = dateKey(selectedDate);
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    cloudSyncStatus = { state: "ok", text: `Cloud restaurado · ${formatLogDate(snapshot.syncedAt || new Date().toISOString())}` };
    render();
    updateCloudSyncStatus();
    if (!silent) toast("Cloud restaurado");
    return true;
  } catch (error) {
    cloudSyncStatus = { state: "error", text: `Cloud restore fallo: ${error.message}` };
    updateCloudSyncStatus();
    if (!silent) toast("Cloud restore falló");
    if (reason === "startup") cloudRestoreChecked = false;
    return false;
  }
}

async function syncCloudState(reason = "manual") {
  if (!cloudConfig.endpointUrl) {
    cloudSyncStatus = { state: "error", text: "Falta endpoint de Cloud." };
    updateCloudSyncStatus();
    toast("Falta endpoint Cloud");
    return;
  }

  if (reason !== "manual" && !stateHasTrainingData(state)) {
    queueInitialCloudRestore();
    cloudSyncStatus = { state: "idle", text: "Cloud protegido: no envio estado vacio automaticamente." };
    updateCloudSyncStatus();
    return;
  }

  cloudSyncStatus = { state: "syncing", text: "Sincronizando con Cloud..." };
  updateCloudSyncStatus();

  const payload = {
    token: cloudConfig.token,
    source: "bittracker-static",
    reason,
    syncedAt: new Date().toISOString(),
    state,
  };

  try {
    const response = await fetch(cloudConfig.endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let result = {};
    try {
      result = JSON.parse(text);
    } catch {
      result = { ok: response.ok, raw: text };
    }
    if (!response.ok || result.ok === false) throw new Error(result.error || `HTTP ${response.status}`);
    state.settings.lastCloudSyncAt = payload.syncedAt;
    cloudSyncStatus = { state: "ok", text: `Cloud sync OK · ${formatLogDate(payload.syncedAt)}` };
    updateCloudSyncStatus();
    if (reason === "manual") toast("Cloud sync OK");
  } catch (error) {
    const corsLike = error instanceof TypeError || /failed to fetch|networkerror|cors/i.test(error.message || "");
    if (!corsLike) {
      cloudSyncStatus = { state: "error", text: `Cloud sync fallo: ${error.message}` };
      updateCloudSyncStatus();
      toast("Cloud sync falló");
      return;
    }

    try {
      await fetch(cloudConfig.endpointUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      state.settings.lastCloudSyncAt = payload.syncedAt;
      cloudSyncStatus = { state: "ok", text: `Cloud sync enviado · verifica Sheets · ${formatLogDate(payload.syncedAt)}` };
      updateCloudSyncStatus();
      if (reason === "manual") toast("Cloud sync enviado");
    } catch (fallbackError) {
      cloudSyncStatus = { state: "error", text: `Cloud sync fallo: ${fallbackError.message}` };
      updateCloudSyncStatus();
      toast("Cloud sync falló");
    }
  }
}

function updateCloudSyncStatus() {
  document.querySelectorAll("#cloudSyncStatus, [data-cloud-sync-status]").forEach((node) => {
    node.textContent = cloudSyncStatus.text;
  });
}

function scoreBox(label, value, icon) {
  return `
    <div class="score-box">
      <span class="small-label"><i data-lucide="${icon}"></i> ${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function statRow(stat, days) {
  const statHabits = activeHabits().filter((habit) => habit.stat === stat.id);
  const total = days.length * statHabits.length || 1;
  const done = days.reduce((sum, day) => {
    const key = dateKey(day);
    return sum + statHabits.filter((habit) => habitDone(key, habit.id)).length;
  }, 0);
  const value = Math.round((done / total) * 100);

  return `
    <div class="stat-row" style="--stat-color:${stat.color}">
      <div class="stat-name"><i data-lucide="${stat.icon}"></i><span>${stat.name}</span></div>
      <div class="meter"><span style="--value:${value}%; --meter-color:${stat.color}"></span></div>
      <div class="stat-value">${value}</div>
    </div>
  `;
}

function trainingMetric(label, value, icon) {
  return `
    <div class="training-metric">
      <span class="small-label"><i data-lucide="${icon}"></i> ${label}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function denseExercisePicker(defaults) {
  const category = state.settings.denseExerciseCategory || "all";
  const sort = state.settings.denseExerciseSort || "recent";
  const search = state.settings.denseExerciseSearch || "";
  const selected = denseExerciseById(defaults.exerciseId);
  const exercises = denseExerciseLibrary({ category, sort, search });

  return `
    <section class="dense-exercise-picker">
      <div class="section-subhead">
        <strong>Ejercicio seleccionado</strong>
        <span>${escapeHtml(selected.name)} · ${escapeHtml(denseCategoryLabel(selected.category))}</span>
      </div>
      <div class="exercise-picker-controls">
        <label class="field">
          <span>Grupo</span>
          <select data-action-input="dense-exercise-category">
            ${denseExerciseCategories.map(([value, label]) => `<option value="${value}" ${category === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
        <label class="field exercise-search-field">
          <span>Buscar</span>
          <input data-action-input="dense-exercise-search" type="search" value="${escapeAttr(search)}" placeholder="dominadas, hspu, anillas..." />
        </label>
        <label class="field">
          <span>Orden</span>
          <select data-action-input="dense-exercise-sort">
            ${denseExerciseSortOptions.map(([value, label]) => `<option value="${value}" ${sort === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="exercise-picker-list">
        ${
          exercises.length
            ? exercises.map((exercise) => denseExercisePickCard(exercise, defaults.exerciseId)).join("")
            : `<article class="exercise-pick-empty">No hay ejercicios con ese filtro.</article>`
        }
      </div>
    </section>
  `;
}

function denseExercisePickCard(exercise, selectedId, action = "pick-dense-exercise") {
  const stats = denseExerciseStats(exercise.id);
  const favorite = denseExerciseFavorites().includes(exercise.id);
  const selected = exercise.id === selectedId;
  const last = stats.lastEntry ? `${stats.daysSince === 0 ? "hoy" : `hace ${stats.daysSince}d`}` : "sin marcas";
  const actionIcon = action === "add-planned-exercise" ? "plus" : "check";
  const hasVideo = Boolean(denseVideoEmbedUrl(exercise.video));
  return `
    <article
      class="exercise-pick-card ${selected ? "is-selected" : ""}"
      data-exercise-card
      data-search="${escapeAttr(`${exercise.name} ${exercise.family} ${denseCategoryLabel(exercise.category)}`.toLowerCase())}"
      data-exercise="${escapeAttr(exercise.id)}"
    >
      <button class="exercise-pick-main" type="button" data-action="${escapeAttr(action)}" data-exercise="${escapeAttr(exercise.id)}">
        ${denseExerciseIconMarkup(exercise)}
        <span>
          <strong>${escapeHtml(exercise.name)}${hasVideo ? ' <i class="exercise-video-dot" data-lucide="play"></i>' : ""}</strong>
          <small>${escapeHtml(denseCategoryLabel(exercise.category))} · ${stats.count} marcas · ${last}</small>
        </span>
        <i data-lucide="${actionIcon}"></i>
      </button>
      <button
        class="icon-button exercise-fav ${favorite ? "is-hot" : ""}"
        type="button"
        data-action="toggle-dense-favorite"
        data-exercise="${escapeAttr(exercise.id)}"
        title="${favorite ? "Quitar favorito" : "Marcar favorito"}"
        aria-label="${favorite ? "Quitar favorito" : "Marcar favorito"} ${escapeAttr(exercise.name)}"
      ><i data-lucide="star"></i></button>
    </article>
  `;
}

function denseSchemeOption(scheme, currentScheme) {
  const selected = scheme === currentScheme;
  const minutes = denseSchemeMinutes(scheme);
  const suffix = scheme.replace(/^\d+D/, "");
  const detail = suffix ? `${minutes}m · ${suffix.replaceAll("-", "-")}/m` : `${minutes}m`;
  return `
    <label class="scheme-option ${selected ? "is-selected" : ""}" style="--scheme-color:${denseSchemeColor(scheme)}">
      <input type="radio" name="scheme" value="${escapeAttr(scheme)}" ${selected ? "checked" : ""} />
      <span>
        <strong>${escapeHtml(scheme)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>
    </label>
  `;
}

function denseEffortOption(value, label, currentValue, verbose = false) {
  const selected = value === currentValue;
  const readable = {
    VE: "Very Easy",
    E: "Easy",
    N: "Normal",
    H: "Hard",
    VH: "Very Hard",
    fallo: "Fail",
  }[value] || value;
  return `
    <label class="effort-option ${selected ? "is-selected" : ""}" style="--effort-color:${denseEffortColor(value)}">
      <input type="radio" name="effort" value="${escapeAttr(value)}" ${selected ? "checked" : ""} />
      <span>${escapeHtml(verbose ? readable : value)}</span>
      <small>${escapeHtml(label.split("·")[1]?.trim() || label)}</small>
    </label>
  `;
}

function denseFormReadiness(form) {
  return form?.querySelector("input[name='readiness']:checked")?.value || "normal";
}

// Writes the deterministic per-scheme, readiness-aware targets into the form and
// refreshes the recommendation card. Shared by scheme and readiness changes.
function applyDenseFormTargets(form, { resetStaleLoad = false } = {}) {
  if (!form) return;
  const baseExercise = denseExerciseById(form.querySelector("[name='exerciseId']")?.value);
  if (!baseExercise) return;
  // Respect the chosen modality: scheme/readiness recalcs must estimate as
  // weighted (or bodyweight) exactly like the picked nature, not the default.
  const chosenNature = form.querySelector("input[name='nature']")?.value;
  const allowed = baseExercise.allowedNatures?.length ? baseExercise.allowedNatures : [baseExercise.nature];
  const exercise = chosenNature && allowed.includes(chosenNature) ? { ...baseExercise, nature: chosenNature } : baseExercise;
  const scheme = form.querySelector("input[name='scheme']:checked")?.value || denseAllowedSchemes(exercise)[0];
  const readiness = denseFormReadiness(form);
  const suggestion = denseProgressionSuggestion(exercise, readiness, scheme);
  const repsPerSetInput = form.querySelector("[name='repsPerSet']");
  if (repsPerSetInput) repsPerSetInput.value = denseFormTargetRepsPerSet(exercise, scheme, suggestion) || "";
  const reps = repsPerSetInput ? denseTotalFromRepsPerSet(repsPerSetInput.value, scheme) : denseDefaultTotalReps(exercise, scheme);
  const repsInput = form.querySelector("[name='totalReps']");
  if (repsInput) repsInput.value = reps || "";
  const roundsInput = form.querySelector("[name='rounds']");
  if (roundsInput) {
    roundsInput.value = (suggestion && suggestion.scheme === scheme && suggestion.rounds) || denseSchemeMinutes(scheme) || "";
  }
  const holdInput = form.querySelector("[name='holdSecondsPerRound']");
  if (holdInput && denseIsIsometric(exercise)) {
    const suggested = denseFormTargetHoldPerRound(exercise, scheme, suggestion);
    if (suggested) holdInput.value = suggested;
  }
  if ((suggestion?.type === "load" || suggestion?.type === "assist") && suggestion.scheme === scheme) {
    const loadTargets = {
      externalLoadKg: suggestion.externalLoadKg,
      addedLoadKg: suggestion.addedLoadKg,
      weightPerDumbbellKg: suggestion.weightPerDumbbellKg,
      assistLoadKg: suggestion.assistLoadKg,
    };
    Object.entries(loadTargets).forEach(([name, value]) => {
      const input = form.querySelector(`[name='${name}']`);
      if (input && value !== undefined && value !== null && value !== "") input.value = value;
    });
  } else if (resetStaleLoad && denseIsLoadExercise(exercise)) {
    ["externalLoadKg", "addedLoadKg", "weightPerDumbbellKg", "assistLoadKg"].forEach((name) => {
      const input = form.querySelector(`[name='${name}']`);
      if (input) input.value = "";
    });
  }
  // Switching to a scheme whose target is an estimate turns the set into a
  // test; add the opt-out toggle if it is not there yet (never remove one the
  // user already saw — they may have unchecked it deliberately).
  if (!denseFailureSetMode && !form.querySelector(".dense-test-toggle") && ["family", "transfer", "estimated", "none"].includes(denseTargetSource(exercise, scheme).kind)) {
    const recWrap = form.querySelector("[data-recommendation]");
    if (recWrap) recWrap.insertAdjacentHTML("beforebegin", denseTestToggleHtml());
  }
  const rec = form.querySelector("[data-recommendation]");
  if (rec) {
    rec.innerHTML = renderDenseProgressionSuggestion(exercise, suggestion);
    if (window.lucide?.createIcons) window.lucide.createIcons({ nameAttr: "data-lucide" });
  }
  updateDenseHoldEstimate(form);
}

function updateDenseSchemeSelection(input) {
  const form = input.closest("#denseTrainingForm");
  if (!form) return;
  form.querySelectorAll(".scheme-option").forEach((option) => option.classList.toggle("is-selected", option.contains(input)));
  applyDenseFormTargets(form, { resetStaleLoad: true });
}

function updateDenseReadinessSelection(input) {
  const form = input.closest("#denseTrainingForm");
  if (!form) return;
  form.querySelectorAll(".readiness-option").forEach((option) => option.classList.toggle("is-selected", option.contains(input)));
  applyDenseFormTargets(form);
}

// Radio "selected" highlight is JS-driven (like the scheme picker) because
// :has(input:checked) gets stuck on the default option in the effort grid here.
function updateDenseEffortSelection(input) {
  const form = input.closest("#denseTrainingForm");
  if (!form) return;
  form.querySelectorAll(".effort-option").forEach((option) => option.classList.toggle("is-selected", option.contains(input)));
}

function updateDenseTotalFromRepsPerSet(input) {
  const form = input.closest("#denseTrainingForm");
  if (!form) return;
  const scheme = form.querySelector("input[name='scheme']:checked")?.value;
  const totalInput = form.querySelector("[name='totalReps']");
  if (totalInput) totalInput.value = denseTotalFromRepsPerSet(input.value, scheme) || "";
}

// ── Mobility ROM (range of motion) ───────────────────────────────────────
// For mobility work the meaningful progress is DEPTH, not reps: how close you
// get to the floor / full position, in cm (lower is better, goal ~0). Stored
// as `rom_cm` and kept fully decoupled from the strength engine — it never
// feeds e1RM, capacity or the transfer coefficients.
const denseRomLabels = {
  seated_bent_leg_good_morning: "dedos → suelo",
  jefferson_curl: "dedos → suelo",
  straddle_jefferson_curl: "pecho → suelo",
  straddle_good_morning: "pecho → suelo",
  pancake_hold: "pecho → suelo",
  pancake_good_morning: "pecho → suelo",
  frog_stretch: "cadera → suelo",
  side_split_iso: "cadera → suelo",
  side_split_squat: "cadera → suelo",
  horse_stance_hold: "profundidad cadera",
  bridge_push_up: "manos → talones",
  bridge_isometric: "manos → talones",
};
function denseUsesRom(exercise) {
  return exercise?.category === "mobility";
}
function denseRomLabel(exercise) {
  return denseRomLabels[exercise?.id] || "cm al objetivo";
}
function denseEntryRom(entry) {
  const v = entry?.rom_cm;
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function denseParseRom(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? roundTo(n, 1) : null;
}
function denseBestRom(exerciseId) {
  const vals = getDenseEntries()
    .filter((entry) => entry.exercise_id === exerciseId && !entry.deleted_at)
    .map(denseEntryRom)
    .filter((v) => v !== null);
  return vals.length ? Math.min(...vals) : null;
}
function denseLastRomEntry(exerciseId) {
  return (
    [...getDenseEntries()]
      .filter((entry) => entry.exercise_id === exerciseId && !entry.deleted_at && denseEntryRom(entry) !== null)
      .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0] || null
  );
}
function denseRomText(entry) {
  const v = denseEntryRom(entry);
  return v === null ? "" : `${roundTo(v, 1)} cm`;
}
// Next ROM target: creep 0.5–1cm closer when the last one felt easy / you feel
// strong, hold when it was hard or you feel stiff. Gains here are slow on
// purpose — flexibility does not jump.
function denseRomSuggestion(exercise, readiness = "normal") {
  if (!denseUsesRom(exercise)) return null;
  const last = denseLastRomEntry(exercise.id);
  if (!last) return null;
  const current = denseEntryRom(last);
  const effort = last.effort || "N";
  const failed = Boolean(last.failed) || effort === "fallo";
  let step = 0;
  if (!failed && (effort === "VE" || effort === "E" || readiness === "high")) step = 1;
  else if (!failed && effort === "N" && readiness !== "low") step = 0.5;
  const target = Math.max(0, roundTo(current - step, 1));
  return { current, target, best: denseBestRom(exercise.id), closer: target < current };
}
function denseRomField(exercise, defaults) {
  if (!denseUsesRom(exercise)) return "";
  return `
    <label class="field dense-rom-field is-full">
      <span>Rango · ${escapeHtml(denseRomLabel(exercise))} (cm · menos es mejor)</span>
      <input type="number" name="romCm" value="${escapeAttr(String(defaults.romCm ?? ""))}" step="0.5" min="0" inputmode="decimal" placeholder="cm hasta el objetivo" />
    </label>
  `;
}

// ROM progress card for the exercise detail: best (closest) + a sparkline of
// recent marks (inverted, so lower cm sits higher) + net change since start.
function renderRomProgressCard(exercise) {
  if (!denseUsesRom(exercise)) return "";
  const marks = [...getDenseEntries()]
    .filter((entry) => entry.exercise_id === exercise.id && !entry.deleted_at && denseEntryRom(entry) !== null)
    .sort((a, b) => String(a.created_at || a.date || "").localeCompare(String(b.created_at || b.date || "")));
  if (!marks.length) return "";
  const vals = marks.map(denseEntryRom);
  const best = Math.min(...vals);
  const delta = roundTo(vals[0] - vals[vals.length - 1], 1);
  const recent = vals.slice(-8);
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const span = max - min || 1;
  const W = 220;
  const H = 40;
  const P = 5;
  const pts = recent
    .map((v, i) => {
      const x = P + (recent.length === 1 ? 0.5 : i / (recent.length - 1)) * (W - 2 * P);
      const y = P + ((v - min) / span) * (H - 2 * P);
      return `${roundTo(x, 1)},${roundTo(y, 1)}`;
    })
    .join(" ");
  const deltaTxt = delta > 0 ? `−${delta} cm` : delta < 0 ? `+${Math.abs(delta)} cm` : "0 cm";
  const deltaColor = delta > 0 ? "var(--green)" : delta < 0 ? "var(--red)" : "var(--muted)";
  return `
    <section class="exercise-detail-section">
      <div class="section-subhead"><strong>Rango de movimiento</strong><span>${escapeHtml(denseRomLabel(exercise))} · menos es mejor</span></div>
      <div style="display:flex;align-items:center;gap:14px;padding:11px 13px;border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--panel-2)">
        <div style="display:flex;flex-direction:column;min-width:52px"><span style="font-size:0.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Mejor</span><strong style="font-size:1.15rem">${roundTo(best, 1)}<small style="font-size:0.7rem;font-weight:600"> cm</small></strong></div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="flex:1;height:38px" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--cyan)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>
        <div style="display:flex;flex-direction:column;text-align:right;min-width:64px"><span style="font-size:0.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Desde inicio</span><strong style="font-size:0.92rem;color:${deltaColor}">${deltaTxt}</strong></div>
      </div>
    </section>
  `;
}

function denseRepPerSetFields(exercise, defaults) {
  if (!denseUsesRepsPerSet(exercise)) return "";
  if (denseIsLoadExercise(exercise)) {
    return `
      <label class="field dense-fixed-target">
        <span>Reps fijas esquema</span>
        <input type="number" name="repsPerSet" value="${escapeAttr(String(defaults.repsPerSet ?? ""))}" step="any" min="0" readonly aria-readonly="true" />
      </label>
    `;
  }
  return field("Reps por set/min", "repsPerSet", defaults.repsPerSet, "number");
}

function denseHoldFields(exercise, defaults) {
  if (!denseSupportsHold(exercise)) return "";
  const holdDefault = defaults.holdSecondsPerRound || (denseIsIsometric(exercise) ? denseDefaultHoldPerRound(exercise, defaults.scheme) : "");
  return `
    ${field("Hold/ronda s", "holdSecondsPerRound", holdDefault || "", "number")}
    ${field("Rondas", "rounds", defaults.rounds || denseSchemeMinutes(defaults.scheme) || "", "number")}
    <div class="dense-hold-preview" data-hold-preview>Hold off</div>
  `;
}

// Short labels for the in-form modality toggle (allowedNatures).
function denseNatureShort(nature) {
  return (
    {
      weighted: "Con peso",
      weighted_calisthenics: "Peso corporal + lastre",
      assisted: "Asistido (contrapeso)",
      bodyweight: "Peso corporal",
      banded: "Con goma",
      conditioning: "Motor",
      plyometrics: "Pliometría",
      skill: "Skill / hold",
      active_recovery: "Recovery",
    }[nature] || nature
  );
}

// Modality selector: lets an exercise be logged in any of its allowedNatures
// (e.g. a good morning as bodyweight or with added load). Hidden when there is
// only one option, so nothing changes for single-modality exercises.
function denseNatureSelectorMarkup(exercise, currentNature) {
  const options = exercise.allowedNatures?.length ? exercise.allowedNatures : [exercise.nature];
  if (options.length <= 1) return "";
  return `
    <fieldset class="readiness-field nature-field is-full">
      <legend>Modalidad</legend>
      <div class="readiness-grid">
        ${options
          .map(
            (nat) => `
              <label class="readiness-option ${nat === currentNature ? "is-selected" : ""}" data-nature="${escapeAttr(nat)}">
                <input type="radio" name="natureChoice" value="${escapeAttr(nat)}" ${nat === currentNature ? "checked" : ""} />
                <span>${escapeHtml(denseNatureShort(nat))}</span>
              </label>`,
          )
          .join("")}
      </div>
    </fieldset>
  `;
}

function denseLoadFields(exercise, defaults = {}) {
  if (exercise.loadPattern === "dumbbell_pair") {
    return field("Peso por mancuerna kg", "weightPerDumbbellKg", defaults.weightPerDumbbellKg || "", "number");
  }
  if (exercise.nature === "weighted_calisthenics") {
    return field("Lastre añadido kg", "addedLoadKg", defaults.addedLoadKg || "", "number");
  }
  if (exercise.nature === "weighted") {
    return field("Carga usada kg", "externalLoadKg", defaults.externalLoadKg || "", "number");
  }
  if (exercise.nature === "assisted") {
    return field("Asistencia kg (contrapeso)", "assistLoadKg", defaults.assistLoadKg || "", "number");
  }
  return "";
}

function denseExerciseHint(exercise) {
  if (exercise.loadPattern === "dumbbell_pair") return "Guarda el peso por mancuerna; BitTracker calcula el total externo.";
  if (exercise.nature === "weighted_calisthenics") return "Guarda el lastre; BitTracker suma tu peso corporal para la carga total del sistema.";
  if (exercise.nature === "weighted") return "Guarda la carga externa usada en el esquema elegido.";
  if (exercise.nature === "assisted") return "Guarda el contrapeso; se resta de tu peso corporal (aprox., la fricción de la cuerda come un poco). Baja el contrapeso para progresar hacia la OAC completa.";
  if (exercise.family === "front_lever" || exercise.family === "back_lever") return "Isométrico straight-arm: registra hold/ronda y rondas para calcular tiempo bajo tensión.";
  if (exercise.family === "front_lever_pull" || exercise.family === "back_lever_pull") return "Versión Pull: registra reps por minuto o reps totales como trabajo dinámico.";
  if (denseSupportsHold(exercise)) return "Guarda reps o activa Hold/ronda para isométricos; BitTracker calcula tiempo bajo tensión.";
  return "Guarda reps totales y esfuerzo; BitTracker calcula reps/min y capacidad entre esquemas.";
}

function metric(label, value) {
  return `
    <div class="metric">
      <span class="metric-label">${label}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function reviewCard(title, value, icon, detail) {
  return `
    <article class="review-card">
      <span class="small-label"><i data-lucide="${icon}"></i> ${escapeHtml(title)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(detail)}</span>
    </article>
  `;
}

function habitChoiceField(kind, label, value) {
  const options = choiceOptions(kind, value);
  return `
    <div class="field choice-field" data-choice-kind="${kind}">
      <span>${escapeHtml(label)}</span>
      <input class="choice-hidden" type="hidden" name="${kind}" value="${escapeAttr(value)}" />
      <button class="choice-trigger" type="button" data-action="toggle-choice-popover" data-kind="${kind}">
        ${choiceTriggerContent(kind, value)}
      </button>
      <div class="choice-popover" role="listbox">
        <div class="choice-popover-grid ${kind}-popover-grid">
          ${options.map((option) => choiceOption(kind, option, value)).join("")}
        </div>
      </div>
    </div>
  `;
}

function choiceOptions(kind, value) {
  if (kind === "icon") {
    return ensureOption(habitIconOptions, "icon", value, {
      icon: value || "circle",
      label: "Personalizado",
      hint: "icono actual",
    });
  }
  if (kind === "color") {
    return ensureOption(habitColorOptions, "color", value, {
      color: value || "#68d66f",
      label: "Actual",
      hint: "color personalizado",
    });
  }
  return statCatalog;
}

function choiceOption(kind, option, currentValue) {
  const value = option[kind] || option.id;
  const selected = value === currentValue;
  const color = option.color || "var(--green)";
  return `
    <button
      class="choice-option ${selected ? "is-selected" : ""}"
      type="button"
      data-action="set-choice-value"
      data-kind="${kind}"
      data-value="${escapeAttr(value)}"
      style="--option-color:${color}"
      role="option"
      aria-selected="${selected}"
    >
      ${choiceVisual(kind, option)}
      <span>
        <strong>${escapeHtml(option.label || option.name)}</strong>
        <small>${escapeHtml(option.hint || "")}</small>
      </span>
    </button>
  `;
}

function choiceTriggerContent(kind, value) {
  const option = choiceOptions(kind, value).find((item) => (item[kind] || item.id) === value) || choiceOptions(kind, value)[0];
  const color = option.color || "var(--green)";
  return `
    <span class="choice-current" style="--option-color:${color}">
      ${choiceVisual(kind, option)}
      <span>
        <strong>${escapeHtml(option.label || option.name)}</strong>
        <small>${escapeHtml(option.hint || "Pulsa para cambiar")}</small>
      </span>
    </span>
    <i data-lucide="chevron-down"></i>
  `;
}

function choiceVisual(kind, option) {
  if (kind === "color") return `<span class="color-swatch"></span>`;
  return `<span class="option-icon"><i data-lucide="${option.icon}"></i></span>`;
}

function toggleChoicePopover(trigger) {
  const field = trigger.closest(".choice-field");
  const wasOpen = field.classList.contains("is-open");
  closeChoicePopovers();
  field.classList.toggle("is-open", !wasOpen);
}

function setChoiceValue(optionButton) {
  const field = optionButton.closest(".choice-field");
  const kind = optionButton.dataset.kind;
  const value = optionButton.dataset.value;
  field.querySelector(".choice-hidden").value = value;
  field.querySelector(".choice-trigger").innerHTML = choiceTriggerContent(kind, value);
  field.querySelectorAll(".choice-option").forEach((option) => {
    const selected = option.dataset.value === value;
    option.classList.toggle("is-selected", selected);
    option.setAttribute("aria-selected", String(selected));
  });
  closeChoicePopovers();
  refreshIcons();
}

function closeChoicePopovers() {
  document.querySelectorAll(".choice-field.is-open").forEach((field) => field.classList.remove("is-open"));
}

function habitModalSection(title, summary, body, open = false) {
  return `
    <details class="habit-config-section" ${open ? "open" : ""}>
      <summary>
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(summary)}</small>
        </span>
        <i data-lucide="chevron-down"></i>
      </summary>
      <div class="habit-config-body">
        ${body}
      </div>
    </details>
  `;
}

function habitIconPicker(value) {
  const options = ensureOption(habitIconOptions, "icon", value, {
    icon: value || "circle",
    label: "Personalizado",
    hint: "icono actual",
  });

  return `
    <fieldset class="field picker-field is-full">
      <legend>Icono (identidad visual del hábito)</legend>
      <div class="option-grid icon-option-grid">
        ${options
          .map(
            (option) => `
              <label class="option-card ${option.icon === value ? "is-selected" : ""}">
                <input type="radio" name="icon" value="${escapeAttr(option.icon)}" ${option.icon === value ? "checked" : ""} />
                <span class="option-icon"><i data-lucide="${option.icon}"></i></span>
                <span>
                  <strong>${escapeHtml(option.label)}</strong>
                  <small>${escapeHtml(option.hint)}</small>
                </span>
              </label>
            `,
          )
          .join("")}
      </div>
    </fieldset>
  `;
}

function habitColorPicker(value) {
  const options = ensureOption(habitColorOptions, "color", value, {
    color: value || "#68d66f",
    label: "Actual",
    hint: "color personalizado",
  });

  return `
    <fieldset class="field picker-field is-full">
      <legend>Color (tono emocional y categoría visual)</legend>
      <div class="option-grid color-option-grid">
        ${options
          .map(
            (option) => `
              <label class="option-card color-option ${option.color === value ? "is-selected" : ""}" style="--option-color:${option.color}">
                <input type="radio" name="color" value="${escapeAttr(option.color)}" ${option.color === value ? "checked" : ""} />
                <span class="color-swatch"></span>
                <span>
                  <strong>${escapeHtml(option.label)}</strong>
                  <small>${escapeHtml(option.hint)}</small>
                </span>
              </label>
            `,
          )
          .join("")}
      </div>
    </fieldset>
  `;
}

function habitStatPicker(value) {
  return `
    <fieldset class="field picker-field is-full">
      <legend>Stat (qué atributo sube cuando lo cumples)</legend>
      <div class="option-grid stat-option-grid">
        ${statCatalog
          .map(
            (stat) => `
              <label class="option-card stat-option ${stat.id === value ? "is-selected" : ""}" style="--option-color:${stat.color}">
                <input type="radio" name="stat" value="${stat.id}" ${stat.id === value ? "checked" : ""} />
                <span class="option-icon"><i data-lucide="${stat.icon}"></i></span>
                <span>
                  <strong>${stat.name}</strong>
                  <small>${escapeHtml(stat.hint)}</small>
                </span>
              </label>
            `,
          )
          .join("")}
      </div>
    </fieldset>
  `;
}

function field(label, name, value, type = "text", options = []) {
  if (type === "select") {
    return `
      <label class="field">
        <span>${label}</span>
        <select name="${name}">
          ${options.map(([optionValue, optionLabel]) => `<option value="${optionValue}" ${value === optionValue ? "selected" : ""}>${optionLabel}</option>`).join("")}
        </select>
      </label>
    `;
  }

  return `
    <label class="field">
      <span>${label}</span>
      <input type="${type}" name="${name}" value="${escapeAttr(String(value ?? ""))}" ${type === "number" ? "step=\"any\" min=\"0\"" : ""} />
    </label>
  `;
}

function ensureOption(options, key, value, fallback) {
  if (!value || options.some((option) => option[key] === value)) return options;
  return [fallback, ...options];
}

function optionLabel(options, key, value, fallback) {
  return options.find((option) => option[key] === value)?.label || fallback;
}

function calendarCell(day, habit, anchor) {
  const key = dateKey(day);
  const entry = getHabitEntry(key, habit.id);
  const isSelected = key === dateKey(selectedDate);
  const hasRecord = Boolean(state.records[key]);
  const classes = [
    entry.done ? (entry.quality === "heroic" ? "heroic" : "done") : hasRecord && day <= today ? "missed" : "",
    isSelected ? "today" : "",
    sameMonth(day, anchor) ? "" : "is-outside",
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <button
      class="cal-cell ${classes}"
      type="button"
      data-action="select-calendar-date"
      data-date="${key}"
      title="${escapeAttr(`${habit.name} · ${formatLongDate(day)}`)}"
      aria-label="${escapeAttr(`${habit.name} · ${formatLongDate(day)}`)}"
    ></button>
  `;
}

function openModal() {
  nodes.modal.showModal();
  refreshIcons();
}

function closeModal() {
  if (nodes.modalTitle.textContent === "Quick Timer") pauseQuickTimer(false);
  if (nodes.modalCard.dataset.modalKind === "dense-set") {
    delete state.settings.denseDraftEntryId;
    saveState();
  }
  delete nodes.modalCard.dataset.modalKind;
  nodes.modal.close();
}

function toast(message) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 1800);
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function activeHabits() {
  return state.habits.filter((habit) => !habit.archived);
}

function getHabitEntry(dayKey, habitId) {
  const raw = state.records[dayKey]?.[habitId];
  if (typeof raw === "boolean") return { done: raw, quality: "base" };
  return { done: false, quality: "base", ...(raw || {}) };
}

function habitDone(dayKey, habitId) {
  return Boolean(getHabitEntry(dayKey, habitId).done);
}

function doneCopy(quality) {
  const found = qualityCatalog.find((item) => item.id === quality);
  return found ? `completo · ${found.label}` : "completo";
}

function scoreForDate(date) {
  const key = dateKey(date);
  const habits = activeHabits();
  if (!state.records[key] || !habits.length) return 0;
  const done = habits.filter((habit) => habitDone(key, habit.id)).length;
  return Math.round((done / habits.length) * 100);
}

function averageScore(days) {
  const active = days.filter((day) => state.records[dateKey(day)]);
  if (!active.length) return 0;
  return Math.round(active.reduce((sum, day) => sum + scoreForDate(day), 0) / active.length);
}

function averageCoreScore(days) {
  const core = activeHabits().filter((habit) => habit.core);
  if (!core.length) return 0;
  const active = days.filter((day) => state.records[dateKey(day)]);
  if (!active.length) return 0;
  const done = active.reduce((sum, day) => {
    const key = dateKey(day);
    return sum + core.filter((habit) => habitDone(key, habit.id)).length;
  }, 0);
  return Math.round((done / (active.length * core.length)) * 100);
}

function amScore(days) {
  const active = days.filter((day) => state.records[dateKey(day)]);
  if (!active.length) return 0;
  const done = active.filter((day) => {
    const key = dateKey(day);
    return habitDone(key, "wake") && (habitDone(key, "train-am") || habitDone(key, "work-am"));
  }).length;
  return Math.round((done / active.length) * 100);
}

function countHabit(habitId, days) {
  return days.reduce((sum, day) => sum + Number(habitDone(dateKey(day), habitId)), 0);
}

function currentStreak() {
  let streak = 0;
  let cursor = today;
  while (scoreForDate(cursor) >= 70) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function totalXp() {
  const habitXp = Object.entries(state.records).reduce((sum, [dayKey, record]) => {
    return (
      sum +
      activeHabits().reduce((habitSum, habit) => {
        const entry = typeof record?.[habit.id] === "object" ? record[habit.id] : { done: Boolean(record?.[habit.id]), quality: "base" };
        if (!entry.done) return habitSum;
        const quality = qualityCatalog.find((item) => item.id === entry.quality) || qualityCatalog[1];
        const recency = dayKey === dateKey(today) ? 1.1 : 1;
        return habitSum + Math.round(habit.xp * quality.mult * recency);
      }, 0)
    );
  }, 0);

  const trainingXp = Object.values(state.trainingLogs).reduce((sum, log) => {
    return sum + Object.values(log.exercises || {}).filter(Boolean).length * 8;
  }, 0);

  const denseXp = getDenseEntries().reduce((sum, entry) => {
    const effortBonus = entry.effort === "VE" || entry.effort === "E" ? 1 : entry.effort === "VH" || entry.effort === "fallo" ? 1.2 : 1.1;
    return sum + Math.round(10 * effortBonus);
  }, 0);

  return habitXp + trainingXp + denseXp;
}

function levelFromXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

function xpForLevel(level) {
  return Math.round(120 * Math.pow(level - 1, 1.55));
}

function rankFor(level) {
  if (level >= 18) return "Mythic";
  if (level >= 12) return "Diamond";
  if (level >= 8) return "Gold";
  if (level >= 4) return "Silver";
  return "Bronze";
}

function dailyAvatarForm(date) {
  const key = dateKey(date);
  const score = scoreForDate(date);
  const coreDone = ["wake", "frog", "nophone", "family"].filter((habitId) => habitDone(key, habitId)).length;
  const firstBlock = habitDone(key, "train-am") || habitDone(key, "work-am");

  if (score >= 92 && coreDone >= 4 && firstBlock) {
    return {
      id: "ascended",
      label: "Ascenso diario",
      subtitle: "día perfecto · aura neon",
      color: "#ffd166",
      glow: "rgba(255, 209, 102, 0.62)",
      tierBoost: 2,
    };
  }
  if (score >= 78 && firstBlock) {
    return {
      id: "charged",
      label: "Cargado",
      subtitle: "misiones clave activas",
      color: "#68d66f",
      glow: "rgba(104, 214, 111, 0.5)",
      tierBoost: 1,
    };
  }
  if (score >= 48) {
    return {
      id: "awake",
      label: "Despierto",
      subtitle: "base encendida · queda combo",
      color: "#79aaff",
      glow: "rgba(121, 170, 255, 0.38)",
      tierBoost: 0,
    };
  }
  if (state.records[key]) {
    return {
      id: "low",
      label: "Batería baja",
      subtitle: "modo recuperación · salvar mínimo",
      color: "#e4af54",
      glow: "rgba(228, 175, 84, 0.32)",
      tierBoost: 0,
    };
  }
  return {
    id: "sleeping",
    label: "Sin activar",
    subtitle: "el día espera input",
    color: "#706d64",
    glow: "rgba(112, 109, 100, 0.28)",
    tierBoost: 0,
  };
}

function avatarForLevel(level) {
  const tiers = [
    {
      min: 1,
      tier: 1,
      title: "Street Novice",
      subtitle: "primeras barras · base humana",
      primary: "#79aaff",
      secondary: "#57c6a1",
      glow: "rgba(121, 170, 255, 0.34)",
    },
    {
      min: 4,
      tier: 2,
      title: "Bar Apprentice",
      subtitle: "rutina AM · aura verde",
      primary: "#68d66f",
      secondary: "#8bd9eb",
      glow: "rgba(104, 214, 111, 0.42)",
    },
    {
      min: 8,
      tier: 3,
      title: "Neon Striker",
      subtitle: "fuerza + foco · modo anime",
      primary: "#bd8bff",
      secondary: "#ff7c9e",
      glow: "rgba(189, 139, 255, 0.46)",
    },
    {
      min: 12,
      tier: 4,
      title: "Cyber Senpai",
      subtitle: "calistenia densa · cero ruido",
      primary: "#8bd9eb",
      secondary: "#ffd166",
      glow: "rgba(139, 217, 235, 0.5)",
    },
    {
      min: 18,
      tier: 5,
      title: "Mythic Ascendant",
      subtitle: "mesociclo dominado · leyenda local",
      primary: "#ffd166",
      secondary: "#68d66f",
      glow: "rgba(255, 209, 102, 0.58)",
    },
  ];

  return [...tiers].reverse().find((tier) => level >= tier.min) || tiers[0];
}

function avatarEvolution(level) {
  return [
    { level: "Lv 1", min: 1, name: "Novice" },
    { level: "Lv 4", min: 4, name: "Bars" },
    { level: "Lv 8", min: 8, name: "Neon" },
    { level: "Lv 12", min: 12, name: "Cyber" },
    { level: "Lv 18", min: 18, name: "Mythic" },
  ].map((stage) => {
    const next = [1, 4, 8, 12, 18].filter((min) => min > stage.min).sort((a, b) => a - b)[0] || Infinity;
    return {
      ...stage,
      unlocked: level >= stage.min,
      current: level >= stage.min && level < next,
    };
  });
}

function getDenseEntries() {
  return Array.isArray(state.denseTrainingEntries) ? state.denseTrainingEntries : [];
}

function denseEntriesForDate(key) {
  return getDenseEntries().filter((entry) => entry.date === key);
}

function denseDaySummary(key) {
  const entries = denseEntriesForDate(key);
  return {
    count: entries.length,
    totalReps: entries.reduce((sum, entry) => sum + Number(entry.total_reps || 0), 0),
    tonnage: entries.reduce((sum, entry) => sum + Number(entry.tonnage_kg || 0), 0),
    uniqueExercises: new Set(entries.map((entry) => entry.exercise_id)).size,
  };
}

function latestDenseEntry() {
  return [...getDenseEntries()].sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0] || null;
}

function latestDenseEntryForExercise(exerciseId, scheme = "") {
  return [...getDenseEntries()]
    .filter((entry) => entry.exercise_id === exerciseId && !entry.deleted_at && (!scheme || entry.scheme === scheme))
    .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0] || null;
}

function denseQuickExercises() {
  const favorites = denseExerciseFavorites()
    .map((id) => denseExerciseById(id))
    .filter(Boolean);
  const recent = denseExerciseLibrary({ sort: "recent" }).filter((exercise) => denseExerciseStats(exercise.id).count > 0);
  const fallback = denseExerciseLibrary({ sort: "az" }).slice(0, 6);
  const unique = new Map();
  [...favorites, ...recent, ...fallback].forEach((exercise) => {
    if (exercise?.id && !unique.has(exercise.id)) unique.set(exercise.id, exercise);
  });
  return [...unique.values()].slice(0, 6);
}

function denseEffortBadge(effort) {
  const labels = { VE: "Muy fácil", E: "Fácil", N: "Normal", H: "Difícil", VH: "Muy difícil", fallo: "Fallo" };
  const value = effort || "N";
  return `<span class="effort-badge" style="--effort-color:${denseEffortColor(value)}">${escapeHtml(labels[value] || value)}</span>`;
}

// Bottom line of a logged card: "5D7 (35 reps)" or "5D15 (75s TUT)"
function denseEntrySummaryLine(entry) {
  const scheme = entry.scheme || "";
  if (entry.total_hold_seconds) {
    const perRound = entry.hold_seconds_per_round || (entry.duration_minutes ? Math.round(entry.total_hold_seconds / entry.duration_minutes) : 0);
    return `<span class="set-main-metric">${escapeHtml(denseSchemeCode(scheme, perRound))} <span class="set-paren">(${entry.total_hold_seconds}s TUT)</span></span>`;
  }
  const rpm = Math.round(Number(entry.reps_per_min || entry.reps_per_set || 0));
  return `<span class="set-main-metric">${escapeHtml(denseSchemeCode(scheme, rpm))} <span class="set-paren">(${entry.total_reps || 0} reps)</span></span>`;
}

// Wrap a card so it can be swiped left to reveal a delete action (iOS-style).
function swipeDeleteWrap(cardHtml, deleteAttrs, label) {
  return `
    <div class="swipe-wrap" data-swipe>
      <button class="swipe-delete-bg" type="button" tabindex="-1" ${deleteAttrs} aria-label="Eliminar ${escapeAttr(label)}">
        <i data-lucide="trash-2"></i><span>Eliminar</span>
      </button>
      ${cardHtml}
    </div>
  `;
}

// DENSE-style effort chips: full uppercase word in normal, letter code in minimal
function denseEffortTagLabel(effort) {
  return { VE: "VERY EASY", E: "EASY", N: "NORMAL", H: "HARD", VH: "VERY HARD", fallo: "FAIL" }[effort || "N"] || effort;
}

function denseEffortLetter(effort) {
  return { VE: "VE", E: "E", N: "N", H: "H", VH: "VH", fallo: "F" }[effort || "N"] || effort;
}

// Italic protocol hint under the title ("5 minutes EMOM. Log total reps...")
function denseProtocolHint(scheme, isometric) {
  const minutes = denseSchemeMinutes(scheme) || 0;
  if (!minutes) return "";
  if (isometric) return `${minutes} rondas isométricas. Apunta el hold por ronda.`;
  return `${minutes} minutos EMOM. Apunta las reps totales al final.`;
}

function todayWorkoutCard(entry) {
  const exercise = denseExerciseById(entry.exercise_id);
  const isPr = denseEntryIsPr(entry);
  const effortColor = denseEffortColor(entry.effort || "N");
  const romTxt = denseRomText(entry);
  const volume = romTxt || (entry.tonnage_kg ? `${roundTo(entry.tonnage_kg / 1000, 1)}t` : entry.total_reps ? `${entry.total_reps} reps` : entry.total_hold_seconds ? `${entry.total_hold_seconds}s` : "-");
  const card = `
    <article class="today-workout-card workout-set-card is-complete ${isPr ? "is-pr" : ""}" style="--item-color:${denseCategoryColor(exercise.category)}" data-action="open-dense-exercise-detail" data-exercise="${escapeAttr(entry.exercise_id)}">
      ${denseExerciseIconMarkup(exercise, { className: "tiny-icon workout-exercise-icon" })}
      <div class="workout-set-main">
        <div class="workout-set-tags">
          ${isPr ? `<span class="mini-tag is-amber"><i data-lucide="trophy"></i>${["VE", "E"].includes(entry.effort) ? "PR + margen" : "NEW PR"}</span>` : ""}
          <span class="mini-tag is-blue">${escapeHtml(denseNatureLabel(entry.nature).split("·")[0].trim())} · Dense</span>
          <span class="mini-tag effort-tag" style="--effort-color:${effortColor}">${escapeHtml(denseEffortTagLabel(entry.effort))}</span>
        </div>
        <strong>${escapeHtml(entry.exercise_name)} <small>${escapeHtml(entry.scheme)}</small></strong>
        <em class="set-protocol">${escapeHtml(denseProtocolHint(entry.scheme, Boolean(entry.total_hold_seconds)))}</em>
        <span class="workout-set-summary">${denseEntrySummaryLine(entry)} <span class="effort-letter" style="--effort-color:${effortColor}">${escapeHtml(denseEffortLetter(entry.effort))}</span></span>
      </div>
      <div class="workout-set-volume">
        <span>${romTxt ? "Rango" : "Volume"}</span>
        <strong>${escapeHtml(volume)}</strong>
      </div>
      <div class="workout-set-actions">
        <button class="icon-button" type="button" data-action="open-dense-entry-modal" data-entry="${escapeAttr(entry.id)}" title="Editar" aria-label="Editar ${escapeAttr(entry.exercise_name)}">
          <i data-lucide="edit-3"></i>
        </button>
        <span class="set-state ${isPr ? "is-pr" : ""}" aria-hidden="true"><i data-lucide="square-check"></i></span>
      </div>
    </article>
  `;
  return swipeDeleteWrap(card, `data-action="confirm-delete-dense-entry" data-entry="${escapeAttr(entry.id)}"`, entry.exercise_name);
}

function denseEntryIsPr(entry) {
  // Mobility ROM PR: closest to the floor/target wins, across schemes (a
  // deeper pancake is a PR regardless of reps). Only when this mark logged a
  // ROM; otherwise fall through to the normal per-scheme strength PR.
  const rom = denseEntryRom(entry);
  if (rom !== null && denseUsesRom(denseExerciseById(entry.exercise_id))) {
    return !getDenseEntries().some((item) => {
      if (item.id === entry.id || item.exercise_id !== entry.exercise_id) return false;
      const other = denseEntryRom(item);
      return other !== null && other < rom;
    });
  }
  const score = denseEntryScore(entry);
  if (!score) return false;
  return !getDenseEntries().some((item) => item.id !== entry.id && item.exercise_id === entry.exercise_id && item.scheme === entry.scheme && denseEntryScore(item) > score);
}

// Single source of truth for the default scheme of an exercise: the last
// session's scheme if it's still valid, else a sensible mid-range default
// (10D bodyweight / 10D5 loaded). Used by BOTH the planned card and the set
// form so the "Target" shown and the scheme the form opens with always match.
function denseDefaultScheme(exercise) {
  const allowed = denseAllowedSchemes(exercise);
  const last = latestDenseEntryForExercise(exercise.id);
  if (last && allowed.includes(last.scheme)) return last.scheme;
  const preferred = denseIsLoadExercise(exercise) ? "10D5" : "10D";
  return allowed.includes(preferred) ? preferred : allowed[0] || preferred;
}

function densePlannedScheme(exercise) {
  return denseDefaultScheme(exercise);
}

// Where the recommended target comes from + how much to trust it. Answers the
// audit's "directo / estimado / transferencia" question inline on the card.
// ── Fase 4: la app aprende su propio error ───────────────────────────────
// Every FIRST mark in a scheme was executed against an engine ESTIMATE (block
// scaling, lever sibling, cross-scheme...). Comparing that implicit target with
// what actually happened gives a real, personal error sample — fully derivable
// from history (no stored state, same philosophy as rebuildTransferState).
// (The cache variable lives in the top constants block — TDZ convention.)

// Prediction error of one mark on its natural axis, [0..1] or null.
function denseCalibrationError(entry) {
  // Load axis: e1RM implied by completing the scheme vs the effective e1RM.
  const load = Number(entry.total_system_load_kg) || 0;
  const pct = Number(entry.working_pct) || 0;
  const effective = Number(entry.e1rm_kg) || 0;
  if (load && pct && effective) {
    const nominal = load / pct;
    if (nominal > 0) return clamp(Math.abs(nominal - effective) / nominal, 0, 1);
  }
  const targetRpm = Number(entry.target_reps_per_min) || 0;
  const rpm = Number(entry.reps_per_min) || 0;
  if (targetRpm && rpm) return clamp(Math.abs(targetRpm - rpm) / targetRpm, 0, 1);
  const targetHold = Number(entry.target_total_hold_seconds) || 0;
  const hold = Number(entry.total_hold_seconds) || 0;
  if (targetHold && hold) return clamp(Math.abs(targetHold - hold) / targetHold, 0, 1);
  return null;
}

function denseCalibrationObservations() {
  if (denseCalibrationCache) return denseCalibrationCache;
  const sorted = [...getDenseEntries()]
    .filter((entry) => !entry.deleted_at)
    .sort((a, b) => String(a.created_at || a.date || "").localeCompare(String(b.created_at || b.date || "")));
  const seenScheme = new Set();
  const seenBase = new Set();
  const seenExercise = new Set();
  const leverFamilySeen = new Set();
  const observations = [];
  sorted.forEach((entry) => {
    const exercise = denseExerciseById(entry.exercise_id);
    const schemeKey = `${entry.exercise_id}:${entry.scheme}`;
    const baseKey = `${entry.exercise_id}:${denseSchemeBase(entry.scheme)}`;
    if (!seenScheme.has(schemeKey)) {
      let kind = null;
      if (seenBase.has(baseKey)) kind = "block";
      // "family" = first-ever contact with the exercise, targeted from a leveled
      // sibling. With own history at another base the estimate is a cross one.
      else if (denseProgressionLevelOf(exercise) && leverFamilySeen.has(exercise.family) && !seenExercise.has(entry.exercise_id)) kind = "family";
      else if (seenExercise.has(entry.exercise_id)) kind = "cross";
      if (kind) {
        const error = denseCalibrationError(entry);
        if (error !== null) observations.push({ kind, error, date: entry.date, exercise_id: entry.exercise_id });
      }
    }
    seenScheme.add(schemeKey);
    seenBase.add(baseKey);
    seenExercise.add(entry.exercise_id);
    if (denseProgressionLevelOf(exercise) && exercise?.family) leverFamilySeen.add(exercise.family);
  });
  denseCalibrationCache = observations;
  return observations;
}

// Empirical sigma for a target-source kind: the 80th percentile of YOUR real
// prediction errors. Replaces the formula sigma once there is enough evidence.
function denseEmpiricalSigma(kind) {
  const mapped = kind === "estimated" || kind === "transfer" ? "cross" : kind;
  const errors = denseCalibrationObservations()
    .filter((obs) => obs.kind === mapped)
    .map((obs) => obs.error)
    .sort((a, b) => a - b);
  if (errors.length < DENSE_CALIBRATION_MIN_OBS) return null;
  const p80 = errors[Math.min(errors.length - 1, Math.max(0, Math.ceil(errors.length * 0.8) - 1))];
  return { sigma: clamp(p80, 0.04, 0.3), n: errors.length };
}

// Personal rep-max curve bias: if your effective e1RM drifts with rep speed
// (log-log slope across your loaded marks), the generic curve does not fit you.
// Positive slope = more endurance than the curve assumes (a 5D10 overpredicts
// your 5D5). Needs meaningfully different rep ranges; clamped hard.
function denseCurveSlopeBias(exerciseId) {
  const points = getDenseEntries()
    .filter((entry) => entry.exercise_id === exerciseId && !entry.deleted_at && Number(entry.e1rm_kg) > 0 && Number(entry.reps_per_min) > 0 && Number(entry.total_system_load_kg) > 0)
    .map((entry) => ({ x: Math.log(Number(entry.reps_per_min)), y: Math.log(Number(entry.e1rm_kg)) }));
  if (points.length < 2) return 0;
  const xs = points.map((p) => p.x);
  if (Math.max(...xs) - Math.min(...xs) < Math.log(1.8)) return 0;
  const n = points.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  points.forEach((p) => {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) * (p.x - mx);
  });
  if (!den) return 0;
  return clamp(num / den, -DENSE_CURVE_BIAS_CLAMP, DENSE_CURVE_BIAS_CLAMP);
}

function denseTargetSource(exercise, scheme) {
  const base = denseSchemeBase(scheme);
  const entries = getDenseEntries().filter((entry) => entry.exercise_id === exercise.id && !entry.deleted_at);
  const byRecent = (a, b) => String(b.created_at || b.date || "").localeCompare(String(a.created_at || a.date || ""));
  const directExact = [...entries].filter((entry) => entry.scheme === scheme).sort(byRecent)[0];
  if (directExact) {
    const sigma = denseEstimateSigma(directExact.date);
    return { kind: "direct", label: "Directo", cls: "is-green", icon: "check", sigma, confidence: denseConfidenceLabel(sigma) };
  }
  const sameBase = [...entries].filter((entry) => denseSchemeBase(entry.scheme) === base).sort(byRecent)[0];
  if (sameBase) {
    const emp = denseEmpiricalSigma("block");
    const sigma = emp ? emp.sigma : denseEstimateSigma(sameBase.date);
    return { kind: "block", label: `Desde ${sameBase.scheme}`, cls: "is-blue", icon: "history", sigma, empirical: emp, confidence: denseConfidenceLabel(sigma) };
  }
  const leverSibling = denseLeverSiblingEstimate(exercise, denseIsIsometric(exercise) ? "isometric_capacity" : "bodyweight_capacity");
  if (leverSibling) {
    const shortName = leverSibling.from.name.split(" ").slice(-2).join(" ");
    const emp = denseEmpiricalSigma("family");
    const sigma = emp ? emp.sigma : 0.18;
    return { kind: "family", label: `Desde ${shortName}`, cls: "is-amber", icon: "git-branch", sigma, empirical: emp, confidence: denseConfidenceLabel(sigma) };
  }
  if (denseTransferBoost(exercise.id) > 0) {
    const emp = denseEmpiricalSigma("transfer");
    const sigma = emp ? emp.sigma : 0.2;
    return { kind: "transfer", label: "Transferencia", cls: "is-amber", icon: "git-merge", sigma, empirical: emp, confidence: denseConfidenceLabel(sigma) };
  }
  if (entries.length) {
    const emp = denseEmpiricalSigma("estimated");
    const sigma = emp ? emp.sigma : denseEstimateSigma([...entries].sort(byRecent)[0].date, { cross: true, baseGap: 2 });
    return { kind: "estimated", label: "Estimado", cls: "is-amber", icon: "sigma", sigma, empirical: emp, confidence: denseConfidenceLabel(sigma) };
  }
  return { kind: "none", label: "Primer test", cls: "", icon: "flask-conical", sigma: 0, confidence: "" };
}

// Range text for an estimated target: "87-97kg" / "6-8 rpm". Only for
// non-direct sources; a directly-tested scheme shows the single number.
function densePlannedTargetRange(exercise, scheme, src = denseTargetSource(exercise, scheme)) {
  if (!src.sigma || src.kind === "direct" || src.kind === "none") return "";
  if (denseUsesRom(exercise)) return "";
  if (denseIsLoadExercise(exercise)) {
    const suggestion = denseProgressionSuggestion(exercise, "normal", scheme);
    const load = suggestion && Number(suggestion.assistLoadKg || suggestion.externalLoadKg || suggestion.addedLoadKg || suggestion.weightPerDumbbellKg || 0);
    if (!load) return "";
    const low = denseRoundLoad(load * (1 - src.sigma));
    const high = denseRoundLoad(load * (1 + src.sigma));
    return low !== "" && high !== "" && high > low ? `${low}–${high}kg` : "";
  }
  if (denseIsIsometric(exercise)) {
    const seconds = Number(denseFormTargetHoldPerRound(exercise, scheme, null)) || 0;
    if (!seconds) return "";
    const low = Math.max(1, Math.floor(seconds * (1 - src.sigma)));
    const high = Math.max(low + 1, Math.ceil(seconds * (1 + src.sigma)));
    return `${low}–${high}s`;
  }
  const reps = Number(denseFormTargetRepsPerSet(exercise, scheme, null)) || 0;
  if (!reps) return "";
  const low = Math.max(1, Math.floor(reps * (1 - src.sigma)));
  const high = Math.max(low + 1, Math.ceil(reps * (1 + src.sigma)));
  return `${low}–${high} rpm`;
}

function denseTargetSourceBadge(exercise, scheme) {
  const src = denseTargetSource(exercise, scheme);
  return `<span class="mini-tag ${src.cls}"><i data-lucide="${src.icon}"></i>${escapeHtml(src.label)}${src.confidence ? ` · conf ${escapeHtml(src.confidence)}` : ""}</span>`;
}

function densePlannedTargetValue(exercise, scheme) {
  if (denseUsesRom(exercise)) {
    const rom = denseRomSuggestion(exercise);
    if (rom) return `${roundTo(rom.target, 1)} cm`;
    const best = denseBestRom(exercise.id);
    if (best !== null) return `${roundTo(best, 1)} cm`;
  }
  if (denseIsIsometric(exercise)) {
    // Same resolver as the form prefill (own capacity → lever sibling → default)
    // so the card target and the form never disagree.
    const seconds = denseFormTargetHoldPerRound(exercise, scheme, null);
    return seconds ? `${seconds}s/ronda` : "-";
  }
  // Load / assisted exercises: the headline objective is the weight, not rpm.
  if (denseIsLoadExercise(exercise)) {
    const suggestion = denseProgressionSuggestion(exercise, "normal", scheme);
    if (suggestion?.type === "assist") return Number(suggestion.assistLoadKg) > 0 ? `−${formatKg(suggestion.assistLoadKg)}` : "OAC";
    const load = suggestion && (suggestion.externalLoadKg || suggestion.addedLoadKg || suggestion.weightPerDumbbellKg);
    if (load) return `${suggestion.addedLoadKg ? "+" : ""}${formatKg(load)}`;
    return "-";
  }
  if (denseUsesRepsPerSet(exercise)) {
    const reps = denseFormTargetRepsPerSet(exercise, scheme, null);
    return reps ? `${reps} rpm` : "-";
  }
  return scheme;
}

// Last session of the same dense time-block (e.g. last 5D) for this exercise
function denseLastSessionSummary(exercise, scheme) {
  const base = denseSchemeBase(scheme);
  const last = [...getDenseEntries()]
    .filter((entry) => entry.exercise_id === exercise.id && denseSchemeBase(entry.scheme) === base)
    .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
  if (!last) return "Sin marca previa en este bloque";
  const effort = last.effort || "N";
  if (last.total_hold_seconds) return `Última ${escapeHtml(last.scheme)} (${last.total_hold_seconds}s) · ${escapeHtml(effort)}`;
  const rpm = Math.round(Number(last.reps_per_min || last.target_reps_per_min || 0));
  return `Última ${escapeHtml(denseSchemeCode(last.scheme, rpm))} (${last.total_reps || 0} reps) · ${escapeHtml(effort)}`;
}

function plannedWorkoutCard(exercise) {
  const canDelete = exercise.plannedSource === "custom";
  const scheme = exercise.plannedScheme && denseAllowedSchemes(exercise).includes(exercise.plannedScheme) ? exercise.plannedScheme : densePlannedScheme(exercise);
  const target = densePlannedTargetValue(exercise, scheme);
  const src = denseTargetSource(exercise, scheme);
  const range = densePlannedTargetRange(exercise, scheme, src);
  const card = `
    <article class="today-workout-card workout-set-card is-planned" style="--item-color:${denseCategoryColor(exercise.category)}" data-action="open-dense-exercise-detail" data-exercise="${escapeAttr(exercise.id)}">
      ${denseExerciseIconMarkup(exercise, { className: "tiny-icon workout-exercise-icon" })}
      <div class="workout-set-main">
        <div class="workout-set-tags">
          ${exercise.plannedIsTest ? `<span class="mini-tag is-amber"><i data-lucide="flask-conical"></i>Test</span>` : ""}
          ${denseTargetSourceBadge(exercise, scheme)}
          <span class="mini-tag">${escapeHtml(denseNatureLabel(exercise.nature).split("·")[0].trim())}</span>
        </div>
        <strong>${escapeHtml(exercise.name)} <small>${escapeHtml(scheme)}</small></strong>
        <em class="set-protocol">${escapeHtml(denseProtocolHint(scheme, denseIsIsometric(exercise)))}</em>
        <span class="set-last-line">${denseLastSessionSummary(exercise, scheme)}</span>
      </div>
      <div class="workout-set-volume">
        <span>Target</span>
        <strong>${escapeHtml(target)}</strong>
        <small>${escapeHtml(range || scheme)}</small>
      </div>
      <div class="workout-set-actions">
        <button class="set-state is-empty" type="button" data-action="open-dense-exercise-modal" data-exercise="${escapeAttr(exercise.id)}" title="Completar" aria-label="Completar ${escapeAttr(exercise.name)}">
          <i data-lucide="square"></i>
        </button>
        <button class="icon-button is-play" type="button" data-action="start-exercise-timer" data-exercise="${escapeAttr(exercise.id)}" title="Iniciar cronómetro" aria-label="Iniciar cronómetro ${escapeAttr(exercise.name)}">
          <i data-lucide="play"></i>
        </button>
      </div>
      <button class="workout-start-button" type="button" data-action="start-exercise-timer" data-exercise="${escapeAttr(exercise.id)}">
        <i data-lucide="play"></i>Start
      </button>
    </article>
  `;
  if (!canDelete) return card;
  return swipeDeleteWrap(card, `data-action="confirm-delete-planned-exercise" data-plan-index="${exercise.planIndex}"`, exercise.name);
}

function addWorkoutCard() {
  return `
    <button class="workout-add-button" type="button" data-action="open-workout-exercise-picker">
      <i data-lucide="plus"></i>
      <span>Agregar ejercicio</span>
    </button>
  `;
}

function workoutSummaryMetric(value, label) {
  return `
    <div class="workout-summary-metric">
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function yearWeekOptions(selectedWeek, currentWeek) {
  return Array.from({ length: 52 }, (_, index) => index + 1)
    .map((week) => {
      const selected = week === selectedWeek;
      const current = week === currentWeek;
      return `
        <button
          class="week-menu-option ${selected ? "is-selected" : ""} ${current ? "is-current" : ""}"
          type="button"
          data-action="select-year-week"
          data-week="${week}"
        >
          <span>Week ${week}</span>
          ${current ? "<em>CURRENT</em>" : ""}
          ${selected ? '<i data-lucide="check"></i>' : ""}
        </button>
      `;
    })
    .join("");
}

function workoutDayButton(day) {
  const key = dateKey(day);
  const entries = denseEntriesForDate(key);
  const planned = plannedExercisesForDate(day);
  const selected = key === dateKey(selectedDate);
  const tonnage = entries.reduce((sum, entry) => sum + (Number(entry.tonnage_kg) || 0), 0);
  const goal = denseTonnageGoal(key) || 1;
  const heat = entries.length ? Math.max(0.2, Math.min(1, tonnage / goal)) : 0;
  const heatClass = entries.length ? (tonnage >= goal ? "is-heat is-goal-met" : "is-heat") : "";
  const heatLabel = entries.length ? ` · ${roundTo(tonnage / 1000, 1)} T` : "";
  return `
    <button
      class="weekday-button ${selected ? "is-selected" : ""} ${heatClass}"
      style="--heat:${roundTo(heat, 2)}"
      type="button"
      data-action="select-calendar-date"
      data-date="${key}"
      title="${escapeAttr(formatLongDate(day) + heatLabel)}"
      aria-label="${escapeAttr(formatLongDate(day) + heatLabel)}"
    >
      <span>${denseWeekdayLetter(day)}</span>
    </button>
  `;
}

function plannedExercisesForDate(day) {
  // Mesocycle auto-programming is hidden for now: only manual day plans are shown.
  return densePlanItemsForDate(day)
    .map((item, index) => {
      const exercise = findDenseExerciseById(item.exercise_id);
      return exercise
        ? { ...exercise, nature: item.nature && (exercise.allowedNatures || [exercise.nature]).includes(item.nature) ? item.nature : exercise.nature, plannedSource: "custom", planIndex: index, plannedScheme: item.scheme || "", plannedIsTest: Boolean(item.is_test) }
        : null;
    })
    .filter(Boolean);
}

function currentMesocycleSessionForDate(day) {
  const weekIndex = Math.min(state.mesocycle.weeks.length - 1, Math.max(0, Math.floor(daysBetween(parseDate(state.mesocycle.startDate), day) / 7)));
  const week = state.mesocycle.weeks[weekIndex] || state.mesocycle.weeks[0];
  if (!week?.sessions?.length) return null;
  const dayIndex = (day.getDay() + 6) % 7;
  if (dayIndex <= 1) return week.sessions[0];
  if (dayIndex <= 3) return week.sessions[1] || week.sessions[0];
  if (dayIndex <= 5) return week.sessions[2] || week.sessions[0];
  return null;
}

function denseExerciseFromPlannedName(name = "") {
  const normalized = name.toLowerCase();
  if (normalized.includes("domin")) return denseExerciseById("pull_up");
  if (normalized.includes("remo")) return denseExerciseById("ring_row");
  if (normalized.includes("press militar")) return denseExerciseById("seated_db_overhead_press");
  if (normalized.includes("press") || normalized.includes("banca")) return denseExerciseById("floor_push_up");
  if (normalized.includes("sentadilla") || normalized.includes("squat")) return denseExerciseById("air_squat");
  if (normalized.includes("zancada") || normalized.includes("split")) return denseExerciseById("pistol_squat");
  if (normalized.includes("movilidad") || normalized.includes("cadera")) return denseExerciseById("seated_bent_leg_good_morning");
  return null;
}

function denseExerciseById(id) {
  const key = denseExerciseAliases[id] || id;
  return denseExerciseCatalog.find((exercise) => exercise.id === key) || denseExerciseCatalog[0];
}

function findDenseExerciseById(id) {
  const key = denseExerciseAliases[id] || id;
  return denseExerciseCatalog.find((exercise) => exercise.id === key) || null;
}

function denseExerciseFavorites() {
  return Array.isArray(state.denseExerciseFavorites) ? state.denseExerciseFavorites : [];
}

function denseExerciseLibrary({ category = "all", sort = "recent", search = "" } = {}) {
  const query = search.trim().toLowerCase();
  return denseExerciseCatalog
    .map((exercise) => ({ ...exercise, stats: denseExerciseStats(exercise.id), favorite: denseExerciseFavorites().includes(exercise.id) }))
    .filter((exercise) => category === "all" || exercise.category === category)
    .filter((exercise) => {
      if (!query) return true;
      return `${exercise.name} ${exercise.family} ${denseCategoryLabel(exercise.category)}`.toLowerCase().includes(query);
    })
    .sort((a, b) => denseExerciseSortValue(a, b, sort));
}

function denseExerciseSortValue(a, b, sort) {
  if (sort === "favorite") {
    if (Number(b.favorite) !== Number(a.favorite)) return Number(b.favorite) - Number(a.favorite);
    return (b.stats.lastTime || 0) - (a.stats.lastTime || 0);
  }
  if (sort === "used") {
    if (b.stats.count !== a.stats.count) return b.stats.count - a.stats.count;
    return a.name.localeCompare(b.name);
  }
  if (sort === "abandoned") {
    if (b.stats.daysSince !== a.stats.daysSince) return b.stats.daysSince - a.stats.daysSince;
    return a.name.localeCompare(b.name);
  }
  if (sort === "az") return a.name.localeCompare(b.name);
  return (b.stats.lastTime || 0) - (a.stats.lastTime || 0) || a.name.localeCompare(b.name);
}

function denseExerciseStats(exerciseId) {
  const entries = getDenseEntries().filter((entry) => entry.exercise_id === exerciseId);
  const lastEntry = [...entries].sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
  const lastTime = lastEntry ? parseDate(lastEntry.date).getTime() : 0;
  const daysSince = lastEntry ? Math.max(0, Math.round((today.getTime() - parseDate(lastEntry.date).getTime()) / 86400000)) : 9999;
  return {
    count: entries.length,
    lastEntry,
    lastTime,
    daysSince,
  };
}

function denseCategoryLabel(category) {
  return denseExerciseCategories.find(([value]) => value === category)?.[1] || "Otros";
}

function denseCategoryColor(category) {
  if (category === "push") return "var(--rose)";
  if (category === "pull") return "var(--blue)";
  if (category === "legs") return "var(--green)";
  if (category === "skills") return "var(--purple)";
  if (category === "mobility") return "var(--cyan)";
  if (category === "core") return "var(--amber)";
  return "var(--teal)";
}

function denseExerciseIconMarkup(exerciseOrId, { color = "", className = "tiny-icon" } = {}) {
  const exercise = typeof exerciseOrId === "string" ? denseExerciseById(exerciseOrId) : exerciseOrId;
  const tint = color || denseCategoryColor(exercise?.category);
  const icon = exercise?.icon || "dumbbell";
  return `
    <span class="${className}" style="--item-color:${tint}" aria-hidden="true">
      <i data-lucide="${escapeAttr(icon)}"></i>
    </span>
  `;
}

function denseNatureLabel(nature) {
  return denseNatureOptions.find(([value]) => value === nature)?.[1] || nature;
}

function denseSchemeColor(scheme) {
  const base = denseSchemeBase(scheme);
  if (base === "2D") return "#ff7c9e";
  if (base === "5D") return "#ffd166";
  if (base === "10D") return "#79aaff";
  if (base === "20D") return "#68d66f";
  return "#57c6a1";
}

function denseEffortColor(effort) {
  if (effort === "VE") return "#8bd9eb";
  if (effort === "E") return "#68d66f";
  if (effort === "N") return "#ffd166";
  if (effort === "H") return "#e4af54";
  if (effort === "VH") return "#ff7c9e";
  return "#d8574f";
}

function denseAllowedSchemes(exercise) {
  if (exercise.allowedSchemes?.length) return exercise.allowedSchemes;
  if (denseIsLoadExercise(exercise)) return weightedSchemes;
  return bodyweightSchemes;
}

function denseDefaultTotalReps(exercise, scheme) {
  const minutes = denseSchemeMinutes(scheme);
  const prescription = scheme.replace(/^\d+D/, "");
  if (!minutes) return "";
  if (denseUsesRepsPerSet(exercise)) return denseTotalFromRepsPerSet(denseDefaultRepsPerSet(exercise, scheme), scheme);
  if (prescription) {
    const values = prescription
      .split("-")
      .map(Number)
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length) {
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      return Math.round(minutes * average);
    }
  }

  const estimate = state.denseEstimates?.[exercise.id]?.bodyweight_capacity;
  const multiplier = bodyweightMultipliers[denseSchemeBase(scheme)];
  if (estimate && multiplier) return Math.max(1, Math.floor(estimate * multiplier) * minutes);

  const latestSameScheme = [...getDenseEntries()]
    .filter((entry) => entry.exercise_id === exercise.id && entry.scheme === scheme && entry.total_reps)
    .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
  if (latestSameScheme) return latestSameScheme.target_total_reps || latestSameScheme.total_reps;

  const baseRpm = denseDefaultRpm(exercise, denseSchemeBase(scheme));
  return Math.max(1, Math.round(baseRpm * minutes));
}

// Max reps/min that is physically plausible in a dense block. Unilateral moves
// count per side, so >~12/side (>~24 total/min) is not doable — cap suggestions
// so we never propose an impossible pace (e.g. ATG split squats at 14/side).
function denseMaxRepsPerMin(exercise) {
  if (exercise?.repsPerSide) return 12;
  return Infinity;
}

function denseCapRpm(exercise, rpm) {
  const cap = denseMaxRepsPerMin(exercise);
  const value = Number(rpm);
  if (!Number.isFinite(value)) return rpm;
  return Number.isFinite(cap) ? Math.min(value, cap) : value;
}

function denseDefaultRepsPerSet(exercise, scheme) {
  if (!denseUsesRepsPerSet(exercise)) return "";
  const minutes = denseSchemeMinutes(scheme);
  if (!minutes) return "";
  if (denseIsLoadExercise(exercise)) {
    return denseSchemePrescriptionAverage(scheme) || Math.max(1, Math.round(denseDefaultRpm(exercise, denseSchemeBase(scheme))));
  }
  let raw;
  const latestSameScheme = [...getDenseEntries()]
    .filter((entry) => entry.exercise_id === exercise.id && entry.scheme === scheme && entry.total_reps)
    .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
  if (latestSameScheme) {
    const target = Number(latestSameScheme.target_reps_per_min || latestSameScheme.reps_per_set || 0);
    raw = target > 0 ? target : Math.max(1, Math.round(Number(latestSameScheme.total_reps) / minutes));
  } else {
    const estimate = denseBoosted(exercise.id, state.denseEstimates?.[exercise.id]?.bodyweight_capacity || 0);
    const multiplier = bodyweightMultipliers[denseSchemeBase(scheme)];
    // Cross-estimate via the unified e1RM curve (e.g. weighted-only history
    // informing an unweighted scheme) before falling back to generic defaults.
    const crossRpm = denseCrossRpm(exercise, denseSchemeBase(scheme));
    raw = estimate && multiplier
      ? Math.max(1, Math.floor(estimate * multiplier))
      : crossRpm
        ? Math.max(1, Math.floor(crossRpm))
        : Math.max(1, Math.round(denseDefaultRpm(exercise, denseSchemeBase(scheme)) * denseColdStartFactor(exercise)));
  }
  return Math.max(1, Math.round(denseCapRpm(exercise, raw)));
}

// Suggested hold seconds per round for an isometric, scaled by density (more rest = longer holds)
function denseDefaultHoldPerRound(exercise, scheme) {
  const multiplier = bodyweightMultipliers[denseSchemeBase(scheme)];
  if (!multiplier) return "";
  const isoCapacity = state.denseEstimates?.[exercise.id]?.isometric_capacity;
  if (isoCapacity) return denseCapHold(Math.max(1, Math.floor(denseBoosted(exercise.id, isoCapacity) * multiplier)));
  const minutes = denseSchemeMinutes(scheme) || 1;
  const latestIso = [...getDenseEntries()]
    .filter((entry) => entry.exercise_id === exercise.id && entry.isometric_capacity)
    .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
  if (latestIso?.isometric_capacity) return denseCapHold(Math.max(1, Math.floor(denseBoosted(exercise.id, latestIso.isometric_capacity) * multiplier)));
  const latestSameScheme = [...getDenseEntries()]
    .filter((entry) => entry.exercise_id === exercise.id && entry.scheme === scheme && (entry.hold_seconds_per_round || entry.total_hold_seconds))
    .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
  if (latestSameScheme) return denseCapHold(Math.max(1, Math.round(Number(latestSameScheme.hold_seconds_per_round) || Number(latestSameScheme.total_hold_seconds) / minutes)));
  // No history yet: seed a sensible starter hold so fresh isometrics (e.g. a new
  // cuelgue) aren't left empty. Scaled by density like a modest capacity of ~38s,
  // and by the family difficulty level (a one-hand hang seeds far shorter).
  if (denseIsIsometric(exercise)) return Math.max(1, Math.floor(38 * denseFamilyDifficultyFactor(exercise) * multiplier));
  return "";
}

// System e1RM implied by ANY dynamic entry: weighted marks carry it already;
// bodyweight marks derive it inverting the rep-max curve (load = bw × contribution).
function denseEntrySystemE1rm(entry) {
  if (Number(entry.e1rm_kg) > 0) {
    return { e1rm: Number(entry.e1rm_kg), base: denseSchemeBase(entry.scheme), cross: false };
  }
  if (entry.total_hold_seconds) return null; // isométricos: fase 3
  const rpm = Number(entry.reps_per_min) || 0;
  const base = denseSchemeBase(entry.scheme);
  const exercise = denseExerciseById(entry.exercise_id);
  const contribution = Number(entry.bodyweight_contribution_pct ?? exercise?.bodyweightContributionPct) || 0;
  const bw = Number(entry.bodyweight_kg) || latestKnownBodyweight(entry.date) || 0;
  const load = (bw * contribution) / 100;
  if (!rpm || !load || !denseBaseCurve[base]) return null;
  return { e1rm: load / densePctForReps(base, rpm), base, cross: true };
}

// Best implied system e1RM across all of an exercise's entries (any modality)
function denseUnifiedE1rm(exerciseId) {
  let best = null;
  getDenseEntries().forEach((entry) => {
    if (entry.exercise_id !== exerciseId) return;
    const result = denseEntrySystemE1rm(entry);
    if (result && (!best || result.e1rm > best.e1rm)) best = { ...result, date: entry.date };
  });
  if (best) best.e1rm = denseBoosted(exerciseId, best.e1rm);
  return best;
}

// Relative uncertainty of an estimate: grows with staleness, cross-modality
// conversion and distance between dense bases.
function denseEstimateSigma(sourceDate, { cross = false, baseGap = 0 } = {}) {
  if (!sourceDate) return 0.22;
  const weeks = Math.max(0, (today.getTime() - parseDate(sourceDate).getTime()) / (7 * 86400000));
  return clamp(0.08 + 0.006 * weeks + (cross ? 0.04 : 0) + baseGap * 0.012, 0.06, 0.22);
}

function denseConfidenceLabel(sigma) {
  return sigma <= 0.105 ? "alta" : sigma <= 0.16 ? "media" : "baja";
}

// Cross-estimated reps/min for a bodyweight scheme from the unified e1RM
function denseCrossRpm(exercise, base, unified = denseUnifiedE1rm(exercise.id)) {
  if (!unified) return 0;
  const bw = latestKnownBodyweight() || 0;
  const load = (bw * (Number(exercise.bodyweightContributionPct) || 0)) / 100;
  if (!load) return 0;
  const rel = load / unified.e1rm;
  return denseRepsForPct(base, rel) * denseEnduranceFactor(unified.base, base);
}

// Best proven capacity for an exercise: the max across the smoothed estimate and
// every logged entry. Same source the "Objetivo por densidad" table uses so the
// form and the analytics agree.
function denseBestCapacity(exerciseId, key) {
  const estimate = Number(state.denseEstimates?.[exerciseId]?.[key]) || 0;
  const fromEntries = getDenseEntries()
    .filter((item) => item.exercise_id === exerciseId)
    .map((item) => Number(item[key]) || 0);
  return denseBoosted(exerciseId, Math.max(estimate, ...fromEntries, 0));
}

// Difficulty level of an exercise within its family progression (0–1].
// `leverLevel` (generated front/back lever chains) and `progressionLevel`
// (hand-curated catalog entries) share the same semantics: relative
// difficulty inside the family, hardest sibling ≈ 1. 0 = unleveled.
function denseProgressionLevelOf(exercise) {
  return Number(exercise?.progressionLevel ?? exercise?.leverLevel) || 0;
}

// Cold-start difficulty factor: the category default rpm/hold fits the
// family's easiest leveled sibling (its entry point); harder siblings scale
// down through the endurance curve so a sissy squat never starts at
// air-squat pace nor a one-hand hang at two-hand seconds.
function denseFamilyDifficultyFactor(exercise) {
  const level = denseProgressionLevelOf(exercise);
  if (!level || !exercise.family) return 1;
  let entry = level;
  denseExerciseCatalog.forEach((sibling) => {
    if (sibling.family !== exercise.family) return;
    const siblingLevel = denseProgressionLevelOf(sibling);
    if (siblingLevel && siblingLevel < entry) entry = siblingLevel;
  });
  // Floor: families that now include deep regressions (scap pull 0.25 vs
  // pull-up 1.0) must not crush the top sibling's cold default to near zero.
  return Math.max(0.25, Math.pow(entry / level, DENSE_LEVER_ENDURANCE_EXP));
}

// §3.3 — learned endurance exponent per (family, axis). Every pair of leveled
// siblings with DIRECT marks on the same axis is an observation of how steeply
// capacity really falls with difficulty for THIS athlete:
//   e = ln(cap_easy / cap_hard) / ln(level_hard / level_easy)
// Median of observations, prudent clamp; generic 2.2 until evidence exists.
// Derived from history only (cache re-derived after every fold).
function denseFamilyEnduranceExp(family, key) {
  denseLevelExpCache ||= {};
  const cacheKey = `${family}|${key}`;
  if (cacheKey in denseLevelExpCache) return denseLevelExpCache[cacheKey];
  const caps = [];
  denseExerciseCatalog.forEach((sibling) => {
    if (sibling.family !== family) return;
    const level = denseProgressionLevelOf(sibling);
    if (!level) return;
    let best = 0;
    getDenseEntries().forEach((entry) => {
      if (entry.exercise_id === sibling.id && !entry.deleted_at) best = Math.max(best, Number(entry[key]) || 0);
    });
    if (best) caps.push({ level, best });
  });
  const observations = [];
  for (let i = 0; i < caps.length; i++) {
    for (let j = i + 1; j < caps.length; j++) {
      const easy = caps[i].level < caps[j].level ? caps[i] : caps[j];
      const hard = easy === caps[i] ? caps[j] : caps[i];
      if (hard.level - easy.level < 0.1) continue; // too close: noise dominates the ratio
      const exp = Math.log(easy.best / hard.best) / Math.log(hard.level / easy.level);
      if (Number.isFinite(exp)) observations.push(exp);
    }
  }
  let value = DENSE_LEVER_ENDURANCE_EXP;
  if (observations.length) {
    const sorted = [...observations].sort((a, b) => a - b);
    const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    value = clamp(median, 1.6, 3.4);
  }
  return (denseLevelExpCache[cacheKey] = roundTo(value, 3));
}

// Cross-estimate within a leveled progression family: your capacity at one
// difficulty level implies a capacity at every other level via the endurance
// curve (harder sibling → disproportionally shorter holds / fewer reps).
// Picks the sibling CLOSEST in level (best local evidence), not the highest
// scaled value: taking the optimist used to invert difficulty — a fresh weak
// direct test on the near sibling was ignored in favour of a far easy one.
// Ties break toward the higher scaled estimate.
function denseLeverSiblingEstimate(exercise, key) {
  const level = denseProgressionLevelOf(exercise);
  if (!level || !exercise.family) return null;
  const enduranceExp = denseFamilyEnduranceExp(exercise.family, key);
  let best = null;
  denseExerciseCatalog.forEach((sibling) => {
    if (sibling.family !== exercise.family || sibling.id === exercise.id) return;
    const siblingLevel = denseProgressionLevelOf(sibling);
    if (!siblingLevel) return;
    const capacity = denseBestCapacity(sibling.id, key);
    if (!capacity) return;
    const scaled = capacity * Math.pow(siblingLevel / level, enduranceExp);
    const gap = Math.abs(siblingLevel - level);
    if (!best || gap < best.gap - 0.001 || (Math.abs(gap - best.gap) <= 0.001 && scaled > best.value)) {
      best = { value: scaled, from: sibling, fromCapacity: capacity, gap };
    }
  });
  return best;
}

// Deterministic per-scheme reps/min target for the log form. Keeps the value
// stable when the user toggles schemes: the suggested scheme restores the
// progression proposal exactly; other schemes derive from best proven capacity.
function denseFormTargetRepsPerSet(exercise, scheme, suggestion) {
  if (denseIsLoadExercise(exercise)) return denseDefaultRepsPerSet(exercise, scheme);
  if (suggestion && suggestion.type === "reps" && suggestion.scheme === scheme && suggestion.repsPerSet) {
    return suggestion.repsPerSet;
  }
  const capacity = denseBestCapacity(exercise.id, "bodyweight_capacity");
  const multiplier = bodyweightMultipliers[denseSchemeBase(scheme)];
  if (capacity && multiplier) return Math.max(1, Math.round(denseCapRpm(exercise, Math.floor(capacity * multiplier))));
  const sibling = denseLeverSiblingEstimate(exercise, "bodyweight_capacity");
  if (sibling && multiplier) {
    const reps = Math.floor(sibling.value * multiplier);
    if (reps >= 1) return Math.max(1, Math.round(denseCapRpm(exercise, reps)));
  }
  return denseDefaultRepsPerSet(exercise, scheme);
}

// A dense round lasts one minute: a hold target can never exceed it (real
// ceiling ~55s leaves transition time). "81s/ronda" was nonsense on screen.
function denseCapHold(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value)) return seconds;
  return Math.min(value, DENSE_MAX_HOLD_PER_ROUND);
}

// Same idea for isometric hold seconds per round.
function denseFormTargetHoldPerRound(exercise, scheme, suggestion) {
  if (suggestion && suggestion.type === "hold" && suggestion.scheme === scheme && suggestion.holdSecondsPerRound) {
    return denseCapHold(suggestion.holdSecondsPerRound);
  }
  const capacity = denseBestCapacity(exercise.id, "isometric_capacity");
  const multiplier = bodyweightMultipliers[denseSchemeBase(scheme)];
  if (capacity && multiplier) return denseCapHold(Math.max(1, Math.floor(capacity * multiplier)));
  // No direct history at this progression: scale a sibling lever level through
  // the endurance curve (30s tuck ≈ 14s adv tuck ≈ 3s full, not 30s everywhere).
  const sibling = denseLeverSiblingEstimate(exercise, "isometric_capacity");
  if (sibling && multiplier) {
    // Trust the sibling evidence even when tiny (1s): discarding it here used
    // to fall through to a HIGHER generic default, inverting difficulty.
    return denseCapHold(Math.max(1, Math.floor(sibling.value * multiplier)));
  }
  return denseCapHold(denseDefaultHoldPerRound(exercise, scheme));
}

// ── Same-day autoregulation ──────────────────────────────────────────────
// Dense training avoids piling up failure/very-hard work. If a movement group
// (push / pull / lower body) was already hammered today, later exercises of the
// same group get a "back off" warning with a softer suggested target.

const denseHardEfforts = new Set(["H", "VH", "fallo"]);
const denseGroupLabels = { push: "Empuje", pull: "Tirón", legs: "Tren inferior" };
const denseEffortSpanish = { H: "difícil", VH: "muy difícil", fallo: "fallo" };
// Base back-off (fraction) by worst effort seen: harder -> lighter next.
const denseEffortReduction = { H: 0.1, VH: 0.15, fallo: 0.2 };
// Fatigue carries over a couple of days to guarantee rest. Weight fades with time.
const denseFatigueLookbackDays = 2;
const denseFatigueRecency = { 0: 1, 1: 0.6, 2: 0.35 };

// Whole days from key `from` to key `to` (both "YYYY-MM-DD").
function denseDaysBetween(from, to) {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Infinity;
  return Math.round((b - a) / 86400000);
}

// Coarse movement groups an exercise belongs to (push / pull / legs).
function denseGroupKeys(exercise) {
  const patterns = densePatternProfile(exercise);
  const groups = [];
  if (["push", "vertical_push", "horizontal_push"].some((p) => patterns.includes(p))) groups.push("push");
  if (["pull", "vertical_pull", "horizontal_pull"].some((p) => patterns.includes(p))) groups.push("pull");
  if (["legs", "squat", "hinge", "unilateral_leg"].some((p) => patterns.includes(p))) groups.push("legs");
  return groups;
}

function denseEntryEffortCode(entry) {
  return entry.failed ? "fallo" : entry.effort || "";
}

// Returns a warning descriptor when a hard/failure set in a shared group happened
// today or in the previous couple of days (fatigue carry-over). `null` otherwise.
function denseGroupFatigueWarning(exercise, dayKey = dateKey(selectedDate)) {
  if (!exercise) return null;
  const groups = denseGroupKeys(exercise);
  if (!groups.length) return null;
  const draftId = state.settings.denseDraftEntryId;
  const offenders = getDenseEntries()
    .map((entry) => ({ entry, daysAgo: denseDaysBetween(entry.date, dayKey) }))
    .filter(({ entry, daysAgo }) => {
      if (daysAgo < 0 || daysAgo > denseFatigueLookbackDays) return false;
      if (draftId && entry.id === draftId) return false;
      if (!denseHardEfforts.has(denseEntryEffortCode(entry))) return false;
      const other = denseGroupKeys(denseExerciseById(entry.exercise_id));
      return other.some((g) => groups.includes(g));
    });
  if (!offenders.length) return null;
  // Recency-weighted severity: a failure today limits more than one two days ago.
  const scored = offenders.map((o) => ({
    ...o,
    // Failing a TEST is exploration, not planned overreach: half the back-off.
    reduction: (denseEffortReduction[denseEntryEffortCode(o.entry)] || 0) * (denseFatigueRecency[o.daysAgo] || 0) * (o.entry.is_test ? 0.5 : 1),
  }));
  const worst = scored.slice().sort((a, b) => b.reduction - a.reduction)[0];
  const reduction = Math.round(worst.reduction * 100) / 100;
  const worstEffort = denseEntryEffortCode(worst.entry);
  const hitGroups = [...new Set(offenders.flatMap(({ entry }) => denseGroupKeys(denseExerciseById(entry.exercise_id))).filter((g) => groups.includes(g)))];
  return {
    groups: hitGroups,
    groupLabel: hitGroups.map((g) => denseGroupLabels[g] || g).join(" · "),
    offenders: offenders.map((o) => o.entry),
    worst: worst.entry,
    worstEffort,
    daysAgo: worst.daysAgo,
    reduction,
    factor: Math.max(0.5, 1 - reduction),
  };
}

// Build the "soft target" numbers (reps / hold / load) from the current form
// defaults and the back-off factor.
function denseSoftTarget(exercise, defaults, warning) {
  const factor = warning?.factor || 0.9;
  const scheme = defaults.scheme;
  const pct = Math.round((1 - factor) * 100);
  if (exercise.nature === "weighted" || exercise.nature === "weighted_calisthenics") {
    const key = exercise.loadPattern === "dumbbell_pair" ? "weightPerDumbbellKg" : exercise.nature === "weighted_calisthenics" ? "addedLoadKg" : "externalLoadKg";
    const current = Number(defaults[key] || 0);
    if (!current) return null;
    return { kind: "load", key, value: denseRoundLoad(current * factor), pct, label: `${formatKg(denseRoundLoad(current * factor))}${key === "addedLoadKg" ? " lastre" : ""}` };
  }
  if (denseIsIsometric(exercise)) {
    const current = Number(defaults.holdSecondsPerRound || 0);
    if (!current) return null;
    const value = Math.max(1, Math.floor(current * factor));
    return { kind: "hold", value, pct, label: `${scheme} · ${value}s hold/ronda` };
  }
  const current = Number(defaults.repsPerSet || 0);
  if (!current) return null;
  const value = Math.max(1, Math.floor(current * factor));
  return { kind: "reps", value, total: denseTotalFromRepsPerSet(value, scheme), pct, label: `${scheme}${value} (${denseTotalFromRepsPerSet(value, scheme)} reps)` };
}

function denseFatigueWhen(daysAgo) {
  if (daysAgo <= 0) return "hoy";
  if (daysAgo === 1) return "ayer";
  return `hace ${daysAgo} días`;
}

function renderDenseFatigueWarning(exercise, defaults) {
  const warning = denseGroupFatigueWarning(exercise);
  if (!warning) return "";
  const showSoft = warning.reduction >= 0.05;
  const soft = showSoft ? denseSoftTarget(exercise, defaults, warning) : null;
  const offenderNames = [...new Set(warning.offenders.map((entry) => entry.exercise_name || denseExerciseById(entry.exercise_id)?.name).filter(Boolean))];
  const namePart = offenderNames.slice(0, 2).join(", ") + (offenderNames.length > 2 ? "…" : "");
  const effortWord = denseEffortSpanish[warning.worstEffort] || warning.worstEffort;
  const whenWord = denseFatigueWhen(warning.daysAgo);
  const advice = soft
    ? "En dense conviene no acumular fallo: baja reps o intensidad y mantente 1-2 lejos del límite."
    : "Aún dentro de la ventana de recuperación: ve conservador y para lejos del fallo.";
  const softLine = soft
    ? `<div class="dense-fatigue-soft"><span>Objetivo suave (−${soft.pct}%)</span><strong>${escapeHtml(soft.label)}</strong>${
        soft.kind === "load"
          ? `<button class="text-button" type="button" data-action="apply-soft-target" data-kind="load" data-key="${escapeAttr(soft.key)}" data-value="${escapeAttr(soft.value)}"><i data-lucide="check"></i>Aplicar</button>`
          : `<button class="text-button" type="button" data-action="apply-soft-target" data-kind="${escapeAttr(soft.kind)}" data-value="${escapeAttr(soft.value)}"><i data-lucide="check"></i>Aplicar</button>`
      }</div>`
    : "";
  return `
    <div class="dense-fatigue-warning" role="status">
      <span class="tiny-icon"><i data-lucide="alert-triangle"></i></span>
      <div class="dense-fatigue-body">
        <strong>Autorregula · ${escapeHtml(warning.groupLabel)} cargado ${escapeHtml(whenWord)}</strong>
        <span>${escapeHtml(namePart)} fue ${escapeHtml(effortWord)} ${escapeHtml(whenWord)}. ${escapeHtml(advice)}</span>
        ${softLine}
      </div>
    </div>
  `;
}

// Apply the soft (backed-off) target from the fatigue warning into the form.
function applySoftTarget(button) {
  const form = button.closest("#denseTrainingForm");
  if (!form) return;
  const { kind, key, value } = button.dataset;
  if (kind === "load") {
    const input = form.querySelector(`[name='${key}']`);
    if (input) input.value = value;
  } else if (kind === "hold") {
    const input = form.querySelector("[name='holdSecondsPerRound']");
    if (input) input.value = value;
    updateDenseHoldEstimate(form);
  } else {
    const repsPerSetInput = form.querySelector("[name='repsPerSet']");
    if (repsPerSetInput) {
      repsPerSetInput.value = value;
      updateDenseTotalFromRepsPerSet(repsPerSetInput);
    }
  }
  button.classList.add("is-applied");
  button.innerHTML = '<i data-lucide="check"></i>Aplicado';
  if (window.lucide?.createIcons) window.lucide.createIcons({ nameAttr: "data-lucide" });
}

// Conservative progression policy.
// Base step from last effort (before day-of readiness):
//   fallo/failed -> down (always)   VH/H -> down   N -> hold   E -> +1   VE -> +2
// Readiness ("¿cómo estás hoy?") nudges the recommendation:
//   high (fuerte) +1 step, low (flojo) -1 step. fallo always stays down; a hard
//   session with high readiness caps at "maintain" rather than climbing.
const denseReadinessLevels = [
  ["low", "Flojo"],
  ["normal", "Normal"],
  ["high", "Fuerte"],
];

function denseBaseProgressStep(effort, failed) {
  if (failed || effort === "fallo") return -1;
  if (effort === "VE") return 2;
  if (effort === "E") return 1;
  if (effort === "H" || effort === "VH") return -1;
  return 0; // Normal -> hold by default
}

function denseAppliedProgressStep(effort, failed, readiness) {
  if (failed || effort === "fallo") return -1; // failure always steps down
  let step = denseBaseProgressStep(effort, failed);
  if (readiness === "high") step += 1;
  else if (readiness === "low") step -= 1;
  // A hard/very-hard session, even feeling strong, only holds — never climbs.
  if ((effort === "H" || effort === "VH") && step > 0) step = 0;
  // Easy / very-easy always means progress: never drop below a one-step bump.
  if ((effort === "E" || effort === "VE") && step < 1) step = 1;
  return step;
}

function denseStepDirection(step, failed, effort) {
  if (failed || effort === "fallo") return "down";
  if (step > 0) return "up";
  if (step < 0) return "down";
  return "hold";
}

function denseDirectionTone(direction, failed, effort) {
  if (failed || effort === "fallo") return "danger";
  if (direction === "up") return "green";
  if (direction === "down") return "amber";
  return "neutral";
}

function denseBestWeightedE1rmSource(exerciseId) {
  const entries = getDenseEntries()
    .filter((entry) => entry.exercise_id === exerciseId && !entry.deleted_at && Number(entry.e1rm_kg) > 0)
    .sort((a, b) => Number(b.e1rm_kg || 0) - Number(a.e1rm_kg || 0));
  const bestEntry = entries[0] || null;
  // Prefer the smoothed estimate (recency + effort weighted): after a failed
  // heavy attempt it walks DOWN, while the all-time max would keep proposing
  // the same impossible load forever. Entry max only when no estimate exists.
  const estimated = Number(state.denseEstimates?.[exerciseId]?.e1rm_kg) || 0;
  const best = estimated || Number(bestEntry?.e1rm_kg || 0);
  if (best) return { e1rm: denseBoosted(exerciseId, best), entry: bestEntry };
  // No direct weighted mark: derive a system e1RM from BODYWEIGHT history
  // (unified exercise — a heavy BW pull-up implies a weighted-pull-up e1RM), so
  // switching to lastre suggests a real load instead of a blank "-".
  const unified = denseUnifiedE1rm(exerciseId);
  if (unified?.e1rm) return { e1rm: unified.e1rm, entry: bestEntry || latestDenseEntryForExercise(exerciseId), fromBodyweight: true };
  return null;
}

function denseEstimatedLoadSuggestion(exercise, scheme, readiness = "normal") {
  if (!denseIsLoadExercise(exercise) || !denseWorkingPct[scheme]) return null;
  const source = denseBestWeightedE1rmSource(exercise.id);
  if (!source) return null;
  const sourceEntry = source.entry || latestDenseEntryForExercise(exercise.id);
  const bw = latestKnownBodyweight(dateKey(selectedDate)) || sourceEntry?.bodyweight_kg || 0;
  // Personal curve: correct the reference e1RM for the rep-speed gap between
  // where it was measured and where we are estimating (the bench 5D10→5D5 case).
  const slope = denseCurveSlopeBias(exercise.id);
  const refRpm = Number(sourceEntry?.reps_per_min) || Number(denseSchemePrescriptionAverage(sourceEntry?.scheme)) || 0;
  const targetRpm = Number(denseSchemePrescriptionAverage(scheme)) || 0;
  const curveAdjusted = slope && refRpm && targetRpm && refRpm !== targetRpm ? source.e1rm * Math.pow(targetRpm / refRpm, slope) : source.e1rm;
  const totalLoad = curveAdjusted * denseWorkingPct[scheme];
  const fieldLoad =
    exercise.loadPattern === "dumbbell_pair"
      ? totalLoad / 2
      : exercise.nature === "weighted_calisthenics"
        ? Math.max(0, totalLoad - bw)
        : totalLoad;
  const load = roundTo(fieldLoad, 1);
  return {
    entry: sourceEntry || {
      scheme,
      effort: "estimado",
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      e1rm_kg: source.e1rm,
    },
    scheme,
    rounds: denseSchemeMinutes(scheme) || "",
    effort: sourceEntry?.effort || "N",
    readiness,
    step: 0,
    direction: "hold",
    tone: "neutral",
    type: "load",
    repsPerSet: denseDefaultRepsPerSet(exercise, scheme) || "",
    totalReps: denseDefaultTotalReps(exercise, scheme) || "",
    externalLoadKg: exercise.nature === "weighted" && exercise.loadPattern !== "dumbbell_pair" ? load : "",
    addedLoadKg: exercise.nature === "weighted_calisthenics" ? load : "",
    weightPerDumbbellKg: exercise.loadPattern === "dumbbell_pair" ? load : "",
    estimated: true,
    title: `${scheme} · ${exercise.nature === "weighted_calisthenics" ? "+" : ""}${formatKg(load)}`,
    reason: `Estimado desde e1RM ${formatKg(curveAdjusted)}${Math.abs(curveAdjusted - source.e1rm) > 0.5 ? " (curva personal)" : ""}; falta test directo en ${scheme}.`,
  };
}

// Cross-estimate for a bodyweight/hold block without direct history: same
// capacity math the form inputs use, so the card and the prefill always agree.
function denseEstimatedBodySuggestion(exercise, scheme, readiness = "normal") {
  const capacityKey = denseIsIsometric(exercise) ? "isometric_capacity" : "bodyweight_capacity";
  const ownCapacity = denseBestCapacity(exercise.id, capacityKey);
  // Lever progressions: no own data yet, but a sibling level scales through
  // the endurance curve ("puedes X en tuck → puedes Y en adv tuck").
  const sibling = !ownCapacity ? denseLeverSiblingEstimate(exercise, capacityKey) : null;
  if (!ownCapacity && !sibling) return null;
  const sourceEntry = latestDenseEntryForExercise(exercise.id) || (sibling ? latestDenseEntryForExercise(sibling.from.id) : null);
  if (!sourceEntry) return null;
  const minutes = denseSchemeMinutes(scheme) || 0;
  const base = {
    entry: sourceEntry,
    scheme,
    rounds: minutes || "",
    effort: sourceEntry.effort || "N",
    readiness,
    step: 0,
    direction: "hold",
    tone: "neutral",
    estimated: true,
    reason: sibling
      ? `Estimado desde ${sibling.from.name} por nivel de palanca/progresión (${roundTo((denseProgressionLevelOf(sibling.from) / denseProgressionLevelOf(exercise)) * 100, 0)}% de esta); trátalo como test.`
      : `Estimado por capacidad desde ${sourceEntry.scheme}; falta marca directa en ${scheme}.`,
  };
  if (denseIsIsometric(exercise)) {
    const holdSecondsPerRound = Number(denseFormTargetHoldPerRound(exercise, scheme, null)) || 0;
    if (!holdSecondsPerRound) return null;
    return {
      ...base,
      type: "hold",
      holdSecondsPerRound,
      totalHoldSeconds: holdSecondsPerRound * (minutes || 1),
      title: `${scheme} · ${holdSecondsPerRound}s hold/ronda`,
    };
  }
  const repsPerSet = Number(denseFormTargetRepsPerSet(exercise, scheme, null)) || 0;
  if (!repsPerSet) return null;
  return {
    ...base,
    type: "reps",
    repsPerSet,
    totalReps: denseTotalFromRepsPerSet(repsPerSet, scheme),
    title: `${scheme}${repsPerSet} · ${denseTotalFromRepsPerSet(repsPerSet, scheme)} reps`,
  };
}

// Stagnation: the last DENSE_DELOAD_STREAK real (non-test) marks of the
// exercise were all hard/failure and none set a PR — grinding without
// progress. Time to back off.
function denseStagnationInfo(exercise) {
  const marks = [...getDenseEntries()]
    .filter((entry) => entry.exercise_id === exercise.id && !entry.deleted_at && !entry.is_test)
    .sort((a, b) => String(b.created_at || b.date || "").localeCompare(String(a.created_at || a.date || "")))
    .slice(0, DENSE_DELOAD_STREAK);
  if (marks.length < DENSE_DELOAD_STREAK) return null;
  const hard = new Set(["H", "VH", "fallo"]);
  if (!marks.every((entry) => entry.failed || hard.has(entry.effort || ""))) return null;
  if (marks.some((entry) => denseEntryIsPr(entry))) return null;
  return { sessions: marks.length };
}

// Post-processor for the progression suggestion: when the exercise is
// stagnating, replace the normal step with an explicit deload (~-10%) so the
// user rebuilds with margin instead of grinding another hard session. If the
// suggestion already steps down (e.g. after a failure), keep its numbers and
// only surface the deload message.
function denseMaybeDeload(suggestion, exercise) {
  if (!suggestion || !denseStagnationInfo(exercise)) return suggestion;
  const reason = `${DENSE_DELOAD_STREAK} sesiones duras sin PR: deload y reconstruye con margen.`;
  const out = { ...suggestion, deload: true, direction: "down", tone: "amber", reason };
  if (suggestion.direction === "down") return out;
  const scheme = suggestion.scheme;
  if (suggestion.type === "load" && suggestion.loadKey) {
    const current = Number(suggestion.externalLoadKg || suggestion.addedLoadKg || suggestion.weightPerDumbbellKg || 0);
    const next = denseRoundLoad(current * 0.9);
    if (next !== "") {
      const key = suggestion.loadKey === "external_load_kg" ? "externalLoadKg" : suggestion.loadKey === "added_load_kg" ? "addedLoadKg" : "weightPerDumbbellKg";
      out[key] = next;
      out.title = `${scheme} · ${key === "addedLoadKg" ? "+" : ""}${formatKg(next)}`;
    }
  } else if (suggestion.type === "assist") {
    const next = denseRoundLoad(Number(suggestion.assistLoadKg || 0) + 2) || 2;
    out.assistLoadKg = next;
    out.title = `${scheme} · −${formatKg(next)} asist`;
  } else if (suggestion.type === "hold") {
    const next = Math.max(1, Math.round(Number(suggestion.holdSecondsPerRound || 1) * 0.85));
    out.holdSecondsPerRound = next;
    out.totalHoldSeconds = next * (suggestion.rounds || 1);
    out.title = `${scheme} · ${next}s hold/ronda`;
  } else if (suggestion.type === "reps") {
    const next = Math.max(1, Math.floor(Number(suggestion.repsPerSet || 1) * 0.9));
    out.repsPerSet = next;
    out.totalReps = denseTotalFromRepsPerSet(next, scheme);
    out.title = `${scheme}${next} · ${out.totalReps} reps`;
  }
  return out;
}

function denseProgressionSuggestion(exercise, readiness = "normal", schemeFilter = "") {
  // Scheme-aware memory:
  // - load exercises progress from the exact scheme (10D5 does not borrow 10D10)
  // - bodyweight / holds use the dense block (10D) so reps or seconds can move
  //   within that block without falling back to the latest mark overall.
  let entry = null;
  if (schemeFilter) {
    entry = latestDenseEntryForExercise(exercise.id, schemeFilter);
    if (!entry && !denseIsLoadExercise(exercise)) {
      const baseFilter = denseSchemeBase(schemeFilter);
      entry =
        [...getDenseEntries()]
          .filter((item) => item.exercise_id === exercise.id && !item.deleted_at && denseSchemeBase(item.scheme) === baseFilter)
          .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0] || null;
    }
    if (!entry) {
      // No history in this block: honest cross-estimate labeled as such,
      // instead of a recommendation card that talks about another block.
      const estimated = denseIsLoadExercise(exercise)
        ? denseEstimatedLoadSuggestion(exercise, schemeFilter, readiness)
        : denseEstimatedBodySuggestion(exercise, schemeFilter, readiness);
      if (estimated) return estimated;
      if (denseIsLoadExercise(exercise)) return null;
    }
  }
  entry ||= latestDenseEntryForExercise(exercise.id);
  if (!entry) return null;
  const scheme = denseAllowedSchemes(exercise).includes(entry.scheme) ? entry.scheme : denseAllowedSchemes(exercise)[0];
  const minutes = denseSchemeMinutes(scheme) || entry.duration_minutes || 0;
  const effort = entry.effort || "N";
  const failed = Boolean(entry.failed);
  const step = denseAppliedProgressStep(effort, failed, readiness);
  const direction = denseStepDirection(step, failed, effort);
  const base = {
    entry,
    scheme,
    rounds: entry.rounds || minutes || "",
    effort,
    readiness,
    step,
    direction,
    tone: denseDirectionTone(direction, failed, effort),
  };

  if (entry.hold_seconds_per_round || entry.total_hold_seconds) {
    const currentHold = Number(entry.hold_seconds_per_round || (minutes ? entry.total_hold_seconds / minutes : 0)) || 0;
    const secondsPerStep = 3;
    const delta = failed || effort === "fallo" ? -3 : step * secondsPerStep;
    const holdSecondsPerRound = Math.max(1, Math.round(currentHold + delta));
    return denseMaybeDeload(
      {
        ...base,
        type: "hold",
        holdSecondsPerRound,
        totalHoldSeconds: holdSecondsPerRound * (base.rounds || minutes || 1),
        title: `${scheme} · ${holdSecondsPerRound}s hold/ronda`,
        reason: denseProgressionReason(entry, direction, readiness),
      },
      exercise,
    );
  }

  if (exercise.nature === "assisted") {
    // Progress = LESS counterweight (harder), until 0 = full OAC. Failure adds
    // a little assistance back; hold when it was hard.
    const currentAssist = Number(entry.assist_load_kg || 0);
    let nextAssist;
    if (failed || effort === "fallo") nextAssist = denseRoundLoad(currentAssist + 1) || currentAssist;
    else if (step <= 0) nextAssist = currentAssist;
    else nextAssist = Math.max(0, denseRoundLoad(currentAssist - step));
    return denseMaybeDeload(
      {
        ...base,
        type: "assist",
        repsPerSet: entry.target_reps_per_min || entry.reps_per_set || denseSchemePrescriptionAverage(scheme) || "",
        totalReps: entry.target_total_reps || entry.total_reps || "",
        assistLoadKg: nextAssist,
        title: nextAssist > 0 ? `${scheme} · −${formatKg(nextAssist)} asist` : `${scheme} · OAC completa`,
        reason: nextAssist <= 0 ? "Sin contrapeso: intenta la OAC completa." : denseProgressionReason(entry, direction, readiness),
      },
      exercise,
    );
  }

  if (exercise.nature === "weighted" || exercise.nature === "weighted_calisthenics") {
    const loadKey = exercise.loadPattern === "dumbbell_pair" ? "weight_per_dumbbell_kg" : exercise.nature === "weighted_calisthenics" ? "added_load_kg" : "external_load_kg";
    const currentLoad = Number(entry[loadKey] || entry.external_load_kg || entry.added_load_kg || entry.weight_per_dumbbell_kg || 0);
    const pctPerStep = 0.025;
    const factor = failed || effort === "fallo" ? 0.95 : 1 + step * pctPerStep;
    let nextLoad = denseRoundLoad(currentLoad * factor) || currentLoad;
    // After a failure, a flat -5% can stay impossible for sessions (a botched
    // cross-estimate walks down forever). The entry's effective e1RM already
    // encodes the density actually achieved: cap the next load at what that
    // honest e1RM sustains on this scheme.
    if ((failed || effort === "fallo") && Number(entry.e1rm_kg) > 0 && denseWorkingPct[scheme]) {
      const system = Number(entry.e1rm_kg) * denseWorkingPct[scheme];
      const bw = Number(entry.bodyweight_kg) || latestKnownBodyweight(entry.date) || 0;
      const honest = denseRoundLoad(
        loadKey === "weight_per_dumbbell_kg" ? system / 2 : exercise.nature === "weighted_calisthenics" ? Math.max(0, system - bw) : system,
      );
      if (honest !== "" && honest < nextLoad) nextLoad = honest;
    }
    return denseMaybeDeload(
      {
        ...base,
        type: "load",
        loadKey,
        repsPerSet: entry.target_reps_per_min || entry.reps_per_set || denseSchemePrescriptionAverage(scheme) || "",
        totalReps: entry.target_total_reps || entry.total_reps || "",
        externalLoadKg: loadKey === "external_load_kg" ? nextLoad : entry.external_load_kg || "",
        addedLoadKg: loadKey === "added_load_kg" ? nextLoad : entry.added_load_kg || "",
        weightPerDumbbellKg: loadKey === "weight_per_dumbbell_kg" ? nextLoad : entry.weight_per_dumbbell_kg || "",
        title: `${scheme} · ${loadKey === "added_load_kg" ? "+" : ""}${formatKg(nextLoad)}`,
        reason: denseProgressionReason(entry, direction, readiness),
      },
      exercise,
    );
  }

  const currentTarget = Number(entry.target_reps_per_min || entry.reps_per_set || (minutes ? entry.total_reps / minutes : 0)) || denseDefaultRepsPerSet(exercise, scheme) || 1;
  const actualRpm = Number(entry.reps_per_min || (minutes ? entry.total_reps / minutes : 0)) || currentTarget;
  const delta = failed || effort === "fallo" ? Math.min(-1, Math.floor(actualRpm) - currentTarget) : step;
  const repsPerSet = Math.max(1, Math.round(denseCapRpm(exercise, currentTarget + delta)));
  return denseMaybeDeload(
    {
      ...base,
      type: "reps",
      repsPerSet,
      totalReps: denseTotalFromRepsPerSet(repsPerSet, scheme),
      title: `${scheme}${repsPerSet} · ${denseTotalFromRepsPerSet(repsPerSet, scheme)} reps`,
      reason: denseProgressionReason(entry, direction, readiness),
    },
    exercise,
  );
}

function denseRoundLoad(value) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return Math.round(value * 2) / 2;
}

function denseProgressionReason(entry, direction, readiness = "normal") {
  const failed = entry.failed || entry.effort === "fallo";
  if (failed) return "Fallaste o no llegaste: bajo el objetivo para reconstruir sin volver a grindear.";
  const effort = entry.effort || "N";
  const strong = readiness === "high";
  const weak = readiness === "low";
  if (effort === "VE") return direction === "up" ? "Muy fácil: subo con claridad para provocar adaptación." : "Muy fácil, pero hoy vienes flojo: subo lo justo.";
  if (effort === "E") return direction === "up" ? "Fácil: toca subir un paso." : "Fácil, pero hoy flojo: mantengo por prudencia.";
  if (effort === "H" || effort === "VH") {
    if (direction === "hold") return "Fue duro y hoy vienes fuerte: mantengo, no subo tras una sesión exigente.";
    return "Fue duro: bajo un paso para no acumular fatiga.";
  }
  // Normal
  if (strong && direction === "up") return "Normal, pero hoy vienes fuerte: pruebo a subir un paso.";
  if (weak && direction === "down") return "Normal y hoy flojo: bajo un punto para asegurar calidad.";
  return "Normal: mantengo el objetivo. Marca “Fuerte” si te ves para subir.";
}

function denseUsesRepsPerSet(exercise) {
  // Isometric work is measured in hold seconds (TUT), never reps per set —
  // so an isometric bodyweight/weighted hold shows only the hold fields.
  if (denseIsIsometric(exercise)) return false;
  return ["bodyweight", "weighted", "weighted_calisthenics"].includes(exercise.nature);
}

function denseIsIsometric(exercise) {
  return Boolean(exercise && exercise.isometric);
}

function denseIsLoadExercise(exercise) {
  return exercise?.nature === "weighted" || exercise?.nature === "weighted_calisthenics" || exercise?.nature === "assisted";
}

function denseSupportsHold(exercise) {
  return ["bodyweight", "skill", "mobility", "active_recovery"].includes(exercise.nature) || exercise.category === "skills" || exercise.category === "mobility";
}

function denseSchemePrescriptionAverage(scheme) {
  const values = String(scheme || "")
    .replace(/^\d+D/, "")
    .split("-")
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return "";
  return Math.max(1, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
}

function denseSchemeTarget(scheme) {
  return String(scheme || "").replace(/^\d+D/, "") || "";
}

// Display code "5D" + 7 → "5D7". Load schemes already carry their prescription
// ("10D5" must never become "10D55" by appending the rpm again).
function denseSchemeCode(scheme, perMinute) {
  const value = Math.round(Number(perMinute) || 0);
  return denseSchemeTarget(scheme) || !value ? String(scheme || "") : `${scheme}${value}`;
}

function denseLadderSequence(scheme) {
  const values = denseSchemeTarget(scheme)
    .split("-")
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length > 1 ? values : null;
}

function denseSchemeType(exercise, scheme) {
  if (denseLadderSequence(scheme)) return "ladder";
  if (denseSupportsHold(exercise)) return "dense_reps_or_hold";
  if (exercise.nature === "weighted" || exercise.nature === "weighted_calisthenics") return "dense_load";
  if (exercise.nature === "conditioning") return "conditioning";
  if (exercise.nature === "skill") return "skill";
  return "dense_reps";
}

function denseTotalFromRepsPerSet(repsPerSet, scheme) {
  const reps = Number(repsPerSet);
  const minutes = denseSchemeMinutes(scheme);
  if (!Number.isFinite(reps) || reps <= 0 || !minutes) return "";
  return Math.round(reps * minutes);
}

function denseDefaultRpm(exercise, base) {
  const categoryBase = {
    pull: 7,
    push: 9,
    legs: 14,
    skills: 4,
    mobility: 8,
  }[exercise.category] || 8;
  // Scheme scaling must follow the SAME endurance model as capacity-based
  // targets (bodyweightMultipliers), or 10D/20D cold defaults run ~2× hot
  // (the old hand-tuned {10D:0.75} vs the model's 0.33/0.6 ratio).
  const factor = (bodyweightMultipliers[base] || bodyweightMultipliers["5D"]) / bodyweightMultipliers["5D"];
  // Cold-start honesty: the category default fits the family's entry-level
  // sibling; harder leveled siblings scale down (sissy ≠ air-squat pace).
  return categoryBase * factor * denseFamilyDifficultyFactor(exercise);
}

// First contact with a whole family (no marks anywhere in it): propose a
// prudent starter — undershooting a first test beats grinding a failure.
function denseColdStartFactor(exercise) {
  const family = exercise.family || "";
  const seen = getDenseEntries().some(
    (entry) => !entry.deleted_at && (entry.exercise_id === exercise.id || (family && (entry.family || denseExerciseById(entry.exercise_id)?.family) === family)),
  );
  return seen ? 1 : 0.7;
}

function trainingAnalyticsEntries(windowKey) {
  const entries = [...getDenseEntries()].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  if (windowKey === "all") return entries;
  const days = Number(windowKey) || 70;
  const cutoff = dateKey(addDays(selectedDate, -(days - 1)));
  return entries.filter((entry) => !entry.date || entry.date >= cutoff);
}

function denseEquivalentSets(entry) {
  const duration = entry.duration_minutes || denseSchemeMinutes(entry.scheme);
  if (duration) return duration;
  if (entry.rounds) return Number(entry.rounds) || 1;
  return 1;
}

function densePatternProfile(exercise) {
  // Canonical movement patterns only — do NOT seed with the raw category, which
  // duplicated "skills"/"skill" and leaked unlabeled "core"/"other" rows.
  const patterns = new Set();
  const family = exercise?.family || "";
  const id = exercise?.id || "";

  if (family === "strict_pull" || id.includes("pull_up")) patterns.add("vertical_pull");
  if (family === "horizontal_pull" || id.includes("row")) patterns.add("horizontal_pull");
  if (["strict_pull", "horizontal_pull"].includes(family) || exercise?.category === "pull") patterns.add("pull");
  if (family === "front_lever_pull" || family === "back_lever_pull") {
    patterns.add("pull");
    patterns.add("horizontal_pull");
  }

  if (["strict_dip", "hspu", "accessory"].includes(family) || id.includes("hspu") || id.includes("press")) patterns.add("vertical_push");
  if (["ring_push", "pushup"].includes(family) || id.includes("push_up")) patterns.add("horizontal_push");
  if (["strict_dip", "ring_push", "pushup", "hspu", "accessory"].includes(family) || exercise?.category === "push") patterns.add("push");

  if (["squat_bodyweight", "single_leg_squat"].includes(family) || id.includes("squat")) patterns.add("squat");
  if (family === "single_leg_squat" || id.includes("single_leg") || id.includes("pistol")) patterns.add("unilateral_leg");
  if (family === "hinge_bodyweight" || id.includes("good_morning")) patterns.add("hinge");
  if (exercise?.category === "legs") patterns.add("legs");
  if (exercise?.category === "mobility" || family === "mobility_strength") patterns.add("mobility");
  if (exercise?.category === "skills" || family === "hspu" || family.includes("lever")) patterns.add("skills");
  if (exercise?.category === "core") patterns.add("core");

  return [...patterns].filter(Boolean);
}

function densePatternMap(entries) {
  return entries.reduce((map, entry) => {
    const exercise = denseExerciseById(entry.exercise_id);
    const sets = denseEquivalentSets(entry);
    densePatternProfile(exercise).forEach((pattern) => {
      map[pattern] ||= { pattern, sets: 0, reps: 0, tonnage: 0 };
      map[pattern].sets += sets;
      map[pattern].reps += entry.total_reps || 0;
      map[pattern].tonnage += entry.tonnage_kg || 0;
    });
    return map;
  }, {});
}

function densePatternRows(entries) {
  return Object.values(densePatternMap(entries)).sort((a, b) => b.sets - a.sets);
}

function denseLoadByDay(entries) {
  const map = entries.reduce((days, entry) => {
    const key = entry.date || "sin fecha";
    days[key] ||= { date: key, load: 0 };
    days[key].load += denseEquivalentSets(entry) * (entry.effort_value || 5);
    return days;
  }, {});
  return Object.values(map).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-14);
}

function analyticsDetailRow(title, value, detail, icon, expandedDetail = "") {
  return `
    <details class="analytics-detail-row">
      <summary>
        <span class="tiny-icon"><i data-lucide="${icon}"></i></span>
        <div>
          <strong>${escapeHtml(String(title))}</strong>
          <small>${escapeHtml(String(detail || ""))}</small>
        </div>
        <b>${escapeHtml(String(value))}</b>
        <i data-lucide="chevron-down"></i>
      </summary>
      <p>${escapeHtml(String(expandedDetail || detail || "Sin detalle extra todavía."))}</p>
    </details>
  `;
}

function recoveryFeedbackDetails(entries) {
  const withFeedback = entries.filter((entry) => entry.session_fatigue || entry.expected_comparison || entry.session_notes);
  if (!withFeedback.length) return "Aún no hay feedback post-entreno. Al guardar una marca nueva aparecerá el modal de fatiga y comparación.";
  return withFeedback
    .slice(-4)
    .reverse()
    .map((entry) => `${entry.date} · ${entry.exercise_name} · fatiga ${entry.session_fatigue || "-"} · ${denseExpectedComparisonLabel(entry.expected_comparison)}${entry.session_notes ? ` · ${entry.session_notes}` : ""}`)
    .join(" / ");
}

function denseExpectedComparisonLabel(value) {
  if (value === "easier") return "más fácil";
  if (value === "harder") return "más duro";
  if (value === "as_expected") return "esperado";
  return "sin comparar";
}

function effortImprovementCount(entries) {
  const byExercise = entries.reduce((map, entry) => {
    map[entry.exercise_id] ||= [];
    map[entry.exercise_id].push(entry);
    return map;
  }, {});
  return Object.values(byExercise).reduce((count, exerciseEntries) => {
    const sorted = exerciseEntries.sort((a, b) => String(a.created_at || a.date || "").localeCompare(String(b.created_at || b.date || "")));
    const previous = sorted[sorted.length - 2];
    const latest = sorted[sorted.length - 1];
    if (!previous || !latest) return count;
    const sameOrBetter = denseEntryScore(latest) >= denseEntryScore(previous);
    const easier = (latest.effort_value || 5) < (previous.effort_value || 5);
    return count + (sameOrBetter && easier ? 1 : 0);
  }, 0);
}

function denseLevelUpCount(entries) {
  const best = new Map();
  return [...entries]
    .sort((a, b) => String(a.created_at || a.date || "").localeCompare(String(b.created_at || b.date || "")))
    .reduce((count, entry) => {
      const key = `${entry.exercise_id}:${entry.scheme}`;
      const score = denseEntryScore(entry);
      const previousBest = best.get(key) || 0;
      best.set(key, Math.max(previousBest, score));
      return count + (score && score > previousBest ? 1 : 0);
    }, 0);
}

function thresholdCard(label, value, active) {
  return `
    <article class="threshold-card ${active ? "is-active" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </article>
  `;
}

function bodyweightTrendRows(limit = 14) {
  const rows = Object.entries(state.bodyweightLogs || {})
    .map(([date, value]) => ({ date, value: Number(value) }))
    .filter((row) => Number.isFinite(row.value) && row.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit);
  if (!rows.length) return [];
  const min = Math.min(...rows.map((row) => row.value));
  const max = Math.max(...rows.map((row) => row.value));
  const range = Math.max(1, max - min + 1);
  return rows.map((row) => ({ ...row, min, range }));
}

function balanceDetailRow(label, leftValue = 0, rightValue = 0, detail) {
  const hasData = Number(leftValue) > 0 || Number(rightValue) > 0;
  const ratio = hasData && Number(rightValue) ? Number(leftValue) / Number(rightValue) : 0;
  const status = !hasData ? "no data" : ratio >= 0.8 && ratio <= 1.2 ? "balanced" : "needs attention";
  return analyticsDetailRow(label, status, detail, status === "balanced" ? "check-circle-2" : "alert-circle");
}

function consistencyDays(limit = 28) {
  return rangeDays(addDays(selectedDate, -limit + 1), selectedDate).map((day) => {
    const key = dateKey(day);
    return {
      key,
      label: shortWeekday(day).slice(0, 1),
      entries: denseEntriesForDate(key),
    };
  });
}

function trainingCurrentStreak(days) {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (!days[index].entries.length) break;
    streak += 1;
  }
  return streak;
}

function mostLoggedExerciseName(entries) {
  const counts = entries.reduce((map, entry) => {
    map[entry.exercise_name] = (map[entry.exercise_name] || 0) + 1;
    return map;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
}

function weekdayCompletionRows(entries) {
  const labels = ["L", "M", "X", "J", "V", "S", "D"];
  const rows = labels.map((label) => ({ label, count: 0 }));
  entries.forEach((entry) => {
    const day = parseDate(entry.date);
    const index = (day.getDay() + 6) % 7;
    rows[index].count += 1;
  });
  return rows;
}

function analyticsStatCard(label, value, detail, icon) {
  return `
    <article class="analytics-stat-card">
      <span><i data-lucide="${icon}"></i>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function analyticsBar(label, value, max, detail) {
  const width = Math.max(3, pct(value, max));
  return `
    <div class="analytics-bar-row">
      <span>${escapeHtml(label)}</span>
      <div class="analytics-bar-track"><i style="width:${width}%"></i></div>
      <strong>${roundTo(value, 1)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

// Daily totals for the last `days` days (most recent on the right)
function denseDailyTrend(metricFn, days = 7) {
  const buckets = {};
  getDenseEntries().forEach((entry) => {
    if (!entry.date) return;
    buckets[entry.date] = (buckets[entry.date] || 0) + (Number(metricFn(entry)) || 0);
  });
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const key = dateKey(day);
    out.push({ key, short: `${day.getMonth() + 1}/${day.getDate()}`, value: buckets[key] || 0 });
  }
  return out;
}

// Vertical bar trend chart (matches the reference tonnage/blocks trend)
function analyticsTrendChart(title, total, points, unit = "") {
  if (!points.length) return "";
  const max = Math.max(...points.map((p) => p.value), 1);
  const bars = points
    .map((p) => {
      const h = p.value > 0 ? Math.max(6, Math.round((p.value / max) * 100)) : 0;
      return `
        <div class="trend-bar ${p.value > 0 ? "is-on" : ""}" title="${escapeAttr(p.short)}: ${roundTo(p.value, 1)}${unit}">
          <span class="trend-bar-track"><i style="height:${h}%"></i></span>
          <em>${escapeHtml(p.short)}</em>
        </div>
      `;
    })
    .join("");
  return `
    <article class="analytics-card analytics-trend">
      <div class="trend-head">
        <strong>${escapeHtml(String(total))}${escapeHtml(unit)}</strong>
        <span>${escapeHtml(title)}</span>
      </div>
      <div class="trend-chart">${bars}</div>
    </article>
  `;
}

// ── DENSE-style analytics toolkit ────────────────────────────────────────
function dcZoneColor(value) {
  return (dcCnsZones.find((zone) => value < zone.max) || dcCnsZones[dcCnsZones.length - 1]).color;
}

function dcZoneName(value) {
  if (value < 20) return "EASY";
  if (value < 40) return "LIGHT";
  if (value < 60) return "MODERATE";
  if (value < 80) return "HARD";
  return "SPIKE";
}

// Days of bars/points to draw for the active analytics window
function denseWindowChartDays() {
  const windowKey = state.settings.trainingAnalyticsWindow || "70";
  return windowKey === "7" ? 7 : 14;
}

// % change of a summed metric: latest `days` vs the previous `days`
function denseTrendPct(metricFn, days) {
  const map = {};
  getDenseEntries().forEach((entry) => {
    if (!entry.date) return;
    map[entry.date] = (map[entry.date] || 0) + (Number(metricFn(entry)) || 0);
  });
  let current = 0;
  let previous = 0;
  for (let i = 0; i < days; i += 1) {
    current += map[dateKey(addDays(today, -i))] || 0;
    previous += map[dateKey(addDays(today, -days - i))] || 0;
  }
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function dcTrendBadge(pctVal) {
  if (!pctVal) return `<span class="dc-trend is-flat">— 0%</span>`;
  const up = pctVal > 0;
  return `<span class="dc-trend ${up ? "is-up" : "is-down"}"><i data-lucide="${up ? "trending-up" : "trending-down"}"></i>${up ? "+" : ""}${pctVal}%</span>`;
}

// Bar trend chart with a DENSE-style header (big value + trend %)
function dcBarTrendCard(title, valueLabel, pctVal, points, unit = "") {
  const max = Math.max(...points.map((p) => p.value), 1);
  const labelEvery = points.length > 8 ? 2 : 1;
  const bars = points
    .map((p, i) => {
      const h = p.value > 0 ? Math.max(6, Math.round((p.value / max) * 100)) : 0;
      return `
        <div class="trend-bar ${p.value > 0 ? "is-on" : ""}" title="${escapeAttr(`${p.short}: ${roundTo(p.value, 1)}${unit}`)}">
          <span class="trend-bar-track"><i style="height:${h}%"></i></span>
          <em>${i % labelEvery === 0 ? escapeHtml(p.short) : ""}</em>
        </div>`;
    })
    .join("");
  return `
    <div class="dc-section-head"><strong>${escapeHtml(title)}</strong></div>
    <article class="analytics-card analytics-trend">
      <div class="dc-big-head"><strong>${escapeHtml(String(valueLabel))}</strong>${dcTrendBadge(pctVal)}</div>
      <div class="trend-chart">${bars}</div>
    </article>
  `;
}

// SVG line chart with zone-colored day dots (CNS-load style)
function dcLineChart(points, { max = 100, height = 130, legend = true } = {}) {
  const width = 620;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const yFor = (value) => Math.round(height - 10 - (clamp(value, 0, max) / max) * (height - 26));
  const coords = points.map((p, i) => [Math.round(i * step), yFor(p.value)]);
  const path = coords.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const area = `${path} L${coords[coords.length - 1][0]},${height} L${coords[0][0]},${height} Z`;
  const dots = points
    .map((p, i) => (p.value > 0 ? `<circle cx="${coords[i][0]}" cy="${coords[i][1]}" r="4.5" fill="${dcZoneColor(p.value)}"/>` : ""))
    .join("");
  const labelEvery = Math.ceil(points.length / 7);
  const labels = points
    .map((p, i) => (i % labelEvery === 0 || i === points.length - 1 ? `<span style="left:${points.length > 1 ? (i / (points.length - 1)) * 100 : 0}%">${escapeHtml(p.short)}</span>` : ""))
    .join("");
  return `
    <div class="dc-line">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <path class="dc-line-area" d="${area}"/>
        <path class="dc-line-path" d="${path}"/>
        ${dots}
      </svg>
      <div class="dc-line-x">${labels}</div>
      ${legend ? `<div class="dc-zone-legend">${dcCnsZones.map((zone) => `<span><i style="background:${zone.color}"></i>${zone.label}</span>`).join("")}</div>` : ""}
    </div>
  `;
}

// Dual line chart: recovery (lime) vs exertion (amber)
function dcDualLineChart(seriesA, seriesB, labelA, labelB, footnote) {
  const width = 620;
  const height = 150;
  const count = Math.max(seriesA.length, seriesB.length);
  const step = count > 1 ? width / (count - 1) : width;
  const yFor = (value) => Math.round(height - 12 - (clamp(value, 0, 100) / 100) * (height - 28));
  const pathFor = (series) => series.map((p, i) => `${i ? "L" : "M"}${Math.round(i * step)},${yFor(p.value)}`).join(" ");
  const dotsFor = (series, cls) => series.map((p, i) => (p.value > 0 ? `<circle class="${cls}" cx="${Math.round(i * step)}" cy="${yFor(p.value)}" r="3.6"/>` : "")).join("");
  const labelEvery = Math.ceil(count / 7);
  const labels = seriesA
    .map((p, i) => (i % labelEvery === 0 || i === count - 1 ? `<span style="left:${count > 1 ? (i / (count - 1)) * 100 : 0}%">${escapeHtml(p.short)}</span>` : ""))
    .join("");
  return `
    <div class="dc-line is-dual">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <path class="dc-line-path is-a" d="${pathFor(seriesA)}"/>
        <path class="dc-line-path is-b" d="${pathFor(seriesB)}"/>
        ${dotsFor(seriesA, "dc-dot-a")}
        ${dotsFor(seriesB, "dc-dot-b")}
      </svg>
      <div class="dc-line-x">${labels}</div>
      <div class="dc-zone-legend"><span><i class="is-a"></i>${escapeHtml(labelA)}</span><span><i class="is-b"></i>${escapeHtml(labelB)}</span></div>
      ${footnote ? `<p class="dc-footnote">${escapeHtml(footnote)}</p>` : ""}
    </div>
  `;
}

// Daily CNS load, normalized so a typical training day ≈ 50
function denseCnsSeries(days, filterFn = null) {
  const raw = {};
  getDenseEntries().forEach((entry) => {
    if (!entry.date) return;
    if (filterFn && !filterFn(entry)) return;
    raw[entry.date] = (raw[entry.date] || 0) + denseEquivalentSets(entry) * (entry.effort_value || 5);
  });
  const nonZero = Object.values(raw).filter((v) => v > 0).sort((a, b) => a - b);
  const typical = nonZero.length ? nonZero[Math.floor(nonZero.length / 2)] : 50;
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const key = dateKey(day);
    const value = raw[key] || 0;
    out.push({ key, short: `${day.getMonth() + 1}/${day.getDate()}`, value: value ? clamp(Math.round((value / typical) * 50), 4, 100) : 0 });
  }
  return out;
}

// Daily recovery score from wellness signals (readiness, fatigue, comparisons)
function denseRecoverySeries(days) {
  const byDay = {};
  getDenseEntries().forEach((entry) => {
    if (!entry.date) return;
    (byDay[entry.date] ||= []).push(entry);
  });
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const key = dateKey(day);
    const list = byDay[key] || [];
    let score = 0;
    if (list.length) {
      score = 60;
      list.forEach((entry) => {
        if (entry.readiness === "high") score += 12;
        if (entry.readiness === "low") score -= 12;
        const fatigue = Number(entry.session_fatigue) || 0;
        if (fatigue) score -= (fatigue - 5) * 5;
        if (entry.expected_comparison === "harder") score -= 8;
        if (entry.expected_comparison === "easier") score += 8;
        if (entry.failed) score -= 6;
      });
      score = clamp(Math.round(score), 5, 100);
    }
    out.push({ key, short: `${day.getMonth() + 1}/${day.getDate()}`, value: score });
  }
  return out;
}

// % change of the average recovery score: latest `days` vs the previous `days`.
// Only training days (value > 0) count, so rest days don't dilute the average, and
// with no wellness signals every day sits at the 60 baseline → 0% (honest flat).
// Recovery is a level (not a cumulative), so an absent prior baseline returns 0,
// never a spurious +100%.
function denseRecoveryTrendPct(days) {
  const series = denseRecoverySeries(days * 2);
  const avgActive = (points) => {
    const vals = points.map((p) => p.value).filter((v) => v > 0);
    return vals.length ? vals.reduce((sum, v) => sum + v, 0) / vals.length : 0;
  };
  const previous = avgActive(series.slice(0, days));
  const current = avgActive(series.slice(days));
  if (!previous) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function denseWellnessCount() {
  return getDenseEntries().filter((entry) => entry.session_fatigue || (entry.readiness && entry.readiness !== "normal")).length;
}

// Entries in `entries` that set a new best (exercise + scheme) when logged
function densePrEventEntries(entries) {
  const all = [...getDenseEntries()].sort((a, b) => String(a.created_at || a.date || "").localeCompare(String(b.created_at || b.date || "")));
  const best = {};
  const ids = new Set();
  all.forEach((entry) => {
    const key = `${entry.exercise_id}|${entry.scheme}`;
    const score = denseEntryScore(entry) || 0;
    if (score > (best[key] || 0)) {
      ids.add(entry.id);
      best[key] = score;
    }
  });
  return entries.filter((entry) => ids.has(entry.id));
}

// Exercises whose best score inside the window beats their previous best
function denseStrengthMovers(entries) {
  const inWindow = new Set(entries.map((entry) => entry.id));
  const byExercise = {};
  getDenseEntries().forEach((entry) => {
    const row = (byExercise[entry.exercise_id] ||= { name: entry.exercise_name, inWin: 0, before: 0 });
    const score = denseEntryScore(entry) || 0;
    if (inWindow.has(entry.id)) row.inWin = Math.max(row.inWin, score);
    else row.before = Math.max(row.before, score);
  });
  const movers = Object.values(byExercise)
    .filter((row) => row.inWin && row.before)
    .map((row) => ({ name: row.name, pct: Math.round(((row.inWin - row.before) / row.before) * 100) }))
    .filter((row) => row.pct !== 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);
  if (movers.length) return movers;
  // The window covers the whole history (nothing "before" to compare against):
  // fall back to progression INSIDE the window — first mark vs best later mark —
  // so six weeks of PRs never reads as "sin mejoras medibles".
  const byId = {};
  entries.forEach((entry) => (byId[entry.exercise_id] ||= []).push(entry));
  return Object.values(byId)
    .map((list) => {
      const sorted = [...list].sort((a, b) => String(a.created_at || a.date || "").localeCompare(String(b.created_at || b.date || "")));
      const firstScore = denseEntryScore(sorted[0]) || 0;
      const best = Math.max(0, ...sorted.slice(1).map((entry) => denseEntryScore(entry) || 0));
      if (!firstScore || !best) return null;
      const pct = Math.round(((best - firstScore) / firstScore) * 100);
      return pct > 0 ? { name: sorted[0].exercise_name, pct } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);
}

// Window entries that matched-or-beat the previous mark at LOWER effort
function denseEffortEasierRows(entries) {
  const sorted = [...getDenseEntries()].sort((a, b) => String(a.created_at || a.date || "").localeCompare(String(b.created_at || b.date || "")));
  const prevBy = {};
  const inWindow = new Set(entries.map((entry) => entry.id));
  const rows = [];
  sorted.forEach((entry) => {
    const key = `${entry.exercise_id}|${entry.scheme}`;
    const prev = prevBy[key];
    const score = denseEntryScore(entry) || 0;
    if (prev && inWindow.has(entry.id) && score >= prev.score && (entry.effort_value || 5) < (prev.effort || 5)) {
      rows.push({ name: entry.exercise_name, scheme: entry.scheme, date: entry.date });
    }
    prevBy[key] = { score, effort: entry.effort_value || 5 };
  });
  return rows.reverse().slice(0, 6);
}

// Collapsible summary row (PERSONAL RECORDS / EFFORT style)
function dcCollapse(icon, title, subtitle, valueLabel, bodyHtml) {
  return `
    <details class="dc-collapse">
      <summary>
        <span class="tiny-icon"><i data-lucide="${icon}"></i></span>
        <div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle)}</small></div>
        <b>${valueLabel}</b>
        <i data-lucide="chevron-down"></i>
      </summary>
      <div class="dc-collapse-body">${bodyHtml}</div>
    </details>
  `;
}

function dcPrRow(entry) {
  return `
    <div class="dc-pr-row">
      <div><strong>${escapeHtml(entry.exercise_name)}</strong><small><em>Dense</em> ${escapeHtml(entry.scheme)}</small></div>
      <b>${escapeHtml(denseEntryValue(entry))}</b>
      <span>${escapeHtml(String(entry.date || "").slice(5))}</span>
    </div>
  `;
}

// Volume-per-category row with maintenance/productive/overreach zone ticks
function dcZoneVolumeRow(label, weeklySets) {
  const maintenance = 5;
  const productive = 15;
  const scaleMax = Math.max(20, weeklySets * 1.15);
  const zone = weeklySets > productive ? "overreaching" : weeklySets >= maintenance ? "productive" : "maintenance";
  const zoneClass = zone === "productive" ? "is-good" : zone === "overreaching" ? "is-hot" : "";
  return `
    <div class="dc-muscle-row">
      <div class="dc-muscle-head"><strong>${escapeHtml(label)}</strong><span class="${zoneClass}">${roundTo(weeklySets, 1)} sets/sem · ${zone}</span></div>
      <div class="dc-muscle-track">
        <i class="dc-muscle-fill ${zoneClass}" style="width:${clamp((weeklySets / scaleMax) * 100, 2, 100)}%"></i>
        <em style="left:${(maintenance / scaleMax) * 100}%"></em>
        <em style="left:${(productive / scaleMax) * 100}%"></em>
      </div>
    </div>
  `;
}

// Bipolar balance card (Push vs Pull style)
function dcBipolarCard(title, leftLabel, leftSets, leftReps, rightLabel, rightSets, rightReps, target) {
  const total = leftSets + rightSets;
  const ratio = rightSets ? leftSets / rightSets : 0;
  let status = "Sin datos";
  let tone = "";
  let advice = `Registra ${leftLabel.toLowerCase()} o ${rightLabel.toLowerCase()} para activar este balance.`;
  if (total) {
    if (!rightSets) {
      status = `Sin ${rightLabel.toLowerCase()}`;
      tone = "is-bad";
      advice = `Empieza a añadir volumen de ${rightLabel.toLowerCase()} — ahora mismo cero.`;
    } else if (!leftSets) {
      status = `Sin ${leftLabel.toLowerCase()}`;
      tone = "is-bad";
      advice = `Empieza a añadir volumen de ${leftLabel.toLowerCase()} — ahora mismo cero.`;
    } else if (Math.abs(ratio - target) / target <= 0.25) {
      status = `${roundTo(ratio, 2)} · en objetivo`;
      tone = "is-good";
      advice = `Ratio ${roundTo(ratio, 2)} dentro del rango objetivo (~${target}).`;
    } else if (ratio > target) {
      status = `${roundTo(ratio, 2)} · exceso ${leftLabel.toLowerCase()}`;
      tone = "is-warn";
      advice = `Añade ${rightLabel.toLowerCase()} para acercarte al objetivo ${target}.`;
    } else {
      status = `${roundTo(ratio, 2)} · exceso ${rightLabel.toLowerCase()}`;
      tone = "is-warn";
      advice = `Añade ${leftLabel.toLowerCase()} para acercarte al objetivo ${target}.`;
    }
  }
  const fill = total ? clamp((leftSets / total) * 100, 4, 96) : 50;
  return `
    <article class="dc-bipolar">
      <div class="dc-bipolar-head"><strong>${escapeHtml(title)}</strong><span class="${tone}">${escapeHtml(status)}</span></div>
      <div class="dc-bipolar-track ${total ? "" : "is-empty"}">${total ? `<i style="width:${fill}%"></i>` : ""}<em></em></div>
      <div class="dc-bipolar-sides">
        <div><strong>${escapeHtml(leftLabel)}</strong><span>${roundTo(leftSets, 1)} sets${leftReps ? ` · ${Math.round(leftReps)} reps` : ""}</span></div>
        <div><strong>${escapeHtml(rightLabel)}</strong><span>${roundTo(rightSets, 1)} sets${rightReps ? ` · ${Math.round(rightReps)} reps` : ""}</span></div>
      </div>
      <p class="dc-footnote">${escapeHtml(advice)}</p>
    </article>
  `;
}

function ratioRow(label, leftValue = 0, rightValue = 0, leftLabel, rightLabel, target) {
  const ratio = rightValue ? leftValue / rightValue : 0;
  const display = ratio ? roundTo(ratio, 2) : "-";
  const balance = ratio ? clamp(Math.round((1 - Math.min(Math.abs(1 - ratio), 1)) * 100), 0, 100) : 0;
  return `
    <div class="ratio-row">
      <div>
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(leftLabel)} ${roundTo(leftValue || 0, 1)} · ${escapeHtml(rightLabel)} ${roundTo(rightValue || 0, 1)} · target ${escapeHtml(target)}</span>
      </div>
      <div class="ratio-meter"><i style="width:${Math.max(5, balance)}%"></i></div>
      <b>${display}</b>
    </div>
  `;
}

function patternLabel(pattern) {
  return (
    {
      push: "Empuje",
      pull: "Tirón",
      legs: "Pierna",
      skills: "Skills",
      mobility: "Movilidad",
      vertical_push: "Empuje vertical",
      vertical_pull: "Tirón vertical",
      horizontal_push: "Empuje horizontal",
      horizontal_pull: "Tirón horizontal",
      squat: "Squat",
      hinge: "Hinge",
      unilateral_leg: "Pierna unilateral",
      core: "Core",
    }[pattern] || pattern
  );
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function applyDenseExerciseSearch(value) {
  const query = value.trim().toLowerCase();
  document.querySelectorAll("[data-exercise-card]").forEach((card) => {
    const match = !query || (card.dataset.search || "").includes(query);
    card.classList.toggle("is-hidden", !match);
  });
}

function denseFormDefaults() {
  const latest = [...getDenseEntries()].sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
  const selectedId = state.settings.denseSelectedExerciseId;
  const draftEntry = state.settings.denseDraftEntryId
    ? getDenseEntries().find((entry) => entry.id === state.settings.denseDraftEntryId)
    : null;
  if (draftEntry) {
    const exercise = denseExerciseById(draftEntry.exercise_id);
    return {
      date: draftEntry.date || dateKey(selectedDate),
      bodyweightKg: draftEntry.bodyweight_kg || latestKnownBodyweight(draftEntry.date || dateKey(selectedDate)) || 80,
      exerciseId: exercise.id,
      nature: draftEntry.nature || exercise.nature,
      scheme: draftEntry.scheme || denseAllowedSchemes(exercise)[0],
      repsPerSet: draftEntry.target_reps_per_min || draftEntry.reps_per_set || "",
      totalReps: draftEntry.total_reps || "",
      holdSecondsPerRound: draftEntry.hold_seconds_per_round || "",
      rounds: draftEntry.rounds || denseSchemeMinutes(draftEntry.scheme) || "",
      effort: draftEntry.effort || "N",
      externalLoadKg: draftEntry.external_load_kg || "",
      addedLoadKg: draftEntry.added_load_kg || "",
      weightPerDumbbellKg: draftEntry.weight_per_dumbbell_kg || "",
      assistLoadKg: draftEntry.assist_load_kg || "",
      romCm: draftEntry.rom_cm ?? "",
      isTest: Boolean(draftEntry.is_test),
      readiness: draftEntry.readiness || "normal",
      notes: draftEntry.notes || "",
    };
  }
  const exercise = denseExerciseById(selectedId || latest?.exercise_id || "pull_up");
  const latestForExercise = latestDenseEntryForExercise(exercise.id);
  const referenceEntry = selectedId ? latestForExercise : latest;
  const shouldUseLatest = Boolean(referenceEntry);
  // Effective modality: an explicit in-form choice wins, else the last logged
  // modality for this exercise, else the exercise default. Everything below
  // (schemes, suggestion, field targets) is computed for that modality.
  const allowedNatures = exercise.allowedNatures?.length ? exercise.allowedNatures : [exercise.nature];
  const overrideNature = denseFormNatureOverride && allowedNatures.includes(denseFormNatureOverride) ? denseFormNatureOverride : null;
  // A planned item for today may pin a scheme AND a modality (e.g. "Dominadas
  // con lastre"). Both win over the last-session default unless the user
  // switched modality in-form.
  const planItem = densePlanItemsForDate(selectedDate).find((item) => item.exercise_id === exercise.id) || null;
  const planNature = planItem?.nature && allowedNatures.includes(planItem.nature) ? planItem.nature : null;
  const nature = overrideNature || planNature || (shouldUseLatest && referenceEntry?.nature && allowedNatures.includes(referenceEntry.nature) ? referenceEntry.nature : exercise.nature);
  const activeExercise = { ...exercise, nature };
  const allowedSchemes = denseAllowedSchemes(activeExercise);
  // Same default resolver the planned card uses, so the "Target" preview and
  // the scheme the form opens with agree. An explicit modality switch drops
  // the old scheme and picks the mid-range default for the new modality.
  const preferredScheme = overrideNature
    ? denseIsLoadExercise(activeExercise)
      ? "10D5"
      : "10D"
    : (planItem?.scheme && allowedSchemes.includes(planItem.scheme) ? planItem.scheme : denseDefaultScheme(activeExercise));
  const scheme = allowedSchemes.includes(preferredScheme) ? preferredScheme : allowedSchemes[0];
  const suggestion = denseProgressionSuggestion(activeExercise, "normal", scheme);
  const repsPerSet = suggestion?.repsPerSet || denseDefaultRepsPerSet(activeExercise, scheme);
  // Test session: planned as test, or the target comes from transfer/estimation
  // with no direct evidence — exploring a number, not executing a known one.
  const sourceKind = denseTargetSource(activeExercise, scheme).kind;
  const isTest = Boolean(planItem?.is_test) || ["family", "transfer", "estimated", "none"].includes(sourceKind);
  return {
    date: dateKey(selectedDate),
    bodyweightKg: latestKnownBodyweight(dateKey(selectedDate)) || 80,
    exerciseId: exercise.id,
    nature,
    scheme,
    repsPerSet,
    totalReps: suggestion?.totalReps || (repsPerSet ? denseTotalFromRepsPerSet(repsPerSet, scheme) : denseDefaultTotalReps(activeExercise, scheme)),
    holdSecondsPerRound: suggestion?.holdSecondsPerRound || (!overrideNature && shouldUseLatest && referenceEntry?.hold_seconds_per_round ? referenceEntry.hold_seconds_per_round : ""),
    rounds: suggestion?.rounds || (shouldUseLatest && referenceEntry?.rounds ? referenceEntry.rounds : denseSchemeMinutes(scheme) || ""),
    effort: denseFailureSetMode ? "fallo" : "N",
    externalLoadKg: suggestion?.externalLoadKg || "",
    addedLoadKg: suggestion?.addedLoadKg || "",
    weightPerDumbbellKg: suggestion?.weightPerDumbbellKg || "",
    assistLoadKg: suggestion?.assistLoadKg ?? "",
    romCm: denseRomSuggestion(activeExercise)?.target ?? "",
    isTest,
    readiness: "normal",
    notes: "",
  };
}

function latestKnownBodyweight(beforeKey = dateKey(selectedDate)) {
  const logs = state.bodyweightLogs || {};
  const direct = logs[beforeKey];
  if (direct) return direct;
  const latest = Object.entries(logs)
    .filter(([day]) => day <= beforeKey)
    .sort(([a], [b]) => b.localeCompare(a))[0];
  if (latest) return latest[1];
  const entry = [...getDenseEntries()]
    .filter((item) => item.bodyweight_kg && item.date <= beforeKey)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return entry?.bodyweight_kg || "";
}

function computeDenseEntry(raw) {
  const scheme = raw.scheme || "";
  const base = denseSchemeBase(scheme);
  const duration = raw.duration_minutes || denseSchemeMinutes(scheme) || 0;
  const totalReps = raw.total_reps || 0;
  const repsPerMin = duration && totalReps ? totalReps / duration : 0;
  const totalHoldSeconds = raw.total_hold_seconds || 0;
  const holdSecondsPerRound = raw.hold_seconds_per_round || 0;
  const holdSecondsPerMin = duration && totalHoldSeconds ? totalHoldSeconds / duration : 0;
  const workingPct = denseWorkingPct[scheme] || 0;
  const bw = raw.bodyweight_kg || 0;
  const load = raw.external_load_kg || 0;
  const added = raw.added_load_kg || 0;
  const assist = raw.assist_load_kg || 0;
  const contribution = raw.bodyweight_contribution_pct || 0;
  const multiplier = bodyweightMultipliers[base] || 0;

  let totalSystemLoad = raw.nature === "weighted_calisthenics" ? bw + added : load;
  // Assisted (counterweight over the bar): the assistance is negative load, so
  // the working arm handles bodyweight MINUS the counterweight. Approximate —
  // rope friction over the bar eats a little of the assist — but close enough
  // to track OAC progress as the counterweight drops toward 0 (full OAC).
  if (raw.nature === "assisted") {
    totalSystemLoad = Math.max(0, (bw * contribution) / 100 - assist);
  }
  if (raw.nature === "bodyweight" || raw.nature === "banded" || raw.nature === "plyometrics" || raw.nature === "conditioning") {
    totalSystemLoad = 0;
  }

  // Effective e1RM: derived from the density actually achieved on the rep-max
  // curve, not the scheme's nominal %. Completing the scheme reproduces the
  // table value exactly; a failed attempt (fewer reps/min) implies a LOWER
  // e1RM instead of inflating it (no fake PRs from failed heavy attempts),
  // and extra reps raise it. Clamped around nominal to survive typos; falls
  // back to nominal when reps weren't logged.
  const nominalE1rm = workingPct && totalSystemLoad ? totalSystemLoad / workingPct : 0;
  const effectivePct = totalSystemLoad && repsPerMin > 0 ? densePctForReps(base, repsPerMin) : 0;
  const e1rmKg = effectivePct
    ? nominalE1rm
      ? clamp(totalSystemLoad / effectivePct, nominalE1rm * 0.5, nominalE1rm * 1.3)
      : totalSystemLoad / effectivePct
    : nominalE1rm;
  const relativeStrength = bw && totalSystemLoad ? totalSystemLoad / bw : 0;
  const visibleAddedLoad = raw.nature === "weighted_calisthenics" && bw ? totalSystemLoad - bw : 0;
  const capacity = repsPerMin && multiplier ? repsPerMin / multiplier : 0;
  const isometricCapacity = holdSecondsPerMin && multiplier ? holdSecondsPerMin / multiplier : 0;
  const effectiveLoad =
    raw.nature === "weighted_calisthenics" || raw.nature === "assisted"
      ? totalSystemLoad
      : load + (bw * (raw.bodyweight_contribution_pct || 0)) / 100;
  const tonnage = totalReps && effectiveLoad ? effectiveLoad * totalReps * (raw.tonnage_factor || 1) : 0;
  const tutLoad = totalHoldSeconds && effectiveLoad ? effectiveLoad * totalHoldSeconds * (raw.tonnage_factor || 1) : 0;

  return {
    ...raw,
    scheme_base: base,
    duration_minutes: duration,
    total_reps: totalReps,
    reps_per_min: roundTo(repsPerMin, 2),
    hold_seconds_per_round: holdSecondsPerRound,
    total_hold_seconds: totalHoldSeconds,
    hold_seconds_per_min: roundTo(holdSecondsPerMin, 2),
    isometric_capacity: roundTo(isometricCapacity, 3),
    working_pct: workingPct,
    total_system_load_kg: roundTo(totalSystemLoad, 2),
    visible_added_load_kg: roundTo(visibleAddedLoad, 2),
    e1rm_kg: roundTo(e1rmKg, 2),
    relative_strength: roundTo(relativeStrength, 3),
    bodyweight_capacity: roundTo(capacity, 3),
    effective_load_kg: roundTo(effectiveLoad, 2),
    tonnage_kg: roundTo(tonnage, 1),
    tut_load_kg_seconds: roundTo(tutLoad, 1),
    computed: {
      e1rm: roundTo(e1rmKg, 2) || null,
      relative_strength: roundTo(relativeStrength, 3) || null,
      effective_load_kg: roundTo(effectiveLoad, 2) || null,
      tonnage: roundTo(tonnage, 1) || null,
      capacity: roundTo(capacity, 3) || null,
      isometric_capacity: roundTo(isometricCapacity, 3) || null,
      pr_score: roundTo(denseEntryScore({ ...raw, e1rm_kg: e1rmKg, bodyweight_capacity: capacity, isometric_capacity: isometricCapacity, reps_per_min: repsPerMin, total_hold_seconds: totalHoldSeconds }), 3) || null,
    },
  };
}

function updateDenseEstimate(entry) {
  state.denseEstimates ||= {};
  const effortFactor = denseEffortFactors[entry.effort] || 1;
  const key = entry.exercise_id;
  const current = state.denseEstimates[key] || {};
  const next = { ...current, exercise_id: key, exercise_name: entry.exercise_name, updated_at: entry.created_at };

  if (entry.bodyweight_capacity) {
    const observed = entry.bodyweight_capacity * effortFactor;
    next.bodyweight_capacity = roundTo(current.bodyweight_capacity ? current.bodyweight_capacity * 0.7 + observed * 0.3 : observed, 3);
  }

  if (entry.e1rm_kg) {
    const observed = entry.e1rm_kg * effortFactor;
    next.e1rm_kg = roundTo(current.e1rm_kg ? current.e1rm_kg * 0.7 + observed * 0.3 : observed, 2);
  }

  if (entry.isometric_capacity) {
    const observed = entry.isometric_capacity * effortFactor;
    next.isometric_capacity = roundTo(current.isometric_capacity ? current.isometric_capacity * 0.7 + observed * 0.3 : observed, 3);
  }

  state.denseEstimates[key] = next;
}

function rebuildDenseEstimates() {
  denseCalibrationCache = null;
  state.denseEstimates = {};
  [...getDenseEntries()]
    .sort((a, b) => String(a.created_at || a.date || "").localeCompare(String(b.created_at || b.date || "")))
    .forEach((entry) => updateDenseEstimate(entry));
}

function densePrRows() {
  const best = new Map();
  getDenseEntries().forEach((entry) => {
    const key = `${entry.exercise_id}:${entry.scheme}`;
    const score = denseEntryScore(entry);
    if (!score) return;
    const current = best.get(key);
    if (!current || score > current.score) best.set(key, { entry, score });
  });

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => ({
      exerciseName: entry.exercise_name,
      scheme: entry.scheme,
      value: denseEntryValue(entry),
      relative: entry.relative_strength ? `${entry.relative_strength}x BW` : entry.hold_seconds_per_min ? `${entry.hold_seconds_per_min}s/min` : entry.reps_per_min ? `${entry.reps_per_min} rpm` : "-",
      date: entry.date,
    }));
}

function denseEntryCard(entry) {
  const isPr = denseEntryIsPr(entry);
  const metrics = [];
  const romTxt = denseRomText(entry);
  if (romTxt) metrics.push(`${romTxt} rango`);
  if (entry.total_hold_seconds) metrics.push(`${entry.total_hold_seconds}s TUT`);
  if (entry.hold_seconds_per_round) metrics.push(`${entry.hold_seconds_per_round}s/ronda`);
  if (entry.reps_per_min) metrics.push(`${entry.reps_per_min} rpm`);
  if (entry.e1rm_kg) metrics.push(`e1RM ${formatKg(entry.e1rm_kg)}`);
  if (entry.relative_strength) metrics.push(`${entry.relative_strength}x BW`);
  if (entry.tonnage_kg) metrics.push(`${Math.round(entry.tonnage_kg)} kg tonnage`);

  return `
    <article class="dense-entry-card">
      <div class="dense-entry-main">
        ${denseExerciseIconMarkup(entry.exercise_id, { color: denseNatureColor(entry.nature) })}
        <div>
          <strong>${escapeHtml(entry.exercise_name)}</strong>
          <span>${escapeHtml(entry.date)} · ${escapeHtml(entry.scheme)} · ${escapeHtml(entry.effort)}</span>
        </div>
        <button class="icon-button" type="button" data-action="load-dense-entry" data-entry="${escapeAttr(entry.id)}" title="Editar marca" aria-label="Editar ${escapeAttr(entry.exercise_name)}">
          <i data-lucide="edit-3"></i>
        </button>
      </div>
      <div class="dense-entry-stats">
        ${metrics.slice(0, 4).map((item) => `<span class="mini-tag">${escapeHtml(item)}</span>`).join("")}
      </div>
      <p class="tiny-copy">${escapeHtml(entry.notes || "Sin nota")}</p>
    </article>
  `;
}

function selectedExerciseLogEntries(exerciseId, limit = 5) {
  return [...getDenseEntries()]
    .filter((entry) => entry.exercise_id === exerciseId && !entry.deleted_at)
    .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))
    .slice(0, limit);
}

function renderSelectedExerciseLog(exerciseId) {
  const exercise = denseExerciseById(exerciseId);
  const entries = selectedExerciseLogEntries(exerciseId, 5);
  return `
    <section class="dense-selected-log" aria-label="Últimos entrenos de ${escapeAttr(exercise.name)}">
      <div class="section-subhead">
        <strong>Últimos entrenos</strong>
        <span>${entries.length ? `${entries.length} de ${denseExerciseStats(exerciseId).count} marcas` : "sin marcas todavía"}</span>
      </div>
      <div class="dense-selected-log-list">
        ${
          entries.length
            ? entries.map((entry) => selectedExerciseLogRow(entry)).join("")
            : `<article class="dense-selected-log-empty">
                <span class="tiny-icon" style="--item-color:${denseCategoryColor(exercise.category)}"><i data-lucide="${exercise.icon || "dumbbell"}"></i></span>
                <div>
                  <strong>Primer registro pendiente</strong>
                  <span>Cuando guardes ${escapeHtml(exercise.name)}, sus últimas marcas aparecerán aquí.</span>
                </div>
              </article>`
        }
      </div>
    </section>
  `;
}

function renderDenseProgressionSuggestion(exercise, suggestion = denseProgressionSuggestion(exercise)) {
  if (!suggestion) {
    return `
      <article class="dense-progression-card is-empty" style="--item-color:${denseCategoryColor(exercise.category)}">
        <span class="tiny-icon"><i data-lucide="trending-up"></i></span>
        <div>
          <strong>Siguiente objetivo</strong>
          <span>Guarda una marca de ${escapeHtml(exercise.name)} y BitTracker propondrá la progresión.</span>
        </div>
      </article>
    `;
  }
  const dirIcon = suggestion.direction === "up" ? "arrow-up" : suggestion.direction === "down" ? "arrow-down" : "move-right";
  const dirLabel = suggestion.direction === "up" ? "Subir" : suggestion.direction === "down" ? "Bajar" : "Mantener";
  return `
    <article class="dense-progression-card is-${escapeAttr(suggestion.tone)}" style="--item-color:${denseCategoryColor(exercise.category)}">
      <span class="tiny-icon"><i data-lucide="${dirIcon}"></i></span>
      <div>
        <div class="dense-progression-title">
          <strong>${escapeHtml(dirLabel)}</strong>
          <em>${escapeHtml(suggestion.title)}</em>
        </div>
        <span>${escapeHtml(suggestion.reason)}</span>
        <small>Base: ${escapeHtml(suggestion.entry.scheme)} · ${escapeHtml(denseEntryValue(suggestion.entry))} · esfuerzo ${escapeHtml(suggestion.entry.effort || "N")}</small>
        ${(() => {
          const src = denseTargetSource(exercise, suggestion.scheme);
          const empTxt = src.empirical ? ` · error real ±${Math.round(src.empirical.sigma * 100)}% (${src.empirical.n} tests)` : "";
          return `<small class="dense-source-line"><i data-lucide="${src.icon}"></i>Fuente: ${escapeHtml(src.label)}${src.confidence ? ` · confianza ${escapeHtml(src.confidence)}` : ""}${escapeHtml(empTxt)}</small>`;
        })()}
        ${(() => {
          if (!denseUsesRom(exercise)) return "";
          const rom = denseRomSuggestion(exercise);
          if (!rom) return "";
          const goal = rom.closer ? `acércate a ${roundTo(rom.target, 1)} cm` : `mantén ${roundTo(rom.current, 1)} cm`;
          return `<small class="dense-rom-goal"><i data-lucide="ruler"></i>Rango · ${escapeHtml(denseRomLabel(exercise))}: ${goal}${rom.best !== null ? ` · mejor ${roundTo(rom.best, 1)} cm` : ""}</small>`;
        })()}
      </div>
    </article>
  `;
}

function selectedExerciseLogRow(entry) {
  const dateLabel = entry.date ? formatShortDate(parseDate(entry.date)) : "";
  const score = entry.e1rm_kg
    ? `e1RM ${formatKg(entry.e1rm_kg)}`
    : entry.total_hold_seconds
      ? `${entry.total_hold_seconds}s TUT`
      : entry.reps_per_min
        ? `${entry.reps_per_min} rpm`
        : `${entry.total_reps || 0} reps`;
  return `
    <article class="dense-selected-log-row">
      <div class="dense-selected-log-main">
        <span class="dense-log-date">${escapeHtml(dateLabel)}</span>
        <div>
          <strong>${escapeHtml(entry.scheme)} · ${escapeHtml(denseEntryValue(entry))}</strong>
          <span>${escapeHtml(score)} · ${escapeHtml(entry.effort || "N")}${entry.notes ? ` · ${escapeHtml(entry.notes)}` : ""}</span>
        </div>
      </div>
      <button class="icon-button" type="button" data-action="load-dense-entry" data-entry="${escapeAttr(entry.id)}" title="Editar marca" aria-label="Editar ${escapeAttr(entry.exercise_name)} ${escapeAttr(entry.scheme)}">
        <i data-lucide="edit-3"></i>
      </button>
    </article>
  `;
}

function renderDenseEstimateCards(entry) {
  const exercise = denseExerciseById(entry.exercise_id);
  const perSide = Boolean(exercise?.repsPerSide);
  const estimate = state.denseEstimates?.[entry.exercise_id] || {};
  // Targets follow your best proven capacity, not the lagging smoothed estimate.
  const bestMetric = (key) =>
    denseBoosted(
      entry.exercise_id,
      Math.max(
        estimate[key] || 0,
        entry[key] || 0,
        ...getDenseEntries().filter((item) => item.exercise_id === entry.exercise_id).map((item) => Number(item[key]) || 0),
      ),
    );
  const unified = denseUnifiedE1rm(entry.exercise_id);
  // Low technical mastery widens uncertainty on skill estimates (phase 3)
  const tech = denseTechMasteryInfo(exercise || { id: entry.exercise_id });
  const techExtra = tech.technical && tech.t < 0.6 ? (0.6 - tech.t) * 0.25 : 0;

  if (entry.nature === "weighted" || entry.nature === "weighted_calisthenics") {
    // Current-level e1RM: the smoothed estimate follows recent sessions in both
    // directions (a failed attempt lowers next targets instead of freezing the
    // all-time max). Unified/max only when there is no weighted estimate yet —
    // e.g. a bodyweight-only history estimating loads for the first time.
    const emaE1rm = denseBoosted(entry.exercise_id, Number(estimate.e1rm_kg) || 0);
    const e1rm = emaE1rm || Math.max(bestMetric("e1rm_kg"), unified?.e1rm || 0);
    if (!e1rm) return "";
    const cross = !emaE1rm && !bestMetric("e1rm_kg") && Boolean(unified?.cross);
    const bw = entry.bodyweight_kg || latestKnownBodyweight(entry.date) || 0;
    const targets = ["2D5", "5D3", "5D5", "10D3", "10D5", "10D1-2-3", "20D3", "20D5"];
    return targets
      .map((scheme) => {
        const sigma = denseEstimateSigma(unified?.date || entry.date, {
          cross,
          baseGap: Math.abs((denseBaseOrder[denseSchemeBase(scheme)] ?? 0) - (denseBaseOrder[unified?.base || denseSchemeBase(scheme)] ?? 0)),
        });
        const totalLoad = e1rm * denseWorkingPct[scheme];
        const low = totalLoad * (1 - sigma);
        const high = totalLoad * (1 + sigma);
        const displayLoad =
          entry.nature === "weighted_calisthenics" && bw ? `${formatKg(Math.max(0, totalLoad - bw))} lastre` : formatKg(totalLoad);
        const rangeText =
          entry.nature === "weighted_calisthenics" && bw
            ? `${formatKg(Math.max(0, low - bw))}–${formatKg(Math.max(0, high - bw))}`
            : `${formatKg(low)}–${formatKg(high)}`;
        return `
          <article class="dense-estimate-card">
            <span>${scheme}</span>
            <strong>${displayLoad}</strong>
            <small>${rangeText} · conf. ${denseConfidenceLabel(sigma)}${cross ? " · cruzada" : ""}</small>
          </article>
        `;
      })
      .join("");
  }

  const capacity = bestMetric("bodyweight_capacity");
  const isoCapacity = bestMetric("isometric_capacity");
  if (isoCapacity) {
    const lastIso = [...getDenseEntries()]
      .filter((item) => item.exercise_id === entry.exercise_id && item.isometric_capacity)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
    const sigma = clamp(denseEstimateSigma(lastIso?.date || entry.date) + techExtra, 0.06, 0.28);
    return bodyweightSchemes
      .map((scheme) => {
        const minutes = denseSchemeMinutes(scheme);
        const secondsPerMin = Math.floor(isoCapacity * bodyweightMultipliers[scheme]);
        const low = Math.max(1, Math.floor(secondsPerMin * (1 - sigma)));
        const high = Math.ceil(secondsPerMin * (1 + sigma));
        return `
          <article class="dense-estimate-card">
            <span>${scheme}</span>
            <strong>${secondsPerMin}s/min</strong>
            <small>${low}–${high}s · ${secondsPerMin * minutes}s TUT · conf. ${denseConfidenceLabel(sigma)}</small>
          </article>
        `;
      })
      .join("");
  }

  if (!capacity && !unified) return "";
  return bodyweightSchemes
    .map((scheme) => {
      const minutes = denseSchemeMinutes(scheme);
      // Blend the direct capacity path with the e1RM-curve inversion when both
      // exist; either alone still yields an estimate (e.g. weighted-only history).
      const direct = capacity ? capacity * bodyweightMultipliers[scheme] : 0;
      const inverted = unified ? denseCrossRpm(exercise, scheme, unified) : 0;
      const blended = direct && inverted ? direct * 0.6 + inverted * 0.4 : direct || inverted;
      if (!blended) return "";
      const rpm = Math.max(1, Math.round(denseCapRpm(exercise, Math.floor(blended))));
      const sigma = clamp(
        denseEstimateSigma(unified?.date || entry.date, {
          cross: !direct,
          baseGap: unified ? Math.abs((denseBaseOrder[scheme] ?? 0) - (denseBaseOrder[unified.base] ?? 0)) : 0,
        }) + techExtra,
        0.06,
        0.28,
      );
      const low = Math.max(1, Math.floor(rpm * (1 - sigma)));
      const high = Math.max(rpm, Math.ceil(rpm * (1 + sigma)));
      return `
        <article class="dense-estimate-card">
          <span>${scheme}</span>
          <strong>${rpm} rpm${perSide ? "/lado" : ""}</strong>
          <small>${low}–${high} rpm · ${rpm * minutes}${perSide ? " reps/lado" : " reps"} · conf. ${denseConfidenceLabel(sigma)}${!direct ? " · cruzada" : ""}</small>
        </article>
      `;
    })
    .join("");
}

function denseEntryScore(entry) {
  if (entry.e1rm_kg) return entry.e1rm_kg;
  if (entry.isometric_capacity) return entry.isometric_capacity;
  if (entry.total_hold_seconds) return entry.total_hold_seconds;
  if (entry.bodyweight_capacity) return entry.bodyweight_capacity;
  if (entry.reps_per_min) return entry.reps_per_min;
  return entry.total_reps || 0;
}

function denseEntryValue(entry) {
  const romTxt = denseRomText(entry);
  if (romTxt) {
    // Mobility leads with depth; reps/hold (if any) come after as context.
    const extra = entry.total_hold_seconds
      ? ` · ${entry.total_hold_seconds}s`
      : entry.total_reps
        ? ` · ${entry.total_reps} reps`
        : "";
    return `${romTxt}${extra}`;
  }
  if (entry.total_hold_seconds) {
    return `${entry.total_hold_seconds}s TUT · ${entry.hold_seconds_per_round || 0}s/ronda`;
  }
  if (entry.nature === "weighted_calisthenics") {
    return `${entry.total_reps || 0} reps · ${formatKg(entry.visible_added_load_kg)} lastre · e1RM ${formatKg(entry.e1rm_kg)}`;
  }
  if (entry.nature === "weighted") {
    const db = entry.weight_per_dumbbell_kg ? `${formatKg(entry.weight_per_dumbbell_kg)} x2 · ` : "";
    return `${entry.total_reps || 0} reps · ${db}${formatKg(entry.external_load_kg)} · e1RM ${formatKg(entry.e1rm_kg)}`;
  }
  if (entry.nature === "assisted") {
    const assist = Number(entry.assist_load_kg) || 0;
    return `${entry.total_reps || 0} reps · ${assist ? `−${formatKg(assist)} asist` : "sin asist"} · e1RM ${formatKg(entry.e1rm_kg)}`;
  }
  if (entry.reps_per_min) {
    const targetRpm = Number(entry.target_reps_per_min || entry.reps_per_set || 0);
    const targetTotal = Number(entry.target_total_reps || 0);
    const total = Number(entry.total_reps || 0);
    if (targetRpm && targetTotal && total && total !== targetTotal) {
      return `objetivo ${denseSchemeCode(entry.scheme, targetRpm)} · ${total}/${targetTotal} reps · ${entry.reps_per_min} rpm real`;
    }
    if (targetRpm && targetTotal) return `${targetRpm}/min · ${targetTotal} reps`;
    return `${entry.reps_per_min} rpm · ${entry.total_reps} reps`;
  }
  return `${entry.total_reps || 0} reps`;
}

function denseSchemeBase(scheme) {
  const match = String(scheme || "").match(/^(\d+D)/);
  return match ? match[1] : "";
}

function denseSchemeMinutes(scheme) {
  const match = String(scheme || "").match(/^(\d+)D/);
  return match ? Number(match[1]) : 0;
}

function denseNatureColor(nature) {
  if (nature === "weighted" || nature === "weighted_calisthenics") return "var(--green)";
  if (nature === "assisted") return "var(--amber)";
  if (nature === "bodyweight") return "var(--cyan)";
  if (nature === "skill") return "var(--purple)";
  if (nature === "conditioning") return "var(--amber)";
  return "var(--teal)";
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function roundTo(value, decimals = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function formatKg(value) {
  if (!value) return "0kg";
  return `${roundTo(value, 1)}kg`;
}

function getSelectedTraining() {
  let week = state.mesocycle.weeks.find((item) => item.id === state.settings.selectedWeekId) || state.mesocycle.weeks[0];
  let session = week.sessions.find((item) => item.id === state.settings.selectedSessionId) || week.sessions[0];
  if (!week.sessions.some((item) => item.id === session.id)) {
    session = week.sessions[0];
    state.settings.selectedSessionId = session.id;
  }
  return { week, session };
}

function getSessionLog(sessionId) {
  state.trainingLogs[sessionId] ||= { exercises: {}, note: "", updatedAt: new Date().toISOString() };
  return state.trainingLogs[sessionId];
}

function exerciseDone(sessionId, exerciseId) {
  return Boolean(state.trainingLogs[sessionId]?.exercises?.[exerciseId]);
}

function sessionDoneCount(sessionId) {
  const session = findSession(sessionId);
  if (!session) return 0;
  return session.exercises.filter((exercise) => exerciseDone(sessionId, exercise.id)).length;
}

function weekProgress(weekId) {
  const week = state.mesocycle.weeks.find((item) => item.id === weekId);
  if (!week) return 0;
  const total = week.sessions.reduce((sum, session) => sum + session.exercises.length, 0);
  const done = week.sessions.reduce((sum, session) => sum + sessionDoneCount(session.id), 0);
  return total ? Math.round((done / total) * 100) : 0;
}

function trainingWeekScore() {
  const total = state.mesocycle.weeks.reduce((weekSum, week) => weekSum + week.sessions.reduce((sum, session) => sum + session.exercises.length, 0), 0);
  const done = state.mesocycle.weeks.reduce((weekSum, week) => weekSum + week.sessions.reduce((sum, session) => sum + sessionDoneCount(session.id), 0), 0);
  return total ? Math.round((done / total) * 100) : 0;
}

function denseTrainingWeekScore() {
  const days = rangeDays(addDays(selectedDate, -6), selectedDate);
  const activeDays = days.filter((day) => denseEntriesForDate(dateKey(day)).length > 0).length;
  return Math.round((activeDays / days.length) * 100);
}

function findSession(sessionId) {
  for (const week of state.mesocycle.weeks) {
    const session = week.sessions.find((item) => item.id === sessionId);
    if (session) return session;
  }
  return null;
}

function ex(id, name, sets, reps, load, rir, progression, cue) {
  return { id, name, sets, reps, load, rir, progression, cue };
}

function defaultNewHabit() {
  return {
    id: "new",
    name: "Nuevo hábito",
    detail: "",
    icon: "circle",
    color: "#68d66f",
    stat: "mind",
    tolerance: 70,
    target: "",
    xp: 10,
    core: false,
    archived: false,
  };
}

function cleanAccidentalFormUrl() {
  if (!window.location.search) return;
  const params = new URLSearchParams(window.location.search);
  const looksLikeHabitSubmit = params.has("id") && params.has("name") && params.has("target");
  if (!looksLikeHabitSubmit) return;
  window.history.replaceState({}, "", window.location.pathname);
}

function getCurrentCycleWeek() {
  const day = today.getDate();
  return Math.min(3, Math.max(0, Math.floor((day - 1) / 7)));
}

function rangeDays(from, to) {
  const days = [];
  let cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return startOfDay(copy);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function daysBetween(from, to) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / 86400000);
}

function weekStart(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function trainingWeekDays(date) {
  const start = weekStart(date);
  return rangeDays(start, addDays(start, 6));
}

function sameWeek(a, b) {
  return dateKey(weekStart(a)) === dateKey(weekStart(b));
}

function trainingWeekIndex(date) {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.max(1, Math.ceil((daysBetween(yearStart, date) + ((yearStart.getDay() + 6) % 7) + 1) / 7));
}

function yearWeekStart(year, weekNumber) {
  const week = clamp(Math.round(weekNumber || 1), 1, 52);
  return addDays(weekStart(new Date(year, 0, 1)), (week - 1) * 7);
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function monthGridDays(date) {
  const start = monthStart(date);
  const mondayOffset = (start.getDay() + 6) % 7;
  return rangeDays(addDays(start, -mondayOffset), addDays(addDays(start, -mondayOffset), 41));
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function parseDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}-01`;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatWeekday(date) {
  return new Intl.DateTimeFormat("es", { weekday: "long" }).format(date);
}

function shortWeekday(date) {
  return new Intl.DateTimeFormat("es", { weekday: "short" }).format(date).replace(".", "");
}

function denseWeekdayLetter(date) {
  return ["M", "T", "W", "T", "F", "S", "S"][(date.getDay() + 6) % 7];
}

function formatMonthDay(date) {
  return new Intl.DateTimeFormat("es", { month: "short", day: "numeric" }).format(date);
}

function capitalize(value) {
  const text = String(value || "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatLogDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// "hace X" corto para el indicador de copia de seguridad
function denseRelativeTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "hace segundos";
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days === 1 ? "" : "s"}`;
}

// Estado de la última copia en la nube (la que sobrevive a perder el móvil).
function denseLastBackupText() {
  const at = state.settings?.lastCloudSyncAt;
  if (!cloudConfig.enabled || !cloudConfig.endpointUrl) return "Nube desactivada · solo copia local. Actívala para no depender del móvil.";
  if (!at) return "Sin copia en la nube todavía.";
  return `Última copia en la nube: ${denseRelativeTime(at)} · ${formatLogDate(at)}`;
}

function formatTimerSeconds(value) {
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${`${seconds % 60}`.padStart(2, "0")}`;
}

function pct(value, total) {
  if (!total) return 0;
  return clamp(Math.round((value / total) * 100), 0, 100);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function slugify(value) {
  const slug = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let candidate = slug || `habit-${Date.now()}`;
  let index = 2;
  while (state.habits.some((habit) => habit.id === candidate)) {
    candidate = `${slug}-${index}`;
    index += 1;
  }
  return candidate;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
