const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // 1. Get table sizes and row counts
    const tables = await client.query(`
      SELECT
        relname as table_name,
        n_live_tup as row_estimate,
        pg_total_relation_size(relid) as total_bytes
      FROM pg_stat_user_tables
      ORDER BY total_bytes DESC
    `);
    console.log('=== Neon Tables Size Analysis ===');
    let totalBytes = 0;
    for (const t of tables.rows) {
      const sizeMB = (t.total_bytes / 1024 / 1024).toFixed(2);
      totalBytes += parseInt(t.total_bytes);
      console.log(t.table_name.padEnd(25), t.row_estimate.toString().padStart(10), 'rows', sizeMB.padStart(8), 'MB');
    }
    console.log('---');
    console.log('Total:', (totalBytes/1024/1024).toFixed(2), 'MB');

    // 2. Check ename_dict table structure
    console.log('\n=== ename_dict Table Structure ===');
    const enameCols = await client.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'ename_dict'
      ORDER BY ordinal_position
    `);
    for (const col of enameCols.rows) {
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(20)} nullable=${col.is_nullable}`);
    }

    // Count ename_dict rows with/without embedding
    const embedCnt = await client.query("SELECT COUNT(*) FROM ename_dict WHERE embedding IS NOT NULL");
    const totalCnt = await client.query("SELECT COUNT(*) FROM ename_dict");
    console.log(`\n  Total rows: ${totalCnt.rows[0].count}`);
    console.log(`  With embedding: ${embedCnt.rows[0].count}`);

    // 3. Check naming_materials structure
    console.log('\n=== naming_materials Table Structure ===');
    const nmCols = await client.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'naming_materials'
      ORDER BY ordinal_position
    `);
    for (const col of nmCols.rows) {
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} nullable=${col.is_nullable}`);
    }

    // 4. Check naming_classics structure
    console.log('\n=== naming_classics Table Structure ===');
    const ncCols = await client.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'naming_classics'
      ORDER BY ordinal_position
    `);
    for (const col of ncCols.rows) {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} nullable=${col.is_nullable}`);
    }

    // 5. Check various blog and user tables - which are unused?
    console.log('\n=== Checking Doubled Tables ===');
    const doubled = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN (
        'blog_comment', 'blog_comments', 'blog_post', 'blog_posts',
        'name_favorite', 'name_favorites', 'name_record', 'name_records',
        'order', 'orders'
      )
    `);
    for (const t of doubled.rows) {
      const cnt = await client.query(`SELECT COUNT(*) FROM "${t.table_name}"`);
      console.log(`  ${t.table_name}: ${cnt.rows[0].count} rows`);
    }

    // 6. Check playing_with_neon
    const pwn = await client.query("SELECT COUNT(*) FROM playing_with_neon");
    console.log(`\n  playing_with_neon: ${pwn.rows[0].count} rows`);

    // 7. Check vector indexes
    console.log('\n=== Vector Indexes ===');
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('ename_dict', 'naming_materials', 'naming_classics')
        AND indexdef LIKE '%vector%'
    `);
    for (const idx of indexes.rows) {
      console.log(`  ${idx.indexname}: ${idx.indexdef}`);
    }

  } finally { client.release(); }
  await pool.end();
}
main().catch(e => { console.error('FATAL:', e); pool.end(); });