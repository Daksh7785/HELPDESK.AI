import os
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client
from dotenv import load_dotenv

class RagService:
    def __init__(self):
        self.model = None
        self._loaded = False
        
        load_dotenv()
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY")
        if url and key:
            self.supabase: Client = create_client(url, key)
        else:
            self.supabase = None

    def load(self):
        print("[RAG] Loading SentenceTransformer for Knowledge Base...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self._loaded = True
        print("[RAG] Model loaded successfully.")

    def search_knowledge_base(self, text: str, threshold: float = 0.85, match_count: int = 1):
        """
        Embed the input text and query Supabase for a matching article.
        Returns the article text if found above threshold, else None.
        """
        if not self._loaded or not self.supabase:
            return None

        try:
            # Generate Embedding vector (list of 384 floats)
            vector = self.model.encode(text).tolist()

            # Call the Supabase RPC function we created in SQL
            response = self.supabase.rpc(
                'match_articles',
                {
                    'query_embedding': vector,
                    'match_threshold': threshold,
                    'match_count': match_count
                }
            ).execute()

            if response.data and len(response.data) > 0:
                best_match = response.data[0]
                return {
                    "id": best_match["id"],
                    "title": best_match["title"],
                    "content": best_match["content"],
                    "similarity": best_match["similarity"]
                }
                
            return None
            
        except Exception as e:
            print(f"[RAG ERROR] Query failed: {e}")
            return None
