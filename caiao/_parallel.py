import logging
import os
import platform
from collections.abc import Callable

logger = logging.getLogger(__name__)


def _default_load_checker() -> float:
    try:
        if platform.system() == "Linux" and os.path.exists("/proc/loadavg"):
            with open("/proc/loadavg") as f:
                return float(f.read().split()[0])
    except Exception:
        pass
    return 0.0


def get_parallel_limit(
    requested: int,
    load_checker: Callable[[], float] | None = None,
) -> int:
    cpu_count = os.cpu_count() or 4
    safe_max = max(1, cpu_count - 1)
    if requested <= 1:
        return 1
    if cpu_count >= 8:
        return min(requested, safe_max)
    try:
        load = (load_checker or _default_load_checker)()
        available = max(1, cpu_count - int(load))
        if available < 2:
            logger.info(f"High system load ({load:.1f}), falling back to serial")
            return 1
        return min(requested, available)
    except Exception:
        pass
    return min(requested, 2)
