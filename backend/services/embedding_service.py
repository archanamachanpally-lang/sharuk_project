"""
Embedding Service
Provides text embeddings using local sentence-transformers or hosted providers.
"""
import os
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating text embeddings"""
    
    def __init__(self):
        self.provider = os.getenv("EMBEDDING_PROVIDER", "local").lower()
        self.model_name = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
        self._model = None
        self._embedding_dimension = None
        
    def _load_local_model(self):
        """Lazy load the local sentence-transformers model"""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading embedding model: {self.model_name}")
                self._model = SentenceTransformer(self.model_name)
                # Get embedding dimension
                self._embedding_dimension = self._model.get_sentence_embedding_dimension()
                logger.info(f"Model loaded successfully. Embedding dimension: {self._embedding_dimension}")
            except ImportError:
                raise ImportError(
                    "sentence-transformers not installed. Install with: pip install sentence-transformers"
                )
            except Exception as e:
                raise Exception(f"Failed to load embedding model: {str(e)}")
    
    def _embed_with_openai(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using OpenAI API"""
        try:
            import openai
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not set for OpenAI embedding provider")
            
            client = openai.OpenAI(api_key=api_key)
            
            # OpenAI embedding model
            model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
            
            response = client.embeddings.create(
                model=model,
                input=texts
            )
            
            embeddings = [item.embedding for item in response.data]
            return embeddings
            
        except Exception as e:
            logger.error(f"OpenAI embedding failed: {str(e)}")
            raise
    
    def _embed_with_vertex(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using Google Vertex AI"""
        try:
            from google.cloud import aiplatform
            from vertexai.language_models import TextEmbeddingModel
            
            project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
            location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
            
            if not project_id:
                raise ValueError("GOOGLE_CLOUD_PROJECT not set for Vertex AI embedding provider")
            
            aiplatform.init(project=project_id, location=location)
            model = TextEmbeddingModel.from_pretrained("textembedding-gecko@001")
            
            embeddings = []
            for text in texts:
                result = model.get_embeddings([text])
                embeddings.append(result[0].values)
            
            return embeddings
            
        except Exception as e:
            logger.error(f"Vertex AI embedding failed: {str(e)}")
            raise
    
    def embed(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors (each is a list of floats)
        """
        if not texts:
            return []
        
        if self.provider == "local":
            self._load_local_model()
            try:
                embeddings = self._model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
                # Convert numpy array to list of lists
                return embeddings.tolist()
            except Exception as e:
                logger.error(f"Local embedding failed: {str(e)}")
                raise
        elif self.provider == "openai":
            return self._embed_with_openai(texts)
        elif self.provider == "vertex":
            return self._embed_with_vertex(texts)
        else:
            raise ValueError(f"Unknown embedding provider: {self.provider}")
    
    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a single query string.
        
        Args:
            query: Query text to embed
            
        Returns:
            Embedding vector as a list of floats
        """
        embeddings = self.embed([query])
        return embeddings[0] if embeddings else []
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by this service"""
        if self.provider == "local":
            self._load_local_model()
            return self._embedding_dimension
        elif self.provider == "openai":
            model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
            # OpenAI text-embedding-3-small has 1536 dimensions
            return 1536
        elif self.provider == "vertex":
            # Vertex textembedding-gecko@001 has 768 dimensions
            return 768
        else:
            raise ValueError(f"Unknown embedding provider: {self.provider}")

# Create service instance
embedding_service = EmbeddingService()

