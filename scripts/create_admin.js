/**
 * 脚本：在 Neon 数据库中创建管理员账号
 * 运行：node scripts/create_admin.js
 */
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log("✓ 已连接到数据库");

    // 1. 检查表是否存在
    const { rows: tblRows } = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='users'
    `);
    if (tblRows.length === 0) {
      console.log("⚠ users 表不存在，正在创建...");
      await client.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          id          TEXT    PRIMARY KEY DEFAULT gen_random_uuid()::text,
          email       TEXT    UNIQUE,
          name        VARCHAR(50),
          password    TEXT,
          avatar      TEXT,
          admin_role  VARCHAR(20),
          gender      VARCHAR(10),
          status      VARCHAR(20) NOT NULL DEFAULT 'active',
          vip_level   INTEGER NOT NULL DEFAULT 0,
          points      INTEGER NOT NULL DEFAULT 0,
          balance     DECIMAL(10,2) NOT NULL DEFAULT 0,
          created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("✓ users 表已创建");
    } else {
      console.log("✓ users 表已存在");
    }

    // 2. 确保缺少的列存在
    await client.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS password TEXT`).catch(()=>{});
    await client.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS admin_role VARCHAR(20)`).catch(()=>{});
    await client.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS name VARCHAR(50)`).catch(()=>{});
    await client.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS avatar TEXT`).catch(()=>{});
    console.log("✓ 检查/补全列完成");

    // 3. 生成 bcrypt 密码 hash
    const passwordHash = await bcrypt.hash("ZGGs1240", 10);
    console.log("✓ 密码 hash 已生成");

    // 4. 生成 UUID（Neon 上 gen_random_uuid 可能不可用）
    const adminId = crypto.randomUUID();

    // 5. 插入或更新管理员账号
    const result = await client.query(`
      INSERT INTO "users" (id, email, name, password, admin_role, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        admin_role = EXCLUDED.admin_role,
        name = EXCLUDED.name,
        updated_at = NOW()
      RETURNING id, email, name, admin_role
    `, [adminId, "seekname@163.com", "管理员", passwordHash, "admin"]);

    console.log("\n========================================");
    console.log("✅ 管理员账号已创建/更新成功！");
    console.log("========================================");
    console.log(`  ID:         ${result.rows[0].id}`);
    console.log(`  邮箱:       ${result.rows[0].email}`);
    console.log(`  名称:       ${result.rows[0].name}`);
    console.log(`  角色:       ${result.rows[0].admin_role}`);
    console.log(`  密码:       ZGGs1240`);
    console.log("========================================");
    console.log("\n访问 https://seekname.cn/admin/login 登录");

    client.release();
    await pool.end();
  } catch (err) {
    console.error("❌ 失败:", err.message);
    console.error(err);
    process.exit(1);
  }
}

main();