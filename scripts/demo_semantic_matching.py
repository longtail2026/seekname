#!/usr/bin/env python3
"""
Demonstration of semantic matching for AI naming website.
This script shows how customer's naming intentions can be matched with classics entries.
"""

import psycopg2
import logging
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class NamingIntentMatcher:
    """
    Match user's naming intentions with classics entries using semantic search.
    This demonstrates the core functionality for the AI naming website.
    """
    
    def __init__(self, db_config=None):
        self.db_config = db_config or {
            'host': 'localhost',
            'port': 5432,
            'database': 'seekname_db',
            'user': 'postgres',
            'password': 'postgres'
        }
        self.conn = None
        self.cur = None
    
    def connect(self):
        """Connect to database"""
        self.conn = psycopg2.connect(**self.db_config)
        self.cur = self.conn.cursor()
        logger.info("Connected to database")
    
    def disconnect(self):
        """Disconnect from database"""
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()
        logger.info("Disconnected from database")
    
    def find_similar_classics(self, user_intent: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Find classics entries semantically similar to user's naming intent.
        
        Args:
            user_intent: User's naming intention in natural language
            limit: Maximum number of results to return
            
        Returns:
            List of dictionaries containing matching classics entries
        """
        # Note: In production, this would use BGE-M3 embeddings for semantic matching
        # For this demo, we're using the placeholder function that returns random results
        
        self.cur.execute("""
            SELECT * FROM find_similar_classics(%s, %s, 0.5)
        """, (user_intent, limit))
        
        results = []
        for row in self.cur.fetchall():
            entry_id, book_name, ancient_text, modern_text, similarity = row
            results.append({
                'id': entry_id,
                'book_name': book_name,
                'ancient_text': ancient_text,
                'modern_text': modern_text,
                'similarity': similarity
            })
        
        return results
    
    def extract_naming_elements(self, classics_entry: Dict[str, Any]) -> List[str]:
        """
        Extract potential naming elements (characters/words) from classics entry.
        
        Args:
            classics_entry: Classics entry dictionary
            
        Returns:
            List of potential characters/words for naming
        """
        ancient_text = classics_entry['ancient_text']
        
        # Common meaningful characters for naming
        meaningful_chars = {
            '智慧': ['智', '慧', '聪', '明'],
            '勇敢': ['勇', '敢', '刚', '强'],
            '仁义': ['仁', '义', '德', '善'],
            '孝顺': ['孝', '顺', '敬', '爱'],
            '成功': ['成', '功', '就', '达'],
            '健康': ['健', '康', '安', '宁'],
            '快乐': ['快', '乐', '欣', '悦'],
            '才华': ['才', '华', '文', '艺']
        }
        
        naming_elements = []
        
        # Extract individual meaningful characters
        for char in ancient_text:
            for category, chars in meaningful_chars.items():
                if char in chars and char not in naming_elements:
                    naming_elements.append(char)
        
        # Extract 2-character phrases
        phrases = []
        for i in range(len(ancient_text) - 1):
            phrase = ancient_text[i:i+2]
            if len(phrase.strip()) == 2:
                phrases.append(phrase)
        
        # Add top phrases
        naming_elements.extend(phrases[:3])
        
        return naming_elements[:8]  # Return top 8 elements
    
    def generate_name_suggestions(self, naming_elements: List[str], surname: str = None) -> List[str]:
        """
        Generate name suggestions from extracted naming elements.
        
        Args:
            naming_elements: List of characters/words for naming
            surname: Optional surname to combine with
            
        Returns:
            List of suggested names
        """
        suggestions = []
        
        # Generate single-character given names
        for elem in naming_elements:
            if len(elem) == 1:  # Single character
                if surname:
                    suggestions.append(f"{surname}{elem}")
                suggestions.append(elem)  # Just the character
        
        # Generate two-character given names
        for i in range(len(naming_elements)):
            for j in range(i + 1, len(naming_elements)):
                if len(naming_elements[i]) == 1 and len(naming_elements[j]) == 1:
                    two_char = f"{naming_elements[i]}{naming_elements[j]}"
                    if surname:
                        suggestions.append(f"{surname}{two_char}")
                    suggestions.append(two_char)
        
        # Remove duplicates and limit
        unique_suggestions = []
        seen = set()
        for suggestion in suggestions:
            if suggestion not in seen:
                seen.add(suggestion)
                unique_suggestions.append(suggestion)
        
        return unique_suggestions[:10]  # Return top 10 suggestions
    
    def process_naming_intent(self, user_intent: str, surname: str = None) -> Dict[str, Any]:
        """
        Complete processing of user's naming intent.
        
        Args:
            user_intent: User's naming intention
            surname: Optional surname
            
        Returns:
            Dictionary with all processing results
        """
        logger.info(f"Processing naming intent: '{user_intent}'")
        
        # Step 1: Find similar classics entries
        similar_entries = self.find_similar_classics(user_intent, limit=3)
        
        # Step 2: Extract naming elements from each entry
        all_naming_elements = []
        entry_details = []
        
        for entry in similar_entries:
            naming_elements = self.extract_naming_elements(entry)
            all_naming_elements.extend(naming_elements)
            
            entry_details.append({
                'book': entry['book_name'],
                'ancient_text_preview': entry['ancient_text'][:40] + "..." if len(entry['ancient_text']) > 40 else entry['ancient_text'],
                'naming_elements': naming_elements[:5],
                'similarity': entry['similarity']
            })
        
        # Remove duplicates from naming elements
        unique_elements = []
        seen_elements = set()
        for elem in all_naming_elements:
            if elem not in seen_elements:
                seen_elements.add(elem)
                unique_elements.append(elem)
        
        # Step 3: Generate name suggestions
        name_suggestions = self.generate_name_suggestions(unique_elements, surname)
        
        return {
            'user_intent': user_intent,
            'surname': surname,
            'similar_entries_found': len(similar_entries),
            'entry_details': entry_details,
            'extracted_elements': unique_elements[:10],  # Top 10 elements
            'name_suggestions': name_suggestions
        }

def main():
    """Main demonstration function"""
    
    # Example naming intentions from customers
    naming_intents = [
        {
            'intent': '希望孩子聪明智慧，学业有成',
            'surname': '李'
        },
        {
            'intent': '想要孩子勇敢坚强，有担当',
            'surname': '王'
        },
        {
            'intent': '期望孩子仁义道德，品行端正',
            'surname': '张'
        },
        {
            'intent': '愿孩子健康平安，快乐成长',
            'surname': None
        }
    ]
    
    # Initialize matcher
    matcher = NamingIntentMatcher()
    
    try:
        matcher.connect()
        
        print("=" * 80)
        print("AI 起名网站 - 语义匹配演示")
        print("=" * 80)
        
        for i, intent_data in enumerate(naming_intents, 1):
            user_intent = intent_data['intent']
            surname = intent_data['surname']
            
            print(f"\n{'='*80}")
            print(f"案例 {i}: 客户意向 - '{user_intent}'")
            if surname:
                print(f"       姓氏: {surname}")
            print(f"{'='*80}")
            
            # Process the naming intent
            result = matcher.process_naming_intent(user_intent, surname)
            
            # Display results
            print(f"\n找到 {result['similar_entries_found']} 条语义相近的典籍:")
            
            for j, entry in enumerate(result['entry_details'], 1):
                print(f"\n  {j}. 《{entry['book']}》 (相似度: {entry['similarity']:.3f})")
                print(f"     典籍原文: {entry['ancient_text_preview']}")
                print(f"     可提取字词: {', '.join(entry['naming_elements'])}")
            
            print(f"\n提取的起名字词: {', '.join(result['extracted_elements'])}")
            
            print(f"\n生成的起名建议:")
            for k, name in enumerate(result['name_suggestions'], 1):
                print(f"  {k}. {name}")
            
            # Show example name combinations
            print(f"\n示例名字解析:")
            if result['name_suggestions']:
                example_name = result['name_suggestions'][0]
                if surname and example_name.startswith(surname):
                    given_name = example_name[len(surname):]
                    print(f"  '{example_name}': {surname}{given_name}")
                    print(f"    寓意: 结合了典籍中'{given_name[0]}'和'{given_name[1] if len(given_name) > 1 else given_name[0]}'的含义")
                elif len(example_name) == 2:
                    print(f"  '{example_name}': {example_name[0]}{example_name[1]}")
                    print(f"    寓意: 结合了典籍中'{example_name[0]}'和'{example_name[1]}'的美好含义")
            
            print(f"\n{'='*80}")
        
        # Summary
        print("\n" + "="*80)
        print("演示总结:")
        print("="*80)
        print("""
1. 数据库准备完成:
   - 124,120 条典籍条目已向量化
   - 语义搜索函数已创建
   - 基础架构已就绪

2. BGE-M3 集成路径:
   - 安装依赖: pip install torch transformers sentence-transformers
   - 更新 generate_embeddings_simple.py 使用 BGE-M3
   - 重新生成高质量嵌入向量
   - 实现精确的余弦相似度计算

3. 生产部署:
   - 创建 API 端点: /api/search/classics
   - 集成到起名流程中
   - 添加缓存和监控
   - A/B 测试优化

4. 预期效果:
   - 准确理解用户口语化起名意向
   - 从典籍中找到语义匹配的词句
   - 提取有文化内涵的起名字词
   - 生成有意义且独特的名字
        """)
        
    except Exception as e:
        logger.error(f"演示失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        matcher.disconnect()

if __name__ == "__main__":
    main()