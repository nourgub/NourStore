"""Small demo intent classifier.

The returned confidence is the model's raw ``predict_proba`` score. It is never
adjusted by keyword rules: the confidence threshold in ``workflows.rules`` must
see the real model output, otherwise it stops being a safety control.
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

LABELS = ['refund_request', 'subscription_cancellation', 'payment_problem', 'technical_problem',
          'account_problem', 'information_request', 'complaint', 'order_problem']

EXAMPLES = {
    'refund_request': [
        'I want a refund', 'give my money back', 'refund my order', 'refund order 12345',
        'request a refund for my purchase', 'please refund this order', 'I would like my money returned',
        'can I get a refund', 'refund the item I bought', 'return my payment for this order',
        'I need a refund for order', 'please process a refund',
    ],
    'subscription_cancellation': [
        'cancel my subscription', 'stop my plan', 'end membership', 'cancel the subscription',
        'I want to unsubscribe', 'terminate my plan', 'stop renewing my subscription', 'close my membership',
    ],
    'payment_problem': [
        'my card was declined', 'payment failed', 'charged twice', 'I was billed incorrectly',
        'the payment did not go through', 'unknown charge on my card', 'double charge on my statement',
    ],
    'technical_problem': [
        'the app is broken', 'error when logging in', 'website does not work', 'the page keeps crashing',
        'button does nothing', 'app freezes on startup',
    ],
    'account_problem': [
        'change my account email', 'cannot access account', 'reset my profile', 'my account was hacked',
        'someone logged into my account', 'update my password', 'locked out of my account',
    ],
    'information_request': [
        'what are your hours', 'how does delivery work', 'tell me about the plan', 'what is your return policy',
        'do you ship abroad', 'how long does shipping take',
    ],
    'complaint': [
        'I am unhappy', 'terrible service', 'I want to complain', 'very disappointed with support',
        'this is unacceptable', 'worst experience ever',
    ],
    'order_problem': [
        'where is my order', 'wrong item arrived', 'order is late', 'my package never arrived',
        'the item is damaged', 'order status please',
    ],
}

texts = [text for samples in EXAMPLES.values() for text in samples]
ys = [label for label, samples in EXAMPLES.items() for _ in samples]
vec = TfidfVectorizer(ngram_range=(1, 2), lowercase=True, sublinear_tf=True)
# C=10: the default C=1 over-regularises this tiny corpus and squeezes every
# probability towards 1/8. Mixed requests (e.g. "account hacked, refund") still
# stay below the 0.70 threshold and go to a human.
model = LogisticRegression(C=10, max_iter=1000, random_state=42).fit(vec.fit_transform(texts), ys)


def classify(text):
    probabilities = model.predict_proba(vec.transform([text]))[0]
    best = probabilities.argmax()
    return model.classes_[best], float(probabilities[best])
