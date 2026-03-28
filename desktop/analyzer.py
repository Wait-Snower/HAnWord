"""
分析模块：密码强度分析。
"""
from .config import UPPERCASE, LOWERCASE, DIGITS, SPECIAL_CHARS


def analyze_password(password: str) -> dict:
    """分析密码组成，返回各类字符数量。"""
    if not isinstance(password, str):
        raise TypeError(f"password 应为字符串，但得到 {type(password).__name__}")

    return {
        "总长度": len(password),
        "大写字母": sum(1 for c in password if c in UPPERCASE),
        "小写字母": sum(1 for c in password if c in LOWERCASE),
        "数字": sum(1 for c in password if c in DIGITS),
        "特殊符号": sum(1 for c in password if c in SPECIAL_CHARS),
    }
