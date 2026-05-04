/**
 * 检查 ename_dict 更新状态
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();
  
  try {
    const cols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='ename_dict' ORDER BY ordinal_position"
    );
    console.log('表字段:', cols.rows.map(r => r.column_name).join(', '));
    
    const cnt = await client.query("SELECT COUNT(*) FROM ename_dict WHERE pattern_key IS NOT NULL");
    console.log('已填充 pattern_key 的记录数:', cnt.rows[0].count);
    
    const total = await client.query("SELECT COUNT(*) FROM ename_dict");
    console.log('总记录数:', total.rows[0].count);
    
    if (parseInt(cnt.rows[0].count) > 0) {
      const samples = await client.query(
        "SELECT english_name, syllables, start_sound, middle_sound, end_sound, pattern_key FROM ename_dict WHERE pattern_key IS NOT NULL ORDER BY id LIMIT 20"
      );
      console.log('\n样本数据(A开头):');
      samples.rows.forEach(r => console.log(
        '  ' + (r.english_name || '').padEnd(25) + ' → ' + r.syllables + '_' + (r.start_sound || '') + '_' + (r.middle_sound || '') + '_' + (r.end_sound || '')
      ));
      
      // 检查G开头的2音节名字
      console.log('\n=== G开头2音节名字 ===');
      const gNames = await client.query(
        "SELECT english_name, pattern_key FROM ename_dict WHERE syllables = 2 AND start_sound = 'g' AND english_name LIKE 'G%'"
      );
      gNames.rows.forEach(r => console.log('  ' + r.english_name.padEnd(20) + ' → ' + r.pattern_key));
      
      // guoguang match test
      console.log('\n=== 与 guoguang(2_g_uo_uang_ng) 匹配测试 ===');
      try {
        const matches = await client.query(`
          SELECT english_name, pattern_key
          FROM ename_dict
          WHERE syllables = 2 AND start_sound = 'g'
          ORDER BY similarity(COALESCE(middle_sound,''), 'uo_uang') * 1.5 + similarity(COALESCE(end_sound,''), 'ng') DESC
          LIMIT 15
        `);
        for (const r of matches.rows) {
          const parts = r.pattern_key ? r.pattern_key.split('_') : ['','','',''];
          const midSim = (await client.query("SELECT similarity(COALESCE($1,''), 'uo_uang') as sim", [parts[2] || ''])).rows[0].sim;
          const endSim = (await client.query("SELECT similarity(COALESCE($1,''), 'ng') as sim", [parts[3] || ''])).rows[0].sim;
          console.log('  ' + (r.english_name || '').padEnd(20) + ' → ' + (r.pattern_key || '').padEnd(30) + '  mid=' + midSim.toFixed(3) + ' end=' + endSim.toFixed(3));
        }
      } catch (err) {
        console.log('  匹配查询失败（可能是pg_trgm扩展问题）:', err.message);
      }
    } else {
      console.log('\n数据尚未填充，检查之前的更新脚本是否仍在运行...');
    }
  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

check();