"""
Pinecone Service
Manages Pinecone operations for storing and retrieving document chunks.
Creates separate indexes for each mandatory file selected as knowledge base.
"""
import os
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from pinecone import Pinecone, ServerlessSpec

logger = logging.getLogger(__name__)


class PineconeService:
    """Service for managing Pinecone vector store operations"""
    
    def __init__(self):
        self.api_key = os.getenv("PINECONE_API_KEY", "")
        # Host is not required for the new serverless SDK, but keep for backward compatibility/logging
        self.host = os.getenv("PINECONE_HOST", "")
        self.embedding_dimension = 384  # all-MiniLM-L6-v2 dimension
        self._client: Optional[Pinecone] = None
        
        if not self.api_key:
            logger.warning("PINECONE_API_KEY not set. Pinecone operations will fail.")
        if not self.host:
            logger.info("PINECONE_HOST not set. Using serverless configuration via ServerlessSpec.")
    
    def _get_client(self) -> Pinecone:
        """Get or create Pinecone client using the new SDK"""
        if self._client is None:
            try:
                if not self.api_key:
                    raise ValueError("PINECONE_API_KEY environment variable not set")
                
                self._client = Pinecone(api_key=self.api_key)
                logger.info("Pinecone client initialized successfully (new SDK)")
            except ImportError:
                raise ImportError(
                    "pinecone package not installed. Install with: pip install pinecone"
                )
            except Exception as e:
                logger.error(f"Failed to initialize Pinecone client: {str(e)}")
                raise
        return self._client
    
    def _get_index_name(self, file_id: int, file_name: str) -> str:
        """
        Generate a unique index name for a file.
        Format: kb-file-{file_id}-{sanitized_filename}
        Pinecone requires: lowercase alphanumeric characters and hyphens ONLY (no underscores)
        """
        import re
        # Sanitize filename: remove extension, replace spaces and special chars with hyphens
        # Remove file extension
        name_without_ext = file_name.rsplit('.', 1)[0] if '.' in file_name else file_name
        
        # Replace spaces, underscores, and special characters with hyphens
        sanitized = re.sub(r'[^a-zA-Z0-9]', '-', name_without_ext)
        
        # Replace multiple consecutive hyphens with single hyphen
        sanitized = re.sub(r'-+', '-', sanitized)
        
        # Remove leading/trailing hyphens
        sanitized = sanitized.strip('-')
        
        # Convert to lowercase
        sanitized = sanitized.lower()
        
        # Limit length to 40 characters (to leave room for prefix)
        sanitized = sanitized[:40]
        
        # Ensure it doesn't start with a number (add prefix if needed)
        if sanitized and sanitized[0].isdigit():
            sanitized = 'file-' + sanitized
        
        # Build index name: kb-file-{file_id}-{sanitized}
        index_name = f"kb-file-{file_id}-{sanitized}".lower()
        
        # Final validation: ensure only lowercase alphanumeric and hyphens (NO underscores)
        index_name = re.sub(r'[^a-z0-9-]', '', index_name)
        
        # Remove consecutive hyphens
        index_name = re.sub(r'-+', '-', index_name)
        index_name = index_name.strip('-')
        
        # Ensure it doesn't start or end with hyphen
        if index_name.startswith('-'):
            index_name = 'kb' + index_name
        if index_name.endswith('-'):
            index_name = index_name[:-1]
        
        return index_name
    
    def get_index_name_for_file(self, file_id: int, file_name: str) -> str:
        """Public helper to get the Pinecone index name for a file"""
        return self._get_index_name(file_id, file_name)
    
    def index_exists(self, index_name: str) -> bool:
        """Check if a Pinecone index exists using the new SDK"""
        try:
            client = self._get_client()
            try:
                existing_indexes = client.list_indexes().names()
            except AttributeError:
                # Fallback in case .names() is not available
                existing_indexes = [idx.name for idx in client.list_indexes()]
            return index_name in existing_indexes
        except Exception as e:
            logger.error(f"Failed to list Pinecone indexes: {str(e)}")
            return False
    
    def create_index_for_file(
        self,
        file_id: int,
        file_name: str,
        dimension: int = None
    ) -> Dict[str, Any]:
        """
        Create a Pinecone index for a specific file.
        
        Args:
            file_id: Database ID of the file
            file_name: Original filename
            dimension: Embedding dimension (defaults to 384 for all-MiniLM-L6-v2)
            
        Returns:
            Dict with success status and index name
        """
        try:
            client = self._get_client()
            index_name = self._get_index_name(file_id, file_name)
            dim = dimension or self.embedding_dimension
            
            # Check if index already exists
            try:
                existing_indexes = client.list_indexes().names()
            except AttributeError:
                existing_indexes = [idx.name for idx in client.list_indexes()]
            
            if index_name in existing_indexes:
                logger.info(f"Index {index_name} already exists, skipping creation")
                return {
                    "success": True,
                    "index_name": index_name,
                    "created": False,
                    "message": f"Index {index_name} already exists"
                }
            
            # Create index
            logger.info(f"Creating Pinecone index: {index_name} (dimension: {dim})")
            
            # Use ServerlessSpec from the new SDK
            try:
                client.create_index(
                    name=index_name,
                    dimension=dim,
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region="us-east-1"
                    ),
                )
            except Exception as create_error:
                # If index creation fails, it might already exist or be a different type
                logger.warning(f"Index creation returned error (might already exist): {str(create_error)}")
                # Check if index exists
                try:
                    existing_indexes = client.list_indexes().names()
                except AttributeError:
                    existing_indexes = [idx.name for idx in client.list_indexes()]
                if index_name in existing_indexes:
                    logger.info(f"Index {index_name} exists, continuing...")
                else:
                    raise create_error
            
            logger.info(f"Successfully created index: {index_name}")
            return {
                "success": True,
                "index_name": index_name,
                "created": True,
                "message": f"Index {index_name} created successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to create Pinecone index: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def index_file_chunks(
        self,
        file_id: int,
        file_name: str,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]]
    ) -> Dict[str, Any]:
        """
        Index chunks for a file into its Pinecone index.
        
        Args:
            file_id: Database ID of the file
            file_name: Original filename
            chunks: List of chunk dicts with 'text' and 'metadata'
            embeddings: List of embedding vectors
            
        Returns:
            Dict with success status and count
        """
        try:
            client = self._get_client()
            index_name = self._get_index_name(file_id, file_name)
            
            # Get index (new SDK)
            index = client.Index(index_name)
            
            # Prepare vectors for upsert
            vectors = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                # Create unique ID for chunk
                chunk_id = f"chunk_{file_id}_{i}"
                
                # Prepare metadata (Pinecone requires string values)
                # Store full chunk text (chunks are 400 chars, so storing full text is fine)
                chunk_text = chunk.get("text", "")
                metadata = {
                    "file_id": str(file_id),
                    "file_name": file_name,
                    "chunk_index": str(chunk.get("metadata", {}).get("chunk_index", i)),
                    "text": chunk_text  # Store full chunk text (400 chars max)
                }
                
                vectors.append({
                    "id": chunk_id,
                    "values": embedding,
                    "metadata": metadata
                })
            
            # Upsert in batches (Pinecone limit is 100 vectors per request)
            batch_size = 100
            total_upserted = 0
            
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                index.upsert(vectors=batch)
                total_upserted += len(batch)
                logger.info(f"Upserted {total_upserted}/{len(vectors)} vectors to {index_name}")
            
            logger.info(f"Successfully indexed {total_upserted} chunks for file {file_id} ({file_name})")
            return {
                "success": True,
                "index_name": index_name,
                "chunks_indexed": total_upserted
            }
            
        except Exception as e:
            logger.error(f"Failed to index chunks in Pinecone: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def search_across_indexes(
        self,
        query_embedding: List[float],
        index_names: List[str],
        top_k: int = 3
    ) -> Dict[str, Any]:
        """
        Search across multiple Pinecone indexes and return results with scores.
        
        Args:
            query_embedding: Query embedding vector
            index_names: List of index names to search
            top_k: Number of results per index
            
        Returns:
            Dict with results from each index, sorted by score
        """
        try:
            client = self._get_client()
            all_results = []
            
            for index_name in index_names:
                try:
                    index = client.Index(index_name)
                    
                    # Query the index using new SDK parameters
                    results = index.query(
                        vector=query_embedding,
                        top_k=top_k,
                        include_values=False,
                        include_metadata=True,
                    )
                    
                    # Process results
                    for match in results.get("matches", []):
                        all_results.append({
                            "index_name": index_name,
                            "score": match.get("score", 0.0),
                            "chunk_id": match.get("id", ""),
                            "metadata": match.get("metadata", {}),
                            "text": match.get("metadata", {}).get("text", "")
                        })
                    
                    logger.info(f"Found {len(results.get('matches', []))} results in index {index_name}")
                    
                except Exception as e:
                    logger.warning(f"Failed to search index {index_name}: {str(e)}")
                    continue
            
            # Sort all results by score (descending)
            all_results.sort(key=lambda x: x["score"], reverse=True)
            
            logger.info(f"Total results across {len(index_names)} indexes: {len(all_results)}")
            return {
                "success": True,
                "results": all_results,
                "total_results": len(all_results)
            }
            
        except Exception as e:
            logger.error(f"Failed to search across Pinecone indexes: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "results": []
            }
    
    def delete_index(self, file_id: int, file_name: str) -> Dict[str, Any]:
        """
        Delete a Pinecone index for a file.
        
        Args:
            file_id: Database ID of the file
            file_name: Original filename
            
        Returns:
            Dict with success status
        """
        try:
            client = self._get_client()
            index_name = self._get_index_name(file_id, file_name)
            
            # Check if index exists
            try:
                existing_indexes = client.list_indexes().names()
            except AttributeError:
                existing_indexes = [idx.name for idx in client.list_indexes()]
            
            if index_name not in existing_indexes:
                logger.info(f"Index {index_name} does not exist, nothing to delete")
                return {
                    "success": True,
                    "message": f"Index {index_name} does not exist"
                }
            
            # Delete index using new SDK pattern
            try:
                client.delete_index(index_name)
                logger.info(f"Successfully deleted index: {index_name}")
            except Exception as e:
                logger.error(f"Failed to delete index {index_name}: {str(e)}")
                return {
                    "success": False,
                    "error": str(e)
                }
            
            return {
                "success": True,
                "message": f"Index {index_name} deleted successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to delete Pinecone index: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def list_indexes(self) -> List[str]:
        """List all Pinecone indexes"""
        try:
            client = self._get_client()
            try:
                return client.list_indexes().names()
            except AttributeError:
                indexes = client.list_indexes()
                return [idx.name for idx in indexes]
        except Exception as e:
            logger.error(f"Failed to list Pinecone indexes: {str(e)}")
            return []
        
# Create service instance
pinecone_service = PineconeService()
