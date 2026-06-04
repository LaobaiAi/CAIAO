"""SubprocessManager — JSON-line protocol for lightweight CAIAO subprocess servers.

Communicates with a child process via stdin/stdout using a simple JSON-line protocol.
Each request is a single JSON line; each response is a single JSON line.
"""

import json
import logging
import subprocess
import time
from typing import Any

logger = logging.getLogger(__name__)


class SubprocessManager:
    """Manage a CAIAO server as a subprocess with JSON-line stdio protocol.

    The subprocess is spawned lazily on first use. The JSON-line protocol
    is simpler than MCP JSON-RPC: each message is a single line of JSON.
    """

    def __init__(self, name: str, command: list[str], cwd: str | None = None):
        self.name = name
        self.command = command
        self.cwd = cwd
        self._process: subprocess.Popen | None = None
        self._tools: list[dict[str, Any]] = []
        self._tools_fetched = False

    def ensure_running(self) -> None:
        if self._process is not None and self._process.poll() is None:
            return
        logger.info(f"Starting subprocess: {self.name}")
        self._process = subprocess.Popen(
            self.command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=self.cwd,
            text=True,
        )
        self._tools_fetched = False

    def is_running(self) -> bool:
        return self._process is not None and self._process.poll() is None

    def _send_command(self, command: str, payload: Any = None) -> dict[str, Any]:
        self.ensure_running()
        request = {"method": command}
        if payload is not None:
            request["params"] = payload
        line = json.dumps(request) + "\n"
        self._process.stdin.write(line)
        self._process.stdin.flush()
        response_line = self._process.stdout.readline()
        if not response_line:
            return {"error": "No response from subprocess"}
        try:
            return json.loads(response_line)
        except json.JSONDecodeError as e:
            return {"error": f"Invalid response: {e}"}

    def list_tools(self) -> list[dict[str, Any]]:
        if not self._tools_fetched:
            result = self._send_command("list_tools")
            self._tools = result if isinstance(result, list) else []
            self._tools_fetched = True
        return self._tools

    def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        return self._send_command("call_tool", {"name": tool_name, "arguments": arguments})

    def get_metadata(self) -> dict[str, Any]:
        return self._send_command("metadata")

    def stop(self) -> None:
        if self._process is None:
            return
        try:
            self._process.stdin.close()
            self._process.stdout.close()
            self._process.terminate()
            self._process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self._process.kill()
            self._process.wait()
        except Exception:
            pass
        self._process = None
        logger.info(f"Subprocess stopped: {self.name}")
