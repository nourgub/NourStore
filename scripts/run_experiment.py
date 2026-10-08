"""Real Banking77 experiment. This script may use the network; tests never call it."""
import argparse, csv, json, urllib.request
from collections import Counter
from pathlib import Path
import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support

def load_csv(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return list(csv.DictReader(line.decode('utf-8') for line in response))

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--output-dir',default='results'); args=parser.parse_args()
    out=Path(args.output_dir); (out/'metrics').mkdir(parents=True,exist_ok=True)
    base='https://raw.githubusercontent.com/PolyAI-LDN/task-specific-datasets/master/banking_data/'
    train,test=load_csv(base+'train.csv'),load_csv(base+'test.csv')
    x_train=[r['text'] for r in train]; y_train=[r['category'] for r in train]
    x_test=[r['text'] for r in test]; y_test=[r['category'] for r in test]
    vectorizer=TfidfVectorizer(ngram_range=(1,2),min_df=2); train_matrix=vectorizer.fit_transform(x_train); test_matrix=vectorizer.transform(x_test)
    model=LogisticRegression(max_iter=1000,random_state=42); model.fit(train_matrix,y_train); predictions=model.predict(test_matrix)
    labels=sorted(set(y_test)); report=classification_report(y_test,predictions,labels=labels,output_dict=True,zero_division=0)
    precision,recall,f1,_=precision_recall_fscore_support(y_test,predictions,average='weighted',zero_division=0)
    metrics={'dataset':'Banking77','source':base,'license_note':'Use the dataset according to its public repository license/terms; verify before redistribution.','train_examples':len(train),'test_examples':len(test),'classes':len(set(y_train)),'split':'official train.csv/test.csv','preprocessing':'TF-IDF word 1-2 grams, min_df=2','model':'LogisticRegression(max_iter=1000, random_state=42)','random_seed':42,'accuracy':accuracy_score(y_test,predictions),'precision_weighted':precision,'recall_weighted':recall,'macro_f1':report['macro avg']['f1-score'],'weighted_f1':f1,'classification_report':report}
    (out/'metrics.json').write_text(json.dumps(metrics,indent=2))
    (out/'metrics'/'banking77_metrics.json').write_text(json.dumps(metrics,indent=2))
    cm=confusion_matrix(y_test,predictions,labels=labels)
    try:
        import matplotlib.pyplot as plt
        fig,ax=plt.subplots(figsize=(18,16)); ax.imshow(cm); ax.set_title('Banking77 confusion matrix'); ax.set_xlabel('Predicted'); ax.set_ylabel('Actual'); ax.set_xticks(range(len(labels)),labels,rotation=90,fontsize=5); ax.set_yticks(range(len(labels)),labels,fontsize=5); fig.tight_layout(); fig.savefig(out/'confusion_matrix.png',dpi=160); plt.close(fig)
    except ImportError:
        (out/'confusion_matrix.csv').write_text('actual/predicted,'+','.join(labels)+'\n'+'\n'.join(','.join([label]+[str(v) for v in row]) for label,row in zip(labels,cm)))
    errors=[]
    for row,pred in zip(test,predictions):
        if row['category']!=pred: errors.append({'text':row['text'],'actual':row['category'],'predicted':pred})
    (out/'error_analysis.csv').write_text('text,actual,predicted\n'+'\n'.join('"'+e['text'].replace('"','""')+'",'+e['actual']+','+e['predicted'] for e in errors))
    majority=DummyClassifier(strategy='most_frequent'); majority.fit(train_matrix,y_train); majority_pred=majority.predict(test_matrix)
    comparison=[{'model':'TF-IDF + Logistic Regression','accuracy':accuracy_score(y_test,predictions),'weighted_f1':f1},{'model':'Most frequent baseline','accuracy':accuracy_score(y_test,majority_pred),'weighted_f1':precision_recall_fscore_support(y_test,majority_pred,average='weighted',zero_division=0)[2]}]
    (out/'model_comparison.csv').write_text('model,accuracy,weighted_f1\n'+'\n'.join(f"{r['model']},{r['accuracy']},{r['weighted_f1']}" for r in comparison))
    print(json.dumps({'train_examples':len(train),'test_examples':len(test),'classes':len(set(y_train)),'accuracy':metrics['accuracy'],'macro_f1':metrics['macro_f1'],'weighted_f1':metrics['weighted_f1'],'errors':len(errors)},indent=2))
if __name__=='__main__': main()
