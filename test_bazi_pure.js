/**
 * 纯JS八字排盘算法测试
 * 参考标准算法：年柱用立春分界，月柱用节气分界，日柱用日干支基数，时柱用日干推算
 * 注意：这里用简化的年柱算法（正月初一后换年柱），月柱用节气（以每年立春为寅月起点）
 */

// ====== 常量 ======
const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 节气日期（按年,月,日存，精确到日，用于月柱计算）
// 近几年的二十四节气关键节点
// 这里只存了最关键的立春（寅月开始）、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒
// 格式: [month, day]，每年精确计算
// 简化版：使用固定节气表（1900-2100适用）
// source: 中科院紫金山天文台

// 月地支与节气的对应关系
// 寅月(Jan/Feb) - 立春  2月4日前后
// 卯月(Feb/Mar) - 惊蛰  3月6日前后
// 辰月(Mar/Apr) - 清明  4月5日前后
// 巳月(Apr/May) - 立夏  5月5日前后  
// 午月(May/Jun) - 芒种  6月6日前后
// 未月(Jun/Jul) - 小暑  7月7日前后
// 申月(Jul/Aug) - 立秋  8月7日前后
// 酉月(Aug/Sep) - 白露  9月8日前后
// 戌月(Sep/Oct) - 寒露 10月8日前后
// 亥月(Oct/Nov) - 立冬 11月7日前后
// 子月(Nov/Dec) - 大雪 12月7日前后
// 丑月(Dec/Jan) - 小寒  1月5日前后

// ====== 公用工具函数 ======

/** 日干支基数计算 - 基于1900-01-01(甲子日, 干支序号0) */
function calcDayGanZhi(year, month, day) {
  // 计算从公元0年1月1日到输入日期的总天数
  // 使用标准计算: 基数为 1900年1月1日是第1天(干支序号=0)
  
  // 先算从公元0年到目标年份1月1日的天数
  // 但简单做法: 用已知基准日来算
  // 基准: 1900-01-01 = 甲子日 (干支序号0)
  // 公式: days_since_epoch % 60
  
  // 计算从0000-01-01到year-01-01的天数
  function daysFromEpoch(y, m, d) {
    y = Math.floor(y);
    m = Math.floor(m);
    d = Math.floor(d);
    
    // 如果月份<=2，年份减1，月份+12
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    
    // 格里高利历
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    
    const days = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
    return Math.floor(days);
  }
  
  const days1 = daysFromEpoch(year, month, day);
  // 基准: 1900-01-01
  const daysBase = daysFromEpoch(1900, 1, 1);
  const diffDays = days1 - daysBase;
  
  // 1900-01-01 = 甲子日 = 干支0
  const ganZhiIndex = ((diffDays % 60) + 60) % 60;
  return ganZhiIndex;
}

/** 年干支计算 */
function calcYearGanZhi(year, month, day) {
  // 年中国归：立春前算前一年
  // 立春通常在2月4日前后
  const springStartDay = getSolarTermDay(year, 1); // 寅月=立春
  const actualYear = (month < 2 || (month === 2 && day < springStartDay)) ? year - 1 : year;
  
  // 年干支: (actualYear - 4) % 60
  const ganZhiIdx = ((actualYear - 4) % 60 + 60) % 60;
  const stemIdx = ganZhiIdx % 10;
  const branchIdx = ganZhiIdx % 12;
  return { stemIdx, branchIdx, actualYear };
}

/** 获取某年第n个节气的日期（简化版，使用近似值） */
// 节气顺序: 0小寒,1立春,2惊蛰,3清明,4立夏,5芒种,6小暑,7立秋,8白露,9寒露,10立冬,11大雪
// 使用近似计算公式
function getSolarTermDay(year, termIndex) {
  // termIndex: 0=小寒(1月), 1=立春(2月), 2=惊蛰(3月), 3=清明(4月), 
  //           4=立夏(5月), 5=芒种(6月), 6=小暑(7月), 7=立秋(8月),
  //           8=白露(9月), 9=寒露(10月), 10=立冬(11月), 11=大雪(12月)
  
  // 使用近似公式 (适用于1900-2100)
  // 每个节气有计算公式
  const terms = [
    { m: 1,  base: 5.59  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 小寒
    { m: 2,  base: 3.87  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 立春
    { m: 3,  base: 5.63  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 惊蛰
    { m: 4,  base: 4.81  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 清明
    { m: 5,  base: 5.52  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 立夏
    { m: 6,  base: 5.63  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 芒种
    { m: 7,  base: 6.87  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 小暑
    { m: 8,  base: 7.56  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 立秋
    { m: 9,  base: 7.65  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 白露
    { m: 10, base: 8.36  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 寒露
    { m: 11, base: 7.78  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 立冬
    { m: 12, base: 7.38  + 0.2422*(year-2020) - Math.floor((year-2020)/4) }, // 大雪
  ];
  
  return Math.round(terms[termIndex].base);
}

/** 月柱计算（基于年干和月支） */
function calcMonthGanZhi(year, month, day) {
  // 先确定月支（基于节气）
  let monthBranchIdx;
  
  // 确定月份地支
  // 寅=2, 卯=3, 辰=4, 巳=5, 午=6, 未=7, 申=8, 酉=9, 戌=10, 亥=11, 子=0, 丑=1
  const monthTermPairs = [
    { month: 2, termIdx: 1, branch: 2 },  // 立春 -> 寅月(2)
    { month: 3, termIdx: 2, branch: 3 },  // 惊蛰 -> 卯月(3)
    { month: 4, termIdx: 3, branch: 4 },  // 清明 -> 辰月(4)
    { month: 5, termIdx: 4, branch: 5 },  // 立夏 -> 巳月(5)
    { month: 6, termIdx: 5, branch: 6 },  // 芒种 -> 午月(6)
    { month: 7, termIdx: 6, branch: 7 },  // 小暑 -> 未月(7)
    { month: 8, termIdx: 7, branch: 8 },  // 立秋 -> 申月(8)
    { month: 9, termIdx: 8, branch: 9 },  // 白露 -> 酉月(9)
    { month: 10, termIdx: 9, branch: 10 }, // 寒露 -> 戌月(10)
    { month: 11, termIdx: 10, branch: 11 }, // 立冬 -> 亥月(11)
    { month: 12, termIdx: 11, branch: 0 },  // 大雪 -> 子月(0)
    { month: 1, termIdx: 0, branch: 1 },     // 小寒 -> 丑月(1)
  ];
  
  let branchFound = 1; // defalut to 丑月
  for (let i = 0; i < monthTermPairs.length; i++) {
    const { month: m, termIdx: t, branch: b } = monthTermPairs[i];
    const termDay = getSolarTermDay(year, t);
    if (month > m || (month === m && day >= termDay)) {
      branchFound = b;
    }
  }
  monthBranchIdx = branchFound;
  
  // 月干公式：年干决定月干起始
  // 甲己之年丙作首，乙庚之岁戊为头，丙辛之年寻庚上，丁壬壬寅顺水流，若问戊癸何处寻，甲寅之上好追求。
  // 年干: 0甲1乙2丙3丁4戊5己6庚7辛8壬9癸
  // 寅月天干起始: 甲年丙(2), 乙年戊(4), 丙年庚(6), 丁年壬(8), 戊年甲(0)
  // 己年丙(2), 庚年戊(4), 辛年庚(6), 壬年壬(8), 癸年甲(0)
  const yearStem = calcYearGanZhi(year, month, day).stemIdx;
  const yinStemStart = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0][yearStem]; // 寅月天干起始
  
  // 月干 = (yinStemStart + (branchIdx - 2 + 12) % 12) % 10
  const monthStemIdx = (yinStemStart + (monthBranchIdx - 2 + 12) % 12 + 12) % 10;
  
  return { stemIdx: monthStemIdx, branchIdx: monthBranchIdx };
}

/** 时柱计算（基于日干和时辰） */
function calcHourGanZhi(dayStemIdx, hour24) {
  // 时辰地支
  // 子时23-1, 丑时1-3, 寅时3-5, 卯时5-7, 辰时7-9, 巳时9-11
  // 午时11-13, 未时13-15, 申时15-17, 酉时17-19, 戌时19-21, 亥时21-23
  const hourBranchIdx = Math.floor((hour24 + 1) / 2) % 12;
  
  // 时干公式：日干决定时干起始
  // 甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途。
  // 日干: 0甲1乙2丙3丁4戊5己6庚7辛8壬9癸
  // 子时时干起始: 甲日甲(0), 乙日丙(2), 丙日戊(4), 丁日庚(6), 戊日壬(8)
  // 己日甲(0), 庚日丙(2), 辛日戊(4), 壬日庚(6), 癸日壬(8)
  const ziStemStart = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8][dayStemIdx];
  
  // 时干 = (ziStemStart + hourBranchIdx) % 10
  const hourStemIdx = (ziStemStart + hourBranchIdx) % 10;
  
  return { stemIdx: hourStemIdx, branchIdx: hourBranchIdx };
}

// ====== 主函数 ======

function calculateBaZiPure(dateStr) {
  // 解析日期
  const dt = new Date(dateStr);
  const year = dt.getFullYear();
  const month = dt.getMonth() + 1;
  const day = dt.getDate();
  const hour = dt.getHours();
  
  // 1. 年柱
  const yearGZ = calcYearGanZhi(year, month, day);
  
  // 2. 月柱
  const monthGZ = calcMonthGanZhi(year, month, day);
  
  // 3. 日柱
  const dayGZIdx = calcDayGanZhi(year, month, day);
  const dayStemIdx = dayGZIdx % 10;
  const dayBranchIdx = dayGZIdx % 12;
  
  // 4. 时柱
  const hourGZ = calcHourGanZhi(dayStemIdx, hour);
  
  // 返回结果
  return {
    year: { label: '年柱', stem: TIAN_GAN[yearGZ.stemIdx], branch: DI_ZHI[yearGZ.branchIdx], stemIdx: yearGZ.stemIdx, branchIdx: yearGZ.branchIdx },
    month: { label: '月柱', stem: TIAN_GAN[monthGZ.stemIdx], branch: DI_ZHI[monthGZ.branchIdx], stemIdx: monthGZ.stemIdx, branchIdx: monthGZ.branchIdx },
    day: { label: '日柱', stem: TIAN_GAN[dayStemIdx], branch: DI_ZHI[dayBranchIdx], stemIdx: dayStemIdx, branchIdx: dayBranchIdx },
    hour: { label: '时柱', stem: TIAN_GAN[hourGZ.stemIdx], branch: DI_ZHI[hourGZ.branchIdx], stemIdx: hourGZ.stemIdx, branchIdx: hourGZ.branchIdx },
  };
}

// ====== 测试 ======
const testDates = [
  '2026-04-26 12:00',
  '2024-01-01 12:00', 
  '2000-01-01 12:00',
  '1990-06-15 08:30',
  '1988-03-21 14:00',
  '2024-02-10 12:00',
];

testDates.forEach(d => {
  const result = calculateBaZiPure(d);
  const full = `${result.year.stem}${result.year.branch} ${result.month.stem}${result.month.branch} ${result.day.stem}${result.day.branch} ${result.hour.stem}${result.hour.branch}`;
  console.log(d, '->', full);
  
  // 同时显示每个柱的stemIdx, branchIdx
  console.log('   年:', `${result.year.stem}${result.year.branch}(${result.year.stemIdx},${result.year.branchIdx})`,
              '月:', `${result.month.stem}${result.month.branch}(${result.month.stemIdx},${result.month.branchIdx})`,
              '日:', `${result.day.stem}${result.day.branch}(${result.dayStemIdx},${result.dayBranchIdx})`,
              '时:', `${result.hour.stem}${result.hour.branch}(${result.hourGZ.stemIdx},${result.hourGZ.branchIdx})`);
});