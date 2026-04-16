/**
 * 图片上传 API
 * POST /api/upload/image
 *
 * 生产环境（Vercel）：使用 Vercel Blob 存储
 * 开发环境：写入 public/uploads/（需手动确保目录存在）
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "seekname_default_secret_change_in_production"
);

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("token")?.value
    || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未上传文件" }, { status: 400 });
    }

    // 类型校验
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "不支持的文件类型，仅支持 JPG/PNG/GIF/WebP" },
        { status: 400 }
      );
    }

    // 大小校验
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "文件大小超过 5MB 限制" },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    let url: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // ─── Vercel Blob 生产环境 ───────────────────────────────
      const { put } = await import("@vercel/blob");
      const blob = await put(filename, file, { access: "public" });
      url = blob.url;
    } else {
      // ─── 本地开发环境 ───────────────────────────────────────
      // 写入 public/uploads/
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fs = await import("fs");
      const path = await import("path");

      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, buffer);

      url = `/uploads/${filename}`;
    }

    return NextResponse.json({ url, filename, size: file.size });
  } catch (error) {
    console.error("[Upload Image]", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
