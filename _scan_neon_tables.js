const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // List all tables from information_schema
    const tables_list = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('=== ALL TABLES IN DATABASE ===');
    tables_list.rows.forEach(r => {
      console.log('  - ' + r.table_name);
    });

    // Now get size per table
    console.log('\n=== TABLE SIZE ESTIMATES ===');
    for (const r of tables_list.rows) {
      const t = r.table_name;
      const sizeInfo = await client.query(`
        SELECT pg_size_pretty(pg_total_relation_size('public.' || quote_ident($1))) as total_pretty
      `, [t]);
      const countInfo = await client.query(`
        SELECT COUNT(*) as cnt FROM public.${t}
      `);
      console.log('  ' + t + ': ' + countInfo.rows[0].cnt + ' rows, ' + sizeInfo.rows[0].total_pretty);
    }
    
    // List all columns of ename_dict
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'ename_dict'
      ORDER BY ordinal_position
    `);
    console.log('\n=== ename_dict COLUMNS ===');
    cols.rows.forEach(c => {
      const len = c.character_maximum_length ? '(' + c.character_maximum_length + ')' : '';
      const nullable = c.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL';
      console.log('  ' + c.column_name + ': ' + c.data_type + len + ' ' + nullable);
    });
    
    // Check if embedding column exists
    const embeddingCol = cols.rows.find(c => c.column_name === 'embedding');
    if (embeddingCol) {
      console.log('\n  *** embedding column found: type = ' + embeddingCol.data_type);
    } else {
      console.log('\n  *** No embedding column found');
    }

    // Check for other vector columns in all tables
    console.log('\n=== CHECKING VECTOR/EMBEDDING COLUMNS IN ALL TABLES ===');
    const vecCols = await client.query(`
      SELECT c.table_name, c.column_name, c.data_type
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND (c.data_type LIKE '%vector%' OR c.column_name LIKE '%embed%' OR c.column_name LIKE '%vector%')
      ORDER BY c.table_name, c.ordinal_position
    `);
    if (vecCols.rows.length === 0) {
      console.log('  No vector/embedding columns found in any table');
    } else {
      vecCols.rows.forEach(r => {
        console.log('  ' + r.table_name + '.' + r.column_name + ': ' + r.data_type);
      });
    }

    // Check for naming_materials table
    console.log('\n=== CHECKING FOR naming_materials TABLE ===');
    const nmTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%naming%material%'
    `);
    if (nmTables.rows.length === 0) {
      console.log('  No naming_materials table found');
    } else {
      nmTables.rows.forEach(r => {
        console.log('  Found: ' + r.table_name);
      });
    }

    // Check total DB size
    const dbSize = await client.query(`
      SELECT pg_size_pretty(pg_database_size('neondb')) as total_size
    `);
    console.log('\n=== TOTAL DATABASE SIZE ===');
    console.log('  ' + dbSize.rows[0].total_size);

  } finally {
    client.release();
  }
  await pool.end();
}

main().catch(err => {
  console.error('FATAL:', err);
  pool.end();
  process.exit(1);
});