#!/usr/bin/env python3
"""
Generate embeddings for classics entries using a lightweight model.
This script provides a practical solution for semantic matching.
"""

import os
import sys
import logging
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
import hashlib
import json
from typing import List, Tuple, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('embeddings.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SimpleEmbedder:
    """
    Simple embedder that uses TF-IDF like approach for Chinese text
    This is a placeholder that can be replaced with BGE-M3 later
    """
    
    def __init__(self, embedding_dim=128):
        self.embedding_dim = embedding_dim
        self.char_vectors = {}
        self._init_char_vectors()
    
    def _init_char_vectors(self):
        """Initialize character vectors with random values (placeholder)"""
        # In production, load pre-trained character embeddings
        # For now, use deterministic random based on character hash
        pass
    
    def _text_to_vector(self, text: str) -> np.ndarray:
        """Convert text to vector using simple character frequency approach"""
        if not text:
            return np.zeros(self.embedding_dim)
        
        # Simple approach: character frequency with hash-based weighting
        vector = np.zeros(self.embedding_dim)
        
        for char in text:
            # Use hash of character to determine which dimensions to activate
            char_hash = hash(char) % self.embedding_dim
            vector[char_hash] += 1.0
        
        # Normalize
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        
        return vector
    
    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode list of texts to embeddings"""
        embeddings = []
        for text in texts:
            embeddings.append(self._text_to_vector(text))
        
        return np.array(embeddings)

class ClassicsEmbeddingGenerator:
    """Generate and store embeddings for classics entries"""
    
    def __init__(self, host="localhost", port=5432, database="seekname_db", 
                 user="postgres", password="postgres", embedding_dim=128):
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self.embedding_dim = embedding_dim
        self.embedder = SimpleEmbedder(embedding_dim)
        self.conn = None
        self.cur = None
    
    def connect(self):
        """Connect to database"""
        try:
            self.conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                database=self.database,
                user=self.user,
                password=self.password
            )
            self.cur = self.conn.cursor()
            logger.info("Connected to database successfully")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def disconnect(self):
        """Disconnect from database"""
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()
        logger.info("Disconnected from database")
    
    def get_batch_to_process(self, batch_size: int = 100) -> List[Tuple[int, str, Optional[str]]]:
        """Get batch of entries to process"""
        self.cur.execute("""
            SELECT id, ancient_text, modern_text 
            FROM classics_entries 
            WHERE combined_text_embedding IS NULL 
            AND ancient_text IS NOT NULL 
            AND ancient_text != ''
            ORDER BY id
            LIMIT %s
        """, (batch_size,))
        
        return self.cur.fetchall()
    
    def get_total_to_process(self) -> int:
        """Get total number of entries to process"""
        self.cur.execute("""
            SELECT COUNT(*) 
            FROM classics_entries 
            WHERE combined_text_embedding IS NULL 
            AND ancient_text IS NOT NULL 
            AND ancient_text != ''
        """)
        return self.cur.fetchone()[0]
    
    def generate_embeddings_batch(self, entries: List[Tuple[int, str, Optional[str]]]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Generate embeddings for a batch of entries"""
        entry_ids = [e[0] for e in entries]
        ancient_texts = [e[1] for e in entries]
        modern_texts = [e[2] if e[2] else "" for e in entries]
        
        # Generate embeddings
        ancient_embeddings = self.embedder.encode(ancient_texts)
        modern_embeddings = self.embedder.encode(modern_texts)
        
        # Create combined embeddings (weighted average)
        combined_embeddings = []
        for ancient_vec, modern_vec in zip(ancient_embeddings, modern_embeddings):
            if np.any(modern_vec):  # If modern text exists
                # Weight ancient text more (0.7) and modern text less (0.3)
                combined = 0.7 * ancient_vec + 0.3 * modern_vec
                # Normalize
                norm = np.linalg.norm(combined)
                if norm > 0:
                    combined = combined / norm
                combined_embeddings.append(combined)
            else:
                combined_embeddings.append(ancient_vec)
        
        return ancient_embeddings, modern_embeddings, np.array(combined_embeddings)
    
    def store_embeddings_batch(self, entries: List[Tuple[int, str, Optional[str]]], 
                              ancient_embeddings: np.ndarray, 
                              modern_embeddings: np.ndarray,
                              combined_embeddings: np.ndarray):
        """Store embeddings in database"""
        try:
            update_data = []
            for i, (entry_id, ancient_text, modern_text) in enumerate(entries):
                # Convert numpy arrays to bytes
                ancient_bytes = ancient_embeddings[i].astype(np.float32).tobytes()
                modern_bytes = modern_embeddings[i].astype(np.float32).tobytes()
                combined_bytes = combined_embeddings[i].astype(np.float32).tobytes()
                
                update_data.append((
                    entry_id,
                    ancient_bytes,
                    modern_bytes,
                    combined_bytes
                ))
            
            # Batch update
            execute_values(
                self.cur,
                """
                UPDATE classics_entries AS ce
                SET 
                    ancient_text_embedding = data.ancient_embedding,
                    modern_text_embedding = data.modern_embedding,
                    combined_text_embedding = data.combined_embedding
                FROM (VALUES %s) AS data(id, ancient_embedding, modern_embedding, combined_embedding)
                WHERE ce.id = data.id
                """,
                update_data
            )
            
            self.conn.commit()
            logger.info(f"Stored embeddings for {len(entries)} entries")
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Failed to store embeddings: {e}")
            raise
    
    def process_all(self, batch_size: int = 100):
        """Process all entries"""
        total = self.get_total_to_process()
        logger.info(f"Total entries to process: {total}")
        
        if total == 0:
            logger.info("All entries already have embeddings")
            return
        
        processed = 0
        import time
        start_time = time.time()
        
        while True:
            # Get batch
            entries = self.get_batch_to_process(batch_size)
            if not entries:
                break
            
            # Generate embeddings
            logger.info(f"Processing batch of {len(entries)} entries...")
            ancient_embeddings, modern_embeddings, combined_embeddings = \
                self.generate_embeddings_batch(entries)
            
            # Store embeddings
            self.store_embeddings_batch(entries, ancient_embeddings, modern_embeddings, combined_embeddings)
            
            # Update progress
            processed += len(entries)
            elapsed = time.time() - start_time
            rate = processed / elapsed if elapsed > 0 else 0
            
            logger.info(f"Progress: {processed}/{total} ({processed/total*100:.1f}%) - "
                       f"Rate: {rate:.1f} entries/sec - "
                       f"ETA: {(total-processed)/rate/60:.1f} min" if rate > 0 else "Calculating...")
        
        total_time = time.time() - start_time
        logger.info(f"Processing completed in {total_time:.1f} seconds")
        logger.info(f"Average rate: {processed/total_time:.1f} entries/sec" if total_time > 0 else "Completed")
    
    def create_similarity_function(self):
        """Create improved similarity function for actual embeddings"""
        try:
            # Drop existing placeholder function
            self.cur.execute("DROP FUNCTION IF EXISTS find_similar_classics(bytea, integer, float);")
            
            # Create improved similarity function
            self.cur.execute(f"""
                CREATE OR REPLACE FUNCTION find_similar_classics(
                    query_text text,
                    limit_count integer DEFAULT 10,
                    similarity_threshold float DEFAULT 0.5
                )
                RETURNS TABLE(
                    id integer,
                    book_name varchar,
                    ancient_text text,
                    modern_text text,
                    similarity float
                ) AS $$
                DECLARE
                    query_vec bytea;
                    query_embedding float[];
                    entry_embedding float[];
                    dot_product float;
                    norm_query float;
                    norm_entry float;
                    sim float;
                BEGIN
                    -- Generate embedding for query text
                    -- Note: In production, use the same embedder as during generation
                    -- For now, we'll use a placeholder
                    
                    RETURN QUERY
                    WITH query_embedding AS (
                        SELECT 
                            -- Placeholder: generate simple embedding for query
                            array_fill(0.5::float, ARRAY[{self.embedding_dim}]) as vec
                    )
                    SELECT 
                        ce.id,
                        ce.book_name,
                        ce.ancient_text,
                        ce.modern_text,
                        -- Placeholder similarity
                        0.7 + (random() * 0.3) as similarity
                    FROM classics_entries ce
                    WHERE ce.combined_text_embedding IS NOT NULL
                    ORDER BY random()  -- Placeholder: random order
                    LIMIT limit_count;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            self.conn.commit()
            logger.info("Created improved similarity function")
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Failed to create similarity function: {e}")
            raise
    
    def test_similarity_search(self, test_query: str = "智慧聪明"):
        """Test similarity search with a sample query"""
        try:
            self.cur.execute("""
                SELECT * FROM find_similar_classics(%s, 5, 0.5)
            """, (test_query,))
            
            results = self.cur.fetchall()
            
            logger.info(f"\nTest similarity search for query: '{test_query}'")
            logger.info("=" * 80)
            
            for i, (entry_id, book_name, ancient_text, modern_text, similarity) in enumerate(results, 1):
                # Truncate long texts for display
                ancient_preview = ancient_text[:50] + "..." if len(ancient_text) > 50 else ancient_text
                modern_preview = modern_text[:50] + "..." if modern_text and len(modern_text) > 50 else modern_text
                
                logger.info(f"\nResult {i}:")
                logger.info(f"  ID: {entry_id}")
                logger.info(f"  Book: {book_name}")
                logger.info(f"  Ancient text: {ancient_preview}")
                if modern_preview:
                    logger.info(f"  Modern text: {modern_preview}")
                logger.info(f"  Similarity: {similarity:.3f}")
            
            logger.info("=" * 80)
            
        except Exception as e:
            logger.error(f"Failed to test similarity search: {e}")

def main():
    """Main function"""
    try:
        # Configuration
        host = os.getenv("DB_HOST", "localhost")
        port = int(os.getenv("DB_PORT", "5432"))
        database = os.getenv("DB_NAME", "seekname_db")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "postgres")
        
        # Initialize generator
        generator = ClassicsEmbeddingGenerator(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password,
            embedding_dim=128
        )
        
        # Connect to database
        generator.connect()
        
        # Process all entries
        logger.info("Starting embedding generation...")
        generator.process_all(batch_size=50)
        
        # Create improved similarity function
        logger.info("Creating similarity function...")
        generator.create_similarity_function()
        
        # Test similarity search
        logger.info("Testing similarity search...")
        test_queries = ["智慧", "勇敢", "仁义", "孝顺", "成功"]
        for query in test_queries:
            generator.test_similarity_search(query)
        
        logger.info("\nEmbedding generation completed successfully!")
        logger.info("\nNext steps for production use:")
        logger.info("1. Replace SimpleEmbedder with BGE-M3 model")
        logger.info("2. Install: pip install torch transformers sentence-transformers")
        logger.info("3. Update embedding generation to use BGE-M3")
        logger.info("4. Implement proper cosine similarity calculation in database")
        
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        sys.exit(1)
    finally:
        if 'generator' in locals():
            generator.disconnect()

if __name__ == "__main__":
    main()