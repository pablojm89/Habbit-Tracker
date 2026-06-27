#!/usr/bin/env node

const FAMILY_ALPHA = {
  strict_pull: 0.15,
  strict_dip: 0.14,
  weighted_calisthenics_reps: 0.16,
  pushup: 0.12,
  hspu: 0.16,
  core: 0.13,
  nordic: 0.16,
  bodyweight_leg: 0.10,
  unilateral_leg: 0.12,
  barbell: 0.10,
  olympic: 0.14,
  accessory: 0.11,
  banded: 0.10,
  plyometric: 0.16,
  conditioning: 0.08,
};

const EFFORT_FACTOR = {
  2: 1.12,
  3: 1.08,
  5: 1.00,
  7: 0.97,
  9: 0.93,
};

const EFFORT_WEIGHT = {
  2: 0.7,
  3: 0.7,
  5: 1.0,
  7: 1.1,
  9: 0.8,
};

function parseScheme(scheme, totalReps) {
  const ladder = String(scheme).match(/^(\d+)D(\d+(?:-\d+)+)$/);
  if (ladder) {
    const minutes = Number(ladder[1]);
    const cycle = ladder[2].split("-").map(Number);
    const fullCycles = Math.floor(minutes / cycle.length);
    const remainder = minutes % cycle.length;
    const reps = fullCycles * cycle.reduce((a, b) => a + b, 0)
      + cycle.slice(0, remainder).reduce((a, b) => a + b, 0);
    return { minutes, rpm: reps / minutes, totalReps: reps };
  }

  const xdy = String(scheme).match(/^(\d+)D(\d+)$/);
  if (xdy) {
    const minutes = Number(xdy[1]);
    const rpm = Number(xdy[2]);
    return { minutes, rpm, totalReps: minutes * rpm };
  }

  const xd = String(scheme).match(/^(\d+)D$/);
  if (xd && totalReps != null) {
    const minutes = Number(xd[1]);
    const rpm = Number(totalReps) / minutes;
    return { minutes, rpm, totalReps: Number(totalReps) };
  }

  throw new Error(`Unsupported scheme: ${scheme}`);
}

function effortFactor(effort) {
  return EFFORT_FACTOR[effort] ?? 1.0;
}

function effortWeight(effort) {
  return EFFORT_WEIGHT[effort] ?? 1.0;
}

function recencyWeight(date) {
  if (!date) return 1.0;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return 1.0;
  const days = Math.max(0, (Date.now() - d.getTime()) / 86400000);
  if (days <= 14) return 1.0;
  if (days <= 30) return 0.85;
  if (days <= 60) return 0.70;
  if (days <= 90) return 0.55;
  return 0.40;
}

function specificityWeight(sourceMinutes, targetMinutes) {
  const raw = 1 / (1 + Math.abs(Math.log(targetMinutes / sourceMinutes)));
  return raw * raw;
}

function roundDense(rpm) {
  const floor = Math.floor(rpm);
  const decimal = rpm - floor;
  if (rpm < 1) return `${rpm.toFixed(1)}`;
  if (decimal < 0.30) return `${floor}`;
  if (decimal < 0.70) return `${floor}-${floor + 1}`;
  return `${floor + 1}`;
}

function estimate(observations, alpha, targetMinutes) {
  let numerator = 0;
  let denominator = 0;

  for (const obs of observations) {
    const parsed = parseScheme(obs.scheme, obs.totalReps);
    const adjustedRpm = parsed.rpm * effortFactor(obs.effort);
    const capacity = adjustedRpm * Math.pow(parsed.minutes, alpha);
    const weight = effortWeight(obs.effort)
      * recencyWeight(obs.date)
      * specificityWeight(parsed.minutes, targetMinutes);

    numerator += capacity * weight;
    denominator += weight;
  }

  const predictedCapacity = numerator / denominator;
  const rpm = predictedCapacity / Math.pow(targetMinutes, alpha);
  return {
    minutes: targetMinutes,
    rpm,
    scheme: `${targetMinutes}D${roundDense(rpm)}`,
    reps: rpm * targetMinutes,
  };
}

function parseObs(raw) {
  const parts = raw.split(":");
  const scheme = parts[0];
  const effort = parts.find((part) => /^e\d+$/.test(part));
  const date = parts.find((part) => /^\d{4}-\d{2}-\d{2}$/.test(part));
  const repsPart = parts.find((part) => /^r\d+(\.\d+)?$/.test(part));
  return {
    scheme,
    effort: effort ? Number(effort.slice(1)) : null,
    date: date || null,
    totalReps: repsPart ? Number(repsPart.slice(1)) : null,
  };
}

function usage() {
  console.log(`Usage:
  node denseclub_estimator.js --family strict_pull --obs 10D7:e5:2026-06-01 --obs 2D15:e7:2026-06-04
  node denseclub_estimator.js --alpha 0.15 --obs 10D7:e5 --obs 2D15:e7

Families:
  ${Object.keys(FAMILY_ALPHA).join(", ")}

Observation format:
  SCHEME[:eEFFORT][:YYYY-MM-DD][:rTOTAL_REPS]

Examples:
  10D7:e5
  2D15:e7:2026-06-04
  2D:e5:r30
`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.length === 0) {
    usage();
    return;
  }

  let family = "strict_pull";
  let alpha = null;
  const observations = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--family") {
      family = args[++i];
    } else if (arg === "--alpha") {
      alpha = Number(args[++i]);
    } else if (arg === "--obs") {
      observations.push(parseObs(args[++i]));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!observations.length) throw new Error("At least one --obs is required.");
  const usedAlpha = alpha ?? FAMILY_ALPHA[family];
  if (!Number.isFinite(usedAlpha)) throw new Error(`Unknown family: ${family}`);

  console.log(`family=${family} alpha=${usedAlpha}`);
  console.log("observations:");
  for (const obs of observations) {
    const p = parseScheme(obs.scheme, obs.totalReps);
    console.log(`  ${obs.scheme} rpm=${p.rpm.toFixed(2)} reps=${p.totalReps.toFixed(0)} effort=${obs.effort ?? "-"} date=${obs.date ?? "-"}`);
  }

  console.log("\nestimates:");
  for (const target of [2, 3, 5, 10, 20]) {
    const out = estimate(observations, usedAlpha, target);
    const safe = roundDense(out.rpm * 0.93);
    const based = roundDense(out.rpm);
    const aggressive = roundDense(out.rpm * 1.07);
    console.log(`  ${target}D: rpm=${out.rpm.toFixed(2)} reps=${Math.round(out.reps)} scheme=${out.scheme} safe=${target}D${safe} based=${target}D${based} aggressive=${target}D${aggressive}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
