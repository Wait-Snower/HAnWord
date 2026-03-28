"""
配置文件：存储常量和配置。
"""
import string

# 所有字符池
UPPERCASE = string.ascii_uppercase   # A-Z
LOWERCASE = string.ascii_lowercase   # a-z
DIGITS    = string.digits            # 0-9

# 特殊符号池（常见密码允许的符号）
SPECIAL_CHARS = "!@#$%^&*()-_=+[]{}|;:,.<>?"
