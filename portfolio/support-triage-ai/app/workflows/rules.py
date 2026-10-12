from ..config import settings


def decide(intent, confidence, extracted, sources):
    # Checks that apply to every intent come first, so no intent-specific branch can skip them.
    if confidence < settings.confidence_threshold:
        return 'REQUIRES_HUMAN_REVIEW', 'low classifier confidence'
    if extracted.get('urgency') == 'high':
        return 'REQUIRES_HUMAN_REVIEW', 'urgent or sensitive request'
    if not sources:
        return 'REQUIRES_HUMAN_REVIEW', 'no supporting policy source'
    if intent == 'subscription_cancellation':
        return 'REQUIRES_HUMAN_REVIEW', 'subscription changes require human approval'
    if intent == 'refund_request':
        if not extracted.get('order_id'):
            return 'REQUIRES_HUMAN_REVIEW', 'order id is required for refund processing'
        amount = extracted.get('amount')
        if amount is None or amount <= 0:
            return 'REQUIRES_HUMAN_REVIEW', 'refund amount could not be determined'
        if amount > settings.auto_approval_limit:
            return 'REQUIRES_HUMAN_REVIEW', 'refund exceeds configured approval limit'
        return 'AUTO_APPROVED', 'refund is within configured limit and policy context was retrieved'
    return 'REQUIRES_HUMAN_REVIEW', 'intent is not configured for automatic execution'
