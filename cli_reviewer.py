import sys
import json
from app import analyze_code_locally

def main():
    print("=" * 60)
    print(" ⚡ Enterprise AI Code Reviewer CLI Tool")
    print("=" * 60)

    if len(sys.argv) > 1:
        filepath = sys.argv[1]
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                code = f.read()
            lang = filepath.split('.')[-1]
            print(f"\n📂 Auditing file: {filepath} ({lang.upper()})")
        except Exception as e:
            print(f"❌ Error reading file: {e}")
            return
    else:
        print("\nPaste code to review (press Ctrl+Z then Enter on Windows to submit):")
        code = sys.stdin.read()
        lang = "python"

    if not code.strip():
        print("❌ No code provided.")
        return

    result = analyze_code_locally(code, language=lang)
    
    print("\n" + "=" * 60)
    print(f"📊 AUDIT RESULTS (Score: {result['score']}/100)")
    print(f"🛡️  Security Rating: {result['security_score']}/100")
    print(f"🛠️  Maintainability: {result['maintainability_score']}/100")
    print("=" * 60)
    print(f"\nSummary: {result['summary']}\n")

    print(f"🚨 ISSUES FOUND ({len(result['issues'])}):")
    for idx, issue in enumerate(result['issues'], 1):
        cwe = f" [{issue.get('cwe')}]" if issue.get('cwe') else ""
        print(f"\n  {idx}. [Line {issue['line']}] {issue['title']}{cwe}")
        print(f"     Type: {issue['type'].upper()}")
        print(f"     Details: {issue['description']}")
        if issue.get('suggested_fix'):
            print(f"     Fix: {issue['suggested_fix']}")

    print("\n⚡ REFACTORED CODE:")
    print("-" * 40)
    print(result['refactored_code'])
    print("-" * 40)

if __name__ == '__main__':
    main()
