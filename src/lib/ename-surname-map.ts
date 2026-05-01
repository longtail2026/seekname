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
  '郑': {
    chinese: '郑', pinyin: 'zheng',
    variants: [
      { spelling: 'Zheng', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Cheng', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Chang', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '谢': {
    chinese: '谢', pinyin: 'xie',
    variants: [
      { spelling: 'Xie', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Hsieh', type: 'common_anglicized', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Tse', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '宋': {
    chinese: '宋', pinyin: 'song',
    variants: [
      { spelling: 'Song', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Sung', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '唐': {
    chinese: '唐', pinyin: 'tang',
    variants: [
      { spelling: 'Tang', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Tong', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '许': {
    chinese: '许', pinyin: 'xu',
    variants: [
      { spelling: 'Xu', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Hsu', type: 'common_anglicized', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Koh', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '韩': {
    chinese: '韩', pinyin: 'han',
    variants: [
      { spelling: 'Han', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Hahn', type: 'common_anglicized', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '冯': {
    chinese: '冯', pinyin: 'feng',
    variants: [
      { spelling: 'Feng', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Fung', type: 'cantonese', formality: 4, recognizability: 3, easilyMangled: false },
    ]
  },
  '邓': {
    chinese: '邓', pinyin: 'deng',
    variants: [
      { spelling: 'Deng', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Teng', type: 'common_anglicized', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '曹': {
    chinese: '曹', pinyin: 'cao',
    variants: [
      { spelling: 'Cao', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Tsao', type: 'common_anglicized', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Chao', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '彭': {
    chinese: '彭', pinyin: 'peng',
    variants: [
      { spelling: 'Peng', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Phang', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
      { spelling: 'Pang', type: 'cantonese', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '曾': {
    chinese: '曾', pinyin: 'zeng',
    variants: [
      { spelling: 'Zeng', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: false },
      { spelling: 'Tsang', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Chan', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '萧': {
    chinese: '萧', pinyin: 'xiao',
    variants: [
      { spelling: 'Xiao', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Hsiao', type: 'common_anglicized', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Siu', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '田': {
    chinese: '田', pinyin: 'tian',
    variants: [
      { spelling: 'Tian', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Tien', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '董': {
    chinese: '董', pinyin: 'dong',
    variants: [
      { spelling: 'Dong', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Tung', type: 'cantonese', formality: 4, recognizability: 3, easilyMangled: false },
    ]
  },
  '潘': {
    chinese: '潘', pinyin: 'pan',
    variants: [
      { spelling: 'Pan', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Poon', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '袁': {
    chinese: '袁', pinyin: 'yuan',
    variants: [
      { spelling: 'Yuan', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Yuen', type: 'cantonese', formality: 4, recognizability: 3, easilyMangled: false },
    ]
  },
  '蔡': {
    chinese: '蔡', pinyin: 'cai',
    variants: [
      { spelling: 'Cai', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Tsai', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Choi', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
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
  '余': {
    chinese: '余', pinyin: 'yu',
    variants: [
      { spelling: 'Yu', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Yee', type: 'cantonese', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '叶': {
    chinese: '叶', pinyin: 'ye',
    variants: [
      { spelling: 'Ye', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Yeh', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Yip', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '程': {
    chinese: '程', pinyin: 'cheng',
    variants: [
      { spelling: 'Cheng', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Ching', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '苏': {
    chinese: '苏', pinyin: 'su',
    variants: [
      { spelling: 'Su', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Soo', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '吕': {
    chinese: '吕', pinyin: 'lv',
    variants: [
      { spelling: 'Lyu', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Lu', type: 'simplified_phonetic', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Lui', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '魏': {
    chinese: '魏', pinyin: 'wei',
    variants: [
      { spelling: 'Wei', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Way', type: 'simplified_phonetic', formality: 3, recognizability: 4, easilyMangled: false },
      { spelling: 'Ngai', type: 'cantonese', formality: 3, recognizability: 2, easilyMangled: true },
    ]
  },
  '丁': {
    chinese: '丁', pinyin: 'ding',
    variants: [
      { spelling: 'Ding', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Ting', type: 'common_anglicized', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '沈': {
    chinese: '沈', pinyin: 'shen',
    variants: [
      { spelling: 'Shen', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Shum', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
      { spelling: 'Sim', type: 'minnan', formality: 2, recognizability: 2, easilyMangled: true },
    ]
  },
  '任': {
    chinese: '任', pinyin: 'ren',
    variants: [
      { spelling: 'Ren', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Yen', type: 'common_anglicized', formality: 3, recognizability: 4, easilyMangled: false },
      { spelling: 'Yam', type: 'cantonese', formality: 2, recognizability: 3, easilyMangled: false },
    ]
  },
  '姚': {
    chinese: '姚', pinyin: 'yao',
    variants: [
      { spelling: 'Yao', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Yiu', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '卢': {
    chinese: '卢', pinyin: 'lu',
    variants: [
      { spelling: 'Lu', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Lo', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Loh', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '傅': {
    chinese: '傅', pinyin: 'fu',
    variants: [
      { spelling: 'Fu', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Foo', type: 'simplified_phonetic', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '钟': {
    chinese: '钟', pinyin: 'zhong',
    variants: [
      { spelling: 'Zhong', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Chung', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Chong', type: 'simplified_phonetic', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '崔': {
    chinese: '崔', pinyin: 'cui',
    variants: [
      { spelling: 'Cui', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Tsui', type: 'common_anglicized', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Choi', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '汪': {
    chinese: '汪', pinyin: 'wang',
    variants: [
      { spelling: 'Wang', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Wong', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '范': {
    chinese: '范', pinyin: 'fan',
    variants: [
      { spelling: 'Fan', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Faan', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '陆': {
    chinese: '陆', pinyin: 'lu',
    variants: [
      { spelling: 'Lu', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Luk', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '廖': {
    chinese: '廖', pinyin: 'liao',
    variants: [
      { spelling: 'Liao', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Liu', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
      { spelling: 'Leow', type: 'minnan', formality: 2, recognizability: 3, easilyMangled: true },
    ]
  },
  '杜': {
    chinese: '杜', pinyin: 'du',
    variants: [
      { spelling: 'Du', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Do', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '方': {
    chinese: '方', pinyin: 'fang',
    variants: [
      { spelling: 'Fang', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Fong', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '石': {
    chinese: '石', pinyin: 'shi',
    variants: [
      { spelling: 'Shi', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Shek', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '熊': {
    chinese: '熊', pinyin: 'xiong',
    variants: [
      { spelling: 'Xiong', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Hsiung', type: 'common_anglicized', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Hung', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '金': {
    chinese: '金', pinyin: 'jin',
    variants: [
      { spelling: 'Jin', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Chin', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '邱': {
    chinese: '邱', pinyin: 'qiu',
    variants: [
      { spelling: 'Qiu', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Chiu', type: 'common_anglicized', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Khoo', type: 'minnan', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '侯': {
    chinese: '侯', pinyin: 'hou',
    variants: [
      { spelling: 'Hou', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Howe', type: 'simplified_phonetic', formality: 3, recognizability: 4, easilyMangled: false },
      { spelling: 'Hao', type: 'simplified_phonetic', formality: 2, recognizability: 3, easilyMangled: false },
    ]
  },
  '白': {
    chinese: '白', pinyin: 'bai',
    variants: [
      { spelling: 'Bai', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Pak', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
      { spelling: 'Pai', type: 'simplified_phonetic', formality: 2, recognizability: 2, easilyMangled: false },
    ]
  },
  '江': {
    chinese: '江', pinyin: 'jiang',
    variants: [
      { spelling: 'Jiang', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Chiang', type: 'common_anglicized', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Kong', type: 'cantonese', formality: 3, recognizability: 4, easilyMangled: false },
    ]
  },
  '史': {
    chinese: '史', pinyin: 'shi',
    variants: [
      { spelling: 'Shi', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Sze', type: 'cantonese', formality: 3, recognizability: 2, easilyMangled: true },
      { spelling: 'See', type: 'simplified_phonetic', formality: 2, recognizability: 3, easilyMangled: false },
    ]
  },
  '龙': {
    chinese: '龙', pinyin: 'long',
    variants: [
      { spelling: 'Long', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Lung', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '万': {
    chinese: '万', pinyin: 'wan',
    variants: [
      { spelling: 'Wan', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Man', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '段': {
    chinese: '段', pinyin: 'duan',
    variants: [
      { spelling: 'Duan', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: false },
      { spelling: 'Tuan', type: 'common_anglicized', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '雷': {
    chinese: '雷', pinyin: 'lei',
    variants: [
      { spelling: 'Lei', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Lui', type: 'cantonese', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '钱': {
    chinese: '钱', pinyin: 'qian',
    variants: [
      { spelling: 'Qian', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Chien', type: 'common_anglicized', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Chin', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '汤': {
    chinese: '汤', pinyin: 'tang',
    variants: [
      { spelling: 'Tang', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Tong', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '尹': {
    chinese: '尹', pinyin: 'yin',
    variants: [
      { spelling: 'Yin', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Yun', type: 'simplified_phonetic', formality: 3, recognizability: 3, easilyMangled: false },
    ]
  },
  '易': {
    chinese: '易', pinyin: 'yi',
    variants: [
      { spelling: 'Yi', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Yee', type: 'simplified_phonetic', formality: 3, recognizability: 4, easilyMangled: false },
      { spelling: 'Ee', type: 'simplified_phonetic', formality: 2, recognizability: 3, easilyMangled: false },
    ]
  },
  '常': {
    chinese: '常', pinyin: 'chang',
    variants: [
      { spelling: 'Chang', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Cheung', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '武': {
    chinese: '武', pinyin: 'wu',
    variants: [
      { spelling: 'Wu', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Woo', type: 'simplified_phonetic', formality: 3, recognizability: 4, easilyMangled: false },
      { spelling: 'Mo', type: 'cantonese', formality: 2, recognizability: 3, easilyMangled: false },
    ]
  },
  '乔': {
    chinese: '乔', pinyin: 'qiao',
    variants: [
      { spelling: 'Qiao', type: 'pinyin', formality: 5, recognizability: 3, easilyMangled: true },
      { spelling: 'Chiao', type: 'common_anglicized', formality: 4, recognizability: 3, easilyMangled: false },
      { spelling: 'Kiu', type: 'cantonese', formality: 3, recognizability: 2, easilyMangled: true },
    ]
  },
  '贺': {
    chinese: '贺', pinyin: 'he',
    variants: [
      { spelling: 'He', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Ho', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
    ]
  },
  '赖': {
    chinese: '赖', pinyin: 'lai',
    variants: [
      { spelling: 'Lai', type: 'pinyin', formality: 5, recognizability: 5, easilyMangled: false },
      { spelling: 'Lye', type: 'simplified_phonetic', formality: 2, recognizability: 3, easilyMangled: false },
    ]
  },
  '龚': {
    chinese: '龚', pinyin: 'gong',
    variants: [
      { spelling: 'Gong', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Kung', type: 'cantonese', formality: 4, recognizability: 3, easilyMangled: false },
    ]
  },
  '文': {
    chinese: '文', pinyin: 'wen',
    variants: [
      { spelling: 'Wen', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Man', type: 'cantonese', formality: 4, recognizability: 4, easilyMangled: false },
      { spelling: 'Vun', type: 'minnan', formality: 2, recognizability: 2, easilyMangled: true },
    ]
  },
  '欧': {
    chinese: '欧', pinyin: 'ou',
    variants: [
      { spelling: 'Ou', type: 'pinyin', formality: 5, recognizability: 4, easilyMangled: false },
      { spelling: 'Au', type: 'cantonese', formality: 3, recognizability: 4, easilyMangled: false },
      { spelling: 'O', type: 'simplified_phonetic', formality: 2, recognizability: 3, easilyMangled: false },
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

export { SURNAME_VARIANT_MAP };