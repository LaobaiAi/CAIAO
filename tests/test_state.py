"""Tests for CAIAO state constants."""
from caiao._state import (
    GATEWAY_SERVER,
    KIND_ATOMIC_MCP,
    KIND_COMPOSITE,
    KIND_INFRASTRUCTURE,
    KIND_MERGED,
    PIPELINE_COMPLETE,
    PIPELINE_PARTIAL,
    START_MODE_EAGER,
    START_MODE_LAZY,
    STATE_ARCHIVED,
    STATE_COMPOSITE,
    STATE_CRASHED,
    STATE_HIBERNATING,
    STATE_REGISTERED,
    STATE_RUNNING,
    STATE_STARTING,
    STATE_STOPPED,
)


class TestStateConstants:
    def test_state_values(self):
        assert STATE_COMPOSITE == "composite"
        assert STATE_HIBERNATING == "hibernating"
        assert STATE_REGISTERED == "registered"
        assert STATE_STARTING == "starting"
        assert STATE_RUNNING == "running"
        assert STATE_CRASHED == "crashed"
        assert STATE_STOPPED == "stopped"
        assert STATE_ARCHIVED == "archived"

    def test_kind_values(self):
        assert KIND_ATOMIC_MCP == "atomic-mcp"
        assert KIND_COMPOSITE == "composite"
        assert KIND_INFRASTRUCTURE == "infrastructure"
        assert KIND_MERGED == "merged"

    def test_pipeline_values(self):
        assert PIPELINE_COMPLETE == "complete"
        assert PIPELINE_PARTIAL == "partial"

    def test_start_mode_values(self):
        assert START_MODE_LAZY == "lazy"
        assert START_MODE_EAGER == "eager"

    def test_gateway_server(self):
        assert GATEWAY_SERVER == "__gateway__"

    def test_all_states_unique(self):
        states = [
            STATE_COMPOSITE, STATE_HIBERNATING, STATE_REGISTERED, STATE_STARTING,
            STATE_RUNNING, STATE_CRASHED, STATE_STOPPED, STATE_ARCHIVED,
        ]
        assert len(states) == len(set(states))
