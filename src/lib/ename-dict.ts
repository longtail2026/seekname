/**
 * 英文名词典
 * 基于爬取的"注音英汉人名词典"数据，提供英文名查询、推荐功能
 */

import fs from 'fs';
import path from 'path';

// 英文名记录类型
export interface EnameRecord {
  /** 英文名 */
  name: string;
  /** 性别：男性/女性/中性 */
  gender: string;
  /** 音标（已解码HTML实体） */
  phonetic: string;
  /** 中文译名 */
  chinese: string;
  /** 来源/语种（如：英语、希伯来语） */
  origin: string;
  /** 流行度（如：★★★、★★、★、无） */
  popularity: string;
  /** 首字母 */
  firstLetter: string;
}

// 缓存
let records: EnameRecord[] | null = null;

/**
 * HTML实体解码
 */
function decodeHtmlEntities(text: string): string {
  if (!text || text === '无' || text === '') return '';
  
  // 音标常用HTML实体映射
  const entityMap: Record<string, string> = {
    '&#603;': 'ɛ',
    '&#601;': 'ə',
    '&#596;': 'ɔ',
    '&#652;': 'ɜ',
    '&#650;': 'ʊ',
    '&#626;': 'n̩',
    '&#331;': 'ŋ',
    '&#648;': 'ʃ',
    '&#658;': 'ʒ',
    '&#952;': 'θ',
    '&#240;': 'ð',
    '&#592;': 'æ',
    '&#593;': 'ɑ',
    '&#594;': 'ɒ',
    '&#618;': 'ɪ',
    '&#643;': 'ʂ',
    '&#654;': 'ʝ',
    '&#712;': 'ˈ',
    '&#716;': 'ˌ',
  };
  
  let result = text;
  for (const [entity, char] of Object.entries(entityMap)) {
    result = result.split(entity).join(char);
  }
  // 移除剩余未处理的HTML实体（如其他 &#xxx; 模式）
  result = result.replace(/&#?\w+;/g, '');
  // 清理多余的引号和括号
  result = result.replace(/'/g, '').replace(/\[/g, '').replace(/\]/g, '');
  return result.trim();
}

/**
 * 加载词典数据
 */
function loadDict(): EnameRecord[] {
  if (records) return records;

  const csvPath = path.join(process.cwd(), 'ename_dict_data.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn('[ename-dict] CSV文件不存在:', csvPath);
    records = [];
    return records;
  }

  const csv = fs.readFileSync(csvPath, 'utf-8');
  const lines = csv.trim().split('\n');
  
  records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 解析CSV（简单解析，不处理含逗号的字段）
    const cols = line.split(',');
    if (cols.length < 6) continue;

    const name = cols[0]?.trim() || '';
    const gender = cols[1]?.trim() || '';
    const phonetic = cols[2]?.trim() || '';
    const chinese = cols[3]?.trim() || '';
    const origin = cols[4]?.trim() || '';
    const popularity = cols[5]?.trim() || '';

    if (!name) continue;

    records.push({
      name,
      gender,
      phonetic: decodeHtmlEntities(phonetic),
      chinese,
      origin: origin || '',
      popularity: popularity || '无',
      firstLetter: name[0].toUpperCase(),
    });
  }

  return records;
}

/**
 * 获取所有记录
 */
export function getAllRecords(): EnameRecord[] {
  return loadDict();
}

/**
 * 按性别获取英文名
 */
export function getByGender(gender: '男性' | '女性' | '中性' | 'all'): EnameRecord[] {
  const data = loadDict();
  if (gender === 'all') return data;
  return data.filter(r => r.gender === gender);
}

/**
 * 按首字母获取英文名
 */
export function getByFirstLetter(letter: string): EnameRecord[] {
  const data = loadDict();
  const upper = letter.toUpperCase();
  return data.filter(r => r.firstLetter === upper);
}

/**
 * 搜索英文名（支持模糊搜索）
 */
export function searchNames(query: string, limit = 50): EnameRecord[] {
  const data = loadDict();
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results = data.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.chinese.includes(q) ||
    r.origin.includes(q)
  );

  // 按匹配度排序：前缀匹配 > 包含匹配
  results.sort((a, b) => {
    const aPrefix = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    // 优先流行度高的
    const aPop = a.popularity.length;
    const bPop = b.popularity.length;
    return bPop - aPop;
  });

  return results.slice(0, limit);
}

/**
 * 获取首字母分组统计
 */
export function getLetterStats(): Record<string, number> {
  const data = loadDict();
  const stats: Record<string, number> = {};
  for (const r of data) {
    stats[r.firstLetter] = (stats[r.firstLetter] || 0) + 1;
  }
  return stats;
}

/**
 * 获取性别统计
 */
export function getGenderStats(): Record<string, number> {
  const data = loadDict();
  const stats: Record<string, number> = {};
  for (const r of data) {
    stats[r.gender] = (stats[r.gender] || 0) + 1;
  }
  return stats;
}

/**
 * 获取所有来源列表
 */
export function getOrigins(): string[] {
  const data = loadDict();
  const origins = new Set<string>();
  for (const r of data) {
    if (r.origin) origins.add(r.origin);
  }
  return Array.from(origins).sort();
}

/**
 * 按来源筛选
 */
export function getByOrigin(origin: string): EnameRecord[] {
  const data = loadDict();
  return data.filter(r => r.origin === origin);
}

/**
 * 获取推荐英文名（智能推荐）
 */
export function getRecommendations(options: {
  gender?: '男性' | '女性' | '中性' | 'all';
  count?: number;
  exclude?: string[];
} = {}): EnameRecord[] {
  const data = loadDict();
  const { gender = 'all', count = 20, exclude = [] } = options;

  let candidates = gender === 'all' ? data : data.filter(r => r.gender === gender);
  
  // 排除指定名字
  if (exclude.length > 0) {
    const excludeSet = new Set(exclude.map(n => n.toLowerCase()));
    candidates = candidates.filter(r => !excludeSet.has(r.name.toLowerCase()));
  }

  // 按流行度加权排序
  const weighted = candidates.map(r => ({
    record: r,
    weight: r.popularity === '★★★' ? 5 :
            r.popularity === '★★' ? 4 :
            r.popularity === '★' ? 3 :
            r.popularity === '无' ? 1 : 0,
  }));

  // 随机打乱 + 流行度加权
  weighted.sort(() => Math.random() - 0.5);
  weighted.sort((a, b) => b.weight - a.weight);

  return weighted.slice(0, count).map(w => w.record);
}

/**
 * 获取随机名字
 */
export function getRandom(options: {
  gender?: '男性' | '女性' | '中性' | 'all';
  count?: number;
} = {}): EnameRecord[] {
  const data = loadDict();
  const { gender = 'all', count = 1 } = options;

  let candidates = gender === 'all' ? data : data.filter(r => r.gender === gender);
  
  // 乱序
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * 获取总数量
 */
export function getTotalCount(): number {
  return loadDict().length;
}