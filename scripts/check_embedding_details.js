const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // 1. ename_dict embedding column detail
    const cnt2227 = await client.query('SELECT COUNT(*) FROM ename_dict');
    console.log('ename_dict rows:', cnt2227.rows[0].count);

    // Check naming_classics column types in detail
    console.log('\n=== naming_classics COLUMN DETAILS ===');
    const ncCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'naming_classics'
      ORDER BY ordinal_position
    `);
    ncCols.rows.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type + ' nullable=' + c.is_nullable));

    // Check naming_classics vector columns - how many have values
    const ncVecChecks = [
      'combined_text_embedding_vec',
      'modern_text_embedding_vec', 
      'ancient_text_embedding_vec',
      'ancient_text_embedding',
      'modern_text_embedding'
    ];
    console.log('\n=== naming_classics VECTOR COLUMN POPULATION ===');
    for (const col of ncVecChecks) {
      const r = await client.query(`SELECT COUNT(*) as cnt FROM naming_classics WHERE "${col}" IS NOT NULL`);
      console.log('  ' + col + ': ' + r.rows[0].cnt + ' NOT NULL');
    }

    // naming_materials embedding
    const nmEmbed = await client.query('SELECT COUNT(*) FROM naming_materials WHERE embedding IS NOT NULL');
    console.log('\n  naming_materials with embedding:', nmEmbed.rows[0].count);

    // playing_with_neon - what's in it?
    const pwn = await client.query('SELECT * FROM playing_with_neon LIMIT 5');
    console.log('\n=== playing_with_neon SAMPLE DATA ===');
    pwn.rows.forEach(r => console.log('  ' + JSON.stringify(r)));

    // name_wuxing columns
    const nwCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'name_wuxing' ORDER BY ordinal_position
    `);
    console.log('\n=== name_wuxing COLUMNS ===');
    nwCols.rows.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type));
    const nwRows = await client.query('SELECT * FROM name_wuxing LIMIT 3');
    console.log('\n  SAMPLE DATA:');
    nwRows.rows.forEach(r => console.log('  ' + JSON.stringify(r)));

    // subscription table
    const subCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'subscription' ORDER BY ordinal_position
    `);
    console.log('\n=== subscription COLUMNS ===');
    subCols.rows.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type));
    const subCnt = await client.query('SELECT COUNT(*) FROM subscription');
    console.log('  rows: ' + subCnt.rows[0].count);

    // Check the blog/user migration status - are old tables still used?
    console.log('\n=== MIGRATION STATUS: OLD vs NEW TABLES ===');
    const pairs = [
      ['order', 'orders'],
      ['user', 'users'],
      ['name_record', 'name_records'],
      ['name_favorite', 'name_favorites'],
      ['blog_post', 'blog_posts'],
      ['blog_comment', 'blog_comments']
    ];
    for (const [oldT, newT] of pairs) {
      const oldExists = await client.query(`SELECT EXISTS (SELECT FROM infoRmation_schema.tables WHERE table_name = $1)`, [oldT]);
      const newExists = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [newT]);
      let oldRows = 0, newRows = 0;
      let oldSize = '0', newSize = '0';
      if (oldExists.rows[0].exists) {
        const r1 = await client.query(`SELECT COUNT(*) FROM "${oldT}"`);
        oldRows = parseInt(r1.rows[0].count);
        const s1 = await client.query(`SELECT pg_size_pretty(pg_total_relation_size('"${oldT}"'))`);
        oldSize = s1.rows[0].pg_size_pretty;
      }
      if (newExists.rows[0].exists) {
        const r2 = await client.query(`SELECT COUNT(*) FROM "${newT}"`);
        newRows = parseInt(r2.rows[0].count);
        const s2 = await client.query(`SELECT pg_size_pretty(pg_total_relation_size('"${newT}"'))`);
        newSize = s2.rows[0].pg_size_pretty;
      }
      console.log(`  ${oldT}(${oldRows}rows,${oldSize}) vs ${newT}(${newRows}rows,${newSize})`);
    }

  } finally { client.release(); }
  await pool.end();
}
main().catch(e => { console.error('FATAL:', e); pool.end(); process.exit(1); });