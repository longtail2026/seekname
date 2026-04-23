#!/usr/bin/env python3
"""
继续完成naming_classics表中缺失keywords的典籍生成关键词
针对：庄子、礼记、论语，以及尚书的剩余部分
使用更稳健的连接策略，避免连接中断
"""

import psycopg2
import sys
import random
import time
from typing import List, Dict, Any

# 数据库连接URL
vercel_url = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'

# 各典籍关键词定义（与generate_keywords.py相同）
KEYWORDS_BY_BOOK = {
    "孟子": [
        # 孟子核心思想
        "仁政", "王道", "民本", "性善", "仁义", "礼智", "四端", "良知",
        "良能", "浩然之气", "养气", "尽心", "知性", "知天", "存心",
        "养性", "事天", "立命", "天爵", "人爵", "大丈夫", "富贵",
        "贫贱", "威武", "不动心", "寡欲", "养心", "求放心", "夜气",
        # 孟子重要概念
        "恻隐之心", "羞恶之心", "辞让之心", "是非之心", "仁之端",
        "义之端", "礼之端", "智之端", "不忍人之心", "推恩", "保民",
        "与民同乐", "民贵君轻", "社稷", "君臣", "父子", "夫妇",
        "兄弟", "朋友", "五伦", "人伦", "教化", "学校", "明人伦",
        # 孟子名句关键词
        "老吾老", "幼吾幼", "天下可运于掌", "独乐乐", "众乐乐",
        "天时", "地利", "人和", "得道多助", "失道寡助", "生于忧患",
        "死于安乐", "穷则独善其身", "达则兼济天下", "富贵不能淫",
        "贫贱不能移", "威武不能屈", "我善养吾浩然之气"
    ],
    
    "尚书": [
        # 尚书核心内容
        "典谟", "训诂", "誓命", "尧典", "舜典", "大禹谟", "皋陶谟",
        "益稷", "禹贡", "甘誓", "五子之歌", "胤征", "汤誓", "仲虺之诰",
        "汤诰", "伊训", "太甲", "咸有一德", "盘庚", "说命", "高宗肜日",
        "西伯戡黎", "微子", "泰誓", "牧誓", "武成", "洪范", "旅獒",
        "金縢", "大诰", "微子之命", "康诰", "酒诰", "梓材", "召诰",
        "洛诰", "多士", "无逸", "君奭", "蔡仲之命", "多方", "立政",
        "周官", "君陈", "顾命", "康王之诰", "毕命", "君牙", "冏命",
        "吕刑", "文侯之命", "费誓", "秦誓",
        # 尚书重要概念
        "天命", "民心", "德政", "敬天", "保民", "明德", "慎罚",
        "九畴", "五行", "五事", "八政", "五纪", "皇极", "三德",
        "稽疑", "庶征", "五福", "六极", "彝伦", "攸叙", "洪范",
        "禹贡", "九州", "贡赋", "五服", "弼成", "五典", "五惇",
        "五礼", "五庸", "五服", "五章", "五刑", "五用", "五教",
        "五流", "五宅", "三就", "五服", "五流", "五宅", "三就"
    ],
    
    "庄子": [
        # 庄子核心思想
        "逍遥", "齐物", "无为", "自然", "道", "德", "天", "人",
        "真", "朴", "虚", "静", "淡", "漠", "寂寞", "无为",
        "无己", "无功", "无名", "心斋", "坐忘", "悬解", "物化",
        "天钧", "天倪", "天籁", "地籁", "人籁", "朝菌", "蟪蛄",
        "冥灵", "大椿", "彭祖", "殇子", "大知", "小知", "大年",
        "小年", "有待", "无待", "无何有之乡", "广漠之野",
        # 庄子重要概念
        "庖丁解牛", "游刃有余", "目无全牛", "踌躇满志", "善刀而藏",
        "庄周梦蝶", "物化", "栩栩然", "蘧蘧然", "不知周之梦为蝴蝶",
        "濠梁之辩", "子非鱼", "安知鱼之乐", "子非我", "安知我不知",
        "混沌之死", "日凿一窍", "七日而混沌死", "佝偻承蜩", "用志不分",
        "乃凝于神", "呆若木鸡", "异鸡无敢应者", "望之似木鸡",
        "轮扁斫轮", "得之于手而应于心", "口不能言", "有数存焉",
        "东施效颦", "彼知颦美而不知颦之所以美", "邯郸学步",
        "寿陵余子", "未得国能", "又失其故行", "匍匐而归",
        # 庄子篇章
        "逍遥游", "齐物论", "养生主", "人间世", "德充符", "大宗师",
        "应帝王", "骈拇", "马蹄", "胠箧", "在宥", "天地", "天道",
        "天运", "刻意", "缮性", "秋水", "至乐", "达生", "山木",
        "田子方", "知北游", "庚桑楚", "徐无鬼", "则阳", "外物",
        "寓言", "让王", "盗跖", "说剑", "渔父", "列御寇", "天下"
    ],
    
    "礼记": [
        # 礼记核心内容
        "曲礼", "檀弓", "王制", "月令", "曾子问", "文王世子",
        "礼运", "礼器", "郊特牲", "内则", "玉藻", "明堂位",
        "丧服小记", "大传", "少仪", "学记", "乐记", "杂记",
        "丧大记", "祭法", "祭义", "祭统", "经解", "哀公问",
        "仲尼燕居", "孔子闲居", "坊记", "中庸", "表记", "缁衣",
        "奔丧", "问丧", "服问", "间传", "三年问", "深衣",
        "投壶", "儒行", "大学", "冠义", "昏义", "乡饮酒义",
        "射义", "燕义", "聘义", "丧服四制",
        # 礼记重要概念
        "礼", "乐", "刑", "政", "四达而不悖", "王道", "大同",
        "小康", "天下为公", "选贤与能", "讲信修睦", "人不独亲其亲",
        "不独子其子", "老有所终", "壮有所用", "幼有所长",
        "矜寡孤独废疾者皆有所养", "男有分", "女有归", "货恶其弃于地",
        "不必藏于己", "力恶其不出于身", "不必为己", "是故谋闭而不兴",
        "盗窃乱贼而不作", "故外户而不闭", "是谓大同", "教学相长",
        "玉不琢不成器", "人不学不知道", "化民成俗", "其必由学",
        "建国君民", "教学为先", "时过然后学", "则勤苦而难成",
        "独学而无友", "则孤陋而寡闻", "善歌者使人继其声",
        "善教者使人继其志", "君子如欲化民成俗", "其必由学乎"
    ],
    
    "论语": [
        # 论语核心思想
        "仁", "义", "礼", "智", "信", "忠", "孝", "悌", "恕",
        "勇", "温", "良", "恭", "俭", "让", "宽", "敏", "惠",
        "直", "刚", "毅", "木", "讷", "学", "思", "知", "行",
        "君子", "小人", "圣人", "贤人", "士", "成人", "善人",
        "有恒者", "中庸", "和而不同", "周而不比", "泰而不骄",
        "威而不猛", "文质彬彬", "温故知新", "学而时习", "不亦说乎",
        "有朋自远方来", "不亦乐乎", "人不知而不愠", "不亦君子乎",
        "吾日三省吾身", "为人谋而不忠乎", "与朋友交而不信乎",
        "传不习乎", "道千乘之国", "敬事而信", "节用而爱人",
        "使民以时", "弟子入则孝", "出则悌", "谨而信", "泛爱众",
        "而亲仁", "行有余力", "则以学文", "贤贤易色", "事父母能竭其力",
        "事君能致其身", "与朋友交言而有信", "虽曰未学", "吾必谓之学",
        "君子不重则不威", "学则不固", "主忠信", "无友不如己者",
        "过则勿惮改", "慎终追远", "民德归厚", "父在观其志",
        "父没观其行", "三年无改于父之道", "可谓孝", "礼之用和为贵",
        "先王之道斯为美", "小大由之", "有所不行", "知和而和",
        "不以礼节之", "亦不可行", "信近于义", "言可复",
        "恭近于礼", "远耻辱", "因不失其亲", "亦可宗"
    ]
}

def connect_to_database_with_retry(max_retries=3, retry_delay=2):
    """连接到数据库，支持重试"""
    for attempt in range(max_retries):
        try:
            print(f'正在连接Vercel Postgres数据库... (尝试 {attempt+1}/{max_retries})')
            conn = psycopg2.connect(vercel_url)
            cur = conn.cursor()
            print('✓ 连接成功')
            return conn, cur
        except Exception as e:
            print(f'✗ 连接失败: {e}')
            if attempt < max_retries - 1:
                print(f'等待 {retry_delay} 秒后重试...')
                time.sleep(retry_delay)
                retry_delay *= 2  # 指数退避
            else:
                print('已达到最大重试次数，连接失败')
                return None, None

def get_empty_keywords_count(cur):
    """获取空关键词的记录统计"""
    print('\n=== 空关键词记录统计 ===')
    
    try:
        cur.execute("""
            SELECT 
                book_name,
                COUNT(*) as empty_count
            FROM naming_classics 
            WHERE keywords IS NULL OR keywords = ''
            GROUP BY book_name
            ORDER BY book_name
        """)
        
        empty_counts = {}
        for row in cur.fetchall():
            book_name, count = row
            empty_counts[book_name] = count
            print(f'  {book_name}: {count} 条记录')
        
        return empty_counts
    except Exception as e:
        print(f'获取空关键词统计失败: {e}')
        return {}

def generate_keywords_for_book(book_name: str, count: int = 5) -> str:
    """为指定书籍生成关键词"""
    if book_name not in KEYWORDS_BY_BOOK:
        # 如果没有预定义关键词，返回空字符串
        return ""
    
    keywords_list = KEYWORDS_BY_BOOK[book_name]
    
    # 随机选择关键词，但确保不重复
    selected_keywords = random.sample(keywords_list, min(count, len(keywords_list)))
    
    # 返回逗号分隔的字符串
    return ','.join(selected_keywords)

def update_keywords_batch(cur, conn, book_name: str, record_ids: List[int]) -> int:
    """更新一批记录的关键词"""
    updated_count = 0
    
    try:
        for record_id in record_ids:
            # 生成关键词
            keywords = generate_keywords_for_book(book_name)
            
            if keywords:
                # 更新记录
                cur.execute("""
                    UPDATE naming_classics 
                    SET keywords = %s 
                    WHERE id = %s
                """, (keywords, record_id))
                updated_count += 1
        
        conn.commit()
        return updated_count
        
    except Exception as e:
        conn.rollback()
        print(f'  ✗ 批量更新失败: {e}')
        return 0

def update_keywords_for_book_safely(book_name: str, batch_size: int = 50, max_batches: int = None):
    """安全地更新指定书籍的空关键词记录"""
    print(f'\n开始更新《{book_name}》的关键词...')
    
    total_updated = 0
    batches_processed = 0
    
    while True:
        # 每次循环都重新连接，避免连接超时
        conn, cur = connect_to_database_with_retry()
        if not conn or not cur:
            print(f'  ✗ 无法连接到数据库，跳过《{book_name}》')
            break
        
        try:
            # 获取需要更新的记录ID
            cur.execute("""
                SELECT id 
                FROM naming_classics 
                WHERE book_name = %s 
                AND (keywords IS NULL OR keywords = '')
                ORDER BY id
                LIMIT %s
            """, (book_name, batch_size))
            
            record_ids = [row[0] for row in cur.fetchall()]
            
            if not record_ids:
                print(f'  ✓ 《{book_name}》没有需要更新的记录')
                break
            
            print(f'  找到 {len(record_ids)} 条需要更新的记录')
            
            # 更新这批记录
            updated = update_keywords_batch(cur, conn, book_name, record_ids)
            total_updated += updated
            
            if updated > 0:
                print(f'  ✓ 成功更新 {updated} 条记录的关键词')
            else:
                print(f'  ⚠ 没有成功更新任何记录')
            
            batches_processed += 1
            
            # 检查是否达到最大批次限制
            if max_batches and batches_processed >= max_batches:
                print(f'  ⚠ 已达到最大批次限制 ({max_batches})，暂停更新')
                break
            
            # 如果返回的记录数少于批次大小，说明已经处理完所有记录
            if len(record_ids) < batch_size:
                print(f'  ✓ 《{book_name}》所有记录已处理完成')
                break
            
            # 短暂休息，避免数据库压力过大
            time.sleep(1)
            
        except Exception as e:
            print(f'  ✗ 处理过程中出错: {e}')
        
        finally:
            # 关闭当前连接
            cur.close()
            conn.close()
    
    return total_updated

def check_current_coverage(cur):
    """检查当前关键词覆盖率"""
    print('\n=== 当前关键词覆盖率 ===')
    
    books_to_check = ['孟子', '尚书', '庄子', '礼记', '论语']
    
    try:
        # 使用IN子句一次性查询所有书籍
        placeholders = ','.join(['%s'] * len(books_to_check))
        query = f"""
            SELECT 
                book_name,
                COUNT(*) as total,
                COUNT(CASE WHEN keywords IS NOT NULL AND keywords != '' THEN 1 END) as has_keywords,
                COUNT(CASE WHEN keywords IS NULL OR keywords = '' THEN 1 END) as empty_keywords
            FROM naming_classics 
            WHERE book_name IN ({placeholders})
            GROUP BY book_name
            ORDER BY book_name
        """
        
        cur.execute(query, books_to_check)
        
        print(f'{"书名":<10} {"总数":<8} {"有关键词":<10} {"无关键词":<10} {"覆盖率":<10}')
        print('-'*60)
        
        coverage_data = {}
        for row in cur.fetchall():
            book_name, total, has_keywords, empty_keywords = row
            coverage = (has_keywords / total * 100) if total > 0 else 0
            coverage_data[book_name] = {
                'total': total,
                'has_keywords': has_keywords,
                'empty_keywords': empty_keywords,
                'coverage': coverage
            }
            print(f'{book_name:<10} {total:<8} {has_keywords:<10} {empty_keywords:<10} {coverage:.1f}%')
        
        return coverage_data
        
    except Exception as e:
        print(f'查询关键词覆盖率失败: {e}')
        return {}

def main():
    """主函数"""
    print('='*60)
    print('继续完成naming_classics表关键词补充')
    print('='*60)
    
    # 首先检查当前状态
    conn, cur = connect_to_database_with_retry()
    if not conn or not cur:
        return
    
    try:
        # 检查表是否存在
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'naming_classics'
            )
        """)
        
        if not cur.fetchone()[0]:
            print('✗ naming_classics表不存在')
            return
        
        # 检查当前覆盖率
        coverage_data = check_current_coverage(cur)
        
        if not coverage_data:
            print('无法获取覆盖率数据，程序退出')
            return
        
        # 确定需要更新的书籍
        books_to_update = []
        for book_name, data in coverage_data.items():
            if data['coverage'] < 100:
                books_to_update.append(book_name)
                print(f'需要更新: 《{book_name}》 - 覆盖率 {data["coverage"]:.1f}%')
        
        if not books_to_update:
            print('\n✓ 所有书籍的关键词覆盖率已达100%')
            return
        
        print(f'\n需要更新的书籍: {len(books_to_update)} 种')
        
        # 关闭当前连接
        cur.close()
        conn.close()
        
        # 更新每本书籍
        total_updated_all = 0
        
        for book_name in books_to_update:
            # 根据书籍大小调整批次大小
            if book_name in ['庄子', '礼记']:  # 记录数较多的书籍
                batch_size = 30
                max_batches = 20  # 限制每次运行的批次
            else:
                batch_size = 50
                max_batches = None
            
            print(f'\n{"="*60}')
            print(f'更新《{book_name}》 (批次大小: {batch_size})')
            print(f'{"="*60}')
            
            updated = update_keywords_for_book_safely(book_name, batch_size, max_batches)
            total_updated_all += updated
            
            if updated > 0:
                print(f'《{book_name}》本次更新: {updated} 条记录')
            
            # 每更新完一本书后休息一下
            time.sleep(2)
        
        # 最终检查
        print(f'\n{"="*60}')
        print('更新完成，检查最终结果')
        print(f'{"="*60}')
        
        conn, cur = connect_to_database_with_retry()
        if conn and cur:
            final_coverage = check_current_coverage(cur)
            
            # 总体统计
            cur.execute("SELECT COUNT(*) FROM naming_classics")
            total_count = cur.fetchone()[0]
            
            cur.execute("""
                SELECT COUNT(*) 
                FROM naming_classics 
                WHERE keywords IS NOT NULL AND keywords != ''
            """)
            has_keywords_count = cur.fetchone()[0]
            coverage = (has_keywords_count / total_count * 100) if total_count > 0 else 0
            
            print(f'\n总体统计:')
            print(f'总记录数: {total_count}')
            print(f'有关键词的记录: {has_keywords_count} ({coverage:.1f}%)')
            print(f'本次更新记录: {total_updated_all} 条')
            
            cur.close()
            conn.close()
        
    except Exception as e:
        print(f'\n✗ 处理过程中出错: {e}')
        import traceback
        traceback.print_exc()
    
    finally:
        print('\n✓ 程序执行完成')

if __name__ == '__main__':
    main()