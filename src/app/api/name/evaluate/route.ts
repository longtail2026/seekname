/**
 * 名字测评 API（服务端专用）
 * POST /api/name/evaluate
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface EvaluateBody {
  name: string;
}

export async function POST(req: NextRequest) {
  try {
    const { name }: EvaluateBody = await req.json();
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "名字不能为空" }, { status: 400 });
    }

    const chars = name.trim().split("").filter(Boolean);
    const lastChar = chars[chars.length - 1] || "";

    // ── 音律评分（客户端 phonetic-optimizer 同款逻辑） ──
    let harmony = 70;
    const tones = chars.map((c) => {
      const pinyinMap: Record<string, number> = {
        // 阴平 1
        "一": 1, "依": 1, "伊": 1, "医": 1, "衣": 1,
        // 阳平 2
        "啊": 2, "阿": 2, "呀": 2,
        // 上声 3
        "哦": 3, "喔": 3, "鹅": 3, "俄": 3, "额": 3, "恶": 3,
        // 去声 4
        "乌": 4, "屋": 4, "无": 4, "五": 4,
        "于": 4, "鱼": 4, "玉": 4, "月": 4, "雨": 4,
        // 轻声/阳平兜底
        "安": 5, "昂": 5, "爱": 5, "恩": 5,
      };
      return pinyinMap[c] ?? 1;
    });

    if (tones.length >= 2) {
      const pairs = [[0, 1], [0, 2], [1, 2]];
      const good = pairs.filter(([a, b]) => {
        if (a >= tones.length || b >= tones.length) return false;
        const diff = Math.abs(tones[a] - tones[b]);
        return diff === 2 || diff === 3;
      }).length;
      harmony = Math.min(95, 50 + good * 20);
    }
    if (chars.length === 2) harmony = Math.min(95, harmony + 5);
    if (new Set(chars).size < chars.length) harmony = Math.max(40, harmony - 10);

    // ── 文化分（查询典籍） ──
    let cultural = 30;
    try {
      const entry = await prisma.classicsEntry.findFirst({
        where: { ancientText: { contains: lastChar } },
        select: { bookName: true },
      });
      cultural = entry ? 75 : 30;
    } catch {
      cultural = 30; // DB unavailable → fallback
    }

    // ── 重名风险（查询人名样本） ──
    let uniqueness = 70;
    try {
      const count = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*) as cnt FROM name_samples
        WHERE given_name LIKE ${"%" + lastChar + "%"}
        LIMIT 1
      `;
      if (count.length > 0) {
        const n = Number(count[0].cnt);
        uniqueness = n > 10000 ? 60 : n > 1000 ? 75 : 88;
      }
    } catch {
      uniqueness = 70; // DB unavailable → fallback
    }

    // ── 寓意（内置字义库） ──
    const meanings: Record<string, string> = {
      "浩": "浩：盛大、广阔，寓意胸怀宽广、志向远大",
      "然": "然：如此、正确，寓意明理正直、表里如一",
      "沐": "沐：润泽、洗涤，寓意心灵纯净、恩泽加被",
      "涵": "涵：包容、涵养，寓意学识渊博、海纳百川",
      "诗": "诗：诗歌、美文，寓意文采斐然、才情出众",
      "雅": "雅：高雅、风尚，寓意举止端庄、品位不俗",
      "晨": "晨：清晨、晨光，寓意朝气蓬勃、光明磊落",
      "曦": "曦：晨曦、阳光，寓意温暖照耀、前途光明",
      "霖": "霖：连绵细雨，寓意润泽万物、福泽深厚",
      "轩": "轩：气宇轩昂，寓意才华出众、气度不凡",
      "泽": "泽：恩泽、润泽，寓意福泽深厚、惠及他人",
      "宇": "宇：天地宇宙，寓意胸怀宽广、志向高远",
      "琪": "琪：美玉、珍奇，寓意珍贵美好、冰清玉洁",
      "瑶": "瑶：美玉，寓意如珠似玉、珍贵高雅",
      "琳": "琳：美玉之声，寓意才貌双全、冰清玉润",
      "墨": "墨：文墨、书香，寓意文采飞扬、学识渊博",
      "云": "云：云彩、飘逸，寓意志向高远、自由自在",
      "风": "风：风度、气韵，寓意潇洒从容、气宇不凡",
      "月": "月：月光、柔美，寓意温柔纯洁、静谧美好",
      "星": "星：星辰、璀璨，寓意前程似锦、光彩照人",
    };

    const total = Math.round((cultural + harmony + uniqueness) / 3);

    return NextResponse.json({
      name,
      total,
      cultural,
      harmony,
      uniqueness,
      meaning: meanings[lastChar] || `此名富有寓意，体现了家长对孩子的美好期望`,
      suggestion: total >= 80 ? "名字整体评分优秀，推荐使用" :
                 total >= 65 ? "名字有一定优点，可以使用" :
                 "建议综合考虑其他名字",
    });
  } catch (err: unknown) {
    console.error("[/api/name/evaluate]", err);
    return NextResponse.json({ error: "评测失败，请重试" }, { status: 500 });
  }
}
