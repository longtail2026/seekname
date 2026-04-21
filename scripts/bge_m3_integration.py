#!/usr/bin/env python3
"""
BGE-M3 integration for production use.
This script shows how to upgrade from simple embeddings to BGE-M3 embeddings.
"""

import os
import sys
import logging
import numpy as np
import psycopg2
from typing import List, Tuple, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BGE_M3_Integration:
    """
    BGE-M3 integration for production semantic matching.
    This class demonstrates how to use BGE-M3 model for embeddings.
    """
    
    def __init__(self):
        self.embedding_dim = 1024  # BGE-M3 embedding dimension
        
    def check_dependencies(self):
        """Check if BGE-M3 dependencies are installed"""
        try:
            import torch
            import transformers
            from transformers import AutoTokenizer, AutoModel
            
            logger.info("✓ torch version: %s", torch.__version__)
            logger.info("✓ transformers version: %s", transformers.__version__)
            logger.info("✓ BGE-M3 dependencies are available")
            return True
        except ImportError as e:
            logger.error("✗ BGE-M3 dependencies not installed")
            logger.error("Install with: pip install torch transformers sentence-transformers")
            logger.error("Error: %s", e)
            return False
    
    def get_bge_m3_embedder_code(self):
        """Return BGE-M3 embedder implementation code"""
        return '''
import torch
from transformers import AutoTokenizer, AutoModel
import numpy as np
from typing import List

class BGE_M3_Embedder:
    """BGE-M3 embedding model for Chinese text"""
    
    def __init__(self, model_name: str = "BAAI/bge-m3", device: str = None):
        """
        Initialize BGE-M3 model
        
        Args:
            model_name: HuggingFace model name
            device: 'cuda' or 'cpu', auto-detect if None
        """
        self.model_name = model_name
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        
        print(f"Loading BGE-M3 model: {model_name} on {self.device}")
        
        # Load tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        
        print("BGE-M3 model loaded successfully")
    
    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Encode texts to embeddings
        
        Args:
            texts: List of text strings
            batch_size: Batch size for inference
            
        Returns:
            numpy array of embeddings with shape (n_texts, embedding_dim)
        """
        embeddings = []
        
        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                
                # Tokenize
                encoded_input = self.tokenizer(
                    batch_texts,
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors='pt'
                ).to(self.device)
                
                # Generate embeddings
                model_output = self.model(**encoded_input)
                # Use the [CLS] token embedding
                batch_embeddings = model_output.last_hidden_state[:, 0]
                
                # Normalize embeddings
                batch_embeddings = torch.nn.functional.normalize(batch_embeddings, p=2, dim=1)
                
                embeddings.append(batch_embeddings.cpu().numpy())
        
        # Concatenate all batches
        if embeddings:
            return np.vstack(embeddings)
        return np.array([])
    
    def get_embedding_dim(self) -> int:
        """Get embedding dimension"""
        return self.model.config.hidden_size

# Usage example:
if __name__ == "__main__":
    # Initialize embedder
    embedder = BGE_M3_Embedder()
    
    # Example texts
    texts = [
        "智慧聪明的人善于学习",
        "勇敢坚强面对困难",
        "仁义道德是传统美德"
    ]
    
    # Generate embeddings
    embeddings = embedder.encode(texts)
    print(f"Generated embeddings shape: {embeddings.shape}")
    print(f"Embedding dimension: {embedder.get_embedding_dim()}")
'''
    
    def get_production_script_template(self):
        """Return production script template for BGE-M3 vectorization"""
        return '''
#!/usr/bin/env python3
"""
Production script for BGE-M3 vectorization of classics entries.
"""

import os
import sys
import logging
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from typing import List, Tuple, Optional

# BGE-M3 imports
import torch
from transformers import AutoTokenizer, AutoModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bge_m3_vectorization.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BGE_M3_Embedder:
    """BGE-M3 embedding model"""
    
    def __init__(self, model_name: str = "BAAI/bge-m3", device: str = None):
        self.model_name = model_name
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        
        logger.info(f"Loading BGE-M3 model: {model_name} on {self.device}")
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        
        logger.info("BGE-M3 model loaded successfully")
    
    def encode(self, texts: List[str], batch_size: int = 16) -> np.ndarray:
        """Encode texts to embeddings"""
        embeddings = []
        
        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                
                encoded_input = self.tokenizer(
                    batch_texts,
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors='pt'
                ).to(self.device)
                
                model_output = self.model(**encoded_input)
                batch_embeddings = model_output.last_hidden_state[:, 0]
                batch_embeddings = torch.nn.functional.normalize(batch_embeddings, p=2, dim=1)
                
                embeddings.append(batch_embeddings.cpu().numpy())
        
        if embeddings:
            return np.vstack(embeddings)
        return np.array([])

class BGE_M3_Vectorizer:
    """Vectorize classics with BGE-M3"""
    
    def __init__(self, db_config, embedder):
        self.db_config = db_config
        self.embedder = embedder
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
    
    def vectorize_with_bge_m3(self, batch_size: int = 100):
        """Vectorize entries using BGE-M3"""
        # Implementation similar to generate_embeddings_simple.py
        # but using BGE-M3 embedder instead of SimpleEmbedder
        pass

def main():
    """Main function"""
    # Database configuration
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'seekname_db',
        'user': 'postgres',
        'password': 'postgres'
    }
    
    try:
        # Initialize BGE-M3 embedder
        embedder = BGE_M3_Embedder()
        
        # Initialize vectorizer
        vectorizer = BGE_M3_Vectorizer(db_config, embedder)
        vectorizer.connect()
        
        # Vectorize entries
        logger.info("Starting BGE-M3 vectorization...")
        vectorizer.vectorize_with_bge_m3(batch_size=50)
        
        logger.info("BGE-M3 vectorization completed successfully!")
        
    except Exception as e:
        logger.error(f"BGE-M3 vectorization failed: {e}")
        sys.exit(1)
    finally:
        if 'vectorizer' in locals():
            vectorizer.disconnect()

if __name__ == "__main__":
    main()
'''
    
    def get_semantic_search_example(self):
        """Return semantic search example code"""
        return '''
# Semantic Search Example for Seekname AI Naming Website

import psycopg2
import numpy as np
from typing import List, Dict, Any

class SemanticSearch:
    """Semantic search for classics entries"""
    
    def __init__(self, db_config):
        self.db_config = db_config
        self.conn = None
        self.cur = None
    
    def connect(self):
        """Connect to database"""
        self.conn = psycopg2.connect(**self.db_config)
        self.cur = self.conn.cursor()
    
    def disconnect(self):
        """Disconnect from database"""
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()
    
    def search_similar_classics(self, user_intent: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for classics entries similar to user's naming intent
        
        Args:
            user_intent: User's naming intention (e.g., "希望孩子聪明智慧")
            limit: Maximum number of results
            
        Returns:
            List of dictionaries containing matching classics entries
        """
        # In production:
        # 1. Generate embedding for user_intent using BGE-M3
        # 2. Search for similar embeddings in database
        # 3. Return matching classics entries
        
        # Placeholder implementation
        self.cur.execute("""
            SELECT 
                ce.id,
                ce.book_name,
                ce.ancient_text,
                ce.modern_text,
                ce.keywords
            FROM classics_entries ce
            WHERE ce.combined_text_embedding IS NOT NULL
            ORDER BY RANDOM()
            LIMIT %s
        """, (limit,))
        
        results = []
        for row in self.cur.fetchall():
            results.append({
                'id': row[0],
                'book_name': row[1],
                'ancient_text': row[2],
                'modern_text': row[3],
                'keywords': row[4],
                'similarity_score': 0.8  # Placeholder
            })
        
        return results
    
    def extract_naming_elements(self, classics_entry: Dict[str, Any]) -> List[str]:
        """
        Extract potential naming elements from classics entry
        
        Args:
            classics_entry: Classics entry dictionary
            
        Returns:
            List of potential characters/words for naming
        """
        # Extract meaningful characters from ancient text
        ancient_text = classics_entry['ancient_text']
        
        # Simple extraction logic (in production, use more sophisticated NLP)
        naming_elements = []
        
        # Extract 2-character phrases that might be good for names
        words = []
        for i in range(len(ancient_text) - 1):
            phrase = ancient_text[i:i+2]
            if len(phrase.strip()) == 2:
                words.append(phrase)
        
        # Also consider individual meaningful characters
        meaningful_chars = ['智', '慧', '勇', '敢', '仁', '义', '孝', '顺', '成', '功']
        for char in ancient_text:
            if char in meaningful_chars and char not in naming_elements:
                naming_elements.append(char)
        
        # Add some 2-character phrases
        naming_elements.extend(words[:3])  # Top 3 phrases
        
        return naming_elements

# Usage example
def main():
    # Database configuration
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'seekname_db',
        'user': 'postgres',
        'password': 'postgres'
    }
    
    # User's naming intention
    user_intent = "希望孩子聪明智慧，学业有成"
    
    # Perform semantic search
    search = SemanticSearch(db_config)
    search.connect()
    
    try:
        # Find similar classics entries
        similar_entries = search.search_similar_classics(user_intent, limit=5)
        
        print(f"Found {len(similar_entries)} similar classics entries for: '{user_intent}'")
        print("=" * 80)
        
        for i, entry in enumerate(similar_entries, 1):
            print(f"\n{i}. {entry['book_name']} (相似度: {entry['similarity_score']:.3f})")
            print(f"   古籍原文: {entry['ancient_text'][:60]}...")
            if entry['modern_text']:
                print(f"   现代释义: {entry['modern_text'][:60]}...")
            
            # Extract naming elements
            naming_elements = search.extract_naming_elements(entry)
            print(f"   可提取字词: {', '.join(naming_elements[:5])}")
        
        print("=" * 80)
        print("\n这些典籍中的字词可以用于起名，例如：")
        print("- 从'智慧聪明'中提取: 智明、慧聪")
        print("- 从'学业有成'中提取: 学成、业成")
        
    finally:
        search.disconnect()

if __name__ == "__main__":
    main()
'''
    
    def generate_implementation_guide(self):
        """Generate comprehensive implementation guide"""
        guide = """
# BGE-M3 Vectorization Implementation Guide for Seekname

## 1. Current Status
✓ Database schema prepared with embedding columns
✓ 124,120 classics entries have been vectorized with simple embeddings
✓ Vector search functions created in database
✓ Foundation ready for BGE-M3 integration

## 2. Steps to Implement BGE-M3

### Step 1: Install Dependencies
```bash
pip install torch transformers sentence-transformers
```

### Step 2: Update Embedding Generation
Replace the `SimpleEmbedder` in `generate_embeddings_simple.py` with `BGE_M3_Embedder`.

### Step 3: Regenerate Embeddings with BGE-M3
Run the updated script to regenerate all embeddings with BGE-M3 model.

### Step 4: Implement Proper Similarity Search
Update the `find_similar_classics` database function to use actual cosine similarity calculation.

## 3. Production Integration

### API Endpoint for Semantic Search
```python
# Example API endpoint
@app.post("/api/search/classics")
async def search_classics(intent: str, limit: int = 10):
    '''
    Search classics entries semantically similar to user's naming intent
    
    Args:
        intent: User's naming intention (e.g., "希望孩子聪明智慧")
        limit: Maximum number of results
    '''
    # 1. Generate BGE-M3 embedding for intent
    # 2. Search database for similar embeddings
    # 3. Return matching classics entries
```

### Naming Element Extraction
After finding similar classics entries, extract meaningful characters/phrases for naming.

## 4. Performance Considerations

### Batch Processing
- Process embeddings in batches (16-32 texts per batch)
- Use GPU if available for faster inference
- Implement progress tracking and resume capability

### Database Optimization
- Consider adding pgvector extension for native vector operations
- Create proper indexes on embedding columns
- Implement caching for frequent queries

## 5. Testing and Validation

### Test Queries
Test with various naming intentions:
1. "聪明智慧" (intelligent and wise)
2. "勇敢坚强" (brave and strong)
3. "仁义道德" (benevolence and morality)
4. "学业有成" (academic success)
5. "健康平安" (health and safety)

### Evaluation Metrics
- Precision/recall of semantic matches
- Quality of extracted naming elements
- User satisfaction with generated names

## 6. Next Steps

1. **Immediate**: Install BGE-M3 dependencies and test with small batch
2. **Short-term**: Regenerate all embeddings with BGE-M3
3. **Medium-term**: Implement production API endpoints
4. **Long-term**: Add caching, monitoring, and A/B testing

## 7. Files Created

1. `scripts/setup_vector_database.py` - Database setup
2. `scripts/generate_embeddings_simple.py` - Embedding generation (ready for BGE-M3)
3. `scripts/bge_m3_integration.py` - BGE-M3 integration guide
4. `scripts/vectorize_classics.py` - Original BGE-M3 implementation template

## 8. Database Schema Updates

The `classics_entries` table now has:
- `ancient_text_embedding` (bytea) - Embedding for ancient text
- `modern_text_embedding` (bytea) - Embedding for modern text  
- `combined_text_embedding` (bytea) - Combined embedding for search

## 9. Usage Example

```python
# Generate name based on user intent
user_intent = "希望孩子聪明智慧，学业有成"

# 1. Semantic search in classics
similar_entries = semantic_search(user_intent)

# 2. Extract naming elements from matching entries
naming_elements = extract_naming_elements(similar_entries)

# 3. Generate names using extracted elements
# e.g., "智成", "慧学", "明成", "智学"
```

## 10. Conclusion

The vectorization infrastructure is now ready for BGE-M3 integration. 
The simple embeddings provide a working foundation, and upgrading to 
BGE-M3 will significantly improve semantic matching accuracy for the 
AI naming website.
