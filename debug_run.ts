import { HardFilter } from './src/lib/hard-filter';
const out = JSON.stringify({
  strokes: {
    梓: HardFilter.getStrokeCount('梓'),
    萱: HardFilter.getStrokeCount('萱'),
    婷: HardFilter.getStrokeCount('婷'),
    秀: HardFilter.getStrokeCount('秀'),
    英: HardFilter.getStrokeCount('英'),
    杰: HardFilter.getStrokeCount('杰'),
    张: HardFilter.getStrokeCount('张'),
    李: HardFilter.getStrokeCount('李'),
    王: HardFilter.getStrokeCount('王')
  },
  shizhenxiang: HardFilter.hardFilterSingleName('真香', 'zhen xiang', { surname: '史' }),
  zhangzixuan: HardFilter.hardFilterSingleName('梓萱', 'zi xuan', { surname: '张' }),
  litingxiu: HardFilter.hardFilterSingleName('婷秀', 'ting xiu', { surname: '李' }),
  wangyingjie: HardFilter.hardFilterSingleName('英杰', 'ying jie', { surname: '王' })
}, null, 2);
// Also test negative cases
const n1 = HardFilter.hardFilterSingleName('真香', 'zhen xiang', { surname: '史' });
const n2 = HardFilter.hardFilterSingleName('宝宝', 'bao bao', { surname: '张' });
const n3 = HardFilter.hardFilterSingleName('大傻子', 'da sha zi', { surname: '王' });
const n4 = HardFilter.hardFilterSingleName('死', 'si', { surname: '李' });
console.log("=== 正面案例 ===");
console.log("张梓萱:", JSON.stringify(HardFilter.hardFilterSingleName('梓萱', 'zi xuan', { surname: '张' })));
console.log("李婷秀:", JSON.stringify(HardFilter.hardFilterSingleName('婷秀', 'ting xiu', { surname: '李' })));
console.log("王英杰:", JSON.stringify(HardFilter.hardFilterSingleName('英杰', 'ying jie', { surname: '王' })));
console.log("\n=== 负面案例 ===");
console.log("史真香:", JSON.stringify(HardFilter.hardFilterSingleName('真香', 'zhen xiang', { surname: '史' })));
console.log("张宝宝:", JSON.stringify(HardFilter.hardFilterSingleName('宝宝', 'bao bao', { surname: '张' })));
console.log("王大傻子:", JSON.stringify(HardFilter.hardFilterSingleName('大傻子', 'da sha zi', { surname: '王' })));
console.log("李死:", JSON.stringify(HardFilter.hardFilterSingleName('死', 'si', { surname: '李' })));
console.log("\n=== 笔画检测 ===");
console.log("梓(", HardFilter.getStrokeCount('梓'), ") 萱(", HardFilter.getStrokeCount('萱'), ") 合计:", HardFilter.calculateTotalStrokes('梓萱'));
console.log("婷(", HardFilter.getStrokeCount('婷'), ") 秀(", HardFilter.getStrokeCount('秀'), ") 合计:", HardFilter.calculateTotalStrokes('婷秀'));
console.log("英(", HardFilter.getStrokeCount('英'), ") 杰(", HardFilter.getStrokeCount('杰'), ") 合计:", HardFilter.calculateTotalStrokes('英杰'));
console.log("张+梓萱:", HardFilter.calculateTotalStrokes('张梓萱'));
console.log("李+婷秀:", HardFilter.calculateTotalStrokes('李婷秀'));
console.log("王+英杰:", HardFilter.calculateTotalStrokes('王英杰'));