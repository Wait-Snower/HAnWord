"""兼容入口：实际桌面程序位于 desktop/cli.py。"""
import sys

from desktop.cli import run


if __name__ == "__main__":
    sys.exit(run())
