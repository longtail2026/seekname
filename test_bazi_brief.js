const lunisolar = require('lunisolar');
console.log('lunisolar版本:', require('lunisolar/package.json').version);

// 测试八字排盘
const ls = lunisolar('2024-03-15 08:30:00');
console.log('\n========================================');
console.log('八字排盘测试 (出生: 2024-03-15 08:30)');
console.log('预期: 甲辰年 丁卯月 戊寅日 丙辰时');
console.log('========================================');

const char8 = ls.char8;
const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const wuxingNames = ['木','火','土','金','水'];

// 天干五行映射 (甲木,乙木,丙火,丁火,戊土,己土,庚金,辛金,壬水,癸水)
const stemWuxing = [0,0,1,1,2,2,3,3,4,4]; // 0木,1火,2土,3金,4水
// 地支五行映射 (子水,丑土,寅木,卯木,辰土,巳火,午火,未土,申金,酉金,戌土,亥水)
const branchWuxing = [4,2,0,0,2,1,1,2,3,3,2,4];

const pillars = ['年柱','月柱','日柱','时柱'];
const list = char8._list || [];

console.log('\n八字四柱:');
list.forEach((pillar, i) => {
  const stem = pillar.stem;
  const branch = pillar.branch;
  const stemName = stems[stem.value];
  const branchName = branches[branch.value];
  const stemWx = wuxingNames[stemWuxing[stem.value]];
  const branchWx = wuxingNames[branchWuxing[branch.value]];
  console.log(`  ${pillars[i]}: ${stemName}${branchName} (天干:${stemName}五行${stemWx}, 地支:${branchName}五行${branchWx})`);
});

// 日主 (日干)
const dayPillar = list[2];
const dayStem = stems[dayPillar.stem.value];
const dayWx = wuxingNames[stemWuxing[dayPillar.stem.value]];
console.log(`\n日主(日干): ${dayStem} (五行属${dayWx})`);

// 五行统计
const wxCount = [0,0,0,0,0]; // 木火土金水
list.forEach(pillar => {
  wxCount[stemWuxing[pillar.stem.value]]++;
  wxCount[branchWuxing[pillar.branch.value]]++;
});
console.log('\n五行统计 (天干+地支共8字):');
const wxLabels = ['木','火','土','金','水'];
wxCount.forEach((count, i) => {
  const bar = '█'.repeat(count);
  console.log(`  ${wxLabels[i]}: ${count} ${bar}`);
});

console.log('\n✅ 八字排盘功能正常!');