/**
 * 检查现有单字素材和待添加字的存量
 * 运行: node scripts/check_existing_chars.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const REQUESTED_CHARS = [
  // 一、品德操守类
  { char: '悫', pinyin: 'què', meaning: '恭谨诚实', category: '品德操守', gender: 'B', style: ['稳重'] },
  { char: '惇', pinyin: 'dūn', meaning: '敦厚笃实', category: '品德操守', gender: 'B', style: ['稳重'] },
  { char: '笃', pinyin: 'dǔ', meaning: '忠实专一', category: '品德操守', gender: 'B', style: ['稳重'] },
  { char: '恪', pinyin: 'kè', meaning: '恭敬谨慎', category: '品德操守', gender: 'B', style: ['稳重'] },
  { char: '劼', pinyin: 'jié', meaning: '谨慎勤勉', category: '品德操守', gender: 'B', style: ['稳重'] },
  // 二、品德修养与言行类
  { char: '讷', pinyin: 'nè', meaning: '谨慎寡言内心充实', category: '品德修养', gender: 'B', style: ['稳重'] },
  { char: '懿', pinyin: 'yì', meaning: '品德美好', category: '品德修养', gender: 'B', style: ['端庄'] },
  { char: '恭', pinyin: 'gōng', meaning: '恭敬谦和', category: '品德修养', gender: 'B', style: ['稳重'] },
  { char: '恕', pinyin: 'shù', meaning: '宽恕仁厚', category: '品德修养', gender: 'B', style: ['稳重'] },
  // 三、智慧与才干类
  { char: '哲', pinyin: 'zhé', meaning: '智慧明理', category: '智慧才干', gender: 'B', style: ['文雅'] },
  { char: '彦', pinyin: 'yàn', meaning: '才德出众', category: '智慧才干', gender: 'B', style: ['文雅'] },
  { char: '楷', pinyin: 'kǎi', meaning: '楷模榜样', category: '智慧才干', gender: 'B', style: ['稳重'] },
  // 四、气质与风度类
  { char: '穆', pinyin: 'mù', meaning: '和畅美好恭敬', category: '气质风度', gender: 'B', style: ['端庄'] },
  { char: '晏', pinyin: 'yàn', meaning: '温和平静', category: '气质风度', gender: 'B', style: ['文雅'] },
  { char: '颢', pinyin: 'hào', meaning: '浩大光明胸怀宽广', category: '气质风度', gender: 'B', style: ['大气'] },
  // 五、具象品格类
  { char: '璞', pinyin: 'pú', meaning: '天然淳朴美质', category: '具象品格', gender: 'B', style: ['自然'] },
  // 风度：神采飞扬、潇洒不羁
  { char: '逸', pinyin: 'yì', meaning: '安闲超脱自由自在', category: '风度', gender: 'B', style: ['潇洒'] },
  { char: '洒', pinyin: 'sǎ', meaning: '潇洒自然大方', category: '风度', gender: 'B', style: ['潇洒'] },
  { char: '迈', pinyin: 'mài', meaning: '豪放超群', category: '风度', gender: 'B', style: ['大气'] },
  { char: '隽', pinyin: 'jùn', meaning: '才情魅力意味深长', category: '风度', gender: 'B', style: ['文雅'] },
  // 风度：挺拔俊秀
  { char: '朗', pinyin: 'lǎng', meaning: '明亮清澈', category: '风度', gender: 'B', style: ['潇洒'] },
  { char: '硕', pinyin: 'shuò', meaning: '宽广高大', category: '风度', gender: 'B', style: ['大气'] },
  { char: '颀', pinyin: 'qí', meaning: '身子高挑', category: '风度', gender: 'B', style: ['潇洒'] },
  { char: '奕', pinyin: 'yì', meaning: '精神饱满神采奕奕', category: '风度', gender: 'B', style: ['潇洒'] },
  // 风度：玉树临风
  { char: '轩', pinyin: 'xuān', meaning: '气度不凡器宇轩昂', category: '风度', gender: 'B', style: ['大气'] },
  { char: '鹤', pinyin: 'hè', meaning: '高洁姿态优美', category: '风度', gender: 'B', style: ['文雅'] },
  { char: '潇', pinyin: 'xiāo', meaning: '潇洒洒脱不拘一格', category: '风度', gender: 'B', style: ['潇洒'] },
  { char: '临', pinyin: 'lín', meaning: '玉树临风姿态优雅', category: '风度', gender: 'B', style: ['潇洒'] },
  // 风度：古风常用
  { char: '墨', pinyin: 'mò', meaning: '书卷气浓厚', category: '风度', gender: 'B', style: ['文雅'] },
  { char: '如', pinyin: 'rú', meaning: '淡然不争气质从容', category: '风度', gender: 'F', style: ['温柔'] },
  { char: '疏', pinyin: 'shū', meaning: '疏朗清瘦风骨不凡', category: '风度', gender: 'B', style: ['文雅'] },
  // 女子温婉：气质
  { char: '娴', pinyin: 'xián', meaning: '文雅稳重有修养', category: '女子温婉', gender: 'F', style: ['温柔'] },
  { char: '婉', pinyin: 'wǎn', meaning: '温顺柔美', category: '女子温婉', gender: 'F', style: ['温柔'] },
  { char: '淑', pinyin: 'shū', meaning: '贤淑善良', category: '女子温婉', gender: 'F', style: ['温柔'] },
  // 女子温婉：容貌
  { char: '妍', pinyin: 'yán', meaning: '美丽巧慧', category: '女子温婉', gender: 'F', style: ['温柔'] },
  { char: '姝', pinyin: 'shū', meaning: '容貌秀丽', category: '女子温婉', gender: 'F', style: ['温柔'] },
  { char: '娟', pinyin: 'juān', meaning: '姿态柔美秀气', category: '女子温婉', gender: 'F', style: ['温柔'] },
  { char: '倩', pinyin: 'qiàn', meaning: '姿容美好含笑动人', category: '女子温婉', gender: 'F', style: ['温柔'] },
  // 女子温婉：清丽脱俗
  { char: '涵', pinyin: 'hán', meaning: '包容滋润有内涵', category: '女子温婉', gender: 'F', style: ['温柔'] },
  { char: '清', pinyin: 'qīng', meaning: '纯净高洁清冷', category: '女子温婉', gender: 'F', style: ['自然'] },
  { char: '洁', pinyin: 'jié', meaning: '干净纯洁', category: '女子温婉', gender: 'F', style: ['自然'] },
  { char: '雅', pinyin: 'yǎ', meaning: '高尚美好不俗气', category: '女子温婉', gender: 'F', style: ['文雅'] },
  // 女子温婉：身姿窈窕
  { char: '婷', pinyin: 'tíng', meaning: '体态优美亭亭玉立', category: '女子温婉', gender: 'F', style: ['温柔'] },
  { char: '娜', pinyin: 'nuó', meaning: '纤细柔美姿态曼妙', category: '女子温婉', gender: 'F', style: ['温柔'] },
  { char: '姿', pinyin: 'zī', meaning: '容貌形态美好', category: '女子温婉', gender: 'F', style: ['温柔'] },
  // 女子温婉：古典韵味
  { char: '姜', pinyin: 'jiāng', meaning: '美丽亲切邻家气质', category: '女子温婉', gender: 'F', style: ['温柔'] },
  { char: '嬛', pinyin: 'xuān', meaning: '轻柔美丽', category: '女子温婉', gender: 'F', style: ['温柔'] },
  { char: '姣', pinyin: 'jiāo', meaning: '相貌美好面容饱满', category: '女子温婉', gender: 'F', style: ['温柔'] },
  { char: '嫣', pinyin: 'yān', meaning: '笑容美好嫣然动人', category: '女子温婉', gender: 'F', style: ['温柔'] },
];

async function main() {
  const client = await pool.connect();
  try {
    // 1. List all existing single-char entries
    const singles = await client.query(
      "SELECT id, phrase, meaning FROM naming_materials WHERE LENGTH(phrase) = 1 ORDER BY phrase"
    );
    const existingSingleSet = new Set(singles.rows.map(r => r.phrase));
    console.log('=== Existing single-char entries: ' + singles.rows.length + ' ===');
    singles.rows.forEach(r => console.log('  phrase="' + r.phrase + '" id=' + r.id + ' meaning="' + r.meaning + '"'));
    
    // 2. Check requested chars
    console.log('\n=== Check Requested: ' + REQUESTED_CHARS.length + ' chars ===');
    let toAdd = [];
    for (const item of REQUESTED_CHARS) {
      const existing = await client.query(
        'SELECT id, phrase, meaning FROM naming_materials WHERE phrase = $1',
        [item.char]
      );
      if (existing.rows.length > 0) {
        console.log('  SKIP "' + item.char + '": already exists (id=' + existing.rows[0].id + ', meaning="' + existing.rows[0].meaning + '")');
      } else if (existingSingleSet.has(item.char)) {
        console.log('  SKIP "' + item.char + '": already exists as single-char');
      } else {
        console.log('  ADD "' + item.char + '" (' + item.pinyin + '): ' + item.meaning + ' [' + item.category + ']');
        toAdd.push(item);
      }
    }
    
    console.log('\n=== Summary: ' + toAdd.length + ' chars to add ===');
    console.log(JSON.stringify(toAdd, null, 2));
    
  } finally { client.release(); }
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });