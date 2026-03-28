"""
核心模块：密码生成逻辑。
"""
import hashlib
import unicodedata
from config import UPPERCASE, LOWERCASE, DIGITS, SPECIAL_CHARS


CONTEXT_MODES = {
    "device": "device",
    "app": "app",
    "site": "site",
    "purpose": "purpose",
}
PBKDF2_ITERATIONS = 210_000
PBKDF2_HASH = "sha256"


def normalize_text(text: str) -> str:
    """统一输入格式，避免视觉相同的文本产生不同结果。"""
    if not isinstance(text, str):
        raise TypeError(f"text 应为字符串，但得到 {type(text).__name__}")
    return unicodedata.normalize("NFKC", text).strip()


def normalize_context(mode: str = "", context: str = "") -> str:
    """把模式和上下文统一编码为稳定字符串。"""
    if not isinstance(mode, str):
        raise TypeError(f"mode 应为字符串，但得到 {type(mode).__name__}")
    if not isinstance(context, str):
        raise TypeError(f"context 应为字符串，但得到 {type(context).__name__}")

    normalized_mode = normalize_text(mode).lower()
    normalized_context = normalize_text(context)

    if not normalized_mode and not normalized_context:
        return ""
    if not normalized_mode:
        normalized_mode = "purpose"
    if normalized_mode not in CONTEXT_MODES:
        raise ValueError("mode 必须是 device、app、site、purpose 之一")
    if not normalized_context:
        raise ValueError("提供 mode 时必须同时提供非空 context")

    return f"{CONTEXT_MODES[normalized_mode]}:{normalized_context}"


def hanzi_to_seed(text: str) -> int:
    """兼容辅助函数：将规范化文本映射为 SHA-256 整数。"""
    normalized = normalize_text(text)
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    return int(digest, 16)


def _contains_hanzi(text: str) -> bool:
    return any('一' <= char <= '鿿' for char in text)


def _derive_bytes(hanzi_text: str, normalized_context: str, size: int) -> bytes:
    password = normalize_text(hanzi_text).encode("utf-8")
    salt = f"HAnWordPWA::{normalized_context}".encode("utf-8")
    return hashlib.pbkdf2_hmac(PBKDF2_HASH, password, salt, PBKDF2_ITERATIONS, dklen=size)


def generate_password(hanzi_text: str, length: int = 16, context: str = "", mode: str = "") -> str:
    """根据输入汉字生成一个确定性的密码。"""
    if not isinstance(hanzi_text, str):
        raise TypeError(f"hanzi_text 应为字符串，但得到 {type(hanzi_text).__name__}")
    if not isinstance(length, int):
        raise TypeError(f"length 应为整数，但得到 {type(length).__name__}")
    if not isinstance(context, str):
        raise TypeError(f"context 应为字符串，但得到 {type(context).__name__}")
    if not isinstance(mode, str):
        raise TypeError(f"mode 应为字符串，但得到 {type(mode).__name__}")

    if length < 8:
        raise ValueError("密码长度不能小于 8 位")

    normalized_hanzi = normalize_text(hanzi_text)
    if not normalized_hanzi:
        raise ValueError("请输入至少一个汉字")
    if not _contains_hanzi(normalized_hanzi):
        raise ValueError("请输入至少一个汉字")

    normalized_context = normalize_context(mode, context)
    derived = _derive_bytes(normalized_hanzi, normalized_context, max(length * 4, 64))

    password_list = [
        UPPERCASE[derived[0] % len(UPPERCASE)],
        LOWERCASE[derived[1] % len(LOWERCASE)],
        DIGITS[derived[2] % len(DIGITS)],
        SPECIAL_CHARS[derived[3] % len(SPECIAL_CHARS)],
    ]

    all_chars = UPPERCASE + LOWERCASE + DIGITS + SPECIAL_CHARS
    for i in range(4, length):
        password_list.append(all_chars[derived[i] % len(all_chars)])

    for i in range(len(password_list) - 1, 0, -1):
        swap_index = derived[length + i] % (i + 1)
        password_list[i], password_list[swap_index] = password_list[swap_index], password_list[i]

    return "".join(password_list)
