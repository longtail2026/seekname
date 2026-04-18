import { NextResponse } from 'next/server';
import { callDeepSeek } from '@/lib/deepseek-integration';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // 预热调用：用极简请求激活冷启动，让后续正式请求走 warm 实例
    await callDeepSeek(
      [
        { role: 'user', content: 'hi' }
      ],
      { maxTokens: 3, temperature: 0.1 }
    );
    return NextResponse.json({ ok: true, warmed: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message });
  }
}
