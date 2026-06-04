"""Tests for CAIAO CLI — command parsing and project scaffolding."""
import os
import sys
import tempfile
from caiao.cli.main import main, _print_usage


class TestCLIUsage:
    def test_no_args(self):
        """Running CLI with no args should print usage."""
        import io
        from contextlib import redirect_stdout

        buf = io.StringIO()
        with redirect_stdout(buf):
            main()
        output = buf.getvalue()
        assert "CAIAO CLI" in output
        assert "caiao init" in output

    def test_unknown_command(self):
        """Unknown commands should print usage."""
        import io
        from contextlib import redirect_stdout

        buf = io.StringIO()
        with redirect_stdout(buf):
            # Simulate argv
            old_argv = sys.argv
            sys.argv = ["caiao", "blargh"]
            try:
                main()
            finally:
                sys.argv = old_argv
        output = buf.getvalue()
        assert "Unknown" in output or "CAIAO CLI" in output


class TestCLIInit:
    def test_init_project(self):
        """caiao init should create project directory structure."""
        with tempfile.TemporaryDirectory() as tmpdir:
            old_cwd = os.getcwd()
            os.chdir(tmpdir)
            old_argv = sys.argv
            sys.argv = ["caiao", "init", "test_project"]
            try:
                main()
            finally:
                os.chdir(old_cwd)
                sys.argv = old_argv

            project_dir = os.path.join(tmpdir, "test_project")
            assert os.path.isdir(project_dir)
            assert os.path.isdir(os.path.join(project_dir, "servers"))
            assert os.path.isfile(os.path.join(project_dir, "README.md"))

    def test_init_existing_fails_gracefully(self):
        """Init to existing directory should print error."""
        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, "existing_project"))

            old_cwd = os.getcwd()
            os.chdir(tmpdir)
            old_argv = sys.argv
            sys.argv = ["caiao", "init", "existing_project"]
            try:
                main()
            finally:
                os.chdir(old_cwd)
                sys.argv = old_argv

            # Should not crash

    def test_init_no_name(self):
        """Init without a name should print usage."""
        import io
        from contextlib import redirect_stdout

        buf = io.StringIO()
        with redirect_stdout(buf):
            old_argv = sys.argv
            sys.argv = ["caiao", "init"]
            try:
                main()
            finally:
                sys.argv = old_argv
        assert "Usage" in buf.getvalue()


class TestCLINewServer:
    def test_new_server(self):
        """caiao new server should create server directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            old_cwd = os.getcwd()
            os.chdir(tmpdir)
            os.makedirs("servers")
            old_argv = sys.argv
            sys.argv = ["caiao", "new", "server", "my_solver"]
            try:
                main()
            finally:
                os.chdir(old_cwd)
                sys.argv = old_argv

            server_dir = os.path.join(tmpdir, "servers", "my_solver")
            assert os.path.isdir(server_dir)
            assert os.path.isfile(os.path.join(server_dir, "server.py"))
            assert os.path.isfile(os.path.join(server_dir, "caiao.yaml"))

    def test_new_server_bad_args(self):
        """'new' without proper args should print usage."""
        import io
        from contextlib import redirect_stdout

        buf = io.StringIO()
        with redirect_stdout(buf):
            old_argv = sys.argv
            sys.argv = ["caiao", "new"]
            try:
                main()
            finally:
                sys.argv = old_argv
        assert "Usage" in buf.getvalue()


class TestCLIDoctor:
    def test_doctor(self):
        """caiao doctor should print environment info."""
        import io
        from contextlib import redirect_stdout

        buf = io.StringIO()
        old_argv = sys.argv
        sys.argv = ["caiao", "doctor"]
        try:
            with redirect_stdout(buf):
                main()
        finally:
            sys.argv = old_argv
        output = buf.getvalue()
        assert "Python" in output
        assert "MCP SDK" in output or "NOT INSTALLED" in output
