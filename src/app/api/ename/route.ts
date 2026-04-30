/**
 * 英文名 API
 * GET /api/ename
 *
 * 查询参数：
 *   search: string       - 搜索关键词
 *   gender: string       - 男性/女性/中性/all
 *   letter: string       - 首字母 A-Z
 *   origin: string       - 来源语种
 *   action: string       - recommend | random | stats | list
 *   count: number        - 返回数量（默认20）
 *   exclude: string      - 排除的名字（逗号分隔）
 */
import { NextRequest, NextResponse } from "next/server";
import {
  searchNames,
  getByGender,
  getByFirstLetter,
  getByOrigin,
  getRecommendations,
  getRandom,
  getLetterStats,
  getGenderStats,
  getOrigins,
  getAllRecords,
  getTotalCount,
} from "@/lib/ename-dict";
import { semanticSearchEname, searchByMeaning } from "@/lib/semantic-ename-search";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const gender = searchParams.get("gender") || "all";
  const letter = searchParams.get("letter") || "";
  const origin = searchParams.get("origin") || "";
  const action = searchParams.get("action") || "list";
  const count = parseInt(searchParams.get("count") || "20", 10);
  const exclude = searchParams.get("exclude")
    ? searchParams.get("exclude")!.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  try {
    // 语义搜索：根据含义/描述搜索
    if (action === "semantic" && search) {
      const semanticResults = await semanticSearchEname(search, {
        limit: count,
        gender: gender,
        firstLetter: letter || undefined,
        exclude,
      });
      return NextResponse.json({
        success: true,
        data: semanticResults,
        total: semanticResults.length,
      });
    }

    switch (action) {
      case "stats":
        return NextResponse.json({
          success: true,
          data: {
            total: getTotalCount(),
            byGender: getGenderStats(),
            byLetter: getLetterStats(),
            origins: getOrigins(),
          },
        });

      case "recommend":
        return NextResponse.json({
          success: true,
          data: getRecommendations({
            gender: gender as any,
            count,
            exclude,
          }),
        });

      case "random":
        return NextResponse.json({
          success: true,
          data: getRandom({
            gender: gender as any,
            count,
          }),
        });

      case "list":
        if (search) {
          return NextResponse.json({
            success: true,
            data: searchNames(search, count),
            total: getTotalCount(),
          });
        }
        if (letter) {
          return NextResponse.json({
            success: true,
            data: getByFirstLetter(letter),
          });
        }
        if (origin) {
          return NextResponse.json({
            success: true,
            data: getByOrigin(origin),
          });
        }
        if (gender !== "all") {
          return NextResponse.json({
            success: true,
            data: getByGender(gender as any),
          });
        }
        // 默认返回所有
        return NextResponse.json({
          success: true,
          data: getAllRecords(),
          total: getTotalCount(),
        });

      default:
        return NextResponse.json({ success: false, error: "未知action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[ename-api] 错误:", error);
    return NextResponse.json({ success: false, error: "服务器内部错误" }, { status: 500 });
  }
}