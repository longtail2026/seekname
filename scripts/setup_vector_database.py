#!/usr/bin/env python3
"""
Setup vector database for classics entries.
This script:
1. Adds embedding columns to classics_entries table
2. Creates functions for vector operations
3. Sets up the foundation for BGE-M3 embeddings
"""

import os
import sys
import logging
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('vector_setup.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class VectorDatabaseSetup:
    """Setup vector database for classics entries"""
    
    def __init__(self, host="localhost", port=5432, database="seekname_db", 
                 user="postgres", password="postgres"):
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
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
    
    def add_embedding_columns(self):
        """Add embedding columns to classics_entries table"""
        try:
            # Check if columns already exist
            self.cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'classics_entries' 
                AND column_name IN (
                    'ancient_text_embedding', 
                    'modern_text_embedding', 
                    'combined_text_embedding'
                )
            """)
            existing_columns = {row[0] for row in self.cur.fetchall()}
            
            columns_to_add = []
            if 'ancient_text_embedding' not in existing_columns:
                columns_to_add.append("ADD COLUMN ancient_text_embedding bytea")
            if 'modern_text_embedding' not in existing_columns:
                columns_to_add.append("ADD COLUMN modern_text_embedding bytea")
            if 'combined_text_embedding' not in existing_columns:
                columns_to_add.append("ADD COLUMN combined_text_embedding bytea")
            
            if columns_to_add:
                alter_sql = f"ALTER TABLE classics_entries {', '.join(columns_to_add)}"
                self.cur.execute(alter_sql)
                self.conn.commit()
                logger.info(f"Added columns: {', '.join([c.split()[2] for c in columns_to_add])}")
            else:
                logger.info("All embedding columns already exist")
                
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Failed to add embedding columns: {e}")
            raise
    
    def create_vector_functions(self):
        """Create functions for vector operations"""
        try:
            # Create function to calculate cosine similarity between two bytea vectors
            self.cur.execute("""
                CREATE OR REPLACE FUNCTION cosine_similarity_bytea(vec1 bytea, vec2 bytea)
                RETURNS float AS $$
                DECLARE
                    dot_product float := 0;
                    norm1 float := 0;
                    norm2 float := 0;
                    arr1 float[];
                    arr2 float[];
                    i integer;
                    byte_len integer;
                    float_len integer;
                BEGIN
                    -- If either vector is NULL, return 0 similarity
                    IF vec1 IS NULL OR vec2 IS NULL THEN
                        RETURN 0.0;
                    END IF;
                    
                    -- Check if vectors have same length
                    IF octet_length(vec1) != octet_length(vec2) THEN
                        RAISE EXCEPTION 'Vectors must have same length';
                    END IF;
                    
                    -- For now, return a placeholder value
                    -- In production, implement proper cosine similarity calculation
                    -- This requires converting bytea to float array properly
                    RETURN 0.0;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # Create function to find similar entries
            self.cur.execute("""
                CREATE OR REPLACE FUNCTION find_similar_classics(
                    query_embedding bytea,
                    limit_count integer DEFAULT 10,
                    similarity_threshold float DEFAULT 0.7
                )
                RETURNS TABLE(
                    id integer,
                    book_name varchar,
                    ancient_text text,
                    modern_text text,
                    similarity float
                ) AS $$
                BEGIN
                    -- This is a placeholder function
                    -- In production, implement proper similarity search
                    RETURN QUERY
                    SELECT 
                        ce.id,
                        ce.book_name,
                        ce.ancient_text,
                        ce.modern_text,
                        0.8 as similarity  -- Placeholder
                    FROM classics_entries ce
                    WHERE ce.combined_text_embedding IS NOT NULL
                    LIMIT limit_count;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # Create index on embeddings for faster search (when we have actual data)
            self.cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_classics_combined_embedding 
                ON classics_entries USING btree (id) 
                WHERE combined_text_embedding IS NOT NULL;
            """)
            
            self.conn.commit()
            logger.info("Created vector functions and indexes")
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Failed to create vector functions: {e}")
            raise
    
    def test_setup(self):
        """Test the setup by checking table structure"""
        try:
            self.cur.execute("""
                SELECT 
                    column_name,
                    data_type,
                    is_nullable
                FROM information_schema.columns
                WHERE table_name = 'classics_entries'
                ORDER BY ordinal_position;
            """)
            
            columns = self.cur.fetchall()
            logger.info("Current classics_entries table structure:")
            for col in columns:
                logger.info(f"  {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")
            
            # Count entries with embeddings
            self.cur.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(ancient_text_embedding) as with_ancient_embedding,
                    COUNT(modern_text_embedding) as with_modern_embedding,
                    COUNT(combined_text_embedding) as with_combined_embedding
                FROM classics_entries;
            """)
            
            counts = self.cur.fetchone()
            logger.info(f"\nEmbedding statistics:")
            logger.info(f"  Total entries: {counts[0]}")
            logger.info(f"  With ancient text embedding: {counts[1]}")
            logger.info(f"  With modern text embedding: {counts[2]}")
            logger.info(f"  With combined embedding: {counts[3]}")
            
        except Exception as e:
            logger.error(f"Failed to test setup: {e}")
            raise
    
    def setup_complete(self):
        """Complete setup process"""
        try:
            self.connect()
            
            logger.info("Starting vector database setup...")
            
            # Step 1: Add embedding columns
            logger.info("Step 1: Adding embedding columns...")
            self.add_embedding_columns()
            
            # Step 2: Create vector functions
            logger.info("Step 2: Creating vector functions...")
            self.create_vector_functions()
            
            # Step 3: Test setup
            logger.info("Step 3: Testing setup...")
            self.test_setup()
            
            logger.info("Vector database setup completed successfully!")
            
        except Exception as e:
            logger.error(f"Setup failed: {e}")
            raise
        finally:
            self.disconnect()

def main():
    """Main function"""
    try:
        # Get database configuration from environment or use defaults
        host = os.getenv("DB_HOST", "localhost")
        port = int(os.getenv("DB_PORT", "5432"))
        database = os.getenv("DB_NAME", "seekname_db")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "postgres")
        
        # Initialize and run setup
        setup = VectorDatabaseSetup(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        
        setup.setup_complete()
        
        logger.info("\nNext steps:")
        logger.info("1. Install BGE-M3 model dependencies: pip install torch transformers")
        logger.info("2. Run vectorization script to generate embeddings")
        logger.info("3. Implement semantic search functionality")
        
    except Exception as e:
        logger.error(f"Vector database setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()