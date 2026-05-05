/**
 * 外国友人起中文名 API
 * POST /api/foreigner-name/generate
 */
import { NextRequest, NextResponse } from "next/server";
import { generateForeignerChineseNames } from "@/lib/foreigner-name-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, gender, style, contains, avoid } = body;

    // 参数校验
    if (!firstName || firstName.trim().length === 0) {
      return NextResponse.json(
        { success: false, data: { general: [], elegant: [], personality: [] }, message: "请输入外文名" },
        { status: 400 }
      );
    }
    if (!gender || !["male", "female", "neutral"].includes(gender)) {
      return NextResponse.json(
        { success: false, data: { general: [], elegant: [], personality: [] }, message: "请选择性别" },
        { status: 400 }
      );
    }
    if (!style || !["classic", "elegant", "sunshine", "simple", "chinese-style"].includes(style)) {
      return NextResponse.json(
        { success: false, data: { general: [], elegant: [], personality: [] }, message: "请选择风格" },
        { status: 400 }
      );
    }

    const result = await generateForeignerChineseNames({
      firstName: firstName.trim(),
      lastName: lastName?.trim() || "",
      gender,
      style,
      contains: contains?.trim(),
      avoid: avoid?.trim(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API foreigner-name/generate] 错误:", error);
    return NextResponse.json(
      {
        success: false,
        data: { general: [], elegant: [], personality: [] },
        message: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}