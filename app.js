const STORE_KEY = "habbit-tracker-v2";
const OLD_STORE_KEY = "habbit-tracker-v1";
const CLOUD_CONFIG_KEY = "bittracker-cloud-sync-config-v1";
const DEFAULT_CLOUD_ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbxbs5_ucjo9cf_iSsxYEEfXl75m8gUvb5EbyRh86cwWbdaMXAa7h4Bkr4OG6NBqlzjJ/exec";
const DEFAULT_CLOUD_SYNC_TOKEN = "bt_2026_mi_token_largo_cambialo";
const today = startOfDay(new Date());
let cloudConfig = loadCloudConfig();
let cloudSyncTimer = null;
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

const bodyweightSchemes = ["2D", "5D", "10D", "20D"];
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

const trainingAnalyticsTabs = [
  ["progress", "Progreso", "trending-up"],
  ["volume", "Volumen", "bar-chart-3"],
  ["strength", "Fuerza", "trophy"],
  ["conditioning", "Conditioning", "zap"],
  ["recovery", "Recovery", "heart-pulse"],
  ["balance", "Balance", "scale"],
  ["consistency", "Consistency", "calendar-check"],
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
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 100,
    tonnageFactor: 1,
    alpha: 0.15,
    icon: "arrow-up-to-line",
  },
  {
    id: "weighted_pull_up",
    name: "Dominadas con lastre",
    category: "pull",
    family: "strict_pull",
    nature: "weighted_calisthenics",
    allowedNatures: ["weighted_calisthenics", "bodyweight"],
    bodyweightContributionPct: 100,
    tonnageFactor: 1,
    alpha: 0.16,
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
    icon: "circle-dot",
  },
  {
    id: "weighted_ring_dip",
    name: "Dips en anillas con lastre",
    category: "push",
    family: "strict_dip",
    nature: "weighted_calisthenics",
    allowedNatures: ["weighted_calisthenics", "bodyweight"],
    bodyweightContributionPct: 95,
    tonnageFactor: 1,
    alpha: 0.14,
    icon: "circle-dot",
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
    icon: "circle",
  },
  {
    id: "ring_row",
    name: "Remo horizontal en anillas",
    category: "pull",
    family: "horizontal_pull",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "banded"],
    bodyweightContributionPct: 70,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "move-horizontal",
  },
  {
    id: "floor_push_up",
    name: "Flexiones en suelo",
    category: "push",
    family: "pushup",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 64,
    tonnageFactor: 1,
    alpha: 0.12,
    icon: "move-down",
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
    tonnageFactor: 0.7,
    alpha: 0.11,
    icon: "activity",
  },
  {
    id: "bridge_isometric",
    name: "Bridge Isometrico",
    category: "mobility",
    family: "bridge",
    nature: "skill",
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 55,
    tonnageFactor: 0.7,
    alpha: 0.1,
    icon: "activity",
  },
  {
    id: "bridge_walkover",
    name: "Bridge Walkover",
    category: "skills",
    family: "bridge",
    nature: "skill",
    allowedNatures: ["skill", "bodyweight"],
    bodyweightContributionPct: 65,
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
    tonnageFactor: 1,
    alpha: 0.16,
    icon: "arrow-up",
  },
  {
    id: "full_rom_hspu",
    name: "HSPU full ROM",
    category: "skills",
    family: "hspu",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics", "skill"],
    bodyweightContributionPct: 95,
    tonnageFactor: 1,
    alpha: 0.17,
    icon: "arrow-up-from-line",
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
    tonnageFactor: 0.9,
    alpha: 0.13,
    icon: "footprints",
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
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "move-down",
  },
  {
    id: "deficit_push_up",
    name: "Flexiones con déficit",
    category: "push",
    family: "pushup",
    nature: "bodyweight",
    allowedNatures: ["bodyweight", "weighted_calisthenics"],
    bodyweightContributionPct: 68,
    tonnageFactor: 1,
    alpha: 0.13,
    icon: "move-down",
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
    icon: "circle-dot",
  },
  {
    id: "weighted_parallel_bar_dip",
    name: "Dips en paralelas con lastre",
    category: "push",
    family: "parallel_dip",
    nature: "weighted_calisthenics",
    allowedNatures: ["weighted_calisthenics", "bodyweight"],
    bodyweightContributionPct: 90,
    tonnageFactor: 1,
    alpha: 0.15,
    icon: "circle-dot",
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
    icon: "footprints",
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
    id: "weighted_atg_split_squat",
    name: "ATG Split Squat con peso",
    category: "legs",
    family: "atg_split_squat",
    nature: "weighted_calisthenics",
    allowedNatures: ["weighted_calisthenics", "bodyweight"],
    bodyweightContributionPct: 80,
    tonnageFactor: 1,
    repsPerSide: true,
    alpha: 0.13,
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
    tonnageFactor: 1,
    alpha: 0.17,
    icon: "grip-horizontal",
    video: "https://www.youtube.com/watch?v=5NuxVKK5PVk",
  },
  ...leverSkillExercises("front_lever", "Front Lever", 88),
  ...leverSkillExercises("back_lever", "Back Lever", 88),
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
let swipeGesture = null;

function closeAllSwipes(except) {
  document.querySelectorAll(".swipe-wrap.is-open").forEach((wrap) => {
    if (wrap === except) return;
    wrap.classList.remove("is-open");
    const card = wrap.querySelector(".today-workout-card");
    if (card) card.style.transform = "";
  });
}

function onSwipePointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const card = event.target.closest(".swipe-wrap > .today-workout-card");
  if (!card) {
    closeAllSwipes();
    return;
  }
  const wrap = card.parentElement;
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
}

function onSwipePointerMove(event) {
  if (!swipeGesture || event.pointerId !== swipeGesture.id) return;
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
}

function onSwipePointerUp(event) {
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
    gesture.card.style.transform = "translateX(-110%)";
    gesture.card.style.opacity = "0";
    const del = gesture.wrap.querySelector(".swipe-delete-bg");
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
nodes.openBackup.addEventListener("click", () => switchView("review"));

// Temporary: run the app as a training-only tool (habits/panel/review hidden).
// Flip to false to bring the habit tracker back.
const TRAINING_ONLY = true;

render();

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
  const activeMode = state.settings.trainingMode || "workout";
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
              <span class="failure-chip ${status[key] ? "is-done" : "is-pending"}">
                <i data-lucide="${status[key] ? "check" : "flame"}"></i>${label}
              </span>`,
          )
          .join("")}
      </div>
    </div>
  `;
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
  const tonnagePct = tonnageGoal ? Math.min(100, Math.round((volume / tonnageGoal) * 100)) : volume > 0 ? 100 : 0;
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
            <span class="workout-score"><strong>${scoreForDate(selectedDate)}</strong><small>EXR</small></span>
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
            <span class="workout-progress-label"><i data-lucide="${entries.length ? "weight" : planned.length ? "clipboard-list" : "calendar-plus"}"></i>Tonelaje · Day ${dayNumber}</span>
            <span class="workout-progress-time ${statusTone}">${tonnageLabel}</span>
          </div>
          <div class="progress-track"><i style="width:${tonnagePct}%"></i></div>
        </div>

        <div class="workout-metric-row">
          ${workoutSummaryMetric(totalReps || "-", "reps")}
          ${workoutSummaryMetric(roundTo(blocks, 1), "blocks")}
          ${workoutSummaryMetric(totalHold ? `${totalHold}s` : "-", "tut")}
        </div>

        ${renderWeeklyFailureCard(weekDayKeys, isCurrentWeek)}
      </section>

      ${entries.map((entry) => todayWorkoutCard(entry)).join("")}
      ${visiblePlanned.map((exercise) => plannedWorkoutCard(exercise)).join("")}
      ${addWorkoutCard()}
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

function renderDenseTraining() {
  nodes.denseTrainingPanel.innerHTML = "";
  return;
  const defaults = denseFormDefaults();
  const exercise = denseExerciseById(defaults.exerciseId);
  const isEditingDenseEntry = Boolean(state.settings.denseDraftEntryId);

  nodes.denseTrainingPanel.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">${isEditingDenseEntry ? "Editar marca" : "Registrar marca"}</p>
        <h2>${escapeHtml(exercise.name)}</h2>
        <span class="section-meta">${isEditingDenseEntry ? "Marca cargada con objetivo y resultado real separados." : "Elige esquema Dense y guarda sólo lo necesario para este ejercicio."}</span>
      </div>
      <span class="mini-tag is-green"><i data-lucide="${isEditingDenseEntry ? "edit-3" : "cloud"}"></i>${isEditingDenseEntry ? "editando" : cloudConfig.enabled ? "cloud ready" : "local"}</span>
    </div>
    ${denseTrainingFormMarkup(defaults, { includePicker: true, submitLabel: isEditingDenseEntry ? "Actualizar marca Dense" : "Guardar marca Dense" })}
    ${renderDenseProgressionSuggestion(exercise, denseProgressionSuggestion(exercise))}
    ${renderSelectedExerciseLog(exercise.id)}
  `;
  updateDenseHoldEstimate(nodes.denseTrainingPanel.querySelector("#denseTrainingForm"));
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

function denseTrainingFormMarkup(defaults, { includePicker = false, modal = false, submitLabel = "Guardar marca Dense" } = {}) {
  const exercise = denseExerciseById(defaults.exerciseId);
  const allowedSchemes = denseAllowedSchemes(exercise);
  const readiness = defaults.readiness || "normal";
  const suggestion = denseProgressionSuggestion(exercise, readiness);
  return `
    <form id="denseTrainingForm" class="dense-training-form ${modal ? "is-modal-form" : ""}">
      ${includePicker ? denseExercisePicker(defaults) : ""}
      ${modal ? denseSetModalSummary(exercise, defaults) : ""}
      ${renderDenseFatigueWarning(exercise, defaults)}
      ${denseReadinessField(readiness)}
      ${suggestion ? `<div class="dense-recommendation-wrap" data-recommendation>${renderDenseProgressionSuggestion(exercise, suggestion)}</div>` : ""}
      <div class="dense-form-grid">
        ${field("Peso corporal kg", "bodyweightKg", defaults.bodyweightKg, "number")}
        <input type="hidden" name="exerciseId" value="${escapeAttr(defaults.exerciseId)}" />
        <input type="hidden" name="nature" value="${escapeAttr(exercise.nature)}" />
        <fieldset class="scheme-picker-field is-full">
          <legend>${modal ? "Scheme completed" : "Esquema Dense"}</legend>
          <div class="scheme-option-grid">
            ${allowedSchemes.map((scheme) => denseSchemeOption(scheme, defaults.scheme)).join("")}
          </div>
        </fieldset>
        ${denseRepPerSetFields(exercise, defaults)}
        ${denseIsIsometric(exercise) ? "" : field("Reps totales", "totalReps", defaults.totalReps, "number")}
        ${denseHoldFields(exercise, defaults)}
        ${denseLoadFields(exercise, defaults)}
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
          <strong>${escapeHtml(denseNatureLabel(exercise.nature))}</strong>
          <span>${escapeHtml(denseExerciseHint(exercise))}</span>
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

function renderTrainingAnalytics() {
  if (!nodes.trainingAnalyticsPanel) return;
  const activeTab = state.settings.trainingAnalyticsTab || "progress";
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
      ${trainingAnalyticsTabs
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
  if (tab === "conditioning") return renderConditioningAnalytics(entries);
  if (tab === "recovery") return renderRecoveryAnalytics(entries);
  if (tab === "consistency") return renderConsistencyAnalytics(entries);
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
  const prs = densePrRows().filter((row) => entries.some((entry) => entry.exercise_name === row.exerciseName && entry.scheme === row.scheme));
  const last = [...entries].sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
  const effortAvg = average(entries.map((entry) => entry.effort_value).filter(Boolean));
  const density = average(entries.map((entry) => entry.reps_per_min).filter(Boolean));
  const recent = entries.slice(-6).reverse();
  return `
    <div class="analytics-stat-grid">
      ${analyticsStatCard("Marcas", entries.length, "Entradas reales", "clipboard-check")}
      ${analyticsStatCard("PRs vivos", prs.length, "Ejercicio + esquema", "trophy")}
      ${analyticsStatCard("Esfuerzo medio", effortAvg ? roundTo(effortAvg, 1) : "-", "1 fácil · 10 límite", "gauge")}
      ${analyticsStatCard("Densidad media", density ? `${roundTo(density, 1)} rpm` : "-", "Reps/min cuando aplica", "timer")}
    </div>
    <div class="analytics-card-grid">
      <article class="analytics-card">
        <div class="section-subhead"><strong>Última señal</strong><span>${escapeHtml(last.date)}</span></div>
        <div class="analytics-highlight">
          <strong>${escapeHtml(last.exercise_name)}</strong>
          <span>${escapeHtml(last.scheme)} · ${escapeHtml(denseEntryValue(last))}</span>
        </div>
      </article>
      <article class="analytics-card">
        <div class="section-subhead"><strong>Historial reciente</strong><span>${recent.length} marcas</span></div>
        <div class="mini-timeline">
          ${recent.map((entry) => `<span title="${escapeAttr(entry.exercise_name)}">${escapeHtml(entry.scheme)}</span>`).join("")}
        </div>
      </article>
    </div>
    <div class="analytics-detail-list">
      ${analyticsDetailRow("Personal records", `${prs.length}`, "tap to view", "trophy")}
      ${analyticsDetailRow("Effort - easier than before", effortImprovementCount(entries), "mismo o más pesado, menos esfuerzo", "zap")}
      ${analyticsDetailRow("Level-ups", denseLevelUpCount(entries), "nueva mejor señal por ejercicio/esquema", "badge-check")}
    </div>
  `;
}

function renderVolumeAnalytics(entries) {
  const patternRows = densePatternRows(entries).slice(0, 8);
  const maxSets = Math.max(...patternRows.map((row) => row.sets), 1);
  const totalSets = entries.reduce((sum, entry) => sum + denseEquivalentSets(entry), 0);
  const totalReps = entries.reduce((sum, entry) => sum + (entry.total_reps || 0), 0);
  const tonnage = entries.reduce((sum, entry) => sum + (entry.tonnage_kg || 0), 0);
  return `
    <div class="analytics-stat-grid">
      ${analyticsStatCard("Sets eq", roundTo(totalSets, 1), "Minutos/bloques Dense", "blocks")}
      ${analyticsStatCard("Reps", totalReps, "Repeticiones registradas", "repeat-2")}
      ${analyticsStatCard("Tonnage", tonnage ? `${roundTo(tonnage / 1000, 1)}t` : "-", "Carga efectiva estimada", "warehouse")}
      ${analyticsStatCard("Ejercicios", new Set(entries.map((entry) => entry.exercise_id)).size, "Variantes usadas", "dumbbell")}
    </div>
    ${analyticsTrendChart("tonelaje · últimos 7 días", roundTo(tonnage / 1000, 1), denseDailyTrend((entry) => (entry.tonnage_kg || 0) / 1000, 7), "t")}
    ${analyticsTrendChart("bloques · últimos 7 días", roundTo(totalSets, 1), denseDailyTrend((entry) => denseEquivalentSets(entry), 7), "")}
    <div class="analytics-card">
      <div class="section-subhead"><strong>Volumen por patrón</strong><span>sets equivalentes</span></div>
      <div class="analytics-bars">
        ${patternRows.map((row) => analyticsBar(patternLabel(row.pattern), row.sets, maxSets, `${roundTo(row.reps, 0)} reps · ${roundTo(row.tonnage / 1000, 1)}t`)).join("")}
      </div>
    </div>
  `;
}

function renderStrengthAnalytics(entries) {
  const weighted = entries.filter((entry) => entry.e1rm_kg);
  const best = [...weighted].sort((a, b) => (b.e1rm_kg || 0) - (a.e1rm_kg || 0)).slice(0, 5);
  const relativeBest = [...entries].filter((entry) => entry.relative_strength).sort((a, b) => (b.relative_strength || 0) - (a.relative_strength || 0))[0];
  const bodyweightBest = [...entries].filter((entry) => entry.bodyweight_capacity).sort((a, b) => (b.bodyweight_capacity || 0) - (a.bodyweight_capacity || 0))[0];
  return `
    <div class="analytics-stat-grid">
      ${analyticsStatCard("e1RM top", best[0] ? formatKg(best[0].e1rm_kg) : "-", best[0] ? best[0].exercise_name : "Sin cargas", "badge-check")}
      ${analyticsStatCard("Relativo top", relativeBest ? `${relativeBest.relative_strength}x` : "-", relativeBest ? relativeBest.exercise_name : "BW + lastre", "scale")}
      ${analyticsStatCard("Capacidad BW", bodyweightBest ? bodyweightBest.bodyweight_capacity : "-", bodyweightBest ? bodyweightBest.exercise_name : "Reps/min", "activity")}
      ${analyticsStatCard("Cargas", weighted.length, "Entradas con e1RM", "dumbbell")}
    </div>
    <div class="analytics-card">
      <div class="section-subhead"><strong>Personal records</strong><span>carga estimada</span></div>
      <div class="compact-pr-list">
        ${
          best.length
            ? best.map((entry) => `<div><span>${escapeHtml(entry.exercise_name)}</span><strong>${formatKg(entry.e1rm_kg)}</strong><small>${escapeHtml(entry.scheme)} · ${escapeHtml(entry.date)}</small></div>`).join("")
            : `<p class="tiny-copy">Registra un ejercicio con carga o lastre para ver tus e1RM y fuerza relativa.</p>`
        }
      </div>
    </div>
  `;
}

function renderConditioningAnalytics(entries) {
  const conditioning = entries.filter((entry) => entry.nature === "conditioning" || entry.movement_pattern === "conditioning");
  const timed = entries.filter((entry) => entry.total_hold_seconds || entry.duration_minutes);
  const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
  const cnsLoad = entries.reduce((sum, entry) => sum + denseEquivalentSets(entry) * (entry.effort_value || 5), 0);
  const recent = (conditioning.length ? conditioning : timed).slice(-5).reverse();
  const loadByDay = denseLoadByDay(entries);
  const maxLoad = Math.max(...loadByDay.map((row) => row.load), 1);
  return `
    <div class="analytics-stat-grid">
      ${analyticsStatCard("Cond sessions", conditioning.length, "Entradas marcadas como conditioning", "timer")}
      ${analyticsStatCard("Dense minutes", totalMinutes, "Minutos registrados", "clock-3")}
      ${analyticsStatCard("CNS load", roundTo(cnsLoad, 1), "sets eq x esfuerzo", "activity")}
      ${analyticsStatCard("TUT", `${Math.round(entries.reduce((sum, entry) => sum + (entry.total_hold_seconds || 0), 0))}s`, "isométricos y holds", "pause-circle")}
    </div>
    <div class="analytics-card-grid">
      <article class="analytics-card">
        <div class="section-subhead"><strong>Conditioning volume</strong><span>últimas señales</span></div>
        ${
          recent.length
            ? `<div class="analytics-detail-list is-in-card">
                ${recent.map((entry) => analyticsDetailRow(entry.exercise_name, entry.scheme, denseEntryValue(entry), "activity")).join("")}
              </div>`
            : `<div class="analytics-empty is-compact"><i data-lucide="zap"></i><strong>Sin conditioning todavía</strong><span>Cuando registres carries, sprints, saltos o circuitos aparecerán aquí.</span></div>`
        }
      </article>
      <article class="analytics-card">
        <div class="section-subhead"><strong>CNS load</strong><span>últimos días</span></div>
        <div class="recovery-sparkline">
          ${loadByDay.map((row) => `<span style="height:${Math.max(8, pct(row.load, maxLoad))}%" title="${escapeAttr(`${row.date}: ${roundTo(row.load, 1)}`)}"></span>`).join("")}
        </div>
      </article>
    </div>
  `;
}

function renderRecoveryAnalytics(entries) {
  const hardSets = entries.filter((entry) => (entry.effort_value || 0) >= 7).reduce((sum, entry) => sum + denseEquivalentSets(entry), 0);
  const easySets = entries.filter((entry) => (entry.effort_value || 0) <= 3).reduce((sum, entry) => sum + denseEquivalentSets(entry), 0);
  const failed = entries.filter((entry) => entry.failed).length;
  const fatigueAvg = average(entries.map((entry) => Number(entry.session_fatigue || 0)).filter(Boolean));
  const harderThanExpected = entries.filter((entry) => entry.expected_comparison === "harder").length;
  const loadByDay = denseLoadByDay(entries);
  const maxLoad = Math.max(...loadByDay.map((row) => row.load), 1);
  const recoveryScore = clamp(Math.round(100 - hardSets * 2.2 - failed * 6 - harderThanExpected * 4 - fatigueAvg * 1.8 + easySets * 0.8), 0, 100);
  const bodyweightRows = bodyweightTrendRows(14);
  return `
    <div class="analytics-stat-grid">
      ${analyticsStatCard("Recovery", `${recoveryScore}/100`, recoveryScore >= 70 ? "Ligero" : recoveryScore >= 45 ? "Moderado" : "Cuidado", "heart-pulse")}
      ${analyticsStatCard("Sets duros", roundTo(hardSets, 1), "H/VH/fallo", "flame")}
      ${analyticsStatCard("Fallos", failed, "No llegaste al objetivo", "triangle-alert")}
      ${analyticsStatCard("Fatiga", fatigueAvg ? `${roundTo(fatigueAvg, 1)}/10` : "-", `${harderThanExpected} harder than expected`, "gauge")}
    </div>
    <div class="analytics-card">
      <div class="section-subhead"><strong>Carga diaria</strong><span>sets x esfuerzo</span></div>
      <div class="recovery-sparkline">
        ${loadByDay.map((row) => `<span style="height:${Math.max(8, pct(row.load, maxLoad))}%" title="${escapeAttr(`${row.date}: ${roundTo(row.load, 1)}`)}"></span>`).join("")}
      </div>
    </div>
    <div class="analytics-card-grid">
      <article class="analytics-card">
        <div class="section-subhead"><strong>Recovery thresholds</strong><span>global estimado</span></div>
        <div class="threshold-grid">
          ${thresholdCard("Elite", 25, recoveryScore >= 75)}
          ${thresholdCard("Build", 60, recoveryScore >= 45 && recoveryScore < 75)}
          ${thresholdCard("Overload", 90, recoveryScore < 45)}
        </div>
      </article>
      <article class="analytics-card">
        <div class="section-subhead"><strong>Bodyweight trend</strong><span>${bodyweightRows.length ? `${bodyweightRows.length} registros` : "sin peso diario"}</span></div>
        ${
          bodyweightRows.length
            ? `<div class="bodyweight-trend">${bodyweightRows.map((row) => `<span style="height:${Math.max(8, pct(row.value - row.min + 1, row.range))}%" title="${escapeAttr(`${row.date}: ${row.value}kg`)}"></span>`).join("")}</div>`
            : `<p class="tiny-copy">Registra peso corporal para comparar fuerza relativa y recuperación.</p>`
        }
      </article>
    </div>
    <div class="analytics-detail-list">
      ${analyticsDetailRow("Post-session feedback", entries.filter((entry) => entry.session_fatigue).length, "sesiones con feedback guardado", "message-square-text", recoveryFeedbackDetails(entries))}
      ${analyticsDetailRow("Harder than expected", harderThanExpected, "sesiones por encima de lo previsto", "triangle-alert")}
      ${analyticsDetailRow("Easy work", roundTo(easySets, 1), "sets VE/E que suman recuperación activa", "leaf")}
    </div>
  `;
}

function renderBalanceAnalytics(entries) {
  const patternMap = densePatternMap(entries);
  const rows = densePatternRows(entries).slice(0, 10);
  const maxSets = Math.max(...rows.map((row) => row.sets), 1);
  // Upper vs lower body, by category (skills, core and mobility excluded)
  const catSets = {};
  entries.forEach((entry) => {
    const category = denseExerciseById(entry.exercise_id)?.category || "other";
    catSets[category] = (catSets[category] || 0) + denseEquivalentSets(entry);
  });
  const upperSets = (catSets.push || 0) + (catSets.pull || 0);
  const lowerSets = catSets.legs || 0;
  return `
    <article class="analytics-card balance-upper-lower">
      <div class="section-subhead"><strong>Tren superior / inferior</strong><span>sets equivalentes</span></div>
      <div class="ratio-list">
        ${ratioRow("Superior / Inferior", upperSets, lowerSets, "superior", "inferior", "0.8-1.6")}
      </div>
    </article>
    <div class="balance-layout">
      <article class="analytics-card">
        <div class="section-subhead"><strong>Set balance</strong><span>patrones principales</span></div>
        <div class="analytics-bars">
          ${rows.map((row) => analyticsBar(patternLabel(row.pattern), row.sets, maxSets, `${roundTo(row.reps, 0)} reps`)).join("")}
        </div>
      </article>
      <article class="analytics-card">
        <div class="section-subhead"><strong>Ratios actuales</strong><span>objetivo aproximado</span></div>
        <div class="ratio-list">
          ${ratioRow("Push / Pull", patternMap.push?.sets, patternMap.pull?.sets, "push", "pull", "0.8-1.2")}
          ${ratioRow("Vertical push / Vertical pull", patternMap.vertical_push?.sets, patternMap.vertical_pull?.sets, "v push", "v pull", "0.7-1.1")}
          ${ratioRow("Horizontal push / Horizontal pull", patternMap.horizontal_push?.sets, patternMap.horizontal_pull?.sets, "h push", "h pull", "0.8-1.2")}
          ${ratioRow("Squat / Hinge", patternMap.squat?.sets, patternMap.hinge?.sets, "squat", "hinge", "0.8-1.3")}
          ${ratioRow("Pierna unilateral / Squat", patternMap.unilateral_leg?.sets, patternMap.squat?.sets, "unilat", "squat", "0.25-0.6")}
        </div>
      </article>
    </div>
    <div class="analytics-detail-list">
      ${balanceDetailRow("Push-Pull Balance", patternMap.push?.sets, patternMap.pull?.sets, "Close-Grip Bench Press / Pull-ups")}
      ${balanceDetailRow("Squat-Deadlift Balance", patternMap.squat?.sets, patternMap.hinge?.sets, "Back Squat / Deadlift")}
      ${balanceDetailRow("Biceps-Triceps Balance", patternMap.pull?.sets, patternMap.push?.sets, "Curl / Extension proxy")}
      ${balanceDetailRow("Movement Pattern Balance", rows.length, 10, "patrones cubiertos")}
    </div>
  `;
}

function renderConsistencyAnalytics(entries) {
  const days = consistencyDays(28);
  const activeDays = days.filter((day) => day.entries.length).length;
  const currentStreak = trainingCurrentStreak(days);
  const completion = Math.round((activeDays / days.length) * 100);
  const skipped = denseExerciseLibrary({ sort: "abandoned" }).slice(0, 5);
  const weekdayRows = weekdayCompletionRows(entries);
  const maxWeekday = Math.max(...weekdayRows.map((row) => row.count), 1);
  return `
    <div class="analytics-stat-grid">
      ${analyticsStatCard("Training heatmap", `${completion}%`, `${activeDays}/${days.length} días con marcas`, "calendar-days")}
      ${analyticsStatCard("Current streak", currentStreak, "días seguidos", "flame")}
      ${analyticsStatCard("Most logged", mostLoggedExerciseName(entries), "ejercicio más repetido", "repeat-2")}
      ${analyticsStatCard("Skipped", skipped.length, "ejercicios sin tocar hace más", "circle-dashed")}
    </div>
    <div class="analytics-card">
      <div class="section-subhead"><strong>Training heatmap</strong><span>últimos 28 días</span></div>
      <div class="training-heatmap">
        ${days.map((day) => `<span class="${day.entries.length ? "is-on" : ""}" title="${escapeAttr(`${day.key}: ${day.entries.length} marcas`)}">${day.label}</span>`).join("")}
      </div>
    </div>
    <div class="analytics-card-grid">
      <article class="analytics-card">
        <div class="section-subhead"><strong>Most-skipped exercises</strong><span>para rotar mejor</span></div>
        <div class="analytics-detail-list is-in-card">
          ${skipped.map((exercise) => analyticsDetailRow(exercise.name, denseCategoryLabel(exercise.category), denseExerciseStats(exercise.id).count ? "retomar pronto" : "sin marcas", "corner-down-right")).join("")}
        </div>
      </article>
      <article class="analytics-card">
        <div class="section-subhead"><strong>Completion by day</strong><span>densidad semanal</span></div>
        <div class="weekday-completion">
          ${weekdayRows.map((row) => analyticsBar(row.label, row.count, maxWeekday, `${row.count} marcas`)).join("")}
        </div>
      </article>
    </div>
  `;
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
    <div class="dense-pr-layout">
      <div class="dense-pr-table">
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
          <strong>${latest ? escapeHtml(latest.exercise_name) : "Estimador"}</strong>
          <span>${latest ? `${escapeHtml(latest.scheme)} · ${escapeHtml(latest.nature)}` : "sin entrada base"}</span>
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
        <p class="tiny-copy">Pega aqui la URL del Web App de Apps Script. La app enviara cada cambio como snapshot y tablas normalizadas.</p>
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
          </div>
          <p class="tiny-copy" id="cloudSyncStatus">${escapeHtml(cloudSyncStatus.text)}</p>
        </form>
      </article>
    </div>
  `;
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
  if (action === "add-planned-exercise") addPlannedExerciseToSelectedDate(target.dataset.exercise);
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
  if (action === "factory-reset") factoryReset();
}

function handleChange(event) {
  if (event.target.matches("#importFile")) importJson(event.target.files?.[0]);
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
  const suggestion = denseProgressionSuggestion(exercise);
  const scheme = suggestion?.scheme || densePlannedScheme(exercise);
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

function openDenseTrainingModal({ exerciseId = "", entryId = "" } = {}) {
  const entry = entryId ? getDenseEntries().find((item) => item.id === entryId) : null;
  const exercise = entry ? denseExerciseById(entry.exercise_id) : denseExerciseById(exerciseId || state.settings.denseSelectedExerciseId || "pull_up");
  if (!exercise) return;

  state.settings.denseSelectedExerciseId = exercise.id;
  if (entry) state.settings.denseDraftEntryId = entry.id;
  else delete state.settings.denseDraftEntryId;

  const defaults = denseFormDefaults();
  const editing = Boolean(entry);
  nodes.modalCard.dataset.modalKind = "dense-set";
  nodes.modalEyebrow.textContent = editing ? "Editing set" : "New set";
  nodes.modalTitle.textContent = exercise.name;
  nodes.modalBody.innerHTML = `
    <div class="dense-set-modal-shell">
      ${denseTrainingFormMarkup(defaults, {
        includePicker: !entry && !exerciseId,
        modal: true,
        submitLabel: editing ? "Update set" : "Save set",
      })}
    </div>
  `;
  openModal();
  updateDenseHoldEstimate(nodes.modalBody.querySelector("#denseTrainingForm"));
}

function openWorkoutExercisePickerModal() {
  nodes.modalCard.dataset.modalKind = "workout-exercise-picker";
  nodes.modalEyebrow.textContent = "Programar";
  nodes.modalTitle.textContent = "Elegir ejercicio";
  nodes.modalBody.innerHTML = `
    <div class="workout-exercise-picker-modal">
      <p class="tiny-copy">Añade un ejercicio al día. Luego aparecerá como tarjeta programada para rellenarlo cuando entrenes.</p>
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
        <label class="field">
          <span>Grupo</span>
          <select data-action-input="dense-exercise-category">
            ${denseExerciseCategories.map(([value, label]) => `<option value="${value}" ${category === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
        <label class="field exercise-search-field">
          <span>Buscar</span>
          <input data-action-input="dense-exercise-search" type="search" value="${escapeAttr(search)}" placeholder="front lever, dominadas, hspu..." />
        </label>
        <label class="field">
          <span>Orden</span>
          <select data-action-input="dense-exercise-sort">
            ${denseExerciseSortOptions.map(([value, label]) => `<option value="${value}" ${sort === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
      </div>
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

function addPlannedExerciseToSelectedDate(exerciseId) {
  const exercise = findDenseExerciseById(exerciseId);
  if (!exercise) {
    toast("Ejercicio no válido");
    return;
  }
  const key = dateKey(selectedDate);
  state.denseDayPlans ||= {};
  const plan = state.denseDayPlans[key] || [];
  state.denseDayPlans[key] = [...plan, exercise.id];
  state.settings.denseSelectedExerciseId = exercise.id;
  closeModal();
  saveAndRender(`${exercise.name} añadido`);
}

function openDenseDeleteConfirm(entryId) {
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
  const key = dateKey(selectedDate);
  const exercise = findDenseExerciseById(state.denseDayPlans?.[key]?.[planIndex]);
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
      ${
        predictionCards
          ? `<section class="exercise-detail-section">
              <div class="section-subhead"><strong>Objetivo por densidad</strong><span>según tu capacidad</span></div>
              <div class="dense-estimate-grid">${predictionCards}</div>
            </section>`
          : ""
      }
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
      <section class="exercise-detail-levels">
        <strong>Strength levels</strong>
        ${denseExerciseLevels(exercise, best).map((item) => `<div><span>${escapeHtml(item.label)}</span><b>${escapeHtml(item.value)}</b></div>`).join("")}
      </section>
      <div class="modal-actions">
        <button class="text-button" type="button" data-action="open-dense-exercise-modal" data-exercise="${escapeAttr(exercise.id)}"><i data-lucide="plus"></i>Registrar</button>
      </div>
    </div>
  `;
  openModal();
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

function denseExerciseLevels(exercise, best) {
  const base = best?.total_reps || best?.total_hold_seconds || Math.max(1, denseDefaultTotalReps(exercise, denseAllowedSchemes(exercise)[0]) || 1);
  const unit = best?.total_hold_seconds ? "s" : "reps";
  return [
    { label: "Lv 1 Base", value: `${Math.max(1, Math.round(base * 0.7))} ${unit}` },
    { label: "Lv 2 Solid", value: `${Math.max(1, Math.round(base))} ${unit}` },
    { label: "Lv 3 Strong", value: `${Math.max(1, Math.round(base * 1.2))} ${unit}` },
    { label: "Lv 4 Elite", value: `${Math.max(1, Math.round(base * 1.45))} ${unit}` },
  ];
}

function saveDenseTrainingForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const exercise = findDenseExerciseById(data.exerciseId);
  if (!exercise) {
    toast("Ejercicio Dense no válido");
    return;
  }

  const bodyweightKg = positiveNumber(data.bodyweightKg);
  const weightPerDumbbellKg = positiveNumber(data.weightPerDumbbellKg);
  const externalLoadFromPair = exercise.loadPattern === "dumbbell_pair" && weightPerDumbbellKg ? weightPerDumbbellKg * 2 : 0;
  const isometric = denseIsIsometric(exercise);
  const scheme = data.scheme || (exercise.nature === "bodyweight" || isometric ? "10D" : "10D5");
  const durationMinutes = denseSchemeMinutes(scheme) || 0;
  const targetRepsPerMin = isometric ? 0 : positiveNumber(data.repsPerSet) || denseSchemePrescriptionAverage(scheme) || 0;
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
    date: data.date || dateKey(selectedDate),
    created_at: existingEntry?.created_at || now,
    updated_at: now,
    exercise_id: exercise.id,
    exercise_name: exercise.name,
    exercise_family_id: exercise.family,
    family: exercise.family,
    variant_id: exercise.id,
    nature: exercise.nature,
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
  delete state.settings.denseDraftEntryId;
  const savedFromModal = nodes.modal.open && nodes.modalBody.contains(form);
  form.reset();
  if (savedFromModal) closeModal();
  saveAndRender(existingIndex >= 0 ? "Marca Dense actualizada" : "Marca Dense guardada");
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
  if (index >= 0) state.denseExerciseFavorites.splice(index, 1);
  else state.denseExerciseFavorites.push(exerciseId);
  saveState();
  renderDenseTraining();
  refreshIcons();
  toast(index >= 0 ? "Favorito quitado" : "Favorito guardado");
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

function saveAndRender(message) {
  saveState();
  render();
  if (message) toast(message);
}

function saveState() {
  state.settings.selectedDate = dateKey(selectedDate);
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  scheduleCloudSync("auto");
}

function loadCloudConfig() {
  const defaults = { enabled: true, endpointUrl: DEFAULT_CLOUD_ENDPOINT_URL, token: DEFAULT_CLOUD_SYNC_TOKEN };
  try {
    const saved = JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY));
    const savedComplete = Boolean(saved?.endpointUrl && saved?.token);
    return saved
      ? {
          ...defaults,
          ...saved,
          enabled: savedComplete ? saved.enabled ?? true : true,
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
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => syncCloudState(reason), 900);
}

async function syncCloudState(reason = "manual") {
  if (!cloudConfig.endpointUrl) {
    cloudSyncStatus = { state: "error", text: "Falta endpoint de Cloud." };
    updateCloudSyncStatus();
    toast("Falta endpoint Cloud");
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
  const node = document.querySelector("#cloudSyncStatus");
  if (node) node.textContent = cloudSyncStatus.text;
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
        <span class="tiny-icon" style="--item-color:${denseCategoryColor(exercise.category)}"><i data-lucide="${exercise.icon || "dumbbell"}"></i></span>
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
function applyDenseFormTargets(form) {
  if (!form) return;
  const exercise = denseExerciseById(form.querySelector("[name='exerciseId']")?.value);
  if (!exercise) return;
  const scheme = form.querySelector("input[name='scheme']:checked")?.value || denseAllowedSchemes(exercise)[0];
  const readiness = denseFormReadiness(form);
  const suggestion = denseProgressionSuggestion(exercise, readiness);
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
  const rec = form.querySelector("[data-recommendation]");
  if (rec && suggestion) {
    rec.innerHTML = renderDenseProgressionSuggestion(exercise, suggestion);
    if (window.lucide?.createIcons) window.lucide.createIcons({ nameAttr: "data-lucide" });
  }
  updateDenseHoldEstimate(form);
}

function updateDenseSchemeSelection(input) {
  const form = input.closest("#denseTrainingForm");
  if (!form) return;
  form.querySelectorAll(".scheme-option").forEach((option) => option.classList.toggle("is-selected", option.contains(input)));
  applyDenseFormTargets(form);
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

function denseRepPerSetFields(exercise, defaults) {
  if (!denseUsesRepsPerSet(exercise)) return "";
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
  return "";
}

function denseExerciseHint(exercise) {
  if (exercise.loadPattern === "dumbbell_pair") return "Guarda el peso por mancuerna; BitTracker calcula el total externo.";
  if (exercise.nature === "weighted_calisthenics") return "Guarda el lastre; BitTracker suma tu peso corporal para la carga total del sistema.";
  if (exercise.nature === "weighted") return "Guarda la carga externa usada en el esquema elegido.";
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
    return `<span class="set-main-metric">${escapeHtml(`${scheme}${perRound || ""}`)} <span class="set-paren">(${entry.total_hold_seconds}s TUT)</span></span>`;
  }
  const rpm = Math.round(Number(entry.reps_per_min || entry.reps_per_set || 0));
  const code = rpm ? `${scheme}${rpm}` : scheme;
  return `<span class="set-main-metric">${escapeHtml(code)} <span class="set-paren">(${entry.total_reps || 0} reps)</span></span>`;
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

function todayWorkoutCard(entry) {
  const exercise = denseExerciseById(entry.exercise_id);
  const volume = entry.tonnage_kg ? `${roundTo(entry.tonnage_kg / 1000, 1)}t` : entry.total_reps ? `${entry.total_reps} reps` : entry.total_hold_seconds ? `${entry.total_hold_seconds}s` : "-";
  const card = `
    <article class="today-workout-card workout-set-card is-complete" style="--item-color:${denseCategoryColor(exercise.category)}" data-action="open-dense-exercise-detail" data-exercise="${escapeAttr(entry.exercise_id)}">
      <div class="workout-set-main">
        <div class="workout-set-tags">
          <span class="mini-tag is-amber"><i data-lucide="trophy"></i>${denseEntryIsPr(entry) ? "NEW PR" : "DONE"}</span>
          <span class="mini-tag is-blue">${escapeHtml(denseNatureLabel(entry.nature).split("·")[0].trim())}</span>
        </div>
        <strong>${escapeHtml(entry.exercise_name)} <small>${escapeHtml(entry.scheme)}</small></strong>
        <span class="workout-set-summary">${denseEntrySummaryLine(entry)} ${denseEffortBadge(entry.effort)}</span>
      </div>
      <div class="workout-set-volume">
        <span>Volume</span>
        <strong>${escapeHtml(volume)}</strong>
      </div>
      <div class="workout-set-actions">
        <button class="icon-button" type="button" data-action="open-dense-entry-modal" data-entry="${escapeAttr(entry.id)}" title="Editar" aria-label="Editar ${escapeAttr(entry.exercise_name)}">
          <i data-lucide="edit-3"></i>
        </button>
      </div>
    </article>
  `;
  return swipeDeleteWrap(card, `data-action="delete-dense-entry" data-entry="${escapeAttr(entry.id)}"`, entry.exercise_name);
}

function denseEntryIsPr(entry) {
  const score = denseEntryScore(entry);
  if (!score) return false;
  return !getDenseEntries().some((item) => item.id !== entry.id && item.exercise_id === entry.exercise_id && item.scheme === entry.scheme && denseEntryScore(item) > score);
}

function densePlannedScheme(exercise) {
  const allowed = denseAllowedSchemes(exercise);
  const last = latestDenseEntryForExercise(exercise.id);
  if (last && allowed.includes(last.scheme)) return last.scheme;
  return allowed[0] || (denseIsIsometric(exercise) || exercise.nature === "bodyweight" ? "10D" : "10D5");
}

function densePlannedTargetValue(exercise, scheme) {
  if (denseIsIsometric(exercise)) {
    const seconds = denseDefaultHoldPerRound(exercise, scheme);
    return seconds ? `${seconds}s/ronda` : "-";
  }
  if (denseUsesRepsPerSet(exercise)) {
    const reps = denseDefaultRepsPerSet(exercise, scheme);
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
  const schemeLabel = rpm ? `${last.scheme}${rpm}` : last.scheme;
  return `Última ${escapeHtml(schemeLabel)} (${last.total_reps || 0} reps) · ${escapeHtml(effort)}`;
}

function plannedWorkoutCard(exercise) {
  const canDelete = exercise.plannedSource === "custom";
  const scheme = densePlannedScheme(exercise);
  const target = densePlannedTargetValue(exercise, scheme);
  const card = `
    <article class="today-workout-card workout-set-card is-planned" style="--item-color:${denseCategoryColor(exercise.category)}" data-action="open-dense-exercise-detail" data-exercise="${escapeAttr(exercise.id)}">
      <div class="workout-set-main">
        <div class="workout-set-tags">
          <span class="mini-tag is-blue">${escapeHtml(denseNatureLabel(exercise.nature).split("·")[0].trim())}</span>
        </div>
        <strong>${escapeHtml(exercise.name)} <small>${escapeHtml(scheme)}</small></strong>
        <span>${denseLastSessionSummary(exercise, scheme)}</span>
      </div>
      <div class="workout-set-volume">
        <span>Target</span>
        <strong>${escapeHtml(target)}</strong>
        <small>${escapeHtml(scheme)}</small>
      </div>
      <div class="workout-set-actions">
        <button class="icon-button is-hot" type="button" data-action="open-dense-exercise-modal" data-exercise="${escapeAttr(exercise.id)}" title="Completar" aria-label="Completar ${escapeAttr(exercise.name)}">
          <i data-lucide="square-check"></i>
        </button>
        <button class="icon-button is-play" type="button" data-action="start-exercise-timer" data-exercise="${escapeAttr(exercise.id)}" title="Iniciar cronómetro" aria-label="Iniciar cronómetro ${escapeAttr(exercise.name)}">
          <i data-lucide="play"></i>
        </button>
      </div>
    </article>
  `;
  if (!canDelete) return card;
  return swipeDeleteWrap(card, `data-action="delete-planned-exercise" data-plan-index="${exercise.planIndex}"`, exercise.name);
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
  const key = dateKey(day);
  // Mesocycle auto-programming is hidden for now: only manual day plans are shown.
  return (state.denseDayPlans?.[key] || [])
    .map((id, index) => {
      const exercise = findDenseExerciseById(id);
      return exercise ? { ...exercise, plannedSource: "custom", planIndex: index } : null;
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
  return denseExerciseCatalog.find((exercise) => exercise.id === id) || denseExerciseCatalog[0];
}

function findDenseExerciseById(id) {
  return denseExerciseCatalog.find((exercise) => exercise.id === id) || null;
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
  if (exercise.nature === "weighted") {
    if (exercise.loadPattern === "dumbbell_pair") return ["2D5", "2D10", "5D3", "5D5", "5D10", "10D3", "10D5", "10D10", "20D3", "20D5"];
    return ["2D5", "2D10", "5D3", "5D5", "10D3", "10D5", "20D3", "20D5"];
  }
  if (exercise.nature === "weighted_calisthenics") {
    return ["2D5", "5D1", "5D3", "5D5", "10D1", "10D3", "10D5", "10D1-2-3", "20D1", "20D3", "20D5"];
  }
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
  let raw;
  if (exercise.nature === "weighted" || exercise.nature === "weighted_calisthenics") {
    raw = denseSchemePrescriptionAverage(scheme) || Math.max(1, Math.round(denseDefaultRpm(exercise, denseSchemeBase(scheme))));
  } else {
    const latestSameScheme = [...getDenseEntries()]
      .filter((entry) => entry.exercise_id === exercise.id && entry.scheme === scheme && entry.total_reps)
      .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
    if (latestSameScheme) {
      const target = Number(latestSameScheme.target_reps_per_min || latestSameScheme.reps_per_set || 0);
      raw = target > 0 ? target : Math.max(1, Math.round(Number(latestSameScheme.total_reps) / minutes));
    } else {
      const estimate = state.denseEstimates?.[exercise.id]?.bodyweight_capacity;
      const multiplier = bodyweightMultipliers[denseSchemeBase(scheme)];
      raw = estimate && multiplier ? Math.max(1, Math.floor(estimate * multiplier)) : Math.max(1, Math.round(denseDefaultRpm(exercise, denseSchemeBase(scheme))));
    }
  }
  return Math.max(1, Math.round(denseCapRpm(exercise, raw)));
}

// Suggested hold seconds per round for an isometric, scaled by density (more rest = longer holds)
function denseDefaultHoldPerRound(exercise, scheme) {
  const multiplier = bodyweightMultipliers[denseSchemeBase(scheme)];
  if (!multiplier) return "";
  const isoCapacity = state.denseEstimates?.[exercise.id]?.isometric_capacity;
  if (isoCapacity) return Math.max(1, Math.floor(isoCapacity * multiplier));
  const minutes = denseSchemeMinutes(scheme) || 1;
  const latestIso = [...getDenseEntries()]
    .filter((entry) => entry.exercise_id === exercise.id && entry.isometric_capacity)
    .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
  if (latestIso?.isometric_capacity) return Math.max(1, Math.floor(latestIso.isometric_capacity * multiplier));
  const latestSameScheme = [...getDenseEntries()]
    .filter((entry) => entry.exercise_id === exercise.id && entry.scheme === scheme && (entry.hold_seconds_per_round || entry.total_hold_seconds))
    .sort((a, b) => (b.created_at || b.date || "").localeCompare(a.created_at || a.date || ""))[0];
  if (latestSameScheme) return Math.max(1, Math.round(Number(latestSameScheme.hold_seconds_per_round) || Number(latestSameScheme.total_hold_seconds) / minutes));
  // No history yet: seed a sensible starter hold so fresh isometrics (e.g. a new
  // cuelgue) aren't left empty. Scaled by density like a modest capacity of ~38s.
  if (denseIsIsometric(exercise)) return Math.max(1, Math.floor(38 * multiplier));
  return "";
}

// Best proven capacity for an exercise: the max across the smoothed estimate and
// every logged entry. Same source the "Objetivo por densidad" table uses so the
// form and the analytics agree.
function denseBestCapacity(exerciseId, key) {
  const estimate = Number(state.denseEstimates?.[exerciseId]?.[key]) || 0;
  const fromEntries = getDenseEntries()
    .filter((item) => item.exercise_id === exerciseId)
    .map((item) => Number(item[key]) || 0);
  return Math.max(estimate, ...fromEntries, 0);
}

// Deterministic per-scheme reps/min target for the log form. Keeps the value
// stable when the user toggles schemes: the suggested scheme restores the
// progression proposal exactly; other schemes derive from best proven capacity.
function denseFormTargetRepsPerSet(exercise, scheme, suggestion) {
  if (suggestion && suggestion.type === "reps" && suggestion.scheme === scheme && suggestion.repsPerSet) {
    return suggestion.repsPerSet;
  }
  const capacity = denseBestCapacity(exercise.id, "bodyweight_capacity");
  const multiplier = bodyweightMultipliers[denseSchemeBase(scheme)];
  if (capacity && multiplier) return Math.max(1, Math.round(denseCapRpm(exercise, Math.floor(capacity * multiplier))));
  return denseDefaultRepsPerSet(exercise, scheme);
}

// Same idea for isometric hold seconds per round.
function denseFormTargetHoldPerRound(exercise, scheme, suggestion) {
  if (suggestion && suggestion.type === "hold" && suggestion.scheme === scheme && suggestion.holdSecondsPerRound) {
    return suggestion.holdSecondsPerRound;
  }
  const capacity = denseBestCapacity(exercise.id, "isometric_capacity");
  const multiplier = bodyweightMultipliers[denseSchemeBase(scheme)];
  if (capacity && multiplier) return Math.max(1, Math.floor(capacity * multiplier));
  return denseDefaultHoldPerRound(exercise, scheme);
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
    reduction: (denseEffortReduction[denseEntryEffortCode(o.entry)] || 0) * (denseFatigueRecency[o.daysAgo] || 0),
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

function denseProgressionSuggestion(exercise, readiness = "normal") {
  const entry = latestDenseEntryForExercise(exercise.id);
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
    return {
      ...base,
      type: "hold",
      holdSecondsPerRound,
      totalHoldSeconds: holdSecondsPerRound * (base.rounds || minutes || 1),
      title: `${scheme} · ${holdSecondsPerRound}s hold/ronda`,
      reason: denseProgressionReason(entry, direction, readiness),
    };
  }

  if (exercise.nature === "weighted" || exercise.nature === "weighted_calisthenics") {
    const loadKey = exercise.loadPattern === "dumbbell_pair" ? "weight_per_dumbbell_kg" : exercise.nature === "weighted_calisthenics" ? "added_load_kg" : "external_load_kg";
    const currentLoad = Number(entry[loadKey] || entry.external_load_kg || entry.added_load_kg || entry.weight_per_dumbbell_kg || 0);
    const pctPerStep = 0.025;
    const factor = failed || effort === "fallo" ? 0.95 : 1 + step * pctPerStep;
    const nextLoad = denseRoundLoad(currentLoad * factor) || currentLoad;
    return {
      ...base,
      type: "load",
      repsPerSet: entry.target_reps_per_min || entry.reps_per_set || denseSchemePrescriptionAverage(scheme) || "",
      totalReps: entry.target_total_reps || entry.total_reps || "",
      externalLoadKg: loadKey === "external_load_kg" ? nextLoad : entry.external_load_kg || "",
      addedLoadKg: loadKey === "added_load_kg" ? nextLoad : entry.added_load_kg || "",
      weightPerDumbbellKg: loadKey === "weight_per_dumbbell_kg" ? nextLoad : entry.weight_per_dumbbell_kg || "",
      title: `${scheme} · ${loadKey === "added_load_kg" ? "+" : ""}${formatKg(nextLoad)}`,
      reason: denseProgressionReason(entry, direction, readiness),
    };
  }

  const currentTarget = Number(entry.target_reps_per_min || entry.reps_per_set || (minutes ? entry.total_reps / minutes : 0)) || denseDefaultRepsPerSet(exercise, scheme) || 1;
  const actualRpm = Number(entry.reps_per_min || (minutes ? entry.total_reps / minutes : 0)) || currentTarget;
  const delta = failed || effort === "fallo" ? Math.min(-1, Math.floor(actualRpm) - currentTarget) : step;
  const repsPerSet = Math.max(1, Math.round(denseCapRpm(exercise, currentTarget + delta)));
  return {
    ...base,
    type: "reps",
    repsPerSet,
    totalReps: denseTotalFromRepsPerSet(repsPerSet, scheme),
    title: `${scheme}${repsPerSet} · ${denseTotalFromRepsPerSet(repsPerSet, scheme)} reps`,
    reason: denseProgressionReason(entry, direction, readiness),
  };
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
  return ["bodyweight", "weighted", "weighted_calisthenics"].includes(exercise.nature);
}

function denseIsIsometric(exercise) {
  return Boolean(exercise && exercise.isometric);
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
  const factor = { "2D": 1.25, "5D": 1, "10D": 0.75, "20D": 0.6 }[base] || 1;
  return categoryBase * factor;
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

  if (["strict_pull", "weighted_pull_up"].includes(family) || id.includes("pull_up")) patterns.add("vertical_pull");
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
      readiness: draftEntry.readiness || "normal",
      notes: draftEntry.notes || "",
    };
  }
  const exercise = denseExerciseById(selectedId || latest?.exercise_id || "pull_up");
  const latestForExercise = latestDenseEntryForExercise(exercise.id);
  const suggestion = denseProgressionSuggestion(exercise);
  const referenceEntry = selectedId ? latestForExercise : latest;
  const shouldUseLatest = Boolean(referenceEntry);
  const allowedSchemes = denseAllowedSchemes(exercise);
  const preferredScheme = suggestion?.scheme || (shouldUseLatest && referenceEntry?.scheme ? referenceEntry.scheme : exercise.nature === "weighted" || exercise.nature === "weighted_calisthenics" ? "10D5" : "10D");
  const scheme = allowedSchemes.includes(preferredScheme) ? preferredScheme : allowedSchemes[0];
  const repsPerSet = suggestion?.repsPerSet || denseDefaultRepsPerSet(exercise, scheme);
  return {
    date: dateKey(selectedDate),
    bodyweightKg: latestKnownBodyweight(dateKey(selectedDate)) || 80,
    exerciseId: exercise.id,
    nature: shouldUseLatest && referenceEntry?.nature ? referenceEntry.nature : exercise.nature,
    scheme,
    repsPerSet,
    totalReps: suggestion?.totalReps || (repsPerSet ? denseTotalFromRepsPerSet(repsPerSet, scheme) : denseDefaultTotalReps(exercise, scheme)),
    holdSecondsPerRound: suggestion?.holdSecondsPerRound || (shouldUseLatest && referenceEntry?.hold_seconds_per_round ? referenceEntry.hold_seconds_per_round : ""),
    rounds: suggestion?.rounds || (shouldUseLatest && referenceEntry?.rounds ? referenceEntry.rounds : denseSchemeMinutes(scheme) || ""),
    effort: "N",
    externalLoadKg: suggestion?.externalLoadKg || "",
    addedLoadKg: suggestion?.addedLoadKg || "",
    weightPerDumbbellKg: suggestion?.weightPerDumbbellKg || "",
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
  const multiplier = bodyweightMultipliers[base] || 0;

  let totalSystemLoad = raw.nature === "weighted_calisthenics" ? bw + added : load;
  if (raw.nature === "bodyweight" || raw.nature === "banded" || raw.nature === "plyometrics" || raw.nature === "conditioning") {
    totalSystemLoad = 0;
  }

  const e1rmKg = workingPct && totalSystemLoad ? totalSystemLoad / workingPct : 0;
  const relativeStrength = bw && totalSystemLoad ? totalSystemLoad / bw : 0;
  const visibleAddedLoad = raw.nature === "weighted_calisthenics" && bw ? totalSystemLoad - bw : 0;
  const capacity = repsPerMin && multiplier ? repsPerMin / multiplier : 0;
  const isometricCapacity = holdSecondsPerMin && multiplier ? holdSecondsPerMin / multiplier : 0;
  const effectiveLoad =
    raw.nature === "weighted_calisthenics"
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
  const metrics = [];
  if (entry.total_hold_seconds) metrics.push(`${entry.total_hold_seconds}s TUT`);
  if (entry.hold_seconds_per_round) metrics.push(`${entry.hold_seconds_per_round}s/ronda`);
  if (entry.reps_per_min) metrics.push(`${entry.reps_per_min} rpm`);
  if (entry.e1rm_kg) metrics.push(`e1RM ${formatKg(entry.e1rm_kg)}`);
  if (entry.relative_strength) metrics.push(`${entry.relative_strength}x BW`);
  if (entry.tonnage_kg) metrics.push(`${Math.round(entry.tonnage_kg)} kg tonnage`);

  return `
    <article class="dense-entry-card">
      <div class="dense-entry-main">
        <span class="tiny-icon" style="--item-color:${denseNatureColor(entry.nature)}"><i data-lucide="${denseExerciseById(entry.exercise_id)?.icon || "dumbbell"}"></i></span>
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
    Math.max(
      estimate[key] || 0,
      entry[key] || 0,
      ...getDenseEntries().filter((item) => item.exercise_id === entry.exercise_id).map((item) => Number(item[key]) || 0),
    );
  if (entry.nature === "weighted" || entry.nature === "weighted_calisthenics") {
    const e1rm = bestMetric("e1rm_kg");
    if (!e1rm) return "";
    const bw = entry.bodyweight_kg || latestKnownBodyweight(entry.date) || 0;
    const targets = ["2D5", "5D3", "5D5", "10D3", "10D5", "10D1-2-3", "20D3", "20D5"];
    return targets
      .map((scheme) => {
        const totalLoad = e1rm * denseWorkingPct[scheme];
        const displayLoad =
          entry.nature === "weighted_calisthenics" && bw ? `${formatKg(Math.max(0, totalLoad - bw))} lastre` : formatKg(totalLoad);
        const sub = entry.nature === "weighted_calisthenics" && bw ? `${formatKg(totalLoad)} sistema` : `desde e1RM ${formatKg(e1rm)}`;
        return `
          <article class="dense-estimate-card">
            <span>${scheme}</span>
            <strong>${displayLoad}</strong>
            <small>${sub}</small>
          </article>
        `;
      })
      .join("");
  }

  const capacity = bestMetric("bodyweight_capacity");
  const isoCapacity = bestMetric("isometric_capacity");
  if (isoCapacity) {
    return bodyweightSchemes
      .map((scheme) => {
        const minutes = denseSchemeMinutes(scheme);
        const secondsPerMin = Math.floor(isoCapacity * bodyweightMultipliers[scheme]);
        return `
          <article class="dense-estimate-card">
            <span>${scheme}</span>
            <strong>${secondsPerMin}s/min</strong>
            <small>${secondsPerMin * minutes}s TUT estimado</small>
          </article>
        `;
      })
      .join("");
  }
  if (!capacity) return "";
  return bodyweightSchemes
    .map((scheme) => {
      const minutes = denseSchemeMinutes(scheme);
      const rpm = Math.max(1, Math.round(denseCapRpm(exercise, Math.floor(capacity * bodyweightMultipliers[scheme]))));
      return `
        <article class="dense-estimate-card">
          <span>${scheme}</span>
          <strong>${rpm} rpm${perSide ? "/lado" : ""}</strong>
          <small>${rpm * minutes}${perSide ? " reps/lado" : " reps totales"}</small>
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
  if (entry.reps_per_min) {
    const targetRpm = Number(entry.target_reps_per_min || entry.reps_per_set || 0);
    const targetTotal = Number(entry.target_total_reps || 0);
    const total = Number(entry.total_reps || 0);
    if (targetRpm && targetTotal && total && total !== targetTotal) {
      return `objetivo ${entry.scheme}${targetRpm} · ${total}/${targetTotal} reps · ${entry.reps_per_min} rpm real`;
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
