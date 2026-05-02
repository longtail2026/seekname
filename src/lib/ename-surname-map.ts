/**
 * 中文姓氏 → 海外易读拼写变体映射表
 * 
 * 解决中国人姓氏拼音老外读不准的问题。
 * 每个中文姓氏存储多个海外常见拼写变体，
 * 标注拼音来源、商务常用度、是否易被歪读。
 */

export interface SurnameVariant {
  /** 拼写变体（如 "Zhang", "Cham", "Chang"） */
  spelling: string;
  /** 拼音/变体来源 */
  type: 'pinyin' | 'cantonese' | 'minnan' | 'common_anglicized' | 'simplified_phonetic';
  /** 商务正式度 1-5 */
  formality: number;
  /** 欧美辨识度（老外是否一看就能读对）1-5 */
  recognizability: number;
  /** 是否容易被歪读 */
  easilyMangled: boolean;
}

export interface SurnameEntry {
  /** 中文姓氏 */
  chinese: string;
  /** 拼音（标准） */
  pinyin: string;
  /** 拼写变体列表 */
  variants: SurnameVariant[];
}

/**
 * ★★★ V6.3 姓氏英文发音匹配表 ★★★
 * 
 * 用于"姓氏单独匹配发音接近英文"功能。
 * 包含150个常见姓氏的最常见英文表达（香港粤拼/威妥玛/通用拼写）。
 * 
 * 来源：华人海外常用姓氏拼写惯例。
 * 如果 match 完全，则给予额外加分；如果匹配不到，则回退到原拼音逻辑。
 */
export const SURNAME_ENGLISH_MAP: Record<string, string[]> = {
  '陈': ['Chan'],
  '林': ['Lam'],
  '黄': ['Wong'],
  '张': ['Cheung'],
  '李': ['Lee'],
  '王': ['Wong'],
  '吴': ['Ng'],
  '刘': ['Lau'],
  '蔡': ['Choi'],
  '杨': ['Yeung'],
  '周': ['Chow'],
  '徐': ['Tsui'],
  '孙': ['Suen'],
  '朱': ['Chu'],
  '马': ['Ma'],
  '郭': ['Kwok'],
  '何': ['Ho'],
  '梁': ['Leung'],
  '宋': ['Sung'],
  '郑': ['Cheng'],
  '谢': ['Tse'],
  '韩': ['Hon'],
  '唐': ['Tong'],
  '冯': ['Fung'],
  '于': ['Yee'],
  '董': ['Tung'],
  '萧': ['Siu'],
  '程': ['Ching'],
  '曹': ['Cho'],
  '袁': ['Yuen'],
  '邓': ['Tang'],
  '许': ['Hui'],
  '傅': ['Foo'],
  '沈': ['Shum'],
  '曾': ['Tsang'],
  '彭': ['Pang'],
  '吕': ['Lui'],
  '苏': ['So'],
  '卢': ['Lo'],
  '蒋': ['Chiang'],
  '余': ['Yee'],
  '杜': ['To'],
  '戴': ['Tai'],
  '魏': ['Ngai'],
  '钟': ['Chung'],
  '邱': ['Yau'],
  '谭': ['Tam'],
  '韦': ['Wai'],
  '贾': ['Ka'],
  '邹': ['Chau'],
  '石': ['Shek'],
  '熊': ['Hung'],
  '孟': ['Mang'],
  '秦': ['Chun'],
  '白': ['Pak'],
  '阎': ['Yim'],
  '薛': ['Sit'],
  '侯': ['Hau'],
  '雷': ['Lui'],
  '龙': ['Lung'],
  '段': ['Tuen'],
  '郝': ['Kok'],
  '孔': ['Hung'],
  '邵': ['Siu'],
  '史': ['Si'],
  '毛': ['Mo'],
  '常': ['Sheung'],
  '万': ['Man'],
  '顾': ['Koo'],
  '赖': ['Lai'],
  '武': ['Mo'],
  '康': ['Hong'],
  '贺': ['Ho'],
  '严': ['Yim'],
  '尹': ['Wan'],
  '钱': ['Chin'],
  '施': ['Si'],
  '洪': ['Hung'],
  '汤': ['Tong'],
  '龚': ['Kung'],
  '陶': ['To'],
  '黎': ['Lai'],
  '崔': ['Tsui'],
  '范': ['Fan'],
  '乔': ['Kiu'],
  '汪': ['Wong'],
  '田': ['Tin'],
  '陆': ['Luk'],
  '姜': ['Keung'],
  '占': ['Jim'],
  '欧': ['Au'],
  '尤': ['Yau'],
  '金': ['Kam'],
  '潘': ['Poon'],
  '江': ['Kong'],
  '方': ['Fong'],
  '柯': ['O'],
  '柳': ['Lau'],
  '高': ['Go'],
  '章': ['Cheung'],
  '华': ['Wah'],
  '夏': ['Ha'],
  '胡': ['Wu'],
  '温': ['Wan'],
  '俞': ['Yee'],
  '姚': ['Yiu'],
  '庄': ['Chong'],
  '葛': ['Kap'],
  '伍': ['Ng'],
  '庞': ['Pong'],
  '邢': ['Ying'],
  '邸': ['Tai'],
  '栗': ['Leut'],
  '季': ['Kwai'],
  '涂': ['Tou'],
  '霍': ['Fok'],
  '蒙': ['Mung'],
  '鲍': ['Pau'],
  '毕': ['Bat'],
  '甘': ['Kam'],
  '裴': ['Pui'],
  '欧阳': ['Au-Yeung'],
  '慕容': ['Mau-Yung'],
  '司徒': ['Seto'],
  '诸葛': ['Chu-Kut'],
  '尉迟': ['Wai-Chi'],
  '夏侯': ['Ha-Hau'],
  '皇甫': ['Wong-Po'],
  '令狐': ['Ling-Wu'],
  '端木': ['Tuen-Muk'],
  '羊舌': ['Yeung-Sit'],
  '公羊': ['Kung-Yeung'],
  '颛顼': ['Chyun-Yuk'],
  '太史': ['Tai-Si'],
  '淳于': ['Seun-Yu'],
};

/**
 * ★★★ V6.3 获取姓氏的最常见英文表达 ★★★
 * 用于"姓氏独立发音匹配"功能
 */
export function getSurnameEnglishExpressions(chineseSurname: string): string[] {
  return SURNAME_ENGLISH_MAP[chineseSurname] || [];
}

/**
 * 姓氏映射表
 * 
 * 排序规则：常用姓氏在前
 * 变体排序：最推荐（商务+易读）的排第一
 */
const SURNAME_VARIANT_MAP: Record<string, SurnameEntry> = {
  '张': {
    chinese: '张', pinyin: 'zhang',
    variants: [
      { spelling: 'Zhang', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Chang', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Cham', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '李': {
    chinese: '李', pinyin: 'li',
    variants: [
      { spelling: 'Li', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Lee', type: 'common_anglicized', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Lei', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '王': {
    chinese: '王', pinyin: 'wang',
    variants: [
      { spelling: 'Wang', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Wong', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Vang', type: 'minnan', formality: 2, recognizability: 3, easilyMangled: true },
    ]
  },
  '刘': {
    chinese: '刘', pinyin: 'liu',
    variants: [
      { spelling: 'Liu', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Lau', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Liew', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: true },
    ]
  },
  '陈': {
    chinese: '陈', pinyin: 'chen',
    variants: [
      { spelling: 'Chen', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Chan', type: 'cantonese', formality: 4, recognizability: 5, easilyMangled: false },
      { spelling: 'Tan', type: 'minnan', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '杨': {
    chinese: '杨', pinyin: 'yang',
    variants: [
      { spelling: 'Yang', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Young', type: 'common_anglicized', formality: 4, recognizability: 5, easilyMangled: false },
      { spelling: 'Yeung', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: true },
    ]
  },
  '赵': {
    chinese: '赵', pinyin: 'zhao',
    variants: [
      { spelling: 'Zhao', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Chao', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Chiu', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '黄': {
    chinese: '黄', pinyin: 'huang',
    variants: [
      { spelling: 'Huang', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Wong', type: 'cantonese', formality: 4, recognizability: 5, easilyMangled: false },
      { spelling: 'Ng', type: 'cantonese', formality: 3, recognizability: 2, easilyMangled: true },
    ]
  },
  '周': {
    chinese: '周', pinyin: 'zhou',
    variants: [
      { spelling: 'Zhou', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Chow', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Chou', type: 'common_anglicized', formality: 3, recognizability: 3, easilyMangled: true },
    ]
  },
  '吴': {
    chinese: '吴', pinyin: 'wu',
    variants: [
      { spelling: 'Wu', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Woo', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Ng', type: 'cantonese', formality: 3, recognizability: 2, easilyMangled: true },
    ]
  },
  '徐': {
    chinese: '徐', pinyin: 'xu',
    variants: [
      { spelling: 'Xu', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Hsu', type: 'common_anglicized', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Tsui', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '孙': {
    chinese: '孙', pinyin: 'sun',
    variants: [
      { spelling: 'Sun', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Soon', type: 'minnan', formality: 3, recognizability: 4, easilyMangled: false },
      { spelling: 'Suen', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '马': {
    chinese: '马', pinyin: 'ma',
    variants: [
      { spelling: 'Ma', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Mah', type: 'common_anglicized', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '胡': {
    chinese: '胡', pinyin: 'hu',
    variants: [
      { spelling: 'Hu', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Hoo', type: 'simplified_phonetic', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '朱': {
    chinese: '朱', pinyin: 'zhu',
    variants: [
      { spelling: 'Zhu', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Chu', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Gee', type: 'simplified_phonetic', formality: 2, recognizability: 3, easilyMangled: false },
    ]
  },
  '郭': {
    chinese: '郭', pinyin: 'guo',
    variants: [
      { spelling: 'Guo', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Kwok', type: 'cantonese', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Goh', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '何': {
    chinese: '何', pinyin: 'he',
    variants: [
      { spelling: 'He', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Ho', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '罗': {
    chinese: '罗', pinyin: 'luo',
    variants: [
      { spelling: 'Luo', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Lo', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Law', type: 'simplified_phonetic', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '高': {
    chinese: '高', pinyin: 'gao',
    variants: [
      { spelling: 'Gao', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Ko', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
      { spelling: 'Goh', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '林': {
    chinese: '林', pinyin: 'lin',
    variants: [
      { spelling: 'Lin', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Lam', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Lim', type: 'minnan', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '梁': {
    chinese: '梁', pinyin: 'liang',
    variants: [
      { spelling: 'Liang', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Leung', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Leong', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '谢': {
    chinese: '谢', pinyin: 'xie',
    variants: [
      { spelling: 'Xie', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Tse', type: 'cantonese', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Cheah', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '许': {
    chinese: '许', pinyin: 'xu',
    variants: [
      { spelling: 'Xu', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Hui', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Koh', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '郑': {
    chinese: '郑', pinyin: 'zheng',
    variants: [
      { spelling: 'Zheng', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Cheng', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Teh', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '韩': {
    chinese: '韩', pinyin: 'han',
    variants: [
      { spelling: 'Han', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Hon', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Hang', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '唐': {
    chinese: '唐', pinyin: 'tang',
    variants: [
      { spelling: 'Tang', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Tong', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '冯': {
    chinese: '冯', pinyin: 'feng',
    variants: [
      { spelling: 'Feng', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Fung', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '董': {
    chinese: '董', pinyin: 'dong',
    variants: [
      { spelling: 'Dong', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Tung', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '蒋': {
    chinese: '蒋', pinyin: 'jiang',
    variants: [
      { spelling: 'Jiang', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Chiang', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Cheung', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '彭': {
    chinese: '彭', pinyin: 'peng',
    variants: [
      { spelling: 'Peng', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Pang', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Phang', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '曾': {
    chinese: '曾', pinyin: 'zeng',
    variants: [
      { spelling: 'Zeng', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Tsang', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Chan', type: 'minnan', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '蔡': {
    chinese: '蔡', pinyin: 'cai',
    variants: [
      { spelling: 'Cai', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Tsai', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Choi', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '余': {
    chinese: '余', pinyin: 'yu',
    variants: [
      { spelling: 'Yu', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Yee', type: 'cantonese', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '杜': {
    chinese: '杜', pinyin: 'du',
    variants: [
      { spelling: 'Du', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'To', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '戴': {
    chinese: '戴', pinyin: 'dai',
    variants: [
      { spelling: 'Dai', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Tai', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '苏': {
    chinese: '苏', pinyin: 'su',
    variants: [
      { spelling: 'Su', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'So', type: 'cantonese', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '卢': {
    chinese: '卢', pinyin: 'lu',
    variants: [
      { spelling: 'Lu', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Lo', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '钟': {
    chinese: '钟', pinyin: 'zhong',
    variants: [
      { spelling: 'Zhong', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Chung', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Cheong', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '汪': {
    chinese: '汪', pinyin: 'wang',
    variants: [
      { spelling: 'Wang', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Wong', type: 'cantonese', formality: 4, recognizability: 5, easilyMangled: false },
    ]
  },
  '田': {
    chinese: '田', pinyin: 'tian',
    variants: [
      { spelling: 'Tian', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Tin', type: 'cantonese', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '方': {
    chinese: '方', pinyin: 'fang',
    variants: [
      { spelling: 'Fang', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Fong', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '袁': {
    chinese: '袁', pinyin: 'yuan',
    variants: [
      { spelling: 'Yuan', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Yuen', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '范': {
    chinese: '范', pinyin: 'fan',
    variants: [
      { spelling: 'Fan', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Vann', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '江': {
    chinese: '江', pinyin: 'jiang',
    variants: [
      { spelling: 'Jiang', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Kong', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Chiang', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '金': {
    chinese: '金', pinyin: 'jin',
    variants: [
      { spelling: 'Jin', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Kam', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '潘': {
    chinese: '潘', pinyin: 'pan',
    variants: [
      { spelling: 'Pan', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Poon', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '姚': {
    chinese: '姚', pinyin: 'yao',
    variants: [
      { spelling: 'Yao', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Yiu', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '廖': {
    chinese: '廖', pinyin: 'liao',
    variants: [
      { spelling: 'Liao', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Liu', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '邹': {
    chinese: '邹', pinyin: 'zou',
    variants: [
      { spelling: 'Zou', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Chau', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '熊': {
    chinese: '熊', pinyin: 'xiong',
    variants: [
      { spelling: 'Xiong', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Hung', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '秦': {
    chinese: '秦', pinyin: 'qin',
    variants: [
      { spelling: 'Qin', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Chin', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '白': {
    chinese: '白', pinyin: 'bai',
    variants: [
      { spelling: 'Bai', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Pak', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '薛': {
    chinese: '薛', pinyin: 'xue',
    variants: [
      { spelling: 'Xue', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Sit', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '谭': {
    chinese: '谭', pinyin: 'tan',
    variants: [
      { spelling: 'Tan', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Tam', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '姜': {
    chinese: '姜', pinyin: 'jiang',
    variants: [
      { spelling: 'Jiang', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Keung', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '石': {
    chinese: '石', pinyin: 'shi',
    variants: [
      { spelling: 'Shi', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Shek', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '韦': {
    chinese: '韦', pinyin: 'wei',
    variants: [
      { spelling: 'Wei', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Wai', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '贾': {
    chinese: '贾', pinyin: 'jia',
    variants: [
      { spelling: 'Jia', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Ka', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '邱': {
    chinese: '邱', pinyin: 'qiu',
    variants: [
      { spelling: 'Qiu', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Yau', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '侯': {
    chinese: '侯', pinyin: 'hou',
    variants: [
      { spelling: 'Hou', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Hau', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
};

/**
 * 获取中文姓氏的海外拼写变体列表
 */
export function getSurnameVariants(chineseSurname: string): SurnameVariant[] {
  const entry = SURNAME_VARIANT_MAP[chineseSurname];
  if (!entry) {
    // 未收录的姓氏，尝试直接用拼音
    return [
      { spelling: chineseSurname, type: 'pinyin', formality: 3, recognizability: 2, easilyMangled: true },
    ];
  }
  return entry.variants;
}

/**
 * 获取中文姓氏的拼音
 */
export function getSurnamePinyin(chineseSurname: string): string {
  return SURNAME_VARIANT_MAP[chineseSurname]?.pinyin || chineseSurname;
}

/**
 * 获取姓氏推荐拼写（最常用/最正式的前 N 个变体）
 */
export function getRecommendedSurnameSpellings(chineseSurname: string, maxCount: number = 3): string[] {
  const entry = SURNAME_VARIANT_MAP[chineseSurname];
  if (!entry) return [chineseSurname];
  return entry.variants
    .sort((a, b) => (b.formality + b.recognizability * 0.5) - (a.formality + a.recognizability * 0.5))
    .slice(0, maxCount)
    .map(v => v.spelling);
}

/**
 * 中国大陆证件 vs 海外交流 姓氏英文拼写
 * 
 * 中国大陆证件：使用标准汉语拼音（护照、签证、学校、公司正式文件）
 * 海外交流：使用粤拼/威妥玛/通用拼写（老外易读，日常社交）
 * 
 * @returns { china: string, overseas: string }
 *   china  - 中国大陆官方拼音
 *   overseas - 海外推荐拼写（优先选粤拼/通用拼写，若无则回退到拼音）
 */
export function getSurnameChinaOverseas(chineseSurname: string): { china: string; overseas: string } {
  const entry = SURNAME_VARIANT_MAP[chineseSurname];

  if (!entry) {
    // 未收录的姓氏，中外交通用统一写法
    return {
      china: chineseSurname,
      overseas: chineseSurname,
    };
  }

  // 中国大陆证件 → 标准拼音（type === 'pinyin' 的第一个变体）
  const pinyinVariants = entry.variants.filter(v => v.type === 'pinyin');
  const chinaSpelling = pinyinVariants.length > 0
    ? pinyinVariants[0].spelling
    : entry.pinyin.charAt(0).toUpperCase() + entry.pinyin.slice(1);

  // 海外交流 → 优先选粤拼 / 通用拼写 / 简化音译
  // 排序规则：非拼音变体，按 formality + recognizability 降序
  const overseasCandidates = entry.variants
    .filter(v => v.type !== 'pinyin' && !v.easilyMangled)
    .sort((a, b) => (b.formality + b.recognizability * 0.5) - (a.formality + a.recognizability * 0.5));

  let overseasSpelling: string;
  if (overseasCandidates.length > 0) {
    overseasSpelling = overseasCandidates[0].spelling;
  } else {
    // 若无合适的海外拼写，回退到拼音
    overseasSpelling = chinaSpelling;
  }

  return { china: chinaSpelling, overseas: overseasSpelling };
}

export { SURNAME_VARIANT_MAP };