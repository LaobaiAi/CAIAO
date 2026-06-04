# Contributing to CAIAO

Thank you for your interest in CAIAO! This project's documentation has a dedicated contributor guide with full details:

> **📖 [`docs/05-dev-guides/贡献者指南.md`](docs/05-dev-guides/贡献者指南.md)**  
> Detailed Chinese guide covering branching strategy, Conventional Commits, code style, and PR workflow.

## Quick Rules

1. **Branch from `main`**, merge back to `main` — keep branches short-lived
2. **Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):**
   ```
   feat: add support for composite server pipelining
   fix: handle division by zero in calculator server
   docs: update README with quickstart examples
   ```
   Scopes: `hub`, `cli`, `lightweight`, `docs`, `examples`, `test`
3. **Code style** — PEP 8, 120 char line limit. Run `ruff check` before pushing.
4. **Write tests** — place them in `tests/`, matching the module you're testing. Run `pytest tests/` before opening a PR.
5. **PRs** — rebase onto `main` before opening, keep the diff focused.

## Development Setup

```bash
# Clone and install
git clone https://github.com/LaobaiAi/CAIAO.git
cd CAIAO
pip install -e caiao/
pip install pytest pytest-asyncio ruff mypy

# Run tests
python -m pytest tests/ -v

# Type check
mypy caiao/ caiao_lightweight/ --ignore-missing-imports

# Lint
ruff check caiao/ caiao_lightweight/ tests/
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
