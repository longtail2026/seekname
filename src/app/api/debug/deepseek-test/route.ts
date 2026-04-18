/**
 * DeepSeek API 测试接口
 * 用于验证 DeepSeek 在 Vercel Serverless 环境下的连通性和响应时间
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
  const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'vercel' : 'local',
    region: process.env.VERCEL_REGION || 'unknown',
  };

  // 1. 检查 API Key
  if (!DEEPSEEK_API_KEY) {
    results.step1_keyCheck = { ok: false, error: 'DEEPSEEK_API_KEY 未配置' };
    return NextResponse.json(results);
  }
  results.step1_keyCheck = { 
    ok: true, 
    keyPrefix: DEEPSEEK_API_KEY.slice(0, 8) + '...' 
  };

  // 2. 测试 DeepSeek 连通性（简单 ping）
  const testStart = Date.now();
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
        max_tokens: 10,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(8000), // 8秒超时
    });
    results.step2_connectivity = {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - testStart,
    } as Record<string, unknown>;

    if (!response.ok) {
      const errorText = await response.text().catch(() => '无法读取错误响应');
      (results.step2_connectivity as Record<string, unknown>).errorBody = errorText.slice(0, 300);
      return NextResponse.json(results);
    }

    // 3. 解析响应
    const data = await response.json();
    results.step3_response = {
      model: data.model,
      content: data.choices?.[0]?.message?.content,
      usage: data.usage,
      totalLatencyMs: Date.now() - testStart,
    };

  } catch (err: any) {
    const errName = err?.name || 'UnknownError';
    const errMsg = err?.message || String(err);
    results.step2_connectivity = {
      ok: false,
      error: errName + ': ' + errMsg,
      latencyMs: Date.now() - testStart,
    };
  }

  return NextResponse.json(results);
}
