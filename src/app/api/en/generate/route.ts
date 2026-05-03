/**
 * 英文名生成 API
 * POST /api/en/generate
 */
import { NextRequest, NextResponse } from "next/server";
import { generateEnglishNames } from "@/lib/ename-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gender, surname, fullName, needs, avoidFlags, lengthPreference, count } = body;

    // 参数校验
    if (!gender || !["male", "female"].includes(gender)) {
      return NextResponse.json(
        { success: false, message: "请选择性别" },
        { status: 400 }
      );
    }
    if (!surname || surname.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "请输入中文姓氏" },
        { status: 400 }
      );
    }

    const result = await generateEnglishNames({
      gender,
      surname: surname.trim(),
      fullName: fullName?.trim(),
      needs: needs || [],
      avoidFlags: avoidFlags || [],
      lengthPreference: lengthPreference || undefined,
      count: count || 10,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API en/generate] 错误:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误", data: [] },
      { status: 500 }
    );
  }
}