"""
用户界面模块：交互式命令行。
"""
from .analyzer import analyze_password
from .core import generate_password


DEFAULT_LENGTH = 16
MODE_OPTIONS = {
    "1": ("device", "设备"),
    "2": ("app", "应用"),
    "3": ("site", "网站"),
    "4": ("purpose", "其他用途"),
}


def main():
    """交互式主函数，命令行运行时进入本模式。"""
    print("=" * 50)
    print("       汉字密码生成器")
    print("=" * 50)
    print("提示：相同的汉字和上下文输入每次都会生成完全相同的密码。\n")

    try:
        while True:
            try:
                hanzi = input("请输入汉字（输入 /exit 退出）：").strip()
            except EOFError:
                print("\n⚠  输入已结束（EOF），退出程序。")
                return

            if hanzi.lower() == "/exit":
                print("再见！")
                return

            if not hanzi:
                print("⚠  输入为空，请重新输入。\n")
                continue

            try:
                length_str = input(f"请输入密码长度（直接回车默认 {DEFAULT_LENGTH}）：").strip()
            except EOFError:
                print(f"\n⚠  输入已结束（EOF），使用默认长度 {DEFAULT_LENGTH}。")
                length_str = ""

            if length_str == "":
                length = DEFAULT_LENGTH
            else:
                try:
                    length = int(length_str)
                    if length < 8:
                        print(f"⚠  长度不能小于 8，使用默认长度 {DEFAULT_LENGTH}。")
                        length = DEFAULT_LENGTH
                except ValueError:
                    print(f"⚠  无效输入，使用默认长度 {DEFAULT_LENGTH}。")
                    length = DEFAULT_LENGTH

            print("请选择上下文模式：")
            print("  1. 设备")
            print("  2. 应用")
            print("  3. 网站")
            print("  4. 其他用途")
            print("  直接回车：不使用上下文")
            try:
                mode_choice = input("请输入模式编号：").strip()
            except EOFError:
                print("\n⚠  输入已结束（EOF），不使用上下文。")
                mode_choice = ""

            mode = ""
            mode_label = ""
            context = ""
            if mode_choice:
                if mode_choice not in MODE_OPTIONS:
                    print("⚠  无效模式，已忽略上下文。")
                else:
                    mode, mode_label = MODE_OPTIONS[mode_choice]
                    try:
                        context = input(f"请输入{mode_label}名称：").strip()
                    except EOFError:
                        print(f"\n⚠  输入已结束（EOF），{mode_label}留空。")
                        context = ""
                    if not context:
                        print("⚠  上下文为空，已忽略上下文。")
                        mode = ""
                        mode_label = ""

            try:
                password = generate_password(hanzi, length, context, mode)
                analysis = analyze_password(password)

                print("\n" + "─" * 50)
                print(f"  输入汉字：{hanzi}")
                if mode and context:
                    print(f"  模式：{mode_label}")
                    print(f"  上下文：{context}")
                print(f"  生成密码：{password}")
                print("  ─ 密码分析 ─")
                for key, val in analysis.items():
                    print(f"    {key}：{val}")
                print("─" * 50 + "\n")
                break

            except (ValueError, TypeError) as e:
                print(f"⚠  {e}\n")
                continue

    except KeyboardInterrupt:
        print("\n⚠  程序已被用户中断。再见！")
