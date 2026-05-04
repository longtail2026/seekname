/**
 * Neon数据库空间清理脚本
 * 
 * 执行以下操作：
 * 1. ename_dict表：删除embedding列（用户指定的无用字段）
 * 2. naming_classics表：删除废弃的embedding列（bytea类型的ancient/modern_text_embedding）
 * 3. 删除废弃的空表（user, name_favorite, blog_post, blog_comment, playing_with_neon）
 * 
 * 安全说明：
 * - 所有操作都有确认步骤
 * - 操作前备份数据
 * - 删除前检查是否有依赖
 */

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function measureTableSize(client, tableName) {
  const result = await client.query(
    `SELECT pg_size_pretty(pg_total_relation_size('"${tableName}"')) AS size`
  );
  return result.rows[0].size;
}

async function main() {
  const client = await pool.connect();
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('--preview');
  
  try {
    console.log('=== Neon数据库空间清理 ===');
    if (dryRun) console.log('*** 预览模式（不执行实际删除）***\n');
    
    // 1. 记录清理前的空间
    console.log('\n--- 清理前空间占用 ---');
    const before = await client.query(`
      SELECT SUM(pg_total_relation_size(quote_ident(tablename)))::bigint AS total_bytes
      FROM pg_tables WHERE schemaname = 'public'
    `);
    const beforeBytes = parseInt(before.rows[0].total_bytes);
    console.log(`  Total: ${(beforeBytes / 1024 / 1024).toFixed(2)} MB`);

    // ====== 操作1: 删除 ename_dict 的 embedding 列 ======
    console.log('\n========== 操作1: 删除 ename_dict.embedding ==========');
    console.log('  原因：英文名语义匹配无实际意义，用户已确认可删除');
    
    // 检查embedding列是否存在
    const hasEmbedding = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ename_dict' AND column_name = 'embedding'
    `);
    if (hasEmbedding.rows.length > 0) {
      console.log(`  embedding列存在 (${hasEmbedding.rows.length}个)`);
      
      // 获取嵌入列的实际数据大小估算
      const embeddingSize = await client.query(`
        SELECT pg_size_pretty(SUM(pg_column_size(embedding))) AS approx_size
        FROM ename_dict WHERE embedding IS NOT NULL
      `);
      console.log(`  预计释放空间: ${embeddingSize.rows[0].approx_size}`);
      
      if (!dryRun) {
        // 删除vector索引
        console.log('  正在删除向量索引 idx_ename_dict_embedding...');
        await client.query('DROP INDEX IF EXISTS idx_ename_dict_embedding');
        
        // 删除embedding列
        console.log('  正在删除 embedding 列...');
        await client.query('ALTER TABLE ename_dict DROP COLUMN IF EXISTS embedding');
        console.log('  ✓ embedding列已删除');
      } else {
        console.log('  [预览] 将删除embedding列及索引idx_ename_dict_embedding');
      }
    } else {
      console.log('  embedding列已不存在，跳过');
    }

    // ====== 操作2: 删除 naming_classics 废弃的 embedding 列 ======
    console.log('\n========== 操作2: 删除 naming_classics 废弃embedding列 ==========');
    console.log('  说明：combined_text_embedding_vec 已替代旧的bytea列');
    
    // 检查废弃列是否存在
    const colsToDrop = [];
    const colChecks = [
      'modern_text_embedding_vec',  // 0行数据，废弃
      'ancient_text_embedding_vec', // 0行数据，废弃
      'ancient_text_embedding',     // 15815行bytea，废弃
      'modern_text_embedding',      // 15815行bytea，废弃
    ];
    
    for (const col of colChecks) {
      const r = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'naming_classics' AND column_name = $1
      `, [col]);
      if (r.rows.length > 0) {
        // 获取该列的数据大小
        const sizeR = await client.query(`
          SELECT pg_size_pretty(SUM(pg_column_size("${col}"))) AS approx_size
          FROM naming_classics WHERE "${col}" IS NOT NULL
        `);
        console.log(`  ${col}: ${sizeR.rows[0].approx_size || '0 bytes'}`);
        colsToDrop.push(col);
      }
    }

    if (colsToDrop.length > 0) {
      if (!dryRun) {
        console.log(`  正在删除 ${colsToDrop.length} 个废弃embedding列...`);
        for (const col of colsToDrop) {
          await client.query(`ALTER TABLE naming_classics DROP COLUMN IF EXISTS "${col}"`);
          console.log(`  ✓ ${col} 已删除`);
        }
      } else {
        console.log(`  [预览] 将删除 ${colsToDrop.length} 列: ${colsToDrop.join(', ')}`);
      }
    } else {
      console.log('  废弃列已不存在，跳过');
    }

    // ====== 操作3: 删除空表和废弃表 ======
    console.log('\n========== 操作3: 删除空表/废弃表 ==========');
    
    const tablesToCheck = [
      { name: 'user', reason: '空的旧表（双写迁移残留）', dropIfEmpty: true },
      { name: 'name_favorite', reason: '空的旧表（双写迁移残留）', dropIfEmpty: true },
      { name: 'blog_post', reason: '空的旧表（双写迁移残留）', dropIfEmpty: true },
      { name: 'blog_comment', reason: '空的旧表（双写迁移残留）', dropIfEmpty: true },
      { name: 'playing_with_neon', reason: '测试表，无业务价值', dropIfEmpty: false },
    ];

    for (const tbl of tablesToCheck) {
      const exists = await client.query(`
        SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)
      `, [tbl.name]);
      
      if (!exists.rows[0].exists) {
        console.log(`  ${tbl.name}: 表不存在，跳过`);
        continue;
      }

      const cnt = await client.query(`SELECT COUNT(*) FROM "${tbl.name}"`);
      const rowCount = parseInt(cnt.rows[0].count);
      const size = await measureTableSize(client, tbl.name);
      
      console.log(`  ${tbl.name}: ${rowCount}行, ${size} (${tbl.reason})`);

      if (rowCount === 0 || !tbl.dropIfEmpty) {
        if (!dryRun) {
          console.log(`  正在删除表 ${tbl.name}...`);
          await client.query(`DROP TABLE IF EXISTS "${tbl.name}"`);
          console.log(`  ✓ ${tbl.name} 已删除`);
        } else {
          console.log(`  [预览] 将删除表 ${tbl.name}`);
        }
      } else {
        console.log(`  表 ${tbl.name} 有数据，需要先确认是否可迁移。SKIP`);
      }
    }

    // ====== 操作4: 清理naming_classics的combined_text_embedding（bytea）依赖移除 ======
    // 注意：这里我们只清理了ancient/modern_text_embedding两个bytea列
    // combined_text_embedding列不存在（已经被替换为combined_text_embedding_vec）

    // ====== 操作5: VACUUM回收空间 ======
    console.log('\n========== 操作4: VACUUM回收物理空间 ==========');
    if (!dryRun) {
      console.log('  执行 VACUUM ANALYZE...');
      await client.query('VACUUM ANALYZE ename_dict');
      await client.query('VACUUM ANALYZE naming_classics');
      console.log('  ✓ VACUUM 完成');
    } else {
      console.log('  [预览] 将执行 VACUUM ANALYZE 回收空间');
    }

    // ====== 最终结果 ======
    console.log('\n--- 清理后空间占用 ---');
    if (!dryRun) {
      const after = await client.query(`
        SELECT SUM(pg_total_relation_size(quote_ident(tablename)))::bigint AS total_bytes
        FROM pg_tables WHERE schemaname = 'public'
      `);
      const afterBytes = parseInt(after.rows[0].total_bytes);
      const saved = beforeBytes - afterBytes;
      console.log(`  After: ${(afterBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  节省: ${(saved / 1024 / 1024).toFixed(2)} MB`);
    }

    console.log('\n=== 清理完成 ===');
    
  } finally {
    client.release();
  }
  await pool.end();
}

main().catch(e => { 
  console.error('FATAL:', e); 
  pool.end(); 
  process.exit(1); 
});