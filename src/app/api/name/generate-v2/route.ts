/**
 * 寻名网起名API V2 - 四层过滤 + AI精排架构
 * POST /api/name/generate-v2
 * 
 * 请求体：
 * {
 *   rawInput?: string,           // 原始输入文本（可选）
 *   surname?: string,            // 姓氏
 *   gender?: "M" | "F",          // 性别
 *   birthDate?: string,          // 生日 YYYY-MM-DD
 *   birthTime?: string,          // 时辰（可选）
 *   expectations?: string,       // 期望寓意
 *   style?: string               // 风格偏好
 * }
 * 
 * 响应：
 * {
 *   success: true,
 *   data: {
 *     structuredIntent: { ... },  // 解析后的意图
 *     candidates: [               // 名字候选列表
 *       {
 *         fullName: "张雨涵",
 *         givenName: "雨涵",
 *         pinyin: "yu han",
 *         wuxing: "水水",
 *         meaning: "雨水滋润；包容涵养",
 *         strokeCount: 16,
 *         score: 85,
 *         scoreBreakdown: { ... },
 *         sources: [{ book: "诗经", text: "雨我公田..." }],
 *         warnings: [],
 *         uniqueness: "medium"
 *       }
 *     ],
 *     statistics: { ... }
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { generateNames, NamingRequest } from "@/lib/naming-engine";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 构建起名请求
    const namingRequest: NamingRequest = {
      rawInput: body.rawInput || "",
      surname: body.surname,
      gender: body.gender,
      birthDate: body.birthDate,
      birthTime: body.birthTime,
      expectations: body.expectations,
      style: body.style,
    };
    
    // 参数校验
    if (!namingRequest.surname || !namingRequest.gender || !namingRequest.birthDate) {
      // 如果没有提供必要参数，尝试从rawInput中解析
      if (namingRequest.rawInput) {
        // 简单解析（实际应该用大模型）
        const parsed = parseSimpleInput(namingRequest.rawInput);
        namingRequest.surname = namingRequest.surname || parsed.surname;
        namingRequest.gender = namingRequest.gender || parsed.gender;
        namingRequest.birthDate = namingRequest.birthDate || parsed.birthDate;
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: "缺少必要参数：请提供姓氏、性别、生日，或提供完整的描述文本" 
          },
          { status: 400 }
        );
      }
    }
    
    if (namingRequest.gender && !["M", "F"].includes(namingRequest.gender)) {
      return NextResponse.json(
        { success: false, error: "性别只能是 M(男) 或 F(女)" },
        { status: 400 }
      );
    }
    
    // 使用起名引擎生成名字
    const result = await generateNames(namingRequest);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "起名失败", details: result.warnings },
        { status: 500 }
      );
    }
    
    // 注意：暂时不创建起名记录，因为name_records表可能不存在
    // 后续可以启用此功能
    
    return NextResponse.json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error("起名 API V2 错误:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "服务器内部错误",
        message: error instanceof Error ? error.message : "未知错误"
      },
      { status: 500 }
    );
  }
}

// 简单输入解析（用于演示，实际应该用大模型）
function parseSimpleInput(rawInput: string): {
  surname: string;
  gender: "M" | "F";
  birthDate: string;
} {
  // 默认值
  const result = {
    surname: "张",
    gender: "F" as "M" | "F",
    birthDate: "2025-03-15",
  };
  
  // 简单关键词匹配
  const lowerInput = rawInput.toLowerCase();
  
  // 提取姓氏
  const surnameMatch = rawInput.match(/姓([\u4e00-\u9fa5])/);
  if (surnameMatch) {
    result.surname = surnameMatch[1];
  }
  
  // 提取性别
  if (lowerInput.includes("男孩") || lowerInput.includes("男") || lowerInput.includes("儿子")) {
    result.gender = "M";
  } else if (lowerInput.includes("女孩") || lowerInput.includes("女") || lowerInput.includes("女儿")) {
    result.gender = "F";
  }
  
  // 提取日期（简化版）
  const dateMatch = rawInput.match(/(\d{4})[年.-](\d{1,2})[月.-](\d{1,2})/);
  if (dateMatch) {
    const year = dateMatch[1];
    const month = dateMatch[2].padStart(2, '0');
    const day = dateMatch[3].padStart(2, '0');
    result.birthDate = `${year}-${month}-${day}`;
  }
  
  return result;
}

// 测试接口
export async function GET() {
  return NextResponse.json({
    message: "寻名网起名API V2 - 四层过滤 + AI精排架构",
    version: "2.0.0",
    usage: "POST /api/name/generate-v2",
    exampleRequest: {
      rawInput: "女孩，姓张，2025年3月15日出生，希望名字温柔诗意，喜欢水意象",
      // 或提供结构化参数：
      // surname: "张",
      // gender: "F",
      // birthDate: "2025-03-15",
      // expectations: "温柔诗意，喜欢水意象",
      // style: "古典"
    },
    exampleResponse: {
      success: true,
      data: {
        structuredIntent: {
          surname: "张",
          gender: "F",
          birthDate: "2025-03-15",
          style: ["温柔", "诗意"],
          wordCount: 2,
          wuxing: ["水"],
          avoidances: ["生僻字", "复杂字"],
          imagery: ["清", "涵", "汐", "沐", "雨"],
          sourcePreference: ["诗经"]
        },
        candidates: [
          {
            fullName: "张雨涵",
            givenName: "雨涵",
            pinyin: "yu han",
            wuxing: "水水",
            meaning: "雨水滋润；包容涵养",
            strokeCount: 16,
            score: 85,
            scoreBreakdown: {
              cultural: 80,
              popularity: 70,
              harmony: 80,
              safety: 95,
              overall: 85
            },
            sources: [
              { book: "诗经", text: "雨我公田，遂及我私..." }
            ],
            warnings: [],
            uniqueness: "medium"
          }
        ],
        statistics: {
          totalCharactersConsidered: 45,
          totalClassicsEntriesMatched: 12,
          totalNameSamplesAnalyzed: 1000,
          safetyChecksPerformed: 38,
          generationTime: 1250
        }
      }
    }
  });
}