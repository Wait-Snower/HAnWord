import subprocess
import sys
import unittest
from pathlib import Path

from analyzer import analyze_password
from core import (
    PBKDF2_ITERATIONS,
    generate_password,
    normalize_context,
    normalize_text,
)


ROOT = Path(__file__).resolve().parent
ENTRYPOINT = ROOT / "HAnWord.py"


class CoreTests(unittest.TestCase):
    def test_password_is_deterministic(self):
        self.assertEqual(
            generate_password("你好", 16),
            generate_password("你好", 16),
        )

    def test_mode_and_context_change_password(self):
        self.assertNotEqual(
            generate_password("你好", 16, "github.com", "site"),
            generate_password("你好", 16, "微信", "app"),
        )

    def test_normalization_keeps_equivalent_input_stable(self):
        self.assertEqual(
            generate_password(" 你好 ", 16, " GitHub.com ", "site"),
            generate_password(normalize_text(" 你好 "), 16, normalize_text(" GitHub.com "), "site"),
        )

    def test_normalize_context_uses_stable_prefix(self):
        self.assertEqual(normalize_context("device", "工作电脑"), "device:工作电脑")
        self.assertEqual(normalize_context("purpose", " 邮箱 "), "purpose:邮箱")

    def test_password_contains_all_required_categories(self):
        password = generate_password("中国", 24, "example.com", "site")
        stats = analyze_password(password)

        self.assertEqual(stats["总长度"], 24)
        self.assertGreater(stats["大写字母"], 0)
        self.assertGreater(stats["小写字母"], 0)
        self.assertGreater(stats["数字"], 0)
        self.assertGreater(stats["特殊符号"], 0)

    def test_rejects_input_without_hanzi(self):
        with self.assertRaises(ValueError):
            generate_password("hello", 16)

    def test_rejects_mode_without_context(self):
        with self.assertRaises(ValueError):
            generate_password("你好", 16, "", "site")

    def test_pbkdf2_iterations_match_pwa(self):
        self.assertEqual(PBKDF2_ITERATIONS, 210_000)


class CliTests(unittest.TestCase):
    def run_cli(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(ENTRYPOINT), *args],
            text=True,
            capture_output=True,
            check=False,
        )

    def test_cli_success(self):
        result = self.run_cli("你好", "--length", "16", "--mode", "site", "--context", "github.com")
        self.assertEqual(result.returncode, 0)
        self.assertIn("密码：", result.stdout)
        self.assertIn("模式：网站", result.stdout)
        self.assertIn("上下文：github.com", result.stdout)

    def test_cli_invalid_args_fail_with_nonzero_exit(self):
        result = self.run_cli("hello", "--length", "16")
        self.assertEqual(result.returncode, 2)
        self.assertIn("请输入至少一个汉字", result.stderr)

    def test_cli_requires_mode_and_context_together(self):
        result = self.run_cli("你好", "--context", "github.com")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("提供 --context 时必须同时提供 --mode", result.stderr)


if __name__ == "__main__":
    unittest.main()
