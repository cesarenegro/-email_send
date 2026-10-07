import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function run() {
  const projectRef = process.env.SUPABASE_PROJECT_REF || 'cayceyagmorwlbmmvyoc';
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!password) {
    console.error('Missing SUPABASE_DB_PASSWORD in environment');
    process.exit(1);
  }

  // List of possible connection endpoints for Supabase
  const endpoints = [
    {
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      user: 'postgres',
      name: 'Direct Postgres Connection',
    },
    {
      host: 'aws-0-eu-central-1.pooler.supabase.com',
      port: 6543,
      user: `postgres.${projectRef}`,
      name: 'Transaction Pooler (EU Central)',
    },
    {
      host: 'aws-0-eu-west-1.pooler.supabase.com',
      port: 6543,
      user: `postgres.${projectRef}`,
      name: 'Transaction Pooler (EU West)',
    },
    {
      host: 'aws-0-eu-west-3.pooler.supabase.com',
      port: 6543,
      user: `postgres.${projectRef}`,
      name: 'Transaction Pooler (EU West Paris)',
    },
    {
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 6543,
      user: `postgres.${projectRef}`,
      name: 'Transaction Pooler (US East)',
    },
  ];

  const sqlFilePath = path.join(__dirname, '..', 'supabase', 'all_migrations.sql');
  const sql = fs.readFileSync(sqlFilePath, 'utf8');

  let connectedClient: Client | null = null;

  for (const ep of endpoints) {
    console.log(`Trying ${ep.name} (${ep.host}:${ep.port})...`);
    const client = new Client({
      host: ep.host,
      port: ep.port,
      user: ep.user,
      password: password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      console.log(`✅ Successfully connected via ${ep.name}!`);
      connectedClient = client;
      break;
    } catch (err: any) {
      console.log(`  Failed: ${err.message}`);
      await client.end().catch(() => {});
    }
  }

  if (!connectedClient) {
    console.error('❌ Could not connect to any Supabase endpoint. Please verify network access.');
    process.exit(1);
  }

  try {
    console.log('Applying all migrations from all_migrations.sql...');
    await connectedClient.query(sql);
    console.log('✅ Migrations applied successfully!');

    // Verify tables exist
    const res = await connectedClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('campaigns', 'campaign_leads', 'email_logs');
    `);
    console.log('Verified tables in database:');
    res.rows.forEach((r) => console.log(' - ' + r.table_name));

    // Verify RPC
    const rpcRes = await connectedClient.query(`
      SELECT proname 
      FROM pg_proc 
      WHERE proname = 'claim_next_campaign_lead';
    `);
    console.log('Verified RPC functions in database:');
    rpcRes.rows.forEach((r) => console.log(' - ' + r.proname));

  } catch (err: any) {
    console.error('❌ Error executing SQL migrations:', err);
    process.exit(1);
  } finally {
    await connectedClient.end();
  }
}

run();
