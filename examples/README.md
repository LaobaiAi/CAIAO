# CAIAO Examples

Collection of runnable examples demonstrating CAIAO's two implementation paths.

## Calculator (MCP SDK)
- `calculator/server.py` — Standard MCP Server with add/subtract/multiply/divide
- Run standalone: `python examples/calculator/server.py`
- Or register with CAIAO Hub for lifecycle management

## Pipeline (Composite)
- `pipeline/README.md` — Demonstrates chaining tools into a single composite operation

## Lightweight Calculator
- `lightweight/server.py` — Same calculator, zero dependencies, in-process
- Run with: `python -c "from examples.lightweight.server import Calculator; ..."`
