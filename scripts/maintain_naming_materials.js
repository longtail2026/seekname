/**
 * 维护 naming_materials 表（Neon 生产数据库）
 * 列: id, phrase, source, source_snippet, meaning, keywords[], style[], gender, wuxing, quality, combos[], embedding, created_at
 * 
 * 运行: node scripts/maintain_naming_materials.js
 */
const { Pool } = require('pg');

const CONNECTION_STRING = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }
});

async function query(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function main() {
  // 1. Show schema
  const columns = await query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'naming_materials' ORDER BY ordinal_position`
  );
  console.log('=== Columns ===');
  columns.forEach(r => console.log(`${r.column_name} - ${r.data_type}`));

  // 2. Total count
  const count = await query(`SELECT COUNT(*) as cnt FROM naming_materials`);
  console.log(`\n=== Total: ${count[0].cnt} rows ===`);

  // 3. Search for entries to DELETE (by phrase)
  const deletePhrases = [
    '绥和', '无恙', '奋杰', '乐乐', '姝丽', '坚白', '果行',
    '才', '让', '庄', '端', '贞固', '端庄', '肃雍',
    '暤', '昍', '婀娜', '妩媚', '嬛嬛',
    '锷', '犟', '锷锋',
    '禛', '禧', '祺', '禤', '禚', '禔', '禟', '禥', '禨', '禧年',
    '曲'
  ];

  console.log('\n=== Search for DELETE candidates ===');
  const toDelete = [];
  for (const phrase of deletePhrases) {
    const rows = await query(
      `SELECT id, phrase, meaning, wuxing FROM naming_materials WHERE phrase = $1`, [phrase]
    );
    if (rows.length > 0) {
      const r = rows[0];
      console.log(`  FOUND: id=${r.id}, phrase="${r.phrase}", meaning="${r.meaning}", wuxing=${r.wuxing}`);
      toDelete.push(r);
    } else {
      console.log(`  NOT FOUND: "${phrase}"`);
    }
  }

  // 4. Search for entries to UPDATE (rename)
  const renameOps = [
    { from: '强志', to: '志强' },
    { from: '画意', to: '如诗' },
    { from: '琴心', to: '艺琴' }
  ];

  console.log('\n=== Search for UPDATE candidates ===');
  const toUpdate = [];
  for (const op of renameOps) {
    const rows = await query(
      `SELECT id, phrase, meaning FROM naming_materials WHERE phrase = $1`, [op.from]
    );
    if (rows.length > 0) {
      console.log(`  FOUND "${op.from}": id=${rows[0].id}, meaning="${rows[0].meaning}"`);
      toUpdate.push({ ...op, id: rows[0].id, meaning: rows[0].meaning });
    } else {
      // Check if target already exists
      const existing = await query(
        `SELECT id, phrase, meaning FROM naming_materials WHERE phrase = $1`, [op.to]
      );
      if (existing.length > 0) {
        console.log(`  NOT FOUND "${op.from}", BUT "${op.to}" already exists: id=${existing[0].id}`);
      } else {
        console.log(`  NOT FOUND "${op.from}" or "${op.to}"`);
      }
    }
  }

  // 5. Summary
  console.log('\n========================================');
  console.log('SUMMARY:');
  console.log(`  DELETE: ${toDelete.length} entries`);
  toDelete.forEach(r => console.log(`    - "${r.phrase}" (id=${r.id}): ${r.meaning}`));
  console.log(`  RENAME: ${toUpdate.length} entries`);
  toUpdate.forEach(r => console.log(`    - "${r.from}" → "${r.to}" (id=${r.id}): ${r.meaning}`));
  console.log('========================================\n');

  // 6. Perform DELETE
  if (toDelete.length > 0) {
    console.log('=== Performing DELETE ===');
    for (const entry of toDelete) {
      const result = await query(
        `DELETE FROM naming_materials WHERE id = $1 RETURNING id, phrase`, [entry.id]
      );
      if (result.length > 0) {
        console.log(`  DELETED: "${result[0].phrase}" (id=${result[0].id})`);
      }
    }
  } else {
    console.log('=== Nothing to DELETE ===');
  }

  // 7. Count after delete
  const countAfter = await query(`SELECT COUNT(*) as cnt FROM naming_materials`);
  console.log(`\n=== After DELETE: ${countAfter[0].cnt} rows ===`);

  // 8. Perform RENAME
  if (toUpdate.length > 0) {
    console.log('\n=== Performing RENAME ===');
    for (const item of toUpdate) {
      // Check if target phrase already exists
      const exists = await query(
        `SELECT id, phrase, meaning FROM naming_materials WHERE phrase = $1`, [item.to]
      );
      if (exists.length > 0) {
        console.log(`  SKIP: "${item.to}" already exists (id=${exists[0].id}), deleting source "${item.from}"`);
        await query(`DELETE FROM naming_materials WHERE id = $1`, [item.id]);
        console.log(`  DELETED source: "${item.from}" (id=${item.id})`);
      } else {
        const result = await query(
          `UPDATE naming_materials SET phrase = $1 WHERE id = $2 RETURNING id, phrase`,
          [item.to, item.id]
        );
        if (result.length > 0) {
          console.log(`  RENAMED: "${item.from}" → "${result[0].phrase}" (id=${result[0].id})`);
        } else {
          console.log(`  FAILED to rename "${item.from}"`);
        }
      }
    }
  } else {
    console.log('\n=== Nothing to RENAME ===');
  }

  // 9. Final verification
  console.log('\n=== Final Verification ===');
  const finalCount = await query(`SELECT COUNT(*) as cnt FROM naming_materials`);
  console.log(`Total rows: ${finalCount[0].cnt}`);

  // Verify renames
  for (const op of renameOps) {
    const rows = await query(
      `SELECT id, phrase, meaning FROM naming_materials WHERE phrase = $1`, [op.to]
    );
    if (rows.length > 0) {
      console.log(`  ✓ "${op.to}" exists: meaning="${rows[0].meaning}"`);
    } else {
      // Maybe it already existed and source was just deleted
      console.log(`  - "${op.to}" not found (may have already existed beforehand and source was cleaned up)`);
    }
  }

  // Spot-check deletions
  console.log('\n--- Spot-check deletions ---');
  const spotCheck = ['婀娜', '妩媚', '禛', '禧', '绥和', '无恙'];
  for (const phrase of spotCheck) {
    const rows = await query(
      `SELECT id, phrase FROM naming_materials WHERE phrase = $1`, [phrase]
    );
    console.log(`  ${rows.length === 0 ? '✓' : '✗'} "${phrase}": ${rows.length === 0 ? 'removed' : 'STILL EXISTS!'}`);
  }

  await pool.end();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('FATAL:', err);
  pool.end();
  process.exit(1);
});