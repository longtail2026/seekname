/**
 * 英文名音节分解引擎 v2 — 面向中文拼音匹配优化版
 * 
 * 目标：让 Gordon(2_g_or_on_n) 与 guoguang(2_g_uo_uang_ng) 能匹配上
 */
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

function isVowel(ch) {
  return VOWELS.has(ch.toLowerCase());
}

function isYVowel(ch, pos, name) {
  const c = ch.toLowerCase();
  if (c !== 'y') return false;
  if (pos >= name.length - 1) return true;
  const next = name[pos + 1].toLowerCase();
  return !isVowel(next);
}

function isAnyVowel(ch, pos, name) {
  return isVowel(ch) || isYVowel(ch, pos, name);
}

const LEGAL_ONSETS = new Set([
  'b', 'bl', 'br', 'c', 'ch', 'chr', 'cl', 'cr',
  'd', 'dr', 'f', 'fl', 'fr', 'g', 'gh', 'gl', 'gn', 'gr',
  'h', 'j', 'k', 'kh', 'kn', 'l', 'm', 'n', 'p', 'ph', 'pl', 'pn', 'pr', 'ps',
  'qu', 'r', 's', 'sc', 'sch', 'scr', 'sh', 'shr', 'sk', 'sl', 'sm', 'sn',
  'sp', 'spl', 'spr', 'sq', 'st', 'str', 'sw', 't', 'th', 'tr', 'tw',
  'v', 'w', 'wh', 'wr', 'x', 'y', 'z', 'zh',
]);

function isLegalOnset(c) {
  return LEGAL_ONSETS.has(c);
}

/**
 * 分割音节
 */
function splitSyllables(name) {
  const s = name.toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return [];
  const chars = [...s];
  const n = chars.length;

  const hasSilentE = n > 2 && s[n - 1] === 'e' && [...s.slice(0, -1)].some(c => isVowel(c));
  const effectiveLen = hasSilentE ? n - 1 : n;

  const vowelGroups = [];
  let inVowel = false;
  let start = -1;
  for (let i = 0; i < effectiveLen; i++) {
    if (isAnyVowel(chars[i], i, s)) {
      if (!inVowel) { start = i; inVowel = true; }
    } else {
      if (inVowel) { vowelGroups.push([start, i - 1]); inVowel = false; }
    }
  }
  if (inVowel) vowelGroups.push([start, effectiveLen - 1]);
  if (vowelGroups.length === 0) return [s];

  const segments = [];
  for (let i = 0; i < vowelGroups.length; i++) {
    const [vStart, vEnd] = vowelGroups[i];
    let segEnd;

    if (i < vowelGroups.length - 1) {
      const nextVStart = vowelGroups[i + 1][0];
      const middleCons = chars.slice(vEnd + 1, nextVStart).join('');
      let splitPos = 0;
      for (let j = middleCons.length; j >= 1; j--) {
        if (isLegalOnset(middleCons.slice(j))) {
          splitPos = j;
          break;
        }
      }
      segEnd = vEnd + splitPos;
    } else {
      segEnd = effectiveLen - 1;
    }

    const segStart = i === 0 ? 0 : segments[i - 1].end + 1;
    const actualEnd = Math.max(segStart, segEnd);
    const finalEnd = (i === vowelGroups.length - 1 && hasSilentE) ? n - 1 : actualEnd;
    segments.push({ start: segStart, end: finalEnd });
  }

  return segments.map(seg => chars.slice(seg.start, seg.end + 1).join(''));
}

/**
 * 提取开头音
 */
function extractStartSound(syllables) {
  if (!syllables.length) return '';
  const first = syllables[0];
  let s = '';
  for (let i = 0; i < first.length; i++) {
    if (isAnyVowel(first[i], i, first)) break;
    s += first[i];
  }
  return s;
}

/**
 * 提取中间韵母
 */
function extractMiddleSound(syllables) {
  const rimes = [];
  for (const syl of syllables) {
    let vPos = -1;
    for (let i = 0; i < syl.length; i++) {
      if (isAnyVowel(syl[i], i, syl)) { vPos = i; break; }
    }
    if (vPos >= 0) {
      rimes.push(syl.slice(vPos));
    } else {
      rimes.push(syl);
    }
  }
  return rimes.join('_');
}

/**
 * 末尾辅音标准化字典
 */
const ENDING_DEDUP = {
  'ce': 'ce', 'de': 'd', 'ke': 'k', 'le': 'l', 'me': 'm',
  'ne': 'n', 'pe': 'p', 're': 'r', 'se': 's', 'te': 't',
  've': 'v', 'ze': 'z', 'the': 'th', 'che': 'ch', 'she': 'sh',
  'ge': 'g', 'be': 'b',
  'ck': 'k', 'tch': 'ch', 'tt': 't', 'll': 'l', 'nn': 'n',
  'bb': 'b', 'dd': 'd', 'gg': 'g', 'mm': 'm', 'pp': 'p',
  'ss': 's', 'ff': 'f', 'zz': 'z', 'rr': 'r',
  'nt': 't', 'nd': 'd', 'rd': 'd', 'ld': 'd', 'lt': 't',
  'rt': 't', 'st': 't', 'sh': 'sh', 'ch': 'ch', 'th': 'th',
  'ph': 'f', 'gh': '', 'ng': 'ng', 'nk': 'k', 'rn': 'n',
  'ln': 'n', 'tn': 'n', 'lm': 'm', 'rm': 'm', 'rp': 'p',
  'rl': 'l', 'ft': 't', 'pt': 't', 'ct': 't', 'xt': 't',
  'sk': 'k', 'sp': 'p', 'mp': 'p', 'mb': 'm', 'ns': 's',
  'nc': 'k', 'nts': 'ts', 'nds': 'ds', 'cks': 'ks',
  'ght': 't', 'ghts': 'ts', 'gne': 'n',
};

function normalizeEnding(str) {
  if (!str || str.length === 0) return '';
  let result = str;
  while (result.length > 0) {
    if (ENDING_DEDUP[result] !== undefined) {
      result = ENDING_DEDUP[result];
      break;
    }
    if (result.length > 1 && result[0] === result[1]) {
      result = result[0];
      break;
    }
    if (result.length > 1) {
      const short = result.slice(1);
      if (ENDING_DEDUP[short] !== undefined) {
        result = short;
        break;
      }
    }
    break;
  }
  return result;
}

function extractEndSound(syllables) {
  if (!syllables.length) return '';
  const last = syllables[syllables.length - 1];

  let scanEnd = last.length - 1;
  if (last.length > 2 && last[last.length - 1] === 'e') {
    if ([...last.slice(0, -1)].some(c => isVowel(c))) {
      scanEnd = last.length - 2;
    }
  }

  for (let i = scanEnd; i >= 0; i--) {
    if (isAnyVowel(last[i], i, last)) {
      let endStr = last.slice(i + 1, scanEnd + 1);
      return normalizeEnding(endStr);
    }
  }
  return last;
}

function decomposeName(name) {
  const syllables = splitSyllables(name);
  if (!syllables.length) {
    return { syllables: 0, startSound: '', middleSound: '', endSound: '', pattern: '' };
  }
  return {
    syllables: syllables.length,
    startSound: extractStartSound(syllables),
    middleSound: extractMiddleSound(syllables),
    endSound: extractEndSound(syllables),
    pattern: `${syllables.length}_${extractStartSound(syllables)}_${extractMiddleSound(syllables)}_${extractEndSound(syllables)}`
  };
}

// ===== 更简洁的中文拼音分解 =====
function decomposePinyin(pinyin) {
  // 直接用英文的元音分割法，因为拼音的元音组很规整
  return decomposeName(pinyin);
}

// ===== 测试 =====
function test() {
  const testCases = [
    ['Gordon',     '2_g_or_on_n'],
    ['Jason',      '2_j_a_on_n'],
    ['David',      '2_d_a_id_d'],
    ['Daniel',     '2_d_a_iel_l'],
    ['Jack',       '1_j_ack_k'],
    ['Charles',    '2_ch_ar_es_s'],
    ['Thomas',     '2_th_o_as_s'],
    ['Brian',      '1_br_ian_n'],
    ['Mike',       '1_m_ike_k'],
    ['Grace',      '1_gr_ace_ce'],
    ['Steven',     '2_st_e_en_n'],
    ['Gary',       '2_g_a_y_'],
    ['Gavin',      '2_g_a_in_n'],
    ['Gerald',     '2_g_e_ald_ld'],
    ['George',     '1_g_eorge_rg'],
    ['Grant',      '1_gr_ant_t'],
    ['Glen',       '1_gl_en_n'],
    ['Graham',     '2_gr_a_am_m'],
    ['Greg',       '1_gr_eg_g'],
    ['Griffin',    '2_gr_if_in_n'],
    ['Grover',     '2_gr_o_er_r'],
    ['Gunner',     '2_g_un_er_r'],
    ['Guy',        '1_g_uy_'],
    ['Guthrie',    '2_g_uth_ie_'],
    ['guoguang',   '2_g_uo_uang_ng'],
    ['zhangwei',   '2_zh_ang_ei_'],
    ['liming',     '2_l_i_ing_ng'],
    ['wangfang',   '2_w_ang_ang_ng'],
    ['liuyang',    '2_l_iu_ang_ng'],
    ['Alexander',  '4__a_e_an_er_r'],
    ['Benjamin',   '3_b_en_a_in_n'],
    ['Christopher','3_ch_i_o_er_r'],
    ['Elizabeth',  '4__e_i_a_eth_th'],
    ['Bob',        '1_b_ob_b'],
    ['Alice',      '2__a_ice_ce'],
    ['Edward',     '2__ed_ard_d'],
    ['Leo',        '1_l_eo_'],
    ['Zoe',        '1_z_oe_'],
    ['Queen',      '1_q_ueen_n'],
    ['Mary',       '2_m_a_y_'],
    ['Nancy',      '2_n_an_y_'],
    ['Henry',      '2_h_en_y_'],
    ['Lily',       '2_l_i_y_'],
    ['Kevin',      '2_k_e_in_n'],
    ['Lincoln',    '2_l_in_oln_n'],
    ['Linda',      '2_l_in_a_'],
    ['Kimberly',   '3_k_im_er_y_'],
    ['Sam',        '1_s_am_m'],
    ['Tom',        '1_t_om_m'],
    ['Paul',       '1_p_aul_l'],
    ['Robert',     '2_r_o_ert_t'],
    ['Victor',     '2_v_ic_or_r'],
    ['Wendy',      '2_w_en_y_'],
    ['Xavier',     '2_x_a_ier_r'],
    ['Aaron',      '2__aa_on_n'],
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, expected] of testCases) {
    const result = decomposeName(name);
    const status = result.pattern === expected ? '✓' : '✗';
    if (status === '✓') passed++;
    else {
      failed++;
      console.log(`✗ ${name.padEnd(18)} → ${result.pattern.padEnd(28)} (期望: ${expected})`);
    }
  }
  
  console.log(`\n=== 结果: ${passed}通过, ${failed}失败, 共${testCases.length}条, 通过率${(passed/testCases.length*100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n=== 全部通过！可以开始更新数据库 ===');
  }
}

test();