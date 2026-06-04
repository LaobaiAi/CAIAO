from typing import Any, NotRequired, TypedDict


class ServerConfig(TypedDict):
    name: str
    command: str
    args: list[str]
    cwd: str | None
    lazy: NotRequired[bool]
    tools: NotRequired[list[str]]
    composite: NotRequired[bool]
    description: NotRequired[str]
    input_schema: NotRequired[dict[str, Any]]
    pipeline: NotRequired[list[dict[str, Any]]]
    env: NotRequired[dict[str, str]]


class ToolDef(TypedDict):
    name: str
    description: str
    input_schema: dict[str, Any]
    server: str


class ServerState(TypedDict):
    state: str
    pid: int | None
    started_at: float | None
    crash_count: int
    restart_count: int
    max_restarts: int
    last_error: str | None


class ServerMetrics(TypedDict):
    total_calls: int
    error_count: int
    total_latency_ms: float
    avg_latency_ms: float
    last_called: float | None
    tool_metrics: dict[str, dict[str, Any]]


class PipelineStep(TypedDict):
    tool: str
    arguments: NotRequired[dict[str, Any]]
    server: NotRequired[str]
    label: NotRequired[str]
    input_map: NotRequired[dict[str, str]]
    map_result: NotRequired[str]
