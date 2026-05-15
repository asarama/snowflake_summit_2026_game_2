import * as duckdb from '@duckdb/duckdb-wasm';

const STORAGE_KEY = 'greybeam_scores';

let dbInstance = null;
let connInstance = null;
let initPromise = null;

async function getDb() {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const worker = new Worker(bundle.mainWorker);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule);

    dbInstance = db;
    connInstance = await db.connect();

    await connInstance.query(`
      CREATE TABLE IF NOT EXISTS scores (
        email VARCHAR,
        score INTEGER,
        max_speed DOUBLE,
        created_at TIMESTAMP DEFAULT current_timestamp
      )
    `);

    await loadStoredScores();
    return dbInstance;
  })();

  return initPromise;
}

async function getConn() {
  await getDb();
  return connInstance;
}

async function loadStoredScores() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  let rows;
  try {
    rows = JSON.parse(raw);
  } catch {
    return;
  }

  if (!Array.isArray(rows) || rows.length === 0) return;

  const conn = connInstance;
  for (const row of rows) {
    if (!row.email || row.score == null || row.maxSpeed == null) continue;
    const ts = row.createdAt ? `'${row.createdAt}'` : 'current_timestamp';
    await conn.query(`
      INSERT INTO scores (email, score, max_speed, created_at)
      VALUES ('${escapeSql(row.email)}', ${Math.floor(row.score)}, ${Number(row.maxSpeed)}, ${ts})
    `);
  }
}

function escapeSql(str) {
  return String(str).replace(/'/g, "''");
}

async function persistScores() {
  const conn = await getConn();
  const result = await conn.query(`
    SELECT email, score, max_speed, strftime(created_at, '%Y-%m-%dT%H:%M:%S') as created_at
    FROM scores
    ORDER BY created_at DESC
  `);

  const rows = [];
  for (let i = 0; i < result.numRows; i++) {
    rows.push({
      email: result.get(i, 'email'),
      score: result.get(i, 'score'),
      maxSpeed: result.get(i, 'max_speed'),
      createdAt: result.get(i, 'created_at')
    });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export async function saveScore(email, score, maxSpeed) {
  const conn = await getConn();
  await conn.query(`
    INSERT INTO scores (email, score, max_speed)
    VALUES ('${escapeSql(email)}', ${Math.floor(score)}, ${Number(maxSpeed)})
  `);
  await persistScores();
}

export async function getTopScores(limit = 10) {
  const conn = await getConn();
  const result = await conn.query(`
    SELECT email, score, max_speed
    FROM scores
    ORDER BY score DESC, max_speed DESC
    LIMIT ${Math.max(1, Math.floor(limit))}
  `);

  const rows = [];
  for (let i = 0; i < result.numRows; i++) {
    rows.push({
      email: result.get(i, 'email'),
      score: result.get(i, 'score'),
      maxSpeed: Number(result.get(i, 'max_speed')).toFixed(1)
    });
  }
  return rows;
}

export async function getPersonalBest(email) {
  const conn = await getConn();
  const result = await conn.query(`
    SELECT MAX(score) as best_score, MAX(max_speed) as best_max_speed
    FROM scores
    WHERE email = '${escapeSql(email)}'
  `);

  if (result.numRows === 0) return null;
  return {
    bestScore: result.get(0, 'best_score'),
    bestMaxSpeed: Number(result.get(0, 'best_max_speed') || 0).toFixed(1)
  };
}
