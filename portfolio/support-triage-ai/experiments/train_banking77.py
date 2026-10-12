"""Download and evaluate Banking77; metrics are produced at runtime, not fabricated."""
import argparse,csv,json,urllib.request
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score,precision_recall_fscore_support,confusion_matrix

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',default='artifacts/banking77_metrics.json');a=p.parse_args()
 base='https://raw.githubusercontent.com/PolyAI-LDN/task-specific-datasets/master/banking_data/'
 def load(name):
  with urllib.request.urlopen(base+name,timeout=60) as r: return list(csv.DictReader((line.decode('utf-8') for line in r)))
 train,test=load('train.csv'),load('test.csv'); X=[r['text'] for r in train]; y=[r['category'] for r in train]; Xt=[r['text'] for r in test]; yt=[r['category'] for r in test]
 v=TfidfVectorizer(ngram_range=(1,2),min_df=2); tr=v.fit_transform(X); te=v.transform(Xt); m=LogisticRegression(max_iter=1000,random_state=42);m.fit(tr,y); pred=m.predict(te); out={'dataset':'Banking77','source':base,'split':'official train.csv / test.csv','accuracy':accuracy_score(yt,pred),'macro_f1':precision_recall_fscore_support(yt,pred,average='macro',zero_division=0)[2],'weighted_f1':precision_recall_fscore_support(yt,pred,average='weighted',zero_division=0)[2],'confusion_matrix':confusion_matrix(yt,pred).tolist(),'labels':list(m.classes_)}
 Path(a.output).parent.mkdir(exist_ok=True);Path(a.output).write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
if __name__=='__main__':main()
