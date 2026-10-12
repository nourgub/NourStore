"""Shared rate limiting, Redis fallback, proxies, body size and JSON validation."""
import logging

import pytest

import ratelimit


class FakeRedis:
    """The two commands RedisLimiter uses, backed by one dict shared by all 'workers'."""

    def __init__(self, store=None, fail=False):
        self.store = {} if store is None else store
        self.fail = fail

    def ping(self):
        return True

    def incr(self, key):
        if self.fail:
            raise ConnectionError("redis down")
        self.store[key] = self.store.get(key, 0) + 1
        return self.store[key]

    def expire(self, key, seconds):
        return True


def test_memory_limiter_counts_per_key():
    limiter = ratelimit.MemoryLimiter()
    assert [limiter.hit("a", 2, 60) for _ in range(3)] == [True, True, False]
    assert limiter.hit("b", 2, 60) is True
    assert limiter.hit("c", 0, 60) is True  # 0 means unlimited


def test_redis_limit_is_shared_between_workers():
    shared = {}
    worker_1, worker_2 = ratelimit.RedisLimiter(FakeRedis(shared)), ratelimit.RedisLimiter(FakeRedis(shared))
    results = [worker_1.hit("chat:1.2.3.4", 3, 600), worker_2.hit("chat:1.2.3.4", 3, 600),
               worker_1.hit("chat:1.2.3.4", 3, 600), worker_2.hit("chat:1.2.3.4", 3, 600)]
    assert results == [True, True, True, False]


def test_redis_errors_fall_back_to_memory(caplog):
    limiter = ratelimit.RedisLimiter(FakeRedis(fail=True))
    with caplog.at_level(logging.WARNING):
        assert [limiter.hit("k", 1, 60) for _ in range(2)] == [True, False]
    assert "redis rate limiter unavailable" in caplog.text


def test_build_limiter_uses_redis_when_reachable():
    limiter = ratelimit.build_limiter("redis://cache:6379/0", client_factory=lambda url: FakeRedis())
    assert limiter.backend == "redis"


def test_build_limiter_falls_back_with_a_warning(caplog):
    def unreachable(url):
        raise ConnectionError("connection refused")

    with caplog.at_level(logging.WARNING):
        limiter = ratelimit.build_limiter("redis://10.255.255.1:6379/0", client_factory=unreachable)
    assert limiter.backend == "memory"
    assert "falling back to per-process rate limits" in caplog.text


def test_unreachable_redis_url_still_serves_requests(make_app):
    app = make_app(REDIS_URL="redis://127.0.0.1:1/0")
    assert app.limiter.backend == "memory"
    assert app.app.test_client().post("/api/chat", json={"message": "salam"}).status_code == 200


def test_limits_are_separate_per_endpoint(make_app):
    app = make_app(CHAT_LIMIT_PER_10_MIN="1", CONFIRM_LIMIT_PER_10_MIN="5")
    client = app.app.test_client()
    assert client.post("/api/chat", json={"message": "a"}).status_code == 200
    blocked = client.post("/api/chat", json={"message": "b"})
    assert blocked.status_code == 429 and blocked.get_json()["code"] == "rate_limited"
    assert client.post("/api/orders/confirm", json={"proposal_id": "doesnotexist"}).status_code == 409


def test_forwarded_for_is_ignored_without_trusted_proxy(make_app):
    client = make_app(CHAT_LIMIT_PER_10_MIN="1").app.test_client()
    client.post("/api/chat", json={"message": "a"}, headers={"X-Forwarded-For": "1.1.1.1"})
    spoofed = client.post("/api/chat", json={"message": "b"}, headers={"X-Forwarded-For": "2.2.2.2"})
    assert spoofed.status_code == 429  # a client cannot dodge the limit by inventing headers


def test_forwarded_for_is_used_behind_a_trusted_proxy(make_app):
    client = make_app(CHAT_LIMIT_PER_10_MIN="1", TRUSTED_PROXY_COUNT="1").app.test_client()
    assert client.post("/api/chat", json={"message": "a"}, headers={"X-Forwarded-For": "1.1.1.1"}).status_code == 200
    assert client.post("/api/chat", json={"message": "b"}, headers={"X-Forwarded-For": "2.2.2.2"}).status_code == 200
    assert client.post("/api/chat", json={"message": "c"}, headers={"X-Forwarded-For": "2.2.2.2"}).status_code == 429


def test_request_body_size_is_limited(make_app):
    client = make_app(MAX_REQUEST_BYTES="2048").app.test_client()
    response = client.post("/api/chat", data='{"message": "' + "x" * 5000 + '"}', content_type="application/json")
    assert response.status_code == 413


@pytest.mark.parametrize("kwargs", [
    {"data": "message=salam", "content_type": "application/x-www-form-urlencoded"},
    {"data": "not json", "content_type": "application/json"},
    {"json": ["salam"]},
    {"json": {"message": 123}},
    {"json": {"message": "salam", "history": "not a list"}},
    {"json": {"message": "salam", "history": [{"role": "user", "content": "x"}] * 51}},
])
def test_malformed_chat_requests_are_rejected(make_app, kwargs):
    response = make_app().app.test_client().post("/api/chat", **kwargs)
    assert response.status_code == 400


@pytest.mark.parametrize("payload", [{}, {"proposal_id": 5}, {"proposal_id": "x"}, {"proposal_id": "y" * 65}])
def test_malformed_confirmations_are_rejected(make_app, payload):
    assert make_app().app.test_client().post("/api/orders/confirm", json=payload).status_code == 400
