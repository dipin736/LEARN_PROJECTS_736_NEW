import os
import re
import ast
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
CORS(app)

def is_valid_key(key):
    return key and not key.startswith("your_openai_api_key") and key != "sk-placeholder"

api_key = os.getenv("OPENAI_API_KEY")
if not is_valid_key(api_key):
    print("⚠️ WARNING: Real OPENAI_API_KEY not set in .env. Running in Local Analyzer Mode.")
    openai_client = None
else:
    try:
        openai_client = OpenAI(api_key=api_key)
    except Exception as e:
        print(f"⚠️ Error initializing OpenAI client: {e}")
        openai_client = None

def get_openai_client():
    global openai_client
    key = os.getenv("OPENAI_API_KEY")
    if is_valid_key(key):
        try:
            return OpenAI(api_key=key)
        except Exception:
            return None
    return None

def analyze_code_locally(code: str, language: str = "python", focus: str = "all"):
    """
    Local static analysis engine when OpenAI API key is unavailable.
    Inspects syntax, security patterns, performance bottlenecks, and code style.
    """
    lines = code.split("\n")
    issues = []
    score_deductions = 0

    # 1. Security Analysis
    sec_patterns = [
        (r'\beval\s*\(', 'critical', 'Security Vulnerability: `eval()` detected', 'Avoid using `eval()` as it allows arbitrary code execution. Use safer alternatives like `ast.literal_eval()` or direct parsing.'),
        (r'\bexec\s*\(', 'critical', 'Security Vulnerability: `exec()` detected', 'Avoid `exec()` as it introduces severe code injection risks.'),
        (r'\bos\.system\s*\(', 'warning', 'Security Warning: Shell execution via `os.system()`', 'Prefer `subprocess.run(..., shell=False)` with argument arrays to prevent command injection.'),
        (r'(password|secret|api_key|token)\s*=\s*["\'][^"\']+["\']', 'warning', 'Security Risk: Hardcoded credential or API key', 'Store sensitive keys in `.env` environment variables using `os.getenv()`.'),
        (r'SELECT\s+.*\s+FROM\s+.*\+\s*\w+', 'critical', 'Security Vulnerability: Potential SQL Injection', 'Use parameterized queries / ORM placeholders instead of string concatenation in SQL queries.')
    ]

    for idx, line in enumerate(lines, 1):
        for pattern, severity, title, desc in sec_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                issues.append({
                    "line": idx,
                    "type": severity,
                    "title": title,
                    "description": desc,
                    "suggested_fix": f"# Line {idx}: Refactored for security\n" + line.replace("eval(", "ast.literal_eval(").replace("exec(", "# REMOVED EXEC: ")
                })
                score_deductions += 15 if severity == 'critical' else 8

    # 2. Python AST & Syntax Inspection
    if language.lower() == "python":
        try:
            parsed = ast.parse(code)
            
            # Check for docstrings in functions
            for node in ast.walk(parsed):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    if not ast.get_docstring(node):
                        issues.append({
                            "line": node.lineno,
                            "type": "info",
                            "title": f"Missing Docstring in `{node.name}()`",
                            "description": f"Function `{node.name}` lacks a docstring explanation.",
                            "suggested_fix": f'def {node.name}(...):\n    """Summary of {node.name} function."""'
                        })
                        score_deductions += 3

                elif isinstance(node, ast.ExceptHandler):
                    if node.type is None:
                        issues.append({
                            "line": node.lineno,
                            "type": "warning",
                            "title": "Bare `except:` clause",
                            "description": "Catching all exceptions with a bare `except:` can hide unexpected errors. Specify explicit exception types (e.g. `except Exception as e:`).",
                            "suggested_fix": "except Exception as e:\n    logger.error(f'Error occurred: {e}')"
                        })
                        score_deductions += 7
        except SyntaxError as syn_err:
            issues.append({
                "line": syn_err.lineno or 1,
                "type": "critical",
                "title": f"Syntax Error: {syn_err.msg}",
                "description": f"Invalid syntax on line {syn_err.lineno}: '{syn_err.text.strip() if syn_err.text else ''}'",
                "suggested_fix": f"# Fix syntax error at line {syn_err.lineno}"
            })
            score_deductions += 30

    # 3. Performance & Clean Code Patterns
    for idx, line in enumerate(lines, 1):
        if "print(" in line and language.lower() == "python":
            issues.append({
                "line": idx,
                "type": "info",
                "title": "Production Code Practice: Raw `print()` statement",
                "description": "Consider using Python's standard `logging` module instead of raw `print()` for production applications.",
                "suggested_fix": line.replace("print(", "logger.info(")
            })
            score_deductions += 2

        if len(line) > 100:
            issues.append({
                "line": idx,
                "type": "info",
                "title": "Code Style: Line length exceeds 100 characters",
                "description": "Line length is long. Consider splitting across multiple lines for better readability (PEP 8 standard).",
                "suggested_fix": line[:80] + " \\\n    " + line[80:]
            })
            score_deductions += 1

    # Calculate overall quality score
    quality_score = max(20, 100 - score_deductions)

    # Generate Refactored Code Sample
    refactored_code = code
    for issue in issues:
        if issue["type"] == "critical" and "eval" in issue["title"]:
            refactored_code = refactored_code.replace("eval(", "ast.literal_eval(")
        if "print(" in issue["title"]:
            refactored_code = refactored_code.replace("print(", "# logger.info(")

    key_takeaways = [
        f"Overall code quality score is {quality_score}/100.",
        f"Found {len(issues)} potential area(s) for improvement.",
        "Ensure all environment variables and secrets are loaded securely from .env files.",
        "Add explicit type hints and unit tests to ensure long-term code maintainability."
    ]

    return {
        "score": quality_score,
        "summary": f"Local Code Review completed for {language.capitalize()}. Identified {len(issues)} issue(s) across security, performance, and code quality.",
        "issues": issues,
        "refactored_code": refactored_code,
        "key_takeaways": key_takeaways,
        "mode": "local_analyzer"
    }

@app.route('/')
def index():
    return jsonify({
        "status": "online",
        "service": "AI Code Reviewer Backend API (Flask)",
        "endpoints": ["/api/health", "/api/review"]
    })

@app.route('/api/health', methods=['GET'])
def health():
    client = get_openai_client()
    return jsonify({
        "status": "healthy",
        "service": "AI Code Reviewer API",
        "openai_available": client is not None,
        "mode": "AI (OpenAI)" if client else "Local Analyzer (Offline)"
    })

@app.route('/api/review', methods=['POST'])
def review_code():
    data = request.get_json(silent=True) or {}
    code = data.get('code', '').strip()
    language = data.get('language', 'python').strip()
    focus = data.get('focus', 'all').strip()

    if not code:
        return jsonify({"error": "No code provided for review"}), 400

    client = get_openai_client()

    if client:
        try:
            system_prompt = """You are an expert Senior Software Engineer and Security Auditor.
Review the provided code snippet and return your analysis strictly as a valid JSON object matching this schema:
{
  "score": <number between 0 and 100>,
  "summary": "<2-3 sentence overview of code quality and main findings>",
  "issues": [
    {
      "line": <line_number or 1>,
      "type": "<critical|warning|info|security>",
      "title": "<short issue title>",
      "description": "<detailed explanation of the flaw or vulnerability>",
      "suggested_fix": "<corrected code snippet for this line/block>"
    }
  ],
  "refactored_code": "<the complete, clean, optimized, and refactored version of the code>",
  "key_takeaways": [
    "<actionable takeaway 1>",
    "<actionable takeaway 2>",
    "<actionable takeaway 3>"
  ]
}
Be constructive, accurate, and focus on security, performance, readability, and best practices. Do not wrap JSON in markdown formatting."""

            user_prompt = f"Language: {language}\nFocus Area: {focus}\n\nCode to review:\n```\n{code}\n```"

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2
            )

            raw_content = response.choices[0].message.content.strip()
            # Clean markdown code fence if returned
            if raw_content.startswith("```json"):
                raw_content = raw_content[7:]
            if raw_content.startswith("```"):
                raw_content = raw_content[3:]
            if raw_content.endswith("```"):
                raw_content = raw_content[:-3]

            parsed_json = json.loads(raw_content.strip())
            parsed_json["mode"] = "openai_gpt"
            return jsonify(parsed_json)

        except Exception as err:
            print(f"OpenAI API call failed: {err}. Falling back to Local Analyzer.")

    # Local Analyzer Fallback
    local_result = analyze_code_locally(code, language, focus)
    return jsonify(local_result)

if __name__ == '__main__':
    print("🚀 Starting AI Code Reviewer Flask API on http://127.0.0.1:5001")
    app.run(debug=True, port=5001)
