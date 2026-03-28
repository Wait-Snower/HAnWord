"""
汉字密码生成器 - 主程序入口。

支持两种运行模式：
1. 交互模式：python HAnWord.py
2. 命令行模式：python HAnWord.py <汉字> [--length 长度] [--mode 模式 --context 上下文]
"""
import argparse
import sys

from .core import CONTEXT_MODES, generate_password
from .ui import main


MODE_LABELS = {
    "device": "设备",
    "app": "应用",
    "site": "网站",
    "purpose": "其他用途",
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python HAnWord.py",
        description="根据汉字生成确定性密码。",
        add_help=True,
    )
    parser.add_argument("hanzi", nargs="?", help="包含汉字的输入文本")
    parser.add_argument("--length", type=int, default=16, help="密码长度，默认 16")
    parser.add_argument(
        "--mode",
        choices=tuple(CONTEXT_MODES.keys()),
        help="上下文模式：device、app、site、purpose",
    )
    parser.add_argument("--context", help="上下文内容，例如设备名、应用名、网站名")
    return parser


def run() -> int:
    parser = build_parser()
    try:
        args = parser.parse_args()
        if args.hanzi is None:
            main()
        else:
            if args.context and not args.mode:
                parser.error("提供 --context 时必须同时提供 --mode")
            if args.mode and not args.context:
                parser.error("提供 --mode 时必须同时提供 --context")

            pwd = generate_password(args.hanzi, args.length, args.context or "", args.mode or "")
            print(f"汉字：{args.hanzi}")
            if args.mode and args.context:
                print(f"模式：{MODE_LABELS[args.mode]}")
                print(f"上下文：{args.context}")
            print(f"密码：{pwd}")
        return 0
    except (ValueError, TypeError) as e:
        print(f"⚠  {e}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("\n⚠  程序已被用户中断。再见！")
        return 130


if __name__ == "__main__":
    sys.exit(run())
