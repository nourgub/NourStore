import importlib

import pytest


@pytest.fixture()
def make_app(tmp_path, monkeypatch):
    """Fresh app on a temporary database; pass env overrides as keyword arguments."""
    def factory(**env):
        defaults = {"DB_PATH": str(tmp_path / "store.db"), "SEED_DEMO_DATA": "true"}
        for key, value in {**defaults, **env}.items():
            monkeypatch.setenv(key, str(value))
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        import db
        import agent
        import app as app_module
        importlib.reload(db)
        importlib.reload(agent)
        return importlib.reload(app_module)
    return factory
