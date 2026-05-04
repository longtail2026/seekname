const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // ename_dict columns
    const eCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'ename_dict'
      ORDER BY ordinal_position
    `);
    console.log('=== ename_dict COLUMNS ===');
    eCols.rows.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type + ' ' + c.is_nullable));
    
    const eHasVec = await client.query('SELECT COUNT(*) as cnt FROM ename_dict WHERE embedding IS NOT NULL');
    const eTotal = await client.query('SELECT COUNT(*) as cnt FROM ename_dict');
    console.log('\nename_dict rows: total=' + eTotal.rows[0].cnt + ', has_embedding=' + eHasVec.rows[0].cnt);
    
    // naming_classics column usage
    console.log('\n=== naming_classics column data coverage ===');
    const ncChecks = await client.query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(ancient_text_embedding) as has_ancient_bytea,
        COUNT(modern_text_embedding) as has_modern_bytea,
        COUNT(combined_text_embedding_vec) as has_vec,
        COUNT(modern_text_embedding_vec) as has_vec_modern,
        COUNT(ancient_text_embedding_vec) as has_vec_ancient,
        COUNT(gender_tag) as has_gender_tag
      FROM naming_classics
    `);
    console.log(ncChecks.rows[0]);
    
    // sensitive_words
    const sw = await client.query('SELECT COUNT(*) as cnt FROM sensitive_words');
    console.log('\nsensitive_words: ' + sw.rows[0].cnt + ' rows');
    const swCats = await client.query('SELECT category, COUNT(*) from sensitive_words GROUP BY category ORDER BY COUNT(*) DESC');
    console.log('sensitive_words categories:');
    swCats.rows.forEach(r => console.log('  ' + r.category + ': ' + r.count));
    
    // Old vs new data
    console.log('\n=== DATA MIGRATION CHECK ===');
    const oOld = await client.query('SELECT COUNT(*) as cnt FROM "order"');
    const oNew = await client.query('SELECT COUNT(*) as cnt FROM orders');
    console.log('order (old)=' + oOld.rows[0].cnt + ', orders (new)=' + oNew.rows[0].cnt);
    
    const nrOld = await client.query('SELECT COUNT(*) as cnt FROM name_record');
    const nrNew = await client.query('SELECT COUNT(*) as cnt FROM name_records');
    console.log('name_record (old)=' + nrOld.rows[0].cnt + ', name_records (new)=' + nrNew.rows[0].cnt);
    
    // classics_entries table
    const ceCheck = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'classics_entries') as exists`);
    console.log('\nclassics_entries table exists: ' + ceCheck.rows[0].exists);
    if (ceCheck.rows[0].exists) {
      const ceCols = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = 'classics_entries' ORDER BY ordinal_position
      `);
      console.log('classics_entries columns:');
      ceCols.rows.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type));
      const ceCnt = await client.query('SELECT COUNT(*) as cnt FROM classics_entries');
      console.log('classics_entries rows: ' + ceCnt.rows[0].cnt);
    }

    // subscription table
    const tbSub = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription') as exists`);
    console.log('\nsubscription table exists: ' + tbSub.rows[0].exists);
    
    // Check if name_wuxing is really used externally
    const wUsed = await client.query('SELECT COUNT(*) as cnt FROM name_wuxing');
    console.log('name_wuxing rows: ' + wUsed.rows[0].cnt);
    
    // Check kangxi_dict
    const kd = await client.query('SELECT COUNT(*) as cnt FROM kangxi_dict');
    console.log('kangxi_dict rows: ' + kd.rows[0].cnt);
    
    // Check wuxing_characters
    const wc = await client.query('SELECT COUNT(*) as cnt FROM wuxing_characters');
    console.log('wuxing_characters rows: ' + wc.rows[0].cnt);
    
  } finally { client.release(); }
  await pool.end();
}
main().catch(err => { console.error('FATAL:', err); pool.end(); process.exit(1); });