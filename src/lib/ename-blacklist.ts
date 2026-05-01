/**
 * 英文名黑名单
 * 
 * 这些名字被过滤的原因：
 * 1. 中文谐音歧义（如 Shem → "射门"）
 * 2. 英语中带负面含义（如 Dick 俚语含义）
 * 3. 性别混淆（男性名被女性使用过多导致的混淆）
 * 4. 过时/老气（如 Bertha, Gertrude 等）
 * 5. 中文译名不雅
 */

export interface BlacklistEntry {
  name: string;
  reason: string;
  severity: 'hard' | 'soft';  // hard=绝对排除, soft=仅降权
}

export const BLACKLIST: BlacklistEntry[] = [
  // ===== 中文谐音歧义 =====
  { name: 'Shem', reason: '中文谐音歧义「射门」', severity: 'hard' },
  { name: 'Dick', reason: '英语俚语负面含义', severity: 'hard' },
  { name: 'Cock', reason: '英语俚语负面含义', severity: 'hard' },
  { name: 'Bitch', reason: '英语贬义词汇', severity: 'hard' },
  { name: 'Damn', reason: '英语咒骂词汇', severity: 'hard' },
  { name: 'Fuck', reason: '英语粗口', severity: 'hard' },
  { name: 'Shit', reason: '英语粗口', severity: 'hard' },
  { name: 'Pussy', reason: '英语俚语不当含义', severity: 'hard' },
  { name: 'Ass', reason: '英语俚语不当含义', severity: 'hard' },
  { name: 'Hell', reason: '宗教负面含义', severity: 'hard' },
  { name: 'Satan', reason: '宗教负面含义', severity: 'hard' },
  { name: 'Lucifer', reason: '宗教负面含义', severity: 'hard' },
  { name: 'Demon', reason: '宗教负面含义', severity: 'hard' },
  { name: 'Devil', reason: '宗教负面含义', severity: 'hard' },
  { name: 'Voldemort', reason: '虚构反派名称', severity: 'hard' },
  { name: 'Hitler', reason: '历史负面人物', severity: 'hard' },
  { name: 'Stalin', reason: '历史负面人物', severity: 'hard' },
  { name: 'Bin Laden', reason: '历史负面人物', severity: 'hard' },
  { name: 'Osama', reason: '历史负面人物', severity: 'hard' },

  // ===== 过时/老气 =====
  { name: 'Bertha', reason: '过时名字', severity: 'soft' },
  { name: 'Gertrude', reason: '过时名字', severity: 'soft' },
  { name: 'Agnes', reason: '过时名字', severity: 'soft' },
  { name: 'Ethel', reason: '过时名字', severity: 'soft' },
  { name: 'Mildred', reason: '过时名字', severity: 'soft' },
  { name: 'Myrtle', reason: '过时名字', severity: 'soft' },
  { name: 'Beulah', reason: '过时名字', severity: 'soft' },
  { name: 'Prudence', reason: '过时/过于古板', severity: 'soft' },
  { name: 'Eustace', reason: '过时名字', severity: 'soft' },
  { name: 'Sylvester', reason: '过时名字（文化关联卡通猫）', severity: 'soft' },
  { name: 'Waldo', reason: '过时名字', severity: 'soft' },

  // ===== 特别容易混淆或中文译名不雅 =====
  { name: 'Candy', reason: '英文中俚语含义歧义', severity: 'soft' },
  { name: 'Cherry', reason: '英文中俚语含义歧义', severity: 'soft' },
  { name: 'Fanny', reason: '英文中俚语含义歧义', severity: 'hard' },
  { name: 'Horny', reason: '英文俚语含义', severity: 'hard' },
  { name: 'Wang', reason: '中文姓氏作为名容易混淆', severity: 'soft' },
  { name: 'Zhang', reason: '中文姓氏作为名容易混淆', severity: 'soft' },
  { name: 'Tits', reason: '性相关俚语', severity: 'hard' },
  { name: 'Nigger', reason: '种族歧视词汇', severity: 'hard' },
  { name: 'Niger', reason: '与种族歧视词汇拼写相似', severity: 'soft' },

  // ===== 中文音译不雅 =====
  { name: 'Pooh', reason: '译名「噗」不雅', severity: 'soft' },
  { name: 'Pee', reason: '译名「尿」', severity: 'hard' },
  { name: 'Test', reason: '不建议使用普通单词', severity: 'soft' },
  { name: 'Chink', reason: '种族歧视词汇', severity: 'hard' },
  { name: 'Smegma', reason: '医学术语不雅', severity: 'hard' },
];

/**
 * 查找名字是否在黑名单中
 */
export function findInBlacklist(name: string): BlacklistEntry | undefined {
  return BLACKLIST.find(entry => entry.name.toLowerCase() === name.toLowerCase());
}

/**
 * 检查名字是否被硬黑名单排除
 */
export function isHardBlocked(name: string): boolean {
  return BLACKLIST.some(entry => 
    entry.name.toLowerCase() === name.toLowerCase() && entry.severity === 'hard'
  );
}

/**
 * 获取黑名单降权分数（soft 扣 20 分，hard 扣 100 分溢出）
 */
export function getBlacklistPenalty(name: string): { penalty: number; reason: string | null } {
  const entry = findInBlacklist(name);
  if (!entry) return { penalty: 0, reason: null };
  if (entry.severity === 'hard') return { penalty: 999, reason: entry.reason };
  return { penalty: 20, reason: entry.reason };
}