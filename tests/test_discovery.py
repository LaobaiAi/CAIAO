"""Tests for CAIAO server discovery module."""
import os
import sys
import tempfile

import yaml
from caiao.discovery import discover_server_configs, resolve_venv_python


class TestResolveVenvPython:
    def test_returns_existing_python(self):
        """Should return sys.executable when no venv candidates exist."""
        result = resolve_venv_python(base_candidates=["/nonexistent/python"])
        assert result == sys.executable

    def test_returns_first_existing_candidate(self):
        """Should return first path that actually exists."""
        result = resolve_venv_python(base_candidates=[sys.executable, "/nonexistent/python"])
        assert result == sys.executable

    def test_empty_candidates(self):
        """Empty candidate list should fall back to sys.executable."""
        result = resolve_venv_python(base_candidates=[])
        assert result == sys.executable


class TestDiscoverServerConfigs:
    def test_no_servers_dir(self):
        """Missing servers dir should return empty list."""
        configs = discover_server_configs("/nonexistent/path")
        assert configs == []

    def test_no_servers_dir_with_legacy(self):
        """Missing servers dir should return legacy configs."""
        legacy = [{"name": "legacy_solver", "command": "python", "args": ["solver.py"]}]
        configs = discover_server_configs("/nonexistent/path", legacy_configs=legacy)
        assert configs == legacy

    def test_discovers_yaml_manifests(self):
        """Should discover servers from caiao.yaml manifests."""
        with tempfile.TemporaryDirectory() as tmpdir:
            server_dir = os.path.join(tmpdir, "my_solver")
            os.makedirs(server_dir)
            manifest = {
                "name": "my_solver",
                "version": "0.1.0",
                "kind": "atomic-mcp",
                "description": "A test solver",
                "tools": [{"name": "solve", "description": "Solves things"}],
                "command": {"python": "auto", "args": ["server.py"]},
            }
            with open(os.path.join(server_dir, "caiao.yaml"), "w") as f:
                yaml.dump(manifest, f)

            configs = discover_server_configs(tmpdir)
            assert len(configs) == 1
            assert configs[0]["name"] == "my_solver"
            assert "solve" in configs[0]["tools"]

    def test_skips_invalid_manifests(self):
        """Should skip directories without valid caiao.yaml."""
        with tempfile.TemporaryDirectory() as tmpdir:
            empty_dir = os.path.join(tmpdir, "empty_solver")
            os.makedirs(empty_dir)

            configs = discover_server_configs(tmpdir)
            assert len(configs) == 0

    def test_composite_server(self):
        """Composite servers should be detected correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            server_dir = os.path.join(tmpdir, "pipeline")
            os.makedirs(server_dir)
            manifest = {
                "name": "pipeline",
                "kind": "composite",
                "description": "A test pipeline",
                "tools": [{"name": "step1"}, {"name": "step2"}],
                "pipeline": [{"tool": "step1"}, {"tool": "step2"}],
            }
            with open(os.path.join(server_dir, "caiao.yaml"), "w") as f:
                yaml.dump(manifest, f)

            configs = discover_server_configs(tmpdir)
            assert len(configs) == 1
            assert configs[0]["composite"] is True

    def test_legacy_merge(self):
        """Legacy configs should merge with discovered ones."""
        with tempfile.TemporaryDirectory() as tmpdir:
            server_dir = os.path.join(tmpdir, "discovered")
            os.makedirs(server_dir)
            manifest = {
                "name": "discovered_server",
                "version": "0.1.0",
                "kind": "atomic-mcp",
                "tools": [{"name": "tool_a"}],
                "command": {"python": "auto", "args": ["server.py"]},
            }
            with open(os.path.join(server_dir, "caiao.yaml"), "w") as f:
                yaml.dump(manifest, f)

            legacy = [{"name": "legacy_server", "command": "python", "args": ["old.py"]}]
            configs = discover_server_configs(tmpdir, legacy_configs=legacy)
            assert len(configs) == 2
            names = {c["name"] for c in configs}
            assert names == {"discovered_server", "legacy_server"}

    def test_lazy_detection(self):
        """Lazy start_mode should set lazy=True."""
        with tempfile.TemporaryDirectory() as tmpdir:
            server_dir = os.path.join(tmpdir, "lazy_server")
            os.makedirs(server_dir)
            manifest = {
                "name": "lazy_server",
                "version": "0.1.0",
                "kind": "atomic-mcp",
                "tools": [{"name": "tool_a"}],
                "command": {"python": "auto", "args": ["server.py"]},
                "start_mode": "lazy",
            }
            with open(os.path.join(server_dir, "caiao.yaml"), "w") as f:
                yaml.dump(manifest, f)

            configs = discover_server_configs(tmpdir)
            assert len(configs) == 1
            assert configs[0]["lazy"] is True

    def test_skips_hidden_dirs(self):
        """Hidden and underscore-prefixed dirs should be skipped."""
        with tempfile.TemporaryDirectory() as tmpdir:
            for d in (".hidden", "_private"):
                os.makedirs(os.path.join(tmpdir, d))
            configs = discover_server_configs(tmpdir)
            assert len(configs) == 0
