import logging
import time
from contextlib import contextmanager

logger = logging.getLogger('enterprise_ai')
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format='%(message)s')

@contextmanager
def stage(workflow_id, name):
    started = time.perf_counter()
    try:
        yield
        status = 'success'; error = None
    except Exception as exc:
        status = 'error'; error = type(exc).__name__
        raise
    finally:
        duration_ms = round((time.perf_counter() - started) * 1000, 3)
        logger.info({'workflow_id': workflow_id, 'stage': name, 'status': status, 'duration_ms': duration_ms, 'error': error})
