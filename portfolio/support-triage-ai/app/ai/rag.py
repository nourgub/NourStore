"""Directory-backed, source-cited TF-IDF retrieval for demo company documents."""
from dataclasses import dataclass
from pathlib import Path
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

@dataclass(frozen=True)
class Chunk: title:str; text:str; source:str; index:int
class DocumentStore:
    def __init__(self,directory:Path|None=None,chunk_words:int=120):
        self.directory=directory or Path(__file__).parents[2]/'data/documents'; self.chunk_words=chunk_words; self.chunks=self._load(); self.vectorizer=TfidfVectorizer(stop_words='english'); self.matrix=self.vectorizer.fit_transform([c.text for c in self.chunks]) if self.chunks else None
    def _load(self):
        result=[]
        for path in sorted(self.directory.glob('*.md')):
            text=path.read_text(encoding='utf-8'); words=text.split()
            for i in range(0,len(words),self.chunk_words):
                body=' '.join(words[i:i+self.chunk_words]); result.append(Chunk(path.stem.replace('_',' ').title(),body,str(path.relative_to(self.directory.parent.parent)),i//self.chunk_words))
        return result
    def retrieve(self,query,k=3):
        if not self.chunks:return []
        scores=cosine_similarity(self.vectorizer.transform([query]),self.matrix)[0]
        ranked=scores.argsort()[::-1][:k]
        return [{'title':self.chunks[i].title,'source':self.chunks[i].source,'excerpt':self.chunks[i].text,'score':round(float(scores[i]),4)} for i in ranked if scores[i]>0]
store=DocumentStore()
def retrieve(query,k=3): return store.retrieve(query,k)
