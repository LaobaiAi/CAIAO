import logging
import os
import sys
from collections.abc import Callable
from typing import Any

logger = logging.getLogger(__name__)


def resolve_venv_python(
    base_candidates: list[str] | None = None,
    project_dir: str | None = None,
) -> str:
    if base_candidates is None:
        candidates = _default_venv_candidates(project_dir)
    else:
        candidates = list(base_candidates)
    return next((p for p in candidates if os.path.exists(p)), sys.executable)


def _default_venv_candidates(project_dir: str | None = None) -> list[str]:
    candidates: list[str] = []
    if project_dir:
        for venv_name in (".venv", "venv"):
            for scripts_dir in ("Scripts", "bin"):
                python_exe = "python.exe" if scripts_dir == "Scripts" else "python"
                p = os.path.join(project_dir, venv_name, scripts_dir, python_exe)
                candidates.append(p)
    return candidates


def discover_server_configs(
    servers_dir: str,
    sentinel_resolvers: dict[str, Callable[[], str]] | None = None,
    legacy_configs: list[dict[str, Any]] | None = None,
    venv_python: str | None = None,
) -> list[dict[str, Any]]:
    sentinel_resolvers = sentinel_resolvers or {}
    if venv_python is None:
        venv_python = sys.executable

    configs: list[dict[str, Any]] = []

    if not os.path.isdir(servers_dir):
        logger.warning(f"Servers dir not found: {servers_dir}")
        return list(legacy_configs or [])

    try:
        import yaml
    except ImportError:
        logger.warning("PyYAML not available")
        return list(legacy_configs or [])

    for entry in os.scandir(servers_dir):
        if not entry.is_dir():
            continue
        if entry.name.startswith("_") or entry.name.startswith("."):
            continue
        manifest_path = os.path.join(entry.path, "caiao.yaml")
        if not os.path.exists(manifest_path):
            continue
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
        except Exception as e:
            logger.warning(f"Failed to read {manifest_path}: {e}")
            continue
        if not isinstance(data, dict):
            logger.warning(f"Invalid manifest: {manifest_path}")
            continue
        try:
            config = _manifest_to_config(data, entry.path, sentinel_resolvers, venv_python)
            configs.append(config)
            logger.info(f"Discovered: {data.get('name')} ({data.get('kind')})")
        except Exception as e:
            logger.warning(f"Failed to convert {manifest_path}: {e}")

    if not configs and legacy_configs:
        logger.info("No manifests found, using legacy configs")
        return list(legacy_configs)

    if legacy_configs:
        manifest_names = {c["name"] for c in configs}
        for legacy in legacy_configs:
            if legacy["name"] not in manifest_names:
                configs.append(legacy)
                logger.info(f"Added legacy: '{legacy['name']}'")

    return configs


def _manifest_to_config(
    data: dict[str, Any],
    server_dir: str,
    sentinel_resolvers: dict[str, Callable[[], str]],
    venv_python: str,
) -> dict[str, Any]:
    name = data["name"]
    kind = data.get("kind", "atomic-mcp")

    if kind == "composite":
        return {
            "name": name,
            "composite": True,
            "description": data.get("description", ""),
            "input_schema": data.get("input_schema", {}),
            "pipeline": data.get("pipeline", []),
            "tools": [t["name"] for t in data.get("tools", [])],
        }

    cmd = data.get("command", {})
    python_spec = cmd.get("python", "auto")
    if python_spec in ("auto", "python"):
        python_path = venv_python
    elif python_spec.startswith("@") and python_spec.endswith("@"):
        resolver = sentinel_resolvers.get(python_spec)
        if resolver:
            python_path = resolver()
        else:
            logger.warning(f"No resolver for sentinel '{python_spec}', falling back to sys.executable")
            python_path = sys.executable
    else:
        python_path = python_spec

    args = cmd.get("args", ["server.py"])
    cwd = os.path.join(server_dir, cmd.get("cwd", "."))

    config: dict[str, Any] = {
        "name": name,
        "description": data.get("description", ""),
        "command": python_path,
        "args": args,
        "cwd": os.path.normpath(cwd),
        "tools": [t["name"] for t in data.get("tools", [])],
    }

    if data.get("start_mode") == "lazy":
        config["lazy"] = True

    env = cmd.get("env")
    if env and isinstance(env, dict) and env:
        config["env"] = env

    return config
