"""
CAIAO Visual Platform — Backend API Server

Provides REST + SSE endpoints for:
- Server discovery and metadata
- Graph execution (topological sort + parallel execution)
- Flow persistence
- Server merge generation
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Add project root to path for CAIAO imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from caiao_lightweight.hub import Hub
from caiao_lightweight.server import CAIAOServer, tool

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("caiao-visual")

app = FastAPI(title="CAIAO Visual Platform", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory state ──────────────────────────────────────────────
hub = Hub()
_flows: dict[int, dict[str, Any]] = {}
_flow_order: list[int] = []
_next_flow_id: int = 1


# ── Demo Servers ──────────────────────────────────────────────────
# 8 servers designed to fully test the CAIAO Visual Platform:
#   1. DataSource   — generate test data (numbers, text, structured)
#   2. Calculator   — arithmetic & math operations
#   3. TextProcessor — text manipulation (case, split, join, template)
#   4. DataConverter — format conversion (JSON, CSV, number)
#   5. Filter       — filter / select data by conditions
#   6. Aggregator   — merge, group, combine multiple data streams
#   7. Analyzer     — statistical analysis & insights
#   8. Reporter     — format output as reports / tables / summaries
#
# Key scenarios these enable:
#   • Linear:    DataSource → Calculator → Reporter
#   • Branching: DataSource → [Filter, Analyzer] → Aggregator → Reporter
#   • Merging:   DataSource_A ↘
#                DataSource_B → Aggregator → Analyzer → Reporter
#                DataSource_C ↗
#   • DAG:       DataSource → Filter → [Calculator, TextProcessor] → Aggregator → Reporter
#   • Merge Server: Select subgraph → generate composite server


class DataSource(CAIAOServer):
    """Generate structured test data for pipelines."""
    name = "datasource"
    display_name = "Data Source"
    description = "Generate test data: random numbers, sequences, product lists, and structured datasets"
    version = "1.0.0"

    @tool
    def random_numbers(self, args: dict) -> dict:
        """Generate a list of random integers. Params: count (default 10), min_val (default 1), max_val (default 100)"""
        import random
        count = args.get("count", 10)
        min_val = args.get("min_val", 1)
        max_val = args.get("max_val", 100)
        return {"result": [random.randint(min_val, max_val) for _ in range(count)]}
    
    # Register input_schema for this tool
    random_numbers._caiao_input_schema = {
        "type": "object",
        "properties": {
            "count": {"type": "integer", "description": "Number of random integers to generate"},
            "min_val": {"type": "integer", "description": "Minimum value"},
            "max_val": {"type": "integer", "description": "Maximum value"},
        }
    }

    @tool
    def number_sequence(self, args: dict) -> dict:
        """Generate an arithmetic sequence. Params: start, end, step (default 1)"""
        start = args.get("start", 1)
        end = args.get("end", 20)
        step = args.get("step", 1)
        return {"result": list(range(start, end + 1, step))}

    @tool
    def product_list(self, args: dict) -> dict:
        """Return a pre-defined list of sample products with prices and categories"""
        return {
            "result": [
                {"name": "Widget A", "price": 12.99, "category": "Electronics", "stock": 150},
                {"name": "Widget B", "price": 24.50, "category": "Electronics", "stock": 80},
                {"name": "Gadget X",  "price": 8.75,  "category": "Tools",       "stock": 200},
                {"name": "Gadget Y",  "price": 15.00, "category": "Tools",       "stock": 45},
                {"name": "Thing P",   "price": 45.00, "category": "Premium",     "stock": 30},
                {"name": "Thing Q",   "price": 99.99, "category": "Premium",     "stock": 12},
            ]
        }

    @tool
    def daily_sales(self, args: dict) -> dict:
        """Generate simulated daily sales data. Params: days (default 7)"""
        import random
        days = args.get("days", 7)
        products = ["Widget A", "Widget B", "Gadget X", "Gadget Y", "Thing P", "Thing Q"]
        result = []
        for d in range(days):
            for prod in products:
                result.append({
                    "day": d + 1,
                    "product": prod,
                    "quantity": random.randint(1, 20),
                    "revenue": round(random.uniform(50, 500), 2),
                })
        return {"result": result}


class Calculator(CAIAOServer):
    """Arithmetic and math operations."""
    name = "calculator"
    display_name = "Calculator"
    description = "Arithmetic & math: add, subtract, multiply, divide, power, sqrt"
    version = "1.0.0"

    @tool
    def add(self, args: dict) -> dict:
        """Add two numbers: a + b"""
        return {"result": args["a"] + args["b"]}

    @tool
    def subtract(self, args: dict) -> dict:
        """Subtract: a - b"""
        return {"result": args["a"] - args["b"]}

    @tool
    def multiply(self, args: dict) -> dict:
        """Multiply: a * b"""
        return {"result": args["a"] * args["b"]}

    @tool
    def divide(self, args: dict) -> dict:
        """Divide: a / b. Returns error if b is 0."""
        if args.get("b", 1) == 0:
            return {"error": "Division by zero"}
        return {"result": args["a"] / args["b"]}

    @tool
    def power(self, args: dict) -> dict:
        """Raise a number to a power: base ^ exp"""
        return {"result": args["base"] ** args.get("exp", 2)}

    @tool
    def sqrt(self, args: dict) -> dict:
        """Square root of a number"""
        import math
        val = args.get("value", args.get("number", 0))
        if val < 0:
            return {"error": "Cannot compute sqrt of negative number"}
        return {"result": round(math.sqrt(val), 4)}


class TextProcessor(CAIAOServer):
    """Text manipulation and formatting."""
    name = "text_processor"
    display_name = "Text Processor"
    description = "Text tools: uppercase, lowercase, reverse, split, join, concat, template"
    version = "1.0.0"

    @tool
    def uppercase(self, args: dict) -> dict:
        """Convert text to UPPERCASE"""
        return {"result": str(args["text"]).upper()}

    @tool
    def lowercase(self, args: dict) -> dict:
        """Convert text to lowercase"""
        return {"result": str(args["text"]).lower()}

    @tool
    def reverse(self, args: dict) -> dict:
        """Reverse a string"""
        return {"result": str(args["text"])[::-1]}

    @tool
    def concat(self, args: dict) -> dict:
        """Concatenate two values with an optional separator. Params: a, b, separator (default ' ')"""
        sep = args.get("separator", " ")
        return {"result": str(args["a"]) + sep + str(args["b"])}

    @tool
    def split(self, args: dict) -> dict:
        """Split text by separator into a list. Params: text, separator (default ',')"""
        sep = args.get("separator", ",")
        return {"result": [s.strip() for s in str(args["text"]).split(sep)]}

    @tool
    def template(self, args: dict) -> dict:
        """Fill a string template. Params: template (with {key} placeholders), plus values as extra args"""
        tpl = str(args.get("template", args.get("text", "")))
        fill = {k: v for k, v in args.items() if k not in ("template", "text")}
        try:
            return {"result": tpl.format(**fill)}
        except KeyError as e:
            return {"error": f"Missing placeholder value: {e}"}


class DataConverter(CAIAOServer):
    """Convert data between formats."""
    name = "data_converter"
    display_name = "Data Converter"
    description = "Format conversion: to/from JSON, CSV, number, pretty-print"
    version = "1.0.0"

    @tool
    def to_json(self, args: dict) -> dict:
        """Serialize data to a JSON string. Uses 'data' key or all args."""
        payload = args.get("data", args)
        return {"result": json.dumps(payload, default=str, ensure_ascii=False)}

    @tool
    def from_json(self, args: dict) -> dict:
        """Parse a JSON string into an object"""
        try:
            return {"result": json.loads(args["text"])}
        except (json.JSONDecodeError, KeyError) as e:
            return {"error": str(e)}

    @tool
    def to_number(self, args: dict) -> dict:
        """Convert a string or value to a number (float)"""
        val = args.get("text", args.get("value", 0))
        try:
            return {"result": float(val)}
        except (ValueError, TypeError) as e:
            return {"error": str(e)}

    @tool
    def to_csv(self, args: dict) -> dict:
        """Convert a list of dicts to a CSV string. Params: data (list of dicts)"""
        import io, csv
        records = args.get("data", args.get("records", []))
        if not records:
            return {"error": "No data provided"}
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)
        return {"result": output.getvalue()}


class DataFilter(CAIAOServer):
    """Filter and select data by conditions."""
    name = "data_filter"
    display_name = "Filter"
    description = "Filter data: greater_than, less_than, contains, top_n, select_fields"
    version = "1.0.0"

    @tool
    def greater_than(self, args: dict) -> dict:
        """Keep numbers > threshold. Params: numbers (list), threshold (default 50)"""
        numbers = args.get("numbers", args.get("data", []))
        threshold = args.get("threshold", 50)
        return {"result": [n for n in numbers if isinstance(n, (int, float)) and n > threshold]}
    
    greater_than._caiao_input_schema = {
        "type": "object",
        "properties": {
            "numbers": {"type": "array", "items": {"type": "number"}, "description": "List of numbers to filter"},
            "threshold": {"type": "number", "description": "Keep numbers greater than this value"},
        }
    }

    @tool
    def less_than(self, args: dict) -> dict:
        """Keep numbers < threshold. Params: numbers (list), threshold"""
        numbers = args.get("numbers", args.get("data", []))
        threshold = args.get("threshold", 100)
        return {"result": [n for n in numbers if isinstance(n, (int, float)) and n < threshold]}

    @tool
    def contains(self, args: dict) -> dict:
        """Keep dicts whose field contains a keyword. Params: data (list of dicts), field, keyword"""
        data = args.get("data", [])
        field = args.get("field", "name")
        keyword = args.get("keyword", "")
        return {
            "result": [
                item for item in data
                if isinstance(item, dict) and keyword.lower() in str(item.get(field, "")).lower()
            ]
        }

    @tool
    def top_n(self, args: dict) -> dict:
        """Get the top N items, optionally sorted by a field. Params: data, n (default 3), sort_by"""
        data = args.get("data", [])
        n = args.get("n", 3)
        sort_by = args.get("sort_by")
        if sort_by:
            data = sorted(data, key=lambda x: (x.get(sort_by, 0) if isinstance(x, dict) else x), reverse=True)
        return {"result": data[:n]}


class Aggregator(CAIAOServer):
    """Merge, combine, and group data from multiple sources."""
    name = "aggregator"
    display_name = "Aggregator"
    description = "Combine data: merge, group_by, concat_arrays, zip_arrays"
    version = "1.0.0"

    @tool
    def merge(self, args: dict) -> dict:
        """Merge two lists or dicts into one. Params: a, b"""
        a = args.get("a", [])
        b = args.get("b", [])
        if isinstance(a, list) and isinstance(b, list):
            return {"result": a + b}
        if isinstance(a, dict) and isinstance(b, dict):
            return {"result": {**a, **b}}
        return {"result": [a, b]}

    @tool
    def group_by(self, args: dict) -> dict:
        """Group a list of dicts by a field. Params: data (list of dicts), field"""
        data = args.get("data", [])
        field = args.get("field", "category")
        groups: dict = {}
        for item in data:
            if not isinstance(item, dict):
                continue
            key = str(item.get(field, "other"))
            groups.setdefault(key, []).append(item)
        return {"result": groups}

    @tool
    def summarize(self, args: dict) -> dict:
        """Create a summary dict from multiple inputs. Params: any key-value pairs"""
        summary = {k: v for k, v in args.items() if k not in ("tool", "server")}
        return {"result": summary}


class Analyzer(CAIAOServer):
    """Statistical analysis and insights."""
    name = "analyzer"
    display_name = "Analyzer"
    description = "Analyze data: statistics, frequency, trend, average"
    version = "1.0.0"

    @tool
    def statistics(self, args: dict) -> dict:
        """Compute min, max, avg, sum, median, count from a list of numbers"""
        nums = args.get("numbers", args.get("data", []))
        if not nums:
            return {"error": "Empty list"}
        nums = [n for n in nums if isinstance(n, (int, float))]
        if not nums:
            return {"error": "No numeric values found"}
        sorted_nums = sorted(nums)
        mid = len(sorted_nums) // 2
        median = sorted_nums[mid] if len(sorted_nums) % 2 else (sorted_nums[mid - 1] + sorted_nums[mid]) / 2
        return {
            "result": {
                "min": min(nums),
                "max": max(nums),
                "avg": round(sum(nums) / len(nums), 2),
                "sum": sum(nums),
                "median": median,
                "count": len(nums),
            }
        }
    
    statistics._caiao_input_schema = {
        "type": "object",
        "properties": {
            "numbers": {"type": "array", "items": {"type": "number"}, "description": "List of numbers to analyze"},
        }
    }

    @tool
    def frequency(self, args: dict) -> dict:
        """Count occurrences of each unique value in a list"""
        items = args.get("items", args.get("data", []))
        freq: dict = {}
        for item in items:
            key = str(item)
            freq[key] = freq.get(key, 0) + 1
        return {"result": freq}

    @tool
    def trend(self, args: dict) -> dict:
        """Analyze trend direction of a number sequence. Returns: direction, change, values"""
        values = args.get("values", args.get("data", []))
        values = [v for v in values if isinstance(v, (int, float))]
        if len(values) < 2:
            return {"result": {"direction": "insufficient_data", "change": 0, "values": values}}
        change = values[-1] - values[0]
        if change > 0:
            direction = "increasing"
        elif change < 0:
            direction = "decreasing"
        else:
            direction = "stable"
        return {
            "result": {
                "direction": direction,
                "change": round(change, 2),
                "first": values[0],
                "last": values[-1],
                "count": len(values),
            }
        }

    @tool
    def extract_field(self, args: dict) -> dict:
        """Extract a specific field from a list of dicts. Params: data (list of dicts), field"""
        data = args.get("data", [])
        field = args.get("field", "name")
        return {"result": [item.get(field) for item in data if isinstance(item, dict)]}


class Reporter(CAIAOServer):
    """Format and output results as reports."""
    name = "reporter"
    display_name = "Reporter"
    description = "Generate output: summary report, markdown table, pretty JSON"
    version = "1.0.0"

    @tool
    def summary_report(self, args: dict) -> dict:
        """Generate a plain-text summary report. Params: title, sections (dict of section_name: content)"""
        title = args.get("title", "Report")
        sections = args.get("sections", args.get("data", {}))
        lines = [f"{'='*50}", f"  {title}", f"{'='*50}", ""]
        if isinstance(sections, dict):
            for section_name, content in sections.items():
                lines.append(f"--- {section_name} ---")
                lines.append(str(content))
                lines.append("")
        else:
            lines.append(str(sections))
        return {"result": "\n".join(lines)}
    
    summary_report._caiao_input_schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Report title"},
            "data": {"type": "object", "description": "Data sections for the report"},
        }
    }

    @tool
    def markdown_table(self, args: dict) -> dict:
        """Format a list of dicts as a Markdown table. Params: data (list of dicts), title (optional)"""
        data = args.get("data", [])
        title = args.get("title", "")
        if not data or not isinstance(data, list):
            return {"error": "No data to format"}
        lines = []
        if title:
            lines.extend([f"### {title}", ""])
        headers = list(data[0].keys()) if isinstance(data[0], dict) else ["value"]
        lines.append("| " + " | ".join(str(h) for h in headers) + " |")
        lines.append("| " + " | ".join("---" for _ in headers) + " |")
        for row in data:
            if isinstance(row, dict):
                lines.append("| " + " | ".join(str(row.get(h, "")) for h in headers) + " |")
            else:
                lines.append(f"| {row} |")
        return {"result": "\n".join(lines)}

    @tool
    def json_pretty(self, args: dict) -> dict:
        """Pretty-print data as indented JSON"""
        return {"result": json.dumps(args.get("data", args), default=str, indent=2, ensure_ascii=False)}


# Register all demo servers
for server_cls in [DataSource, Calculator, TextProcessor, DataConverter, DataFilter, Aggregator, Analyzer, Reporter]:
    hub.register(server_cls())


# ── Graph Execution Engine ────────────────────────────────────────

class GraphExecutor:
    """Executes a CAIAO server graph defined by nodes and edges."""

    def __init__(self, hub_instance: Hub):
        self.hub = hub_instance

    def _topological_sort(
        self, nodes: list[dict], edges: list[dict]
    ) -> list[list[str]]:
        """Kahn's algorithm: return layers of parallel-executable node IDs."""
        node_ids = {n["id"] for n in nodes}
        in_degree: dict[str, int] = {nid: 0 for nid in node_ids}
        adj: dict[str, list[str]] = defaultdict(list)

        for edge in edges:
            src, tgt = edge["source"], edge["target"]
            if src in node_ids and tgt in node_ids:
                adj[src].append(tgt)
                in_degree[tgt] = in_degree.get(tgt, 0) + 1

        queue: deque[str] = deque(nid for nid in node_ids if in_degree[nid] == 0)
        layers: list[list[str]] = []
        visited: set[str] = set()

        while queue:
            layer = list(queue)
            queue.clear()
            layers.append(layer)
            for nid in layer:
                visited.add(nid)
                for neighbor in adj[nid]:
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        queue.append(neighbor)

        if len(visited) != len(node_ids):
            # Cycle detected — fall back to sequential execution
            remaining = node_ids - visited
            if remaining:
                layers.append(list(remaining))

        return layers

    def _resolve_inputs(
        self,
        node: dict,
        edges: list[dict],
        context: dict[str, dict],
        input_params: dict[str, Any],
    ) -> dict[str, Any]:
        """Merge upstream outputs and direct input params.

        Smart auto-mapping strategy:
        1. Explicit sourceField/targetField on edge takes priority.
        2. Without explicit mapping, upstream's "result" value is auto-assigned
           to the first unfilled expected parameter (detected from input_schema
           or source code analysis).
        3. If only one upstream value exists and multiple params are unfilled,
           the single value is broadcast to all unfilled params (useful for
           square/double operations).
        """
        args: dict[str, Any] = dict(input_params)
        upstream_values: list[Any] = []  # accumulated result values

        for edge in edges:
            if edge["target"] != node["id"]:
                continue
            source_id = edge["source"]
            source_data = context.get(source_id, {})
            if not source_data or "error" in source_data:
                continue

            source_field = edge.get("sourceField")
            target_field = edge.get("targetField")

            if source_field and target_field:
                if source_field in source_data:
                    args[target_field] = source_data[source_field]
            elif source_field:
                if source_field in source_data:
                    args[source_field] = source_data[source_field]
            elif target_field:
                if "result" in source_data:
                    args[target_field] = source_data["result"]
            else:
                if "result" in source_data:
                    upstream_values.append(source_data["result"])
                else:
                    for k, v in source_data.items():
                        if k not in ("error", "traceback", "status"):
                            args[k] = v

        if not upstream_values:
            return args

        # Discover expected parameter names for this tool
        tool_name = node.get("data", {}).get("tool", "")
        server_name = node.get("data", {}).get("serverName", node.get("data", {}).get("server", ""))
        expected_params = self._get_tool_param_names(server_name, tool_name)

        # Filter to only unfilled params
        unfilled = [p for p in expected_params if p not in args]

        if not unfilled:
            # No expected params (e.g. output-server-node) — still forward upstream data
            if upstream_values and "data" not in args:
                args["data"] = upstream_values[0] if len(upstream_values) == 1 else upstream_values
            return args

        # Strategy: assign upstream values to unfilled params, with type matching
        if len(upstream_values) == 1 and len(unfilled) > 1:
            # Single upstream value, multiple unfilled params -> broadcast with type awareness
            val = upstream_values[0]
            is_list_val = isinstance(val, list)
            is_dict_val = isinstance(val, dict)
            param_types = self._get_param_types(server_name, tool_name)
            for p in unfilled:
                ptype = param_types.get(p, "")
                # Type-aware assignment
                if ptype == "array" and is_list_val:
                    args[p] = val
                elif ptype == "object" and is_dict_val:
                    args[p] = val
                elif ptype in ("string", "number", "integer") and not is_list_val and not is_dict_val:
                    args[p] = val
                elif not ptype:
                    # No schema info, assign cautiously
                    args[p] = val
        else:
            # Sequential assignment
            for i, p in enumerate(unfilled):
                if i < len(upstream_values):
                    args[p] = upstream_values[i]

        return args

    def _get_tool_param_names(self, server_name: str, tool_name: str) -> list[str]:
        """Extract expected parameter names for a tool from input_schema or source code."""
        if not server_name or not tool_name:
            return []

        server = hub._servers.get(server_name)
        if not server:
            return []

        # Method 1: from input_schema (list_tools)
        for t in server.list_tools():
            if t["name"] == tool_name:
                props = t.get("input_schema", {}).get("properties", {})
                if props:
                    return list(props.keys())

        # Method 2: from _caiao_input_schema on the handler
        tool_info = server._tools.get(tool_name)
        if tool_info:
            handler = tool_info.get("handler")
            if handler:
                schema = getattr(handler, '_caiao_input_schema', None)
                if schema and schema.get("properties"):
                    return list(schema["properties"].keys())

        # Method 3: source code analysis
        if tool_info:
            handler = tool_info.get("handler")
            if handler:
                try:
                    import inspect, re
                    src = inspect.getsource(handler)
                    matches = re.findall(r'args\[["\']([^"\']+)["\']\]', src)
                    return list(dict.fromkeys(matches))
                except Exception:
                    pass

        return []

    def _get_param_types(self, server_name: str, tool_name: str) -> dict[str, str]:
        """Get parameter type info from input_schema (e.g. {'numbers': 'array', 'threshold': 'number'})."""
        if not server_name or not tool_name:
            return {}
        server = hub._servers.get(server_name)
        if not server:
            return {}
        tool_info = server._tools.get(tool_name)
        if not tool_info:
            return {}
        handler = tool_info.get("handler")
        if handler:
            schema = getattr(handler, '_caiao_input_schema', None)
            if schema and schema.get("properties"):
                return {k: v.get("type", "") for k, v in schema["properties"].items()}
        return {}

    async def execute(
        self,
        nodes: list[dict],
        edges: list[dict],
        node_inputs: dict[str, dict] | None = None,
    ):
        """Execute graph, yielding SSE events."""
        node_inputs = node_inputs or {}
        node_map: dict[str, dict] = {n["id"]: n for n in nodes}
        layers = self._topological_sort(nodes, edges)
        context: dict[str, dict] = {}

        total_layers = len(layers)
        total_nodes = sum(len(l) for l in layers)
        completed = 0

        yield self._sse_event("start", {
            "totalNodes": total_nodes,
            "totalLayers": total_layers,
        })

        for layer_idx, layer in enumerate(layers):
            for node_id in layer:
                node = node_map.get(node_id)
                if node is None:
                    continue
                node_type = node.get("type", "")
                # input-server-node: inject user input data
                if node_type == "input-server-node":
                    data = node_inputs.get(node_id, {})
                    yield self._sse_event("node_start", {
                        "node_id": node_id,
                        "node_name": node.get("data", {}).get("name", node_id),
                    })
                    yield self._sse_event("node_complete", {
                        "node_id": node_id,
                        "status": "ok",
                        "result": data,
                    })
                    context[node_id] = data
                    completed += 1
                    continue
                # output-server-node: collect all upstream results
                if node_type == "output-server-node":
                    upstream = self._resolve_inputs(node, edges, context, {})
                    yield self._sse_event("node_start", {
                        "node_id": node_id,
                        "node_name": node.get("data", {}).get("name", node_id),
                    })
                    yield self._sse_event("node_complete", {
                        "node_id": node_id,
                        "status": "ok",
                        "result": upstream,
                    })
                    context[node_id] = upstream
                    completed += 1
                    continue

            # Execute layer nodes in parallel
            tasks = []
            task_node_ids = []
            for node_id in layer:
                node = node_map.get(node_id)
                if node is None:
                    continue
                node_type = node.get("type", "")
                if node_type in ("input-server-node", "output-server-node"):
                    continue
                yield self._sse_event("node_start", {
                    "node_id": node_id,
                    "node_name": node.get("data", {}).get("name", node_id),
                })
                inputs = self._resolve_inputs(
                    node, edges, context, node_inputs.get(node_id, {})
                )
                tasks.append(self._execute_node(node_id, node, inputs))
                task_node_ids.append(node_id)

            results = await asyncio.gather(*tasks, return_exceptions=True)

            for node_id, result in zip(task_node_ids, results):
                if isinstance(result, Exception):
                    context[node_id] = {"error": str(result)}
                    completed += 1
                    yield self._sse_event("node_error", {
                        "node_id": node_id,
                        "error": str(result),
                        "progress": {"completed": completed, "total": total_nodes},
                    })
                else:
                    context[node_id] = result
                    completed += 1
                    # Add execution timing if available
                    duration_ms = result.get("_duration_ms") if isinstance(result, dict) else None
                    event_data: dict = {
                        "node_id": node_id,
                        "status": "ok",
                        "result": result,
                        "progress": {"completed": completed, "total": total_nodes},
                    }
                    if duration_ms is not None:
                        event_data["duration_ms"] = duration_ms
                    yield self._sse_event("node_complete", event_data)

        yield self._sse_event("complete", {
            "data": context,
            "totalNodes": total_nodes,
        })

    async def _execute_node(
        self, node_id: str, node: dict, inputs: dict
    ) -> dict:
        """Execute a single node's tool call."""
        server_name = node.get("data", {}).get("serverName", node.get("data", {}).get("server", ""))
        tool_name = node.get("data", {}).get("tool", "")

        if not tool_name:
            return {"error": f"No tool configured for node {node_id}"}

        logger.info(f"Executing node {node_id}: {server_name}.{tool_name}({inputs})")

        # Profile execution time
        import time
        t_start = time.perf_counter()
        result = self.hub.call_tool(tool_name, inputs)
        elapsed_ms = round((time.perf_counter() - t_start) * 1000, 1)
        if isinstance(result, dict):
            result["_duration_ms"] = elapsed_ms
        return result

    @staticmethod
    def _sse_event(event_type: str, data: dict) -> str:
        return f"event: {event_type}\ndata: {json.dumps(data, default=str)}\n\n"


graph_executor = GraphExecutor(hub)


# ── Pydantic Models ───────────────────────────────────────────────

class FlowSaveRequest(BaseModel):
    id: int | None = None
    name: str
    description: str | None = None
    nodes: list[dict]
    edges: list[dict]
    viewport: dict | None = None
    data: dict | None = None
    is_template: bool = False
    tags: list[str] | None = None


class GraphRunRequest(BaseModel):
    graph_nodes: list[dict]  # what frontend sends
    graph_edges: list[dict]
    input_data: dict | None = None


class MergeRequest(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    new_server_name: str
    new_server_description: str = ""


class ToolInfo(BaseModel):
    name: str
    description: str
    input_schema: dict = {}


class ServerInfo(BaseModel):
    name: str
    display_name: str = ""
    description: str
    version: str
    tools: list[ToolInfo]
    status: str


# ── API Endpoints ─────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "servers": len(hub.get_status())}


@app.get("/api/servers")
async def list_servers() -> list[ServerInfo]:
    """List all discovered servers with their tools."""
    servers: list[ServerInfo] = []
    statuses = hub.get_status()

    for server_name, status in statuses.items():
        server = hub._servers.get(server_name)
        if server:
            metadata = server.get_metadata()
            tools = [
                ToolInfo(name=t["name"], description=t["description"], input_schema=t.get("input_schema", {}))
                for t in server.list_tools()
            ]
            servers.append(ServerInfo(
                name=metadata["name"],
                display_name=getattr(server, "display_name", metadata.get("display_name", "")),
                description=metadata.get("description", ""),
                version=metadata.get("version", "0.1.0"),
                tools=tools,
                status=status,
            ))

    # Also check subprocess servers
    for name, mgr in hub._subprocesses.items():
        try:
            mgr.ensure_running()
            tools_raw = mgr.list_tools()
            tools = [ToolInfo(name=t["name"], description=t.get("description", ""), input_schema=t.get("input_schema", {})) for t in tools_raw]
            servers.append(ServerInfo(
                name=name,
                description=f"Subprocess server: {name}",
                version="0.1.0",
                tools=tools,
                status=statuses.get(name, "unknown"),
            ))
        except Exception as e:
            logger.warning(f"Cannot get info for subprocess {name}: {e}")

    return servers


@app.get("/api/servers/{server_name}")
async def get_server(server_name: str) -> ServerInfo:
    """Get detailed info for a specific server."""
    server = hub._servers.get(server_name)
    if not server:
        raise HTTPException(status_code=404, detail=f"Server '{server_name}' not found")

    metadata = server.get_metadata()
    tools = [
        ToolInfo(name=t["name"], description=t["description"], input_schema=t.get("input_schema", {}))
        for t in server.list_tools()
    ]
    return ServerInfo(
        name=metadata["name"],
        display_name=getattr(server, "display_name", metadata.get("display_name", "")),
        description=metadata.get("description", ""),
        version=metadata.get("version", "0.1.0"),
        tools=tools,
        status=hub.get_status().get(server_name, "unknown"),
    )


@app.post("/api/graph/run")
async def run_graph(req: GraphRunRequest):
    """Execute a graph and stream results via SSE."""
    # Convert frontend's flat input_data to backend's node_inputs format.
    # The frontend sends input_data as parsed JSON for the input-server-node.
    # We need to find the input-server node and map data to it.
    node_inputs: dict[str, dict] = {}
    if req.input_data:
        # Find the first node of type 'input-server-node' and assign inputs to it
        for node in req.graph_nodes:
            if node.get("type") == "input-server-node":
                node_inputs[node["id"]] = dict(req.input_data)
                break
        # If no input-server-node found, assign to all nodes as fallback
        if not node_inputs and req.graph_nodes:
            first_id = req.graph_nodes[0]["id"]
            node_inputs[first_id] = dict(req.input_data)

    async def event_stream():
        async for event in graph_executor.execute(req.graph_nodes, req.graph_edges, node_inputs):
            yield event

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/graph/validate")
async def validate_graph(req: GraphRunRequest):
    """Validate graph topology."""
    try:
        layers = graph_executor._topological_sort(req.graph_nodes, req.graph_edges)
        has_cycle = sum(len(l) for l in layers) != len(req.graph_nodes)
        return {
            "valid": not has_cycle,
            "hasCycle": has_cycle,
            "layerCount": len(layers),
            "layers": layers,
            "totalNodes": len(req.graph_nodes),
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


@app.post("/api/flows")
async def save_flow(req: FlowSaveRequest):
    """Save a flow."""
    global _next_flow_id
    flow_id = req.id if req.id else _next_flow_id
    if flow_id >= _next_flow_id:
        _next_flow_id = flow_id + 1
    now = datetime.utcnow().isoformat() + "Z"
    _flows[flow_id] = {
        "id": flow_id,
        "name": req.name,
        "description": req.description or "",
        "nodes": req.nodes,
        "edges": req.edges,
        "viewport": req.viewport or {},
        "data": req.data or {},
        "is_template": req.is_template,
        "tags": req.tags or [],
        "created_at": now,
        "updated_at": now,
    }
    if flow_id not in _flow_order:
        _flow_order.append(flow_id)
    return _flows[flow_id]


@app.get("/api/flows")
async def list_flows():
    """List all saved flows."""
    return [
        {
            "id": fid,
            "name": _flows[fid]["name"],
            "description": _flows[fid].get("description", ""),
            "is_template": _flows[fid].get("is_template", False),
            "created_at": _flows[fid].get("created_at", ""),
            "updated_at": _flows[fid].get("updated_at", ""),
        }
        for fid in _flow_order if fid in _flows
    ]


@app.get("/api/flows/{flow_id}")
async def get_flow(flow_id: int):
    """Get a saved flow by ID."""
    flow = _flows.get(flow_id)
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    return flow


@app.put("/api/flows/{flow_id}")
async def update_flow(flow_id: int, req: FlowSaveRequest):
    """Update an existing flow."""
    if flow_id not in _flows:
        raise HTTPException(status_code=404, detail="Flow not found")
    now = datetime.utcnow().isoformat() + "Z"
    _flows[flow_id] = {
        "id": flow_id,
        "name": req.name,
        "description": req.description or "",
        "nodes": req.nodes,
        "edges": req.edges,
        "viewport": req.viewport or {},
        "data": req.data or {},
        "is_template": req.is_template,
        "tags": req.tags or [],
        "created_at": _flows[flow_id]["created_at"],
        "updated_at": now,
    }
    return _flows[flow_id]


@app.delete("/api/flows/{flow_id}")
async def delete_flow(flow_id: int):
    """Delete a flow."""
    if flow_id in _flows:
        del _flows[flow_id]
        if flow_id in _flow_order:
            _flow_order.remove(flow_id)
    return {"ok": True}


@app.post("/api/graph/merge")
async def merge_graph(req: MergeRequest):
    """Generate a merged server from selected subgraph."""
    server_names = list(set(
        n.get("data", {}).get("server", "") for n in req.nodes if n.get("data", {}).get("server")
    ))
    tool_names = list(set(
        n.get("data", {}).get("tool", "") for n in req.nodes if n.get("data", {}).get("tool")
    ))

    # Generate merged server code
    code_lines = [
        '"""Auto-generated merged CAIAO server.',
        f'   Name: {req.new_server_name}',
        f'   Source servers: {", ".join(server_names)}',
        '"""',
        "",
        "from caiao_lightweight.server import CAIAOServer, tool",
        "",
        "",
        f"class {_to_class_name(req.new_server_name)}(CAIAOServer):",
        f'    name = "{req.new_server_name}"',
        f'    description = "{req.new_server_description}"',
        '    version = "0.1.0"',
        "",
        "    @tool",
        f"    def {req.new_server_name}_pipeline(self, args: dict) -> dict:",
        f'        """Execute merged pipeline: {" → ".join(tool_names)}"""',
        "        from caiao_lightweight.hub import Hub",
        "        hub = Hub()",
    ]

    # Add imports and registrations for each server
    for srv_name in server_names:
        code_lines.append(f"        from servers.{srv_name} import {_to_class_name(srv_name)}")
        code_lines.append(f"        hub.register({_to_class_name(srv_name)}())")

    code_lines.append("")
    code_lines.append("        context = {}")

    # Generate execution steps
    for edge in req.edges:
        src_node = next((n for n in req.nodes if n["id"] == edge["source"]), None)
        tgt_node = next((n for n in req.nodes if n["id"] == edge["target"]), None)
        if src_node and tgt_node:
            src_tool = src_node.get("data", {}).get("tool", "unknown")
            tgt_tool = tgt_node.get("data", {}).get("tool", "unknown")
            code_lines.append(f"        # {src_tool} → {tgt_tool}")

    code_lines.extend([
        "        # TODO: Complete the pipeline execution logic",
        "        return {'status': 'ok', 'context': context}",
        "",
        "",
        "if __name__ == '__main__':",
        f"    server = {_to_class_name(req.new_server_name)}()",
        "    server.run_cli()",
    ])

    return {
        "serverName": req.new_server_name,
        "sourceServers": server_names,
        "tools": tool_names,
        "code": "\n".join(code_lines),
    }


def _to_class_name(name: str) -> str:
    """Convert snake_case to PascalCase."""
    return "".join(word.capitalize() for word in name.replace("-", "_").split("_"))


# ── Startup ───────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    logger.info(f"CAIAO Visual Platform starting with {len(hub.get_status())} servers")
    for name, status in hub.get_status().items():
        logger.info(f"  Server: {name} — {status}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
