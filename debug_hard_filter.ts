import { hardFilterSingleName, calculateTotalStrokes, getStrokeCount } from './src/lib/hard-filter';

console.log('=== 详细笔画 ===');
const chars = ['梓', '萱', '婷', '秀', '英', '杰', '张', '李'];
for (const c of chars) {
  console.log(`"${c}" U+${c.charCodeAt(0).toString(16).toUpperCase()} 笔画: ${getStrokeCount(c)}`);
}

console.log('\n=== 史真香谐音检测 ===');
// 只传入名字拼音 "zhēn xiāng"，验证谐音检测
const r_shizhen = hardFilterSingleName('真香', 'zhēn xiāng', { surname: '史' });
console.log('史真香结果:', JSON.stringify(r_shizhen));

// 测试不带音调的拼音
const r_shizhen2 = hardFilterSingleName('真香', 'zhen xiang', { surname: '史' });
console.log('史真香(无音调)结果:', JSON.stringify(r_shizhen2));

console.log('\n=== 谐音checkHomophoneTaboo直接测试 ===');
import { HardFilter } from './src/lib/hard-filter';
// 注意: checkHomophoneTaboo 不是导出的，直接通过hardFilterSingleName测试

console.log('\n=== 完整测试 ===');
console.log('梓萱:', calculateTotalStrokes('梓萱'));
console.log('婷秀:', calculateTotalStrokes('婷秀'));
console.log('英杰:', calculateTotalStrokes('英杰'));

// 测试三字名字
console.log('张梓萱(姓12+名', calculateTotalStrokes('梓萱'), '):', calculateTotalStrokes('张梓萱'));
console.log('李婷秀(姓7+名', calculateTotalStrokes('婷秀'), '):', calculateTotalStrokes('李婷秀'));