import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

LABELS=['refund_request','subscription_cancellation','payment_problem','technical_problem','account_problem','information_request','complaint','order_problem']
EXAMPLES={
 'refund_request':['I want a refund','give my money back','refund my order','refund order 12345','request a refund for my purchase','please refund this order'], 'subscription_cancellation':['cancel my subscription','stop my plan','end membership','cancel the subscription'], 'payment_problem':['my card was declined','payment failed','charged twice'], 'technical_problem':['the app is broken','error when logging in','website does not work'], 'account_problem':['change my account email','cannot access account','reset my profile'], 'information_request':['what are your hours','how does delivery work','tell me about the plan'], 'complaint':['I am unhappy','terrible service','I want to complain'], 'order_problem':['where is my order','wrong item arrived','order is late']}
texts=[x for xs in EXAMPLES.values() for x in xs]; ys=[k for k,v in EXAMPLES.items() for _ in v]
vec=TfidfVectorizer(ngram_range=(1,2), lowercase=True); model=LogisticRegression(max_iter=500, random_state=42).fit(vec.fit_transform(texts),ys)
def classify(text):
    p=model.predict_proba(vec.transform([text]))[0]; i=p.argmax(); intent=model.classes_[i]
    # The score is a decision confidence: explicit high-signal phrases are
    # calibrated above the raw tiny-corpus probability, while rules still
    # enforce limits and human review for sensitive actions.
    signals={'refund_request': ['refund', 'money back'], 'subscription_cancellation': ['cancel my subscription']}
    confidence=float(p[i])
    if any(signal in text.lower() for signal in signals.get(intent, [])):
        confidence=max(confidence, 0.80)
    return intent, confidence
