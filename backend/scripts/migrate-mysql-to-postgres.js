import 'dotenv/config';
import { Sequelize } from 'sequelize';

const mysql = new Sequelize(process.env.MYSQL_DATABASE.toLowerCase(), process.env.MYSQL_USER, process.env.MYSQL_PASSWORD || '', {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  dialect: 'mysql',
  logging: false,
});

const pg = new Sequelize(process.env.SUPABASE_PG_DATABASE, process.env.SUPABASE_PG_USER, process.env.SUPABASE_PG_PASSWORD, {
  host: process.env.SUPABASE_POOLER_HOST,
  port: Number(process.env.SUPABASE_POOLER_PORT) || 5432,
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: false },
});

const tableMetaCache = {};

async function getPgTableMeta(table) {
  if (tableMetaCache[table]) return tableMetaCache[table];
  try {
    const desc = await pg.getQueryInterface().describeTable(table);
    tableMetaCache[table] = desc;
    return desc;
  } catch {
    throw new Error(`Target table '${table}' not found. Ensure Sequelize synced before running migration.`);
  }
}

function coerceValue(col, val, meta) {
  if (val === null || val === undefined) return val;
  const colMeta = meta[col];
  if (!colMeta) return val;

  const type = (colMeta.type || '').toUpperCase();

  if (type.includes('BOOLEAN')) {
    return (val === 1 || val === '1' || val === true) ? true : false;
  }

  if (type.includes('TIMESTAMP') || type.includes('DATE')) {
    if (typeof val === 'string' && val.includes('+00:00')) {
      return new Date(val);
    }
  }

  // JSON handling: keep objects for JSON/JSONB, stringify otherwise
  if (typeof val === 'object' && !(val instanceof Date) && !Buffer.isBuffer(val)) {
    if (type.includes('JSON')) {
      return val; // let PG driver handle JSON
    }
    return JSON.stringify(val);
  }

  return val;
}

async function copyTable(table) {
  console.log(`Starting table: ${table}`);
  const rows = await mysql.query(`SELECT * FROM \`${table}\``, { type: Sequelize.QueryTypes.SELECT });
  if (!rows.length) {
    console.log(`${table}: 0 rows`);
    return;
  }

  const meta = await getPgTableMeta(table);
  const targetCols = Object.keys(meta);

  // Transform rows
  const transformed = rows.map(r => {
    const obj = {};
    for (const c of targetCols) {
      if (r.hasOwnProperty(c)) {
        obj[c] = coerceValue(c, r[c], meta);
      }
    }
    return obj;
  });

  const chunkSize = 500;
  for (let i = 0; i < transformed.length; i += chunkSize) {
    const chunk = transformed.slice(i, i + chunkSize);
    await pg.getQueryInterface().bulkInsert(table, chunk, { ignoreDuplicates: true });
    console.log(`${table}: inserted ${i + chunk.length}/${transformed.length}`);
  }
  console.log(`${table}: ${transformed.length} rows copied`);
}

async function resetSequences(tables) {
  for (const t of tables) {
    try {
      await pg.query(`
        SELECT setval(
          pg_get_serial_sequence('${t}','id'),
          COALESCE((SELECT MAX(id) FROM ${t}), 0)
        );
      `);
    } catch {
      // Skip if no serial id
    }
  }
  console.log('Sequences reset.');
}

async function main() {
  try {
    await mysql.authenticate();
    await pg.authenticate();
    console.log('Connected to source and target.');

    // Dependency‑ordered tables (ensure parent tables first)
    const tables = [
      'school_years',
      'classes',
      'users',
      'subjects',
      'class_subjects',
      'students',
      'announcements',
      'announcement_images',
      'comments',
      'attendance_summaries',
      'attendances',
      'grades',
      'quarterly_averages',
      'push_subscriptions',
      'visitors',
      'audit_logs'
    ];

    // Optionally disable FK triggers (uncomment if needed):
    // await pg.query('SET session_replication_role = replica;');

    for (const t of tables) {
      await copyTable(t);
    }

    await resetSequences(tables);

    // Re-enable FK triggers if disabled:
    // await pg.query('SET session_replication_role = origin;');

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();