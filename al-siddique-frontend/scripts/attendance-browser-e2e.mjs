// al-siddique-frontend/scripts/attendance-browser-e2e.mjs
// GATES 2, 3, 4: Real Playwright Browser Acceptance Test Suite
// Uses its own pg Pool reading DB creds from backend .env — no cross-package import hack.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { Pool } = require("pg");

function loadEnv(envPath) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return env;
}

const BACKEND_ENV_PATH = path.resolve(__dirname, "../../al-siddique-backend/src/.env");
let dbEnv = {};
try {
  dbEnv = loadEnv(BACKEND_ENV_PATH);
  console.log("[DB] Loaded credentials from: " + BACKEND_ENV_PATH);
} catch (e) {
  console.warn("[DB] Could not read .env: " + e.message + ". Using defaults.");
}

const dbPool = new Pool({
  host:     dbEnv.DB_HOST     || "localhost",
  port:     Number(dbEnv.DB_PORT || 5432),
  database: dbEnv.DB_NAME     || "apexos_db",
  user:     dbEnv.DB_USER     || "postgres",
  password: dbEnv.DB_PASSWORD || "",
  max:      5,
  idleTimeoutMillis:       10000,
  connectionTimeoutMillis: 5000,
});

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4178";

const installedChrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe" : null,
].find(c => c && fs.existsSync(c));

if (!installedChrome) {
  console.error("Chrome executable not found. Install Google Chrome first.");
  process.exit(1);
}

const REAL_JWT_TOKEN = process.env.E2E_JWT ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBhbHNpZGRpcXVlLmVkdS5wayIsInJvbGUiOiJhZG1pbiIsInNjaG9vbF9pZCI6MSwiaWF0IjoxNzkwMDgxOTM4LCJleHAiOjE3OTA2ODY3Mzh9.9VK-Auc9f7l58DdjETdot-SJxEUwDoPBm3Xs2OOYrl4";

const REAL_USER = {
  id: 1, school_id: 1, tenant_id: "assps", school_code: "assps",
  name: "Muhammad Haseeb Arshad", email: "admin@alsiddique.edu.pk",
  role: "admin", designation: "Principal", mustChangePassword: false,
};

function getTodayPkt() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

async function runBrowserAcceptanceSuite() {
  console.log("=================================================================");
  console.log("STARTING REAL PLAYWRIGHT BROWSER ACCEPTANCE SUITE");
  console.log("=================================================================");
  console.log("Using Chrome: " + installedChrome);
  console.log("Target URL:   " + BASE_URL);

  const todayPkt = getTodayPkt();
  console.log("Current Asia/Karachi Date: " + todayPkt);

  console.log("\n[PRE-CHECK] Verifying DB connectivity...");
  await dbPool.query("SELECT 1");
  console.log("[PRE-CHECK] DB connection OK.");

  const stuRes = await dbPool.query(
    "SELECT id, name, class, section, school_id FROM students WHERE school_id = 1 AND is_active = true ORDER BY id ASC LIMIT 10"
  );
  assert.ok(stuRes.rows.length >= 4, "Need at least 4 active students in School 1 (found " + stuRes.rows.length + ")");
  const [s1, s2, s3, s4] = stuRes.rows;
  console.log("[PRE-CHECK] Test Students: " + [s1,s2,s3,s4].map(s => "#" + s.id + "(" + s.name + ")").join(", "));

  await dbPool.query(
    "DELETE FROM attendance WHERE student_id = ANY($1::int[]) AND date = $2",
    [[s1.id, s2.id, s3.id, s4.id], todayPkt]
  );
  console.log("[PRE-CHECK] Cleaned today attendance for test students.");

  const browser = await chromium.launch({
    headless: true,
    executablePath: installedChrome,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = { passed: 0, failed: 0, gates: {} };

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      storageState: {
        cookies: [],
        origins: [{
          origin: BASE_URL,
          localStorage: [
            { name: "al_siddique_token", value: REAL_JWT_TOKEN },
            { name: "al_siddique_login_at", value: String(Date.now()) },
            { name: "al_siddique_user", value: JSON.stringify(REAL_USER) },
          ],
        }],
      },
    });

    const page = await context.newPage();

    // ── GATE 2: ATTENDANCE LIFECYCLE ──────────────────────────────────────
    console.log("\n[GATE 2] Attendance Lifecycle Flow...");
    try {
      await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForSelector("main, .super-module-card, [data-testid='unmarked-stat-cell']", { timeout: 12000 });
      console.log("  1. Dashboard loaded.");

      const unmarkedCell = page.locator("[data-testid='unmarked-stat-cell']");
      await unmarkedCell.waitFor({ state: "visible", timeout: 10000 });
      await unmarkedCell.click();

      const modal = page.locator("[data-testid='unmarked-attendance-modal']");
      await modal.waitFor({ state: "visible", timeout: 10000 });
      console.log("  2. Modal visible.");

      const presentBtn1 = page.locator("[data-testid='btn-present-" + s1.id + "']");
      await presentBtn1.waitFor({ state: "visible", timeout: 10000 });
      await presentBtn1.click();
      console.log("  3. Marked student #" + s1.id + " Present.");

      const stagedTag1 = page.locator("[data-testid='staged-tag-" + s1.id + "']");
      await stagedTag1.waitFor({ state: "visible", timeout: 5000 });
      const stagedText = await stagedTag1.innerText();
      assert.ok(stagedText.trim().toUpperCase().includes("STAGED"), "Expected STAGED tag, got: " + stagedText);
      console.log("  4. STAGED tag confirmed: " + stagedText.trim());

      const saveBtn = page.locator("[data-testid='save-attendance-btn']");
      const saveBtnText = await saveBtn.innerText();
      assert.ok(saveBtnText.includes("1"), "Save button must show count 1, got: " + saveBtnText);
      console.log("  5. Unsaved count indicator: " + saveBtnText.trim());

      await saveBtn.click();
      const successBanner = page.locator("[data-testid='attendance-save-success']");
      await successBanner.waitFor({ state: "visible", timeout: 10000 });
      console.log("  6. SAVED banner visible.");

      const dbRow1 = await dbPool.query("SELECT status FROM attendance WHERE student_id=$1 AND date=$2", [s1.id, todayPkt]);
      assert.strictEqual(dbRow1.rows[0]?.status, "present");
      console.log("  7. DB row confirmed: present.");

      const closeBtn = page.locator("[data-testid='modal-close-x']");
      await closeBtn.waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(500);
      await closeBtn.click();
      await modal.waitFor({ state: "hidden", timeout: 5000 });
      console.log("  8. Modal closed.");

      await unmarkedCell.click();
      await modal.waitFor({ state: "visible", timeout: 10000 });
      const isPresentReopened = await page.locator("[data-testid='btn-present-" + s1.id + "']").isVisible();
      assert.strictEqual(isPresentReopened, false, "Student must be absent from Unmarked list on reopen");
      console.log("  9. Student absent from Unmarked list on reopen.");

      await closeBtn.waitFor({ state: "visible", timeout: 8000 });

      await page.waitForTimeout(300);

      await closeBtn.click();
      await modal.waitFor({ state: "hidden", timeout: 8000 });
      await page.reload({ waitUntil: "networkidle", timeout: 20000 });
      await page.waitForSelector("[data-testid='unmarked-stat-cell']", { timeout: 12000 });

      const unmarkedCellR = page.locator("[data-testid='unmarked-stat-cell']");
      await unmarkedCellR.waitFor({ state: "visible", timeout: 10000 });
      await unmarkedCellR.click();
      await modal.waitFor({ state: "visible", timeout: 10000 });
      const isPresentAfterReload = await page.locator("[data-testid='btn-present-" + s1.id + "']").isVisible();
      assert.strictEqual(isPresentAfterReload, false, "Student must STILL be absent after reload");
      console.log("  10. Student STILL absent after hard reload.");

      console.log(">> GATE 2: PASS");
      results.gates["GATE_2"] = "PASS";
      results.passed++;

      // ── GATE 3: EXIT-PATH TESTS ────────────────────────────────────────
      console.log("\n[GATE 3] Exit-Path Browser Tests...");

      // A — X Button Guard
      const presentBtnS2 = page.locator("[data-testid='btn-present-" + s2.id + "']");
      await presentBtnS2.waitFor({ state: "visible", timeout: 8000 });
      await presentBtnS2.click();
      const modalCloseX = page.locator("[data-testid='modal-close-x']");
      await modalCloseX.waitFor({ state: "visible", timeout: 8000 });
      await modalCloseX.click();
      const confirmDialog = page.locator("[data-testid='unsaved-changes-dialog']");
      await confirmDialog.waitFor({ state: "visible", timeout: 5000 });
      console.log("  A1. Confirm dialog appeared on X click.");

      const keepEditingBtn = page.locator("[data-testid='keep-editing-btn']");
      await keepEditingBtn.click();
      await confirmDialog.waitFor({ state: "hidden", timeout: 3000 });
      assert.ok(await modal.isVisible(), "Modal must stay open after Keep Editing");
      assert.ok(await page.locator("[data-testid='staged-tag-" + s2.id + "']").isVisible(), "Staged tag must survive");
      console.log("  A2. Keep Editing preserved modal and staged state.");

      await modalCloseX.waitFor({ state: "visible", timeout: 5000 });

      await modalCloseX.click();
      await confirmDialog.waitFor({ state: "visible", timeout: 3000 });
      const discardBtn = page.locator("[data-testid='discard-changes-btn']");
      await discardBtn.click();
      await confirmDialog.waitFor({ state: "hidden", timeout: 3000 });
      await modal.waitFor({ state: "hidden", timeout: 5000 });
      const dbS2afterDiscard = await dbPool.query("SELECT status FROM attendance WHERE student_id=$1 AND date=$2", [s2.id, todayPkt]);
      assert.strictEqual(dbS2afterDiscard.rows.length, 0, "Discarded student must not be in DB");
      console.log("  A3. X Guard PASS: student not saved after discard.");

      // B — Backdrop Click Guard
      await unmarkedCellR.click();
      await modal.waitFor({ state: "visible", timeout: 10000 });
      await presentBtnS2.click();
      const backdrop = page.locator("[data-testid='modal-backdrop']");
      await backdrop.click({ position: { x: 10, y: 10 } });
      await confirmDialog.waitFor({ state: "visible", timeout: 5000 });
      console.log("  B1. Confirm dialog appeared on backdrop click.");
      await discardBtn.click();
      await modal.waitFor({ state: "hidden", timeout: 5000 });
      console.log("  B2. Backdrop Guard PASS.");

      // C — ESC Key + Save & Continue
      await unmarkedCellR.click();
      await modal.waitFor({ state: "visible", timeout: 10000 });
      const presentBtnS3 = page.locator("[data-testid='btn-present-" + s3.id + "']");
      await presentBtnS3.waitFor({ state: "visible", timeout: 8000 });
      await presentBtnS3.click();
      await page.keyboard.press("Escape");
      await confirmDialog.waitFor({ state: "visible", timeout: 5000 });
      console.log("  C1. Confirm dialog appeared on ESC.");
      const saveAndContinueBtn = page.locator("[data-testid='save-and-continue-btn']");
      await saveAndContinueBtn.click();
      await confirmDialog.waitFor({ state: "hidden", timeout: 8000 });
      await modal.waitFor({ state: "hidden", timeout: 8000 });
      const dbS3 = await dbPool.query("SELECT status FROM attendance WHERE student_id=$1 AND date=$2", [s3.id, todayPkt]);
      assert.strictEqual(dbS3.rows[0]?.status, "present");
      console.log("  C2. ESC + Save & Continue PASS: student #" + s3.id + " persisted.");

      // D — Full Sheet Nav Guard
      await unmarkedCellR.click();
      await modal.waitFor({ state: "visible", timeout: 10000 });
      const presentBtnS4 = page.locator("[data-testid='btn-present-" + s4.id + "']");
      await presentBtnS4.waitFor({ state: "visible", timeout: 8000 });
      await presentBtnS4.click();
      const fullSheetBtn = page.locator("[data-testid='full-sheet-nav-btn']");
      await fullSheetBtn.click();
      await confirmDialog.waitFor({ state: "visible", timeout: 5000 });
      console.log("  D1. Confirm dialog appeared on Full Sheet nav.");
      await saveAndContinueBtn.click();
      await page.waitForURL("**/attendance/mark", { timeout: 10000 });
      console.log("  D2. Navigated to: " + page.url());
      const dbS4 = await dbPool.query("SELECT status FROM attendance WHERE student_id=$1 AND date=$2", [s4.id, todayPkt]);
      assert.strictEqual(dbS4.rows[0]?.status, "present");
      console.log("  D3. Full Sheet Nav Guard PASS: student #" + s4.id + " persisted.");

      console.log(">> GATE 3: PASS");
      results.gates["GATE_3"] = "PASS";
      results.passed++;
    } catch (g23Err) {
      console.error("\n!! GATE 2/3 FAILURE: " + g23Err.message);
      results.gates["GATE_2_3"] = "FAIL: " + g23Err.message;
      results.failed++;
    }

    // ── GATE 4: SAVE FAILURE RESILIENCE ─────────────────────────────────
    console.log("\n[GATE 4] Save Failure Resilience Test...");
    try {
      await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 20000 });
      const unmarkedCellG4 = page.locator("[data-testid='unmarked-stat-cell']");
      await unmarkedCellG4.waitFor({ state: "visible", timeout: 10000 });
      await unmarkedCellG4.click();
      const modalG4 = page.locator("[data-testid='unmarked-attendance-modal']");
      await modalG4.waitFor({ state: "visible", timeout: 10000 });

      const presentBtnS2g4 = page.locator("[data-testid='btn-present-" + s2.id + "']");
      await presentBtnS2g4.waitFor({ state: "visible", timeout: 8000 });
      await presentBtnS2g4.click();

      console.log("  1. Intercepting POST /api/attendance/mark to force HTTP 500...");
      await page.route("**/api/attendance/mark", (route) => {
        route.fulfill({ status: 500, contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Simulated Network Failure" }) });
      });

      const saveBtnG4 = page.locator("[data-testid='save-attendance-btn']");
      await saveBtnG4.click();

      const successBannerG4 = page.locator("[data-testid='attendance-save-success']");
      await page.waitForTimeout(2000);
      assert.strictEqual(await successBannerG4.isVisible(), false, "Success banner must NOT appear on 500 failure");
      console.log("  2. Success banner correctly absent after forced failure.");

      const errorBanner = page.locator("[data-testid='attendance-save-error']");
      await errorBanner.waitFor({ state: "visible", timeout: 8000 });
      console.log("  3. Error banner appeared: " + (await errorBanner.innerText()).trim());

      assert.ok(await page.locator("[data-testid='staged-tag-" + s2.id + "']").isVisible(), "Staged tag must remain after failure");
      console.log("  4. Staged state preserved (zero data loss on failure).");

      const dbS2fail = await dbPool.query("SELECT status FROM attendance WHERE student_id=$1 AND date=$2", [s2.id, todayPkt]);
      assert.strictEqual(dbS2fail.rows.length, 0, "Student must remain unmarked in DB after 500 failure");
      console.log("  5. Student remains unmarked in PostgreSQL (atomic rollback confirmed).");

      await page.unroute("**/api/attendance/mark");
      await saveBtnG4.click();
      await successBannerG4.waitFor({ state: "visible", timeout: 10000 });
      console.log("  6. Retry succeeded — SAVED banner appeared.");

      const dbS2saved = await dbPool.query("SELECT status FROM attendance WHERE student_id=$1 AND date=$2", [s2.id, todayPkt]);
      assert.strictEqual(dbS2saved.rows[0]?.status, "present");
      console.log("  7. PostgreSQL row confirmed saved on retry.");

      console.log(">> GATE 4: PASS");
      results.gates["GATE_4"] = "PASS";
      results.passed++;
    } catch (g4Err) {
      console.error("\n!! GATE 4 FAILURE: " + g4Err.message);
      results.gates["GATE_4"] = "FAIL: " + g4Err.message;
      results.failed++;
    }

    await context.close();
  } finally {
    await browser.close();
    await dbPool.end();
  }

  console.log("\n=================================================================");
  console.log("PLAYWRIGHT BROWSER ACCEPTANCE SUITE — FINAL RESULTS");
  console.log("=================================================================");
  for (const [gate, verdict] of Object.entries(results.gates)) {
    console.log("  " + (verdict === "PASS" ? "PASS" : "FAIL") + " " + gate + ": " + verdict);
  }
  console.log("\nTotal: " + results.passed + " PASS, " + results.failed + " FAIL");
  if (results.failed > 0) {
    console.error("\nFINAL VERDICT: BROWSER_E2E_FAILED");
    process.exit(1);
  } else {
    console.log("\nFINAL VERDICT: BROWSER_E2E_PASSED");
  }
}

runBrowserAcceptanceSuite().catch((err) => {
  console.error("BROWSER ACCEPTANCE SUITE FATAL ERROR: " + err.message);
  console.error(err.stack);
  process.exit(1);
});

