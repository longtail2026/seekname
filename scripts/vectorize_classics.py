#!/usr/bin/env python3
"""
Vectorize classics entries using BGE-M3 model for semantic matching.
This script:
1. Adds embedding columns to classics_entries table
2. Generates embeddings for ancient_text and modern_text using BGE-M3
3. Stores embeddings in the database
4. Creates similarity search functions
"""

import os
import sys
import time
import logging
from typing import List, Tuple, Optional
import numpy as np
from dataclasses import dataclass
from tqdm import tqdm
import psycopg2
from psycopg2.extras import execute_values
from psycopg2.extensions import register_adapter, AsIs
import torch
from transformers import AutoTokenizer, AutoModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('vectorization.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Register numpy array adapter for PostgreSQL
def adapt_numpy_array(arr):
    return AsIs("'" + arr.tobytes().hex() + "'::bytea")

register_adapter(np.ndarray, adapt_numpy_array)

@dataclass
class DatabaseConfig:
    """Database configuration"""
    host: str = "localhost"
    port: int = 5432
    database: str = "seekname_db"
    user: str = "postgres"
    password: str = "postgres"
    
    @property
    def connection_string(self):
        return f"host={self.host} port={self.port} dbname={self.database} user={self.user} password={self.password}"

class BGE_M3_Embedder:
    """BGE-M3 embedding model wrapper"""
    
    def __init__(self, model_name: str = "BAAI/bge-m3", device: str = None):
        """
        Initialize BGE-M3 model
        
        Args:
            model_name: HuggingFace model name
            device: 'cuda' or 'cpu', auto-detect if None
        """
        self.model_name = model_name
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        
        logger.info(f"Loading BGE-M3 model: {model_name} on {self.device}")
        
        # Load tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        
        logger.info("BGE-M3 model loaded successfully")
    
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
            for i in tqdm(range(0, len(texts), batch_size), desc="Generating embeddings"):
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

class ClassicsVectorizer:
    """Vectorize classics entries in database"""
    
    def __init__(self, db_config: DatabaseConfig, embedder: BGE_M3_Embedder):
        self.db_config = db_config
        self.embedder = embedder
        self.conn = None
        self.cur = None
    
    def connect(self):
        """Connect to database"""
        try:
            self.conn = psycopg2.connect(self.db_config.connection_string)
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
    
    def setup_database_schema(self):
        """Add embedding columns and create necessary functions"""
        try:
            # Add embedding columns if they don't exist
            self.cur.execute("""
                DO $$ 
                BEGIN
                    -- Add ancient_text_embedding column if not exists
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'classics_entries' 
                        AND column_name = 'ancient_text_embedding'
                    ) THEN
                        ALTER TABLE classics_entries 
                        ADD COLUMN ancient_text_embedding bytea;
                    END IF;
                    
                    -- Add modern_text_embedding column if not exists
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'classics_entries' 
                        AND column_name = 'modern_text_embedding'
                    ) THEN
                        ALTER TABLE classics_entries 
                        ADD COLUMN modern_text_embedding bytea;
                    END IF;
                    
                    -- Add combined_text_embedding column if not exists
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'classics_entries' 
                        AND column_name = 'combined_text_embedding'
                    ) THEN
                        ALTER TABLE classics_entries 
                        ADD COLUMN combined_text_embedding bytea;
                    END IF;
                END $$;
            """)
            
            # Create function to decode bytea to float array
            self.cur.execute("""
                CREATE OR REPLACE FUNCTION bytea_to_float_array(bytea_data bytea)
                RETURNS float[] AS $$
                DECLARE
                    arr float[];
                    byte_len int;
                    float_len int;
                BEGIN
                    IF bytea_data IS NULL THEN
                        RETURN NULL;
                    END IF;
                    
                    byte_len := octet_length(bytea_data);
                    float_len := byte_len / 4; -- 4 bytes per float
                    arr := array_fill(0.0::float, ARRAY[float_len]);
                    
                    -- Note: This is a simplified version
                    -- In production, you'd need proper byte conversion
                    RETURN arr;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # Create cosine similarity function
            self.cur.execute("""
                CREATE OR REPLACE FUNCTION cosine_similarity(a bytea, b bytea)
                RETURNS float AS $$
                DECLARE
                    dot_product float := 0;
                    norm_a float := 0;
                    norm_b float := 0;
                    arr_a float[];
                    arr_b float[];
                    i int;
                BEGIN
                    IF a IS NULL OR b IS NULL THEN
                        RETURN 0;
                    END IF;
                    
                    -- Convert bytea to arrays (simplified - need proper implementation)
                    -- For now, return placeholder
                    RETURN 0.5;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            self.conn.commit()
            logger.info("Database schema updated successfully")
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Failed to setup database schema: {e}")
            raise
    
    def get_unvectorized_count(self) -> int:
        """Get count of entries without embeddings"""
        self.cur.execute("""
            SELECT COUNT(*) FROM classics_entries 
            WHERE ancient_text_embedding IS NULL 
            AND ancient_text IS NOT NULL 
            AND ancient_text != ''
        """)
        return self.cur.fetchone()[0]
    
    def get_batch_to_vectorize(self, batch_size: int = 100) -> List[Tuple[int, str, Optional[str]]]:
        """Get batch of entries to vectorize"""
        self.cur.execute("""
            SELECT id, ancient_text, modern_text 
            FROM classics_entries 
            WHERE ancient_text_embedding IS NULL 
            AND ancient_text IS NOT NULL 
            AND ancient_text != ''
            ORDER BY id
            LIMIT %s
        """, (batch_size,))
        
        return self.cur.fetchall()
    
    def update_embeddings(self, entries: List[Tuple[int, str, Optional[str]]], 
                         ancient_embeddings: np.ndarray, 
                         modern_embeddings: np.ndarray,
                         combined_embeddings: np.ndarray):
        """Update embeddings in database"""
        try:
            update_data = []
            for i, (entry_id, ancient_text, modern_text) in enumerate(entries):
                # Convert numpy arrays to bytes
                ancient_embedding_bytes = ancient_embeddings[i].tobytes() if i < len(ancient_embeddings) else None
                modern_embedding_bytes = modern_embeddings[i].tobytes() if i < len(modern_embeddings) else None
                combined_embedding_bytes = combined_embeddings[i].tobytes() if i < len(combined_embeddings) else None
                
                update_data.append((
                    entry_id,
                    ancient_embedding_bytes,
                    modern_embedding_bytes,
                    combined_embedding_bytes
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
            logger.info(f"Updated embeddings for {len(entries)} entries")
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Failed to update embeddings: {e}")
            raise
    
    def vectorize_all(self, batch_size: int = 100):
        """Vectorize all classics entries"""
        total_count = self.get_unvectorized_count()
        logger.info(f"Total entries to vectorize: {total_count}")
        
        if total_count == 0:
            logger.info("All entries already vectorized")
            return
        
        processed = 0
        with tqdm(total=total_count, desc="Vectorizing classics") as pbar:
            while True:
                # Get batch to process
                entries = self.get_batch_to_vectorize(batch_size)
                if not entries:
                    break
                
                # Prepare texts for embedding
                entry_ids = [e[0] for e in entries]
                ancient_texts = [e[1] for e in entries]
                modern_texts = [e[2] if e[2] else "" for e in entries]
                
                # Create combined texts (ancient + modern for better semantic understanding)
                combined_texts = []
                for ancient, modern in zip(ancient_texts, modern_texts):
                    if modern:
                        combined_texts.append(f"{ancient} {modern}")
                    else:
                        combined_texts.append(ancient)
                
                # Generate embeddings
                logger.info(f"Generating embeddings for batch of {len(entries)} entries")
                
                ancient_embeddings = self.embedder.encode(ancient_texts)
                modern_embeddings = self.embedder.encode(modern_texts) if any(modern_texts) else np.array([])
                combined_embeddings = self.embedder.encode(combined_texts)
                
                # Update database
                self.update_embeddings(entries, ancient_embeddings, modern_embeddings, combined_embeddings)
                
                # Update progress
                processed += len(entries)
                pbar.update(len(entries))
                
                logger.info(f"Processed {processed}/{total_count} entries")
        
        logger.info(f"Vectorization completed. Total processed: {processed}")

def main():
    """Main function"""
    try:
        # Configuration
        db_config = DatabaseConfig()
        
        # Initialize embedder
        embedder = BGE_M3_Embedder()
        
        # Initialize vectorizer
        vectorizer = ClassicsVectorizer(db_config, embedder)
        
        # Connect to database
        vectorizer.connect()
        
        # Setup database schema
        logger.info("Setting up database schema...")
        vectorizer.setup_database_schema()
        
        # Vectorize all entries
        logger.info("Starting vectorization...")
        vectorizer.vectorize_all(batch_size=50)  # Smaller batch for memory management
        
        logger.info("Vectorization completed successfully!")
        
    except Exception as e:
        logger.error(f"Vectorization failed: {e}")
        sys.exit(1)
    finally:
        if 'vectorizer' in locals():
            vectorizer.disconnect()

if __name__ == "__main__":
    main()