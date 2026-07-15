#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const XMU_ENDPOINT = "https://jw.xmu.edu.cn/gsapp/sys/wdkbapp/wdkcb/queryXspkjg.do";
const TIME_ZONE = "Asia/Shanghai";
const term = process.env.XMU_TERM || "20253";
const week = String(process.env.XMU_WEEK || "1");
const studentId = process.env.XMU_STUDENT_ID || "";
const cookie = process.env.XMU_COOKIE || "";
const publicPath = sanitizePath(process.env.PUBLIC_PATH || "");
const requireCookie = process.env.REQUIRE_XMU_COOKIE === "1";
const outDir = path.join("docs", publicPath);
const outFile = path.join(outDir, "schedule.json");
const termsDir = path.join(outDir, "terms");
const termFile = path.join(termsDir, term, "schedule.json");
const termsIndexFile = path.join(termsDir, "index.json");

function sanitizePath(value) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, ""))
    .filter(Boolean)
    .join("/");
}

function first(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function weekdayName(value) {
  const n = toInt(value, 0);
  return {
    0: "周日",
    1: "周一",
    2: "周二",
    3: "周三",
    4: "周四",
    5: "周五",
    6: "周六",
    7: "周日"
  }[n] || "";
}

function normalizeTime(value) {
  const text = first(value);
  if (!text) return "";
  const colon = text.match(/(\d{1,2}):(\d{2})/);
  if (colon) return `${colon[1].padStart(2, "0")}:${colon[2]}`;
  const compact = text.match(/^(\d{1,2})(\d{2})$/);
  if (compact) return `${compact[1].padStart(2, "0")}:${compact[2]}`;
  return text;
}

function minutesOfDay(value) {
  const text = normalizeTime(value);
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 24 * 60 + 1;
  return Number(match[1]) * 60 + Number(match[2]);
}

function chinaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[byType.weekday] || 0;
  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    weekday,
    minutes: Number(byType.hour) * 60 + Number(byType.minute)
  };
}

function normalizeCourse(item) {
  const weekday = toInt(first(item.XQ, item.weekday), 0);
  const startSection = first(item.KSJCDM, item.KSJCMC, item.startSection);
  const endSection = first(item.JSJCDM, item.JSJCMC, item.endSection);
  const section = first(
    item.section,
    startSection && endSection ? `${startSection}-${endSection}` : startSection
  );

  return {
    name: first(item.KCMC, item.KCMCYW, item.name, item.course),
    className: first(item.BJMC, item.className),
    teacher: first(item.JSXM, item.JSYWM, item.teacher),
    room: first(item.JASMC, item.JASYWMC, item.room),
    campus: first(item.XQDM_DISPLAY, item.campus),
    weekday,
    weekdayName: first(item.XQ_DISPLAY, item.weekdayName, weekdayName(weekday)),
    start: normalizeTime(first(item.KSSJ, item.start)),
    end: normalizeTime(first(item.JSSJ, item.end)),
    section,
    weeks: first(item.ZCMC, item.weeks),
    note: first(item.KBBZ, item.BZ, item.note)
  };
}

function pickNext(today, courses, nowInfo) {
  const sortedToday = [...today].sort((a, b) => minutesOfDay(a.start) - minutesOfDay(b.start));
  const future = sortedToday.find((course) => minutesOfDay(course.start) >= nowInfo.minutes);
  const selected = future || sortedToday[0] || courses[0] || null;
  if (!selected) return null;
  return {
    name: selected.name,
    room: selected.room,
    start: selected.start,
    end: selected.end,
    weekdayName: selected.weekdayName
  };
}

function normalizePayload(raw, status = "ok") {
  const rawCourses = Array.isArray(raw.pkjgList)
    ? raw.pkjgList
    : Array.isArray(raw.courses)
      ? raw.courses
      : [];
  const courses = rawCourses.map(normalizeCourse).filter((course) => course.name);
  const nowInfo = chinaParts();
  const today = courses.filter((course) => course.weekday === nowInfo.weekday);

  return {
    schema: "xmu-desk-card/v1",
    status,
    // An authenticated, successfully parsed response may legitimately contain
    // no courses. Firmware requires this explicit acknowledgement before it
    // replaces a non-empty local cache with an empty list.
    allow_empty: status === "ok",
    source: "xmu-wdkbapp",
    term,
    week: toInt(week, 1),
    updatedAt: new Date().toISOString(),
    timeZone: TIME_ZONE,
    todayDate: nowInfo.date,
    courses,
    today,
    next: pickNext(today, courses, nowInfo)
  };
}

function sampleRawPayload() {
  return {
    pkjgList: [
      {
        KCMC: "电子设计与工艺实训A",
        BJMC: "03",
        JASMC: "新工科大楼303",
        XQ: "2",
        XQ_DISPLAY: "周二",
        KSSJ: "14:30",
        JSSJ: "17:05",
        KSJCDM: "5",
        JSJCDM: "7",
        ZCMC: "1-3周",
        KBBZ: "示例数据，等待 GitHub Actions 更新"
      }
    ]
  };
}

async function fetchXmuPayload() {
  const body = new URLSearchParams({ XNXQDM: term, XH: studentId, ZC: week });
  const response = await fetch(XMU_ENDPOINT, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      "Cookie": cookie,
      "Referer": process.env.XMU_REFERER || "https://jw.xmu.edu.cn/gsapp/sys/wdkbapp/*default/index.do#/xskcb"
    },
    body
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`XMU request failed: HTTP ${response.status}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("XMU response is not JSON. The login cookie may be expired.");
  }
}

async function loadPayload() {
  if (process.env.XMU_SIMPLIFIED_JSON) {
    return { raw: JSON.parse(process.env.XMU_SIMPLIFIED_JSON), status: "ok" };
  }
  if (process.env.XMU_RAW_JSON_FILE) {
    const text = await readFile(process.env.XMU_RAW_JSON_FILE, "utf8");
    return { raw: JSON.parse(text), status: "ok" };
  }
  if (cookie) {
    return { raw: await fetchXmuPayload(), status: "ok" };
  }
  if (requireCookie) {
    throw new Error("Missing XMU_COOKIE secret. Add it in GitHub Settings > Secrets and variables > Actions.");
  }
  return { raw: sampleRawPayload(), status: "demo" };
}

async function updateTermsIndex(output) {
  let previousTerms = [];
  try {
    const previous = JSON.parse(await readFile(termsIndexFile, "utf8"));
    if (Array.isArray(previous.terms)) previousTerms = previous.terms;
  } catch {
    // The index is created on the first successful update.
  }

  const entry = {
    term: output.term,
    updatedAt: output.updatedAt,
    courseCount: output.courses.length,
    url: `terms/${output.term}/schedule.json`
  };
  const terms = [entry, ...previousTerms.filter((item) => item?.term !== output.term)]
    .sort((left, right) => String(right.term).localeCompare(String(left.term)));
  const index = {
    schema: "xmu-desk-card/terms-v1",
    status: output.status,
    currentTerm: output.term,
    updatedAt: output.updatedAt,
    terms
  };
  await mkdir(termsDir, { recursive: true });
  await writeFile(termsIndexFile, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

const { raw, status } = await loadPayload();
const output = normalizePayload(raw, status);
await mkdir(outDir, { recursive: true });
await mkdir(path.dirname(termFile), { recursive: true });
const serialized = `${JSON.stringify(output, null, 2)}\n`;
await writeFile(outFile, serialized, "utf8");
await writeFile(termFile, serialized, "utf8");
await updateTermsIndex(output);

console.log(`Wrote ${outFile}`);
console.log(`Wrote ${termFile}`);
console.log(`Wrote ${termsIndexFile}`);
console.log(`status=${output.status} term=${output.term} week=${output.week} courses=${output.courses.length}`);
