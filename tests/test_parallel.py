"""Tests for CAIAO parallel execution module."""
from caiao._parallel import get_parallel_limit


class FakeLoadChecker:
    """Simulates system load for testing."""
    def __init__(self, load: float):
        self._load = load

    def __call__(self) -> float:
        return self._load


class TestGetParallelLimit:
    def test_single_request(self):
        """Single tool call should never be parallelized."""
        assert get_parallel_limit(1) == 1

    def test_zero_request(self):
        """Zero requests should return 1."""
        assert get_parallel_limit(0) == 1

    def test_low_load_allows_parallel(self):
        """Low load should allow parallel execution (up to cpu - 1)."""
        checker = FakeLoadChecker(0.1)
        limit = get_parallel_limit(16, load_checker=checker)
        assert 2 <= limit <= 16

    def test_high_load_falls_back_to_serial(self):
        """Very high system load should fall back to serial execution."""
        checker = FakeLoadChecker(1000.0)
        assert get_parallel_limit(10, load_checker=checker) == 1

    def test_request_respected(self):
        """Limit should not exceed requested count."""
        checker = FakeLoadChecker(0.0)
        limit = get_parallel_limit(2, load_checker=checker)
        assert limit <= 2

    def test_load_checker_exception(self):
        """If load checker raises, should fall back to safe default."""

        def broken_checker() -> float:
            raise RuntimeError("Broken")

        limit = get_parallel_limit(10, load_checker=broken_checker)
        assert 1 <= limit <= 4

    def test_moderate_load_reduces_concurrency(self):
        """Moderate load should reduce but not eliminate concurrency."""
        checker = FakeLoadChecker(2.0)
        limit = get_parallel_limit(16, load_checker=checker)
        assert 1 <= limit <= 16
