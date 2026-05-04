/**
 * 英文名词典语义搜索
 * 
 * 此模块已被标记为废弃——ename_dict表的embedding列已于2026-05-04删除。
 * 原因：英文名的语义向量匹配对中文起英文名无实际意义。
 * 
 * 所有搜索函数均返回空数组，并由 fallback 机制（结构音韵匹配）替代。
 * 保留此文件以避免破坏import结构，但功能已停用。
 * 
 * 替代方案：
 * - 音韵结构匹配: ename-phonetic-structure.ts
 * - 字典全文搜索: ename-dict.ts (localSearch, getByName)
 * - 名字生成: ename-generator.ts
 */

import { queryRaw } from "./prisma";

// ========== 类型定义 ==========

export interface EnameSemanticMatch {
  name: string;
  gender: string;
  phonetic: string;
  chinese: string;
  origin: string;
  popularity: string;
  firstLetter: string;
  similarity: number;
}

export interface EnameSemanticSearchOptions {
  limit?: number;
  threshold?: number;
  gender?: string;
  firstLetter?: string;
  exclude?: string[];
}

/**
 * 语义搜索——已废弃
 * embedding列已删除，始终返回空数组
 */
export async function semanticSearchEname(
  _query: string,
  _options: EnameSemanticSearchOptions = {}
): Promise<EnameSemanticMatch[]> {
  // embedding列已删除，语义搜索不可用
  return [];
}

/**
 * 根据中文描述语义搜索英文名——已废弃
 */
export async function searchByNameDescription(
  _description: string,
  _genderFilter: "male" | "female" | "neutral" | "all" = "all",
  _limit: number = 20
): Promise<EnameSemanticMatch[]> {
  return [];
}

/**
 * 获取类似名字推荐——已废弃
 */
export async function getSimilarNames(
  _name: string,
  _exclude: boolean = true,
  _count: number = 10
): Promise<EnameSemanticMatch[]> {
  return [];
}

/**
 * 根据含义语义搜索——已废弃
 */
export async function searchByMeaning(
  _meaning: string,
  _genderFilter: "male" | "female" | "neutral" | "all" = "all",
  _limit: number = 20
): Promise<EnameSemanticMatch[]> {
  return [];
}

/**
 * 根据风格/气质搜索——已废弃
 */
export async function searchByVibe(
  _vibe: string,
  _genderFilter: "male" | "female" | "neutral" | "all" = "all",
  _limit: number = 20
): Promise<EnameSemanticMatch[]> {
  return [];
}

// ========== 导出 ==========

export const SemanticEnameSearch = {
  search: semanticSearchEname,
  byDescription: searchByNameDescription,
  similar: getSimilarNames,
  byMeaning: searchByMeaning,
  byVibe: searchByVibe,
};