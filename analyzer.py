"""
分析模块：密码强度分析。
"""
from config import UPPERCASE, LOWERCASE, DIGITS, SPECIAL_CHARS


def analyze_password(password: str) -> dict:
    """分析密码组成，返回各类字符数量。
    
    用法:
      stats = analyze_password("Ab1$efgh")
      # stats = {"总长度": 8, "大写字母": 1, ...}

    参数:
      password: 待分析密码字符串

    返回:
      字典，包含总长度、大写、小写、数字、特殊符号数量。
    
    异常:
      TypeError: 如果 password 不是字符串类型。
    """
    # TypeError: 参数类型检查
    if not isinstance(password, str):
        raise TypeError(f"password 应为字符串，但得到 {type(password).__name__}")
    
    # len(s) : 返回字符串长度
    # sum(genexpr) : 求和，常用于计数
    return {
        "总长度":   len(password),
        "大写字母": sum(1 for c in password if c in UPPERCASE),
        "小写字母": sum(1 for c in password if c in LOWERCASE),
        "数字":     sum(1 for c in password if c in DIGITS),
        "特殊符号": sum(1 for c in password if c in SPECIAL_CHARS),
    }
