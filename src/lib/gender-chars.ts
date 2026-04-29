/**
 * gender-chars.ts — 汉字性别特征数据库（v2.2 增强版）
 *
 * 核心功能：
 * 起名时确保男性名只含男性/中性字，女性名只含女性/中性字
 *
 * 使用原则（三层联动）：
 * 1. hardFilter（硬过滤）：FEMALE_CHARS / MALE_CHARS → 违反即淘汰
 * 2. 评分扣分：MALE_LEANING / FEMALE_LEANING → 违反则降性别分 + 附加语义匹配惩罚
 * 3. AI提示指导：buildGenderPromptBlock → 指导AI不要生成不符合性别的名字
 *
 * 分类标准：
 * - FEMALE_CHARS: 强烈女性特征字。女名正常，男名中应被硬过滤淘汰 ✗
 * - MALE_CHARS: 强烈男性特征字。男名正常，女名中应被硬过滤淘汰 ✗
 * - NEUTRAL_CHARS: 中性字。男女皆可使用 ✓
 * - MALE_LEANING_CHARS: 偏男性中性字。女名中使用会降性别分 + 附加语义惩罚
 * - FEMALE_LEANING_CHARS: 偏女性中性字。男名中使用会降性别分
 *
 * v2.2 更新：
 * - 大幅扩充 NEUTRAL_CHARS（中性字库），覆盖"然如若涵清溪沐"等常用中性字
 * - 明确"慧"归入 FEMALE_LEANING（女性名常见，但非强烈女性特征）
 * - 明确"智"归入 MALE_LEANING（理性学术偏男，女名降低分）
 * - 新增大量常见的现代中性字（子、轩、宇、涵、沐、泽、晨、曦 等）
 * - 确保 hardFilter / scorer / prompt 三处字集的一致性
 *
 * v3.0 更新（性别特征优化）：
 * - "慧"从 FEMALE_LEANING 移入 MALE_LEANING（"智慧"合用时是直白老土组合）
 * - checkOvertName 新增"智+丽/美/慧"联合惩罚（-30分）
 * - 性别评分中"智"和"慧"同时在女名中出现时，联合惩罚翻倍
 */

// ============================================================
// 一、强烈女性特征字 — 女名正常，男名应淘汰
// ============================================================
//
// 分类依据：
// A. 女字旁/女部首字：婉、婷、娟、姝、嫣、妍、娇、娜、婵、媚、媛、婧、妡、婌、婳、婀、袅、娴、娣、婕、媱、娆
// B. 花草/自然意象偏女性：兰、蕙、蕊、芙、蓉、莲、薇、萱、菡、菱、芷、芮、芯、蔓、芳、芬、芸、莎、荷、菊
// C. 珠宝/柔美偏女性：瑶、琪、琳、玲、珍、珠、翠、璇、璐、璟、瑛、瑾、瑜、簪、钗、钏、珮、环、瑗
// D. 色彩/柔美意象偏女性：彩、彤、嫣、艳、靓、黛、霞、雯、霓、霖、霏
// E. 名物女名高频字：琴、瑟、箫、笙、筝、画、绣、织、纨、绮、绫、绢
// F. 其他常见女名专有字：妙、倩、嫔、姬、妃、娥、姑、娘、妮、婴、姻、妊、娩、媪、婺
export const FEMALE_CHARS = new Set<string>(
  (
    // A. 女字旁 / 女性称谓
    "婉娟姝嫣妍娇娜婵媚媛婧娴婌婳婀袅娣婕媱娆妡婍婺妤嬛嬅嬋嬈" +
    "嫔姬妃娥姑娘妮婴媪婺妞妈妹姐嫂媳嫁娶婚姻妊娩" +
    // B. 花草/柔美意象
    "兰蕙蕊芙蓉莲薇萱菡菱芷芮芯蔓芳芬芸莎荷菊梅桃杏柳樱桂" +
    "茉芊茜荑苹苞荷荇菀葶蒨蓁蓉蕴蘅芷蕙芙苒茗" +
    "玫瑰牡丹茉莉芍药芙蓉海棠" +
    // C. 珠宝/柔美
    "瑶琪琳玲珍珠翠璇璐璟瑛瑾瑜簪钗钏珮环瑗琦珂玥珑珏玛瑙琥珀璧" +
    "璎瓒琨璋璞璨璜琼" +
    // D. 色彩/柔美意象
    "彩彤嫣艳靓黛霞雯霓霏霖霁" +
    "绯绛紫红绮绡" +
    // E. 女名高频字
    "妙倩琴瑟箫笙筝画绣织纨绮绫绢纾" +
    "蝶燕莺凤鸾鹊"
  ).split("").filter(c => /[\u4e00-\u9fff]/.test(c))
);

// ============================================================
// 二、强烈男性特征字 — 男名正常，女名应淘汰
// ============================================================
//
// 分类依据：
// A. 男性气质字：刚强雄伟浩毅猛霸彪悍劲壮健豪英杰俊威
// B. 武/力量/兵器字：军武剑锋刀兵戈矛戟弩弓矢铠甲盾枪炮
// C. 动物雄性字：龙虎豹鹏鹰驹骏马牛象麒麟彪狼
// D. 山岳/宏大象征字：山峰岭岳岗岩磊嵩巍穹
// E. 权威/地位字：帝君王皇侯伯公卿爵帅将相宰尉
// F. 其他男名高频字：汉男郎兵卒叔伯侄舅兄爹爷父
export const MALE_CHARS = new Set<string>(
  (
    // A. 男性气质
    "刚强雄伟浩毅猛霸彪悍劲壮健豪英杰俊威勇锐" +
    "宏洪泓浩灏恺觊勋勉劼隽" +
    // B. 武/力量/兵器
    "军武剑锋刀兵戈矛戟弩弓矢铠甲盾枪炮镖" +
    "伐征战讨戍戍卫防御防守护" +
    // C. 动物雄性
    "龙虎豹鹏鹰驹骏马" +
    "麒麟豹彪罴熊罴雕鹄隼骠骁骐骅骝骥" +
    // D. 山岳/宏大
    "山峰岭岳岗岩磊嵩巍穹岫峥嵘峻崧" +
    "川泽渊溟渤瀛瀚" +
    // E. 权威/地位
    "帝王君皇侯伯公卿爵帅将相宰尉" +
    "霸雄杰豪首" +
    // F. 其他男名字
    "英勇锐毅烈刚壮汉男" +
    "叔伯侄舅兄爹爷父皇太祖" +
    // G. 方向/气魄类男性常用
    "乾震乾坤昊晟"
  ).split("").filter(c => /[\u4e00-\u9fff]/.test(c))
);

// ============================================================
// 三、偏男性中性字 — 女名中用会降性别分 + 附加语义惩罚
// ============================================================
//
// 【重要】这类字的惩罚机制：
// - hardFilter 不淘汰女名（因为有中性成分）
// - 性别评分扣减（约30-50分降幅）
// - 语义匹配评分时，如果女名含这些字且用户期望含智能相关词，**额外扣分**
//
// 分类依据：
// A. 理性/学术/逻辑类：智、聪、睿、哲、昕（光明/理性）
// B. 道德/品格类偏男性: 德、仁、义、信、诚、忠、孝、廉
// C. 宏大/气魄类中性：博、宇、轩、翰、景、泰、安、宁、康
// D. 方向/度量类偏男：方、正、平、安、定、恒、久、远
export const MALE_LEANING_CHARS = new Set<string>(
  (
    // A. 理性/学术/逻辑（v3.0: "慧"从FEMALE_LEANING移入此处）
    "智慧聪睿哲昕明晖" +
    // B. 道德/品格偏男
    "德仁义信诚忠孝廉" +
    // C. 宏大/气魄
    "博宇轩翰景泰安宁静" +
    "昊天乾元亨贞" +
    "国邦家廷朝堂" +
    // D. 方向/度量
    "方正平定恒久远"
  ).split("").filter(c => /[\u4e00-\u9fff]/.test(c))
);

// ============================================================
// 四、偏女性中性字 — 男名中用会降性别分
// ============================================================
//
// 分类依据：
// A. 才艺/审美类偏女（柔美）：诗、书、画、艺、韵、雅、词、曲、歌、舞、乐
// B. 柔美自然意象：月、星、云、雾、露、冰、雪、风（温婉意）
// C. 柔和品德类偏女：温、柔、和、顺、良、善、美、丽、秀
// D. 织物/丝线类偏女：丝、线、纱、帛、素、练、织、绣、纨、绮
// E. 家室/宁静类偏女：安、宁、静、闲、乐、怡、悦、恬、舒、畅、惬
// （v3.0: "慧"已移入MALE_LEANING，此处删除）
export const FEMALE_LEANING_CHARS = new Set<string>(
  (
    // A. 才艺/审美
    "诗书画艺韵雅词曲歌舞乐" +
    "琴瑟笙箫笛筝棋画" +
    // B. 柔美自然
    "月星云雾露冰雪霜" +
    "岚曦曜霁晴韶" +
    // C. 柔和品德
    "温和顺良善美丽秀" +
    "温柔婉约" +
    // D. 织物/丝线
    "丝线纱帛素练" +
    // E. 宁静/安逸
    "安宁静闲乐怡悦恬舒畅惬" +
    "安逸悠闲"
  ).split("").filter(c => /[\u4e00-\u9fff]/.test(c))
);

// ============================================================
// 五、中性字（v2.2 大幅扩充）
// ============================================================
//
// 核心原则：
// - 中性字男女皆可用，不改变性别分
// - 以下收录易被误判的、以及现代起名中常见的中性字
//
// 分类：
// A. 文言助词：然、如、若、之、以、于、斯、其、乃
// B. 水/清新类常用中性：清、涵、沐、泽、溪、源、沁、津、泓、泠、汐、润
// C. 时间/光感类中性：晨、曦、朝、暮、晚、晖、曜、昱、昀、昶
// D. 自然气象中性：云、风、雨、雪、露、霜、霞（非女性语境）、雷
// E. 植物类中性（非花）：林、森、木、叶、松、柏、桐、杨、柳、枫
// F. 宝石类中性（现代常用）：瑜、瑶、琳、琅、玥、璇（这些在男名中也常见）
// G. 现代流行中性字：子、轩、宇、宸、睿、铭、熙、诺、伊、舒、芮、禾、锦、笙、洛、晚、星
// H. 其他常用中性：嘉、瑞、祥、福、禄、寿、安、康、宁、和
export const NEUTRAL_CHARS = new Set<string>(
  (
    // A. 文言助词
    "然如若之以于斯其乃" +
    // B. 水/清新类（中性）
    "清涵沐泽溪源沁津泓泠汐润洵沂沅沄沅洳洁" +
    // C. 时间/光感（中性）
    "晨曦朝暮晚晖曜昱昀昶昭" +
    // D. 自然气象（中性语境）
    "云风雨露霜雷虹" +
    // E. 植物（非花，中性）
    "林森木叶松柏桐杨柳枫杉桦楠" +
    // F. 宝石类（现代中性）
    "瑜瑶琳琅玥璇珩玦琮琦珂琪" +
    // G. 现代流行中性字
    "子轩宇宸睿铭熙诺伊舒芮禾锦笙洛晚星" +
    "可亦言伊一依" +
    // H. 其他常用中性
    "嘉瑞祥福安康宁和天华" +
    // I. 单字名常用中性
    "之亦言然如"
  ).split("").filter(c => /[\u4e00-\u9fff]/.test(c))
);

// ============================================================
// 六、查询接口
// ============================================================

/**
 * 判断一个字符的性别特征分类
 *
 * @returns 'female' | 'male' | 'male-leaning' | 'female-leaning' | 'neutral'
 */
export function getCharGender(char: string): 'female' | 'male' | 'male-leaning' | 'female-leaning' | 'neutral' {
  if (!char || char.length !== 1) return 'neutral';
  if (FEMALE_CHARS.has(char)) return 'female';
  if (MALE_CHARS.has(char)) return 'male';
  if (MALE_LEANING_CHARS.has(char)) return 'male-leaning';
  if (FEMALE_LEANING_CHARS.has(char)) return 'female-leaning';
  if (NEUTRAL_CHARS.has(char)) return 'neutral';
  return 'neutral'; // 未收录的字默认为中性
}

/**
 * 检查名字是否符合同一性别的用字规范
 *
 * 核心规则：
 * - 女性名：只能包含 female | female-leaning | neutral 三类字
 *   ❌ 包含 male 字的 → 淘汰
 *   ⚠️ 包含 male-leaning 字的 → 降性别分 + 附加语义惩罚（不淘汰但降分）
 * - 男性名：只能包含 male | male-leaning | neutral 三类字
 *   ❌ 包含 female 字的 → 淘汰
 *   ⚠️ 包含 female-leaning 字的 → 降性别分
 *
 * @returns { passed, reasons, warnings }
 */
export function checkGenderCharCompatibility(
  givenName: string,
  gender: "M" | "F"
): {
  passed: boolean;
  rejectReason?: string;
  warningReason?: string;
} {
  // 收集所有偏性/违例信息
  let maleCharsInFemale: string[] = [];
  let maleLeaningCharsInFemale: string[] = [];
  let femaleCharsInMale: string[] = [];
  let femaleLeaningCharsInMale: string[] = [];

  for (const char of givenName) {
    if (!/[\u4e00-\u9fff]/.test(char)) continue;

    const charGender = getCharGender(char);

    if (gender === "F") {
      if (charGender === 'male') {
        maleCharsInFemale.push(char);
      }
      if (charGender === 'male-leaning') {
        maleLeaningCharsInFemale.push(char);
      }
    } else {
      if (charGender === 'female') {
        femaleCharsInMale.push(char);
      }
      if (charGender === 'female-leaning') {
        femaleLeaningCharsInMale.push(char);
      }
    }
  }

  // ── 女名检查 ──
  if (gender === "F") {
    if (maleCharsInFemale.length > 0) {
      return {
        passed: false,
        rejectReason: `名字含男性特征字"${maleCharsInFemale.join('、')}"，不适合女性`,
      };
    }
    if (maleLeaningCharsInFemale.length > 0) {
      return {
        passed: true,
        warningReason: `名字含偏男性字"${maleLeaningCharsInFemale.join('、')}"，女性使用显得刚硬古板，建议更换为更柔美的字`,
      };
    }
  }

  // ── 男名检查 ──
  if (gender === "M") {
    if (femaleCharsInMale.length > 0) {
      return {
        passed: false,
        rejectReason: `名字含女性特征字"${femaleCharsInMale.join('、')}"，不适合男性`,
      };
    }
    if (femaleLeaningCharsInMale.length > 0) {
      return {
        passed: true,
        warningReason: `名字含偏女性字"${femaleLeaningCharsInMale.join('、')}"，男性使用可能偏阴柔`,
      };
    }
  }

  return { passed: true };
}

/**
 * 检查名字是否由"直白词"构成（用户期望中的词直接作为名字）
 *
 * 例如用户期望"聪明智慧"，名字叫"张智慧"——这就是直白老土的典型
 * 用户期望"美丽俊俏"，名字叫"张美丽"——一样老土
 *
 * @returns { isOvert: boolean; overtWords: string[] }
 */
export function checkOvertName(
  givenName: string,
  userExpectations: string[]
): { isOvert: boolean; overtWords: string[] } {
  if (!userExpectations || userExpectations.length === 0) {
    return { isOvert: false, overtWords: [] };
  }

  const matched: string[] = [];

  // 1. 检查整词匹配：用户期望中的双字词直接出现在名字中
  const OVERT_NAME_PATTERNS = [
    "智慧", "聪明", "美丽", "俊秀", "才华", "艺术",
    "善良", "贤惠", "仁爱", "德才", "富贵", "吉祥",
    "如意", "福气", "好运", "成功",
  ];

  for (const pattern of OVERT_NAME_PATTERNS) {
    if (givenName.includes(pattern)) {
      matched.push(pattern); // ★ 只返回纯词，不加描述文字
      break;
    }
  }

  // 2. 检查用户期望中的词被直接使用
  for (const expect of userExpectations) {
    const trimmed = expect.trim();
    if (trimmed.length >= 2 && givenName.includes(trimmed)) {
      matched.push(trimmed); // ★ 只返回纯词
    }
  }

  // 3. 检查「智+丽/美/慧」等老土组合
  const OVERT_COMBOS = [
    /智[慧丽美]/,     // "智"+"丽/美/慧"老土组合
    /[美俊]丽/,       // "美丽/俊丽"老土组合
    /聪[明慧]/,       // "聪明/聪慧"老土组合
    /[才华]艺/,       // "才艺/华艺"直白组合
  ];

  for (const pattern of OVERT_COMBOS) {
    const match = pattern.exec(givenName);
    if (match) {
      matched.push(match[0]); // 实际匹配到的子串（如"智慧""智丽""美丽"）
    }
  }

  return {
    isOvert: matched.length > 0,
    overtWords: matched,
  };
}

/**
 * 构建AI提示词用的性别用字指南（v2.2 增强版）
 * 
 * 核心改进：
 * - 明确列出"智"为女名禁用（AI常误用）
 * - 将"慧"列为"避免用于女名"
 * - 新增更丰富的女性推荐字
 * - 明确告诉AI：不要使用用户期望词直接作为名字
 */
export function buildGenderPromptBlock(gender: "M" | "F"): string {
  if (gender === "F") {
    return `【★ 女性字严格指南 — 必须遵守】

以下是起名时必须遵循的字分类：

✅ 【强烈推荐 — 柔美女性字，优先使用】：
婉、婷、娟、姝、嫣、妍、娇、娜、婵、姗、媛、婧、娴、妡、婌
兰、蕙、蕊、芙、蓉、莲、萱、薇、茉、茜、芷、芯、苒
瑶、琪、琳、珠、翠、璇、璐、瑛、瑾、瑜、玥
妙、倩、诗、琴、画、韵、雅、彤、彩、霞、雯、露、雪
怡、悦、恬、舒、畅、乐、静、宁

✅ 【可选 — 中性字，男女皆可用】：
若、如、然、之、以、于、斯
清、涵、沐、泽、溪、沁、晨、曦、晚、星
云、雨、风、月、林、嘉、瑞、安、和

❌ 【绝对禁用 — 不能用于女名】：
刚、强、雄、伟、浩、毅、猛、霸、彪
龙、虎、豹、鹏、军、武、剑、锋
帝、王、君、将、帅、相

❌ 【强烈避免 — 用于女名会显得土气、古板、粗犷】：
智（理性学术化，女性用显硬邦邦）
慧（虽然女名可见，但直白老土）
德、仁、义、信（偏男性品格）

⚠️ 【重要：不要偷懒用用户期望词】：
如果用户期望包含"聪明智慧"，绝对不要直接起名"智慧"或"智慧"。
如果用户期望包含"美丽俊俏"，绝对不要直接起名"美丽"或"俊俏"。
要做的是：用同义近义字创造有画面感的名字。
举例：
  ✅ 好的做法：期望"聪明智慧" → 用"灵""颖""悟""捷""敏"等字创造"灵犀""颖悟"
  ❌ 差的做法：期望"聪明智慧" → 直接叫"智慧""智丽""智美"`;
  } else {
    return `【★ 男性字严格指南 — 必须遵守】

以下是起名时必须遵循的字分类：

✅ 【强烈推荐 — 阳刚男性字，优先使用】：
刚、强、雄、伟、浩、毅、猛、霸、彪
龙、虎、豹、鹏、军、武、剑、锋
勇、锐、杰、豪、英、俊、威、壮
德、仁、义、信、诚、忠、孝、廉
博、渊、瀚、宏、崇、尚、道、志、远

✅ 【可选 — 中性字，男女皆可用】：
若、如、然、之、以、于、斯
清、涵、沐、泽、溪、沁、晨、曦、晚、星
云、雨、风、月、林、嘉、瑞、安、和

❌ 【绝对禁用 — 不能用于男名】：
婉、婷、娟、姝、嫣、妍、娇、娜、婵、姗、媛、婧、娴
兰、蕙、蕊、芙、蓉、莲、萱、薇
瑶、琪、琳、珠、翠
妙、倩、诗、琴、画、韵（偏女性才艺）`;
  }
}