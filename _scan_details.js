const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // naming_classics columns
    const nCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'naming_classics'
      ORDER BY ordinal_position
    `);
    console.log('=== naming_classics COLUMNS ===');
    nCols.rows.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type + ' ' + c.is_nullable));
    
    // naming_materials columns
    const mCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'naming_materials'
      ORDER BY ordinal_position
    `);
    console.log('\n=== naming_materials COLUMNS ===');
    mCols.rows.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type + ' ' + c.is_nullable));
    
    // Check old singular tables for data
    console.log('\n=== OLD TABLES WITH DATA CHECK ===');
    const oldTables = ['order', 'user', 'name_record', 'blog_comment', 'blog_post', 'name_favorite'];
    for (const t of oldTables) {
      const tbl = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) as exists`, [t]);
      if (tbl.rows[0].exists) {
        const cnt = await client.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
        console.log('  ' + t + ': ' + cnt.rows[0].cnt + ' rows');
      } else {
        console.log('  ' + t + ': does not exist');
      }
    }
    
    // Check new plural tables
    console.log('\n=== NEW (Prisma-managed) TABLES WITH ROWS ===');
    const newTables = ['orders', 'users', 'name_records', 'blog_posts', 'blog_comments', 'blog_favorites', 'name_favorites', 'blog_likes', 'blog_tags', 'blog_post_tags', 'subscription'];
    for (const t of newTables) {
      const tbl = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) as exists`, [t]);
      if (tbl.rows[0].exists) {
        const cnt = await client.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
        console.log('  ' + t + ': ' + cnt.rows[0].cnt + ' rows');
      } else {
        console.log('  ' + t + ': does not exist');
      }
    }

    // Check playing_with_neon columns
    const pCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'playing_with_neon' ORDER BY ordinal_position
    `);
    console.log('\n=== playing_with_neon COLUMNS ===');
    pCols.rows.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type));
    
    // Check if name_wuxing is used by any code
    const wCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'name_wuxing' ORDER BY ordinal_position
    `);
    console.log('\n=== name_wuxing COLUMNS ===');
    wCols.rows.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type));

    // Summary of large tables and their space
    console.log('\n=== SPACE SUMMARY (sorted) ===');
    const sizes = await client.query(`
      SELECT table_name,
             pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as total_pretty,
             pg_total_relation_size(quote_ident(table_name)) as total_bytes
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY total_bytes DESC
    `);
    sizes.rows.forEach(r => {
      console.log('  ' + r.table_name.padEnd(25) + ' ' + r.total_pretty);
    });

  } finally { client.release(); }
  await pool.end();
}
main().catch(err => { console.error('FATAL:', err); pool.end(); process.exit(1); });