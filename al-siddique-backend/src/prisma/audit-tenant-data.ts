import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const ASSPS_EMAIL = "admin@assps.edu.pk";
const FIX_MODE = process.argv.includes("--fix");

const TABLES = [
  { label: "student", table: "students" },
  { label: "class", table: "classes" },
  { label: "section", table: "sections" },
  { label: "feeVoucher", table: "fee_vouchers" },
  { label: "exam", table: "exams" },
  { label: "result", table: "results" },
  { label: "questionBank", table: "question_bank" },
  { label: "paper", table: "papers" },
];

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "alsiddique_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "admin123",
});

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function tableExists(tableName: string) {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = $1
     LIMIT 1`,
    [tableName]
  );

  return result.rowCount > 0;
}

async function columnExists(tableName: string, columnName: string) {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );

  return result.rowCount > 0;
}

async function findAsspsTenant() {
  const byAdmin = await pool.query(
    `SELECT
       COALESCE(u.tenant_id, s.tenant_id) AS tenant_id,
       COALESCE(s.school_name, s.name, u.name) AS tenant_name,
       s.id AS school_id
     FROM users u
     LEFT JOIN schools s ON u.school_id = s.id OR u.tenant_id = s.tenant_id
     WHERE LOWER(u.email) = LOWER($1)
     ORDER BY s.id NULLS LAST
     LIMIT 1`,
    [ASSPS_EMAIL]
  );

  if (byAdmin.rows[0]?.tenant_id) {
    return {
      id: String(byAdmin.rows[0].tenant_id),
      name: byAdmin.rows[0].tenant_name || "ASSPS",
      schoolId: byAdmin.rows[0].school_id || null,
    };
  }

  const bySchool = await pool.query(
    `SELECT
       tenant_id,
       COALESCE(school_name, name) AS tenant_name,
       id AS school_id
     FROM schools
     WHERE LOWER(COALESCE(email, '')) = LOWER($1)
        OR LOWER(COALESCE(code, '')) = 'assps'
        OR LOWER(COALESCE(tenant_id, '')) = 'assps'
     ORDER BY id
     LIMIT 1`,
    [ASSPS_EMAIL]
  );

  if (bySchool.rows[0]?.tenant_id) {
    return {
      id: String(bySchool.rows[0].tenant_id),
      name: bySchool.rows[0].tenant_name || "ASSPS",
      schoolId: bySchool.rows[0].school_id || null,
    };
  }

  return null;
}

async function auditTable({
  label,
  table,
  tenantId,
}: {
  label: string;
  table: string;
  tenantId: string;
}) {
  if (!(await tableExists(table))) {
    console.log(`SKIP: ${label} table not found (${table})`);
    return;
  }

  if (!(await columnExists(table, "tenant_id"))) {
    console.log(`SKIP: ${label} has no tenant_id column (${table})`);
    return;
  }

  const tableSql = quoteIdent(table);
  const missing = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM ${tableSql}
     WHERE tenant_id IS NULL OR tenant_id = ''`
  );
  const missingCount = Number(missing.rows[0]?.count || 0);

  console.log(`${label}: missing tenantId = ${missingCount}`);

  if (FIX_MODE && missingCount > 0) {
    const fixed = await pool.query(
      `UPDATE ${tableSql}
       SET tenant_id = $1
       WHERE tenant_id IS NULL OR tenant_id = ''`,
      [tenantId]
    );

    console.log(`${label}: fixed ${fixed.rowCount} records`);
  }
}

async function main() {
  const tenant = await findAsspsTenant();

  if (!tenant) {
    throw new Error("ASSPS tenant not found. Run lock-assps-data.ts first.");
  }

  console.log("Tenant:", tenant.name, tenant.id);
  console.log("Fix mode:", FIX_MODE ? "ON" : "OFF");

  for (const item of TABLES) {
    await auditTable({
      ...item,
      tenantId: tenant.id,
    });
  }

  console.log("Audit completed.");
}

main()
  .catch((error) => {
    console.error("Audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
