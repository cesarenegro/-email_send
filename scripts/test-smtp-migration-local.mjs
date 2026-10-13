// Requires a freshly initialized isolated cluster owned by audit_owner, port 55439.
// Never loads .env or remote credentials. The fixture schema is deliberately minimal.
import pg from 'pg';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new pg.Client({host:'127.0.0.1',port:55439,user:'audit_owner',database:'postgres'});
await db.connect();
const results=[];
async function check(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS',name);}
async function denied(sql, code='42501') {
  await db.query('SAVEPOINT negative_test');
  let error;
  try{await db.query(sql);}catch(e){error=e;}
  await db.query('ROLLBACK TO SAVEPOINT negative_test');
  assert.equal(error?.code,code,`Expected ${code}: ${sql}`);
}
const A='00000000-0000-4000-8000-000000000001';
const B='00000000-0000-4000-8000-000000000002';
const CA='10000000-0000-4000-8000-000000000001';
const CB='10000000-0000-4000-8000-000000000002';
const CU='10000000-0000-4000-8000-000000000003';
try {
  assert.equal((await db.query('select current_user')).rows[0].current_user,'audit_owner');
  await db.query(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated,anon,service_role;
    CREATE TABLE public.campaigns(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id));
    CREATE TABLE public.newsletters(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id));
    CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;`);
  const migration=await readFile('supabase/migrations/010_user_smtp_connections.sql','utf8');
  await check('Complete migration executes on PostgreSQL 16',()=>db.query(migration));
  await db.query('BEGIN');
  await db.query(`INSERT INTO auth.users VALUES ('${A}'),('${B}');
    INSERT INTO smtp_connections(id,user_id,host,port,username,encrypted_password,from_name,from_email,is_verified)
    VALUES ('${CA}','${A}','smtp.example.com',465,'a@example.com','synthetic','A','a@example.com',true),
    ('${CB}','${B}','smtp.example.com',465,'b@example.com','synthetic','B','b@example.com',true),
    ('${CU}','${A}','smtp.example.com',465,'a@example.com','synthetic','A','a@example.com',false);
    SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${A}',false);`);
  await check('Own metadata only; ciphertext absent',async()=>{
    const {rows}=await db.query('SELECT * FROM user_smtp_connections_view');
    assert.equal(rows.length,2);assert(rows.every(r=>r.user_id===A));assert(!('encrypted_password' in rows[0]));
  });
  await check('Base table SELECT denied',()=>denied('SELECT * FROM smtp_connections'));
  for(const sql of [
    `UPDATE user_smtp_connections_view SET host='attacker.example',from_email='spoof@example.com',is_verified=true WHERE id='${CA}'`,
    `INSERT INTO user_smtp_connections_view(id,user_id) VALUES(gen_random_uuid(),'${A}')`,
    `DELETE FROM user_smtp_connections_view WHERE id='${CA}'`
  ]) await check('View mutation denied: '+sql.split(' ')[0],()=>denied(sql));
  for(const table of ['campaigns','newsletters']) {
    await check(`${table}: own verified connection allowed`,()=>db.query(`INSERT INTO ${table}(id,user_id,smtp_connection_id) VALUES(gen_random_uuid(),'${A}','${CA}')`));
    await check(`${table}: foreign connection denied`,()=>denied(`INSERT INTO ${table}(id,user_id,smtp_connection_id) VALUES(gen_random_uuid(),'${A}','${CB}')`,'23514'));
    await check(`${table}: unverified connection denied`,()=>denied(`INSERT INTO ${table}(id,user_id,smtp_connection_id) VALUES(gen_random_uuid(),'${A}','${CU}')`,'23514'));
  }
  await db.query(`SELECT set_config('request.jwt.claim.sub','${B}',false)`);
  await check('User B sees only own metadata',async()=>assert.deepEqual((await db.query('SELECT id FROM user_smtp_connections_view')).rows.map(r=>r.id),[CB]));
  await db.query('SET ROLE anon');
  await check('Anonymous metadata denied',()=>denied('SELECT * FROM user_smtp_connections_view'));
  await db.query('RESET ROLE');
  // Demonstrate the test catches the prior default-privilege hole, then roll it back.
  await check('Regression proof: previous authenticated write grant permits bypass',async()=>{
    await db.query(`SAVEPOINT mutation; GRANT UPDATE ON user_smtp_connections_view TO authenticated;
      SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${A}',false);`);
    const r=await db.query(`UPDATE user_smtp_connections_view SET is_verified=true WHERE id='${CU}' RETURNING id`);
    assert.equal(r.rowCount,1);
    await db.query('ROLLBACK TO SAVEPOINT mutation');
  });
  await db.query('ROLLBACK');
} finally {
  await db.end();
  await writeFile('output/audit-local-20261013/database-results.json',JSON.stringify(results,null,2));
}
