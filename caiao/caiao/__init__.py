"""CAIAO — a Server-as-atomic-unit framework for tool orchestration.

Two implementation paths:
- MCP SDK path (this package): ``from caiao import CAIAOClientHub``
- Lightweight path: copy ``caiao_lightweight/`` files into your project

See https://github.com/.../caiao for documentation.
"""

__version__ = "0.1.0"

from ._parallel import get_parallel_limit
from .discovery import discover_server_configs, resolve_venv_python
from .hub import CAIAOClientHub

__all__ = [
    "CAIAOClientHub",
    "discover_server_configs",
    "resolve_venv_python",
    "get_parallel_limit",
]
