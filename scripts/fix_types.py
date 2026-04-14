"""批量修复 register/page.tsx 中的 e.target.style 类型错误"""
import re

path = r'c:\seekname\src\app\register\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 统计修复前
count_before = len(re.findall(r'e\.target\.style|e\.currentTarget\.style', content))
print(f"修复前: {count_before} 处")

# 1. input onFocus/onBlur: e.target.style.XXX = "value"
# 匹配 onFocus={(e) => (e.target.style.borderColor = "#E86A17")}
content = re.sub(
    r'onFocus=\{(e\) => \(e\.target\.style\.(\w+) = "([^"]+)"\)\}',
    r'onFocus={(e) => { (e.target as HTMLElement).style.\1 = "\2"; }}',
    content
)
content = re.sub(
    r'onBlur=\{(e\) => \(e\.target\.style\.(\w+) = "([^"]+)"\)\}',
    r'onBlur={(e) => { (e.target as HTMLElement).style.\1 = "\2"; }}',
    content
)

# 2. Link onMouseEnter/Leave: e.target.style.textDecoration = "underline"
content = re.sub(
    r'onMouseEnter=\{(e\) => \(e\.target\.style\.(\w+) = "([^"]+)"\)\}',
    r'onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.\1 = "\2"}',
    content
)
content = re.sub(
    r'onMouseLeave=\{(e\) => \(e\.target\.style\.(\w+) = "([^"]+)"\)\}',
    r'onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.\1 = "\2"}',
    content
)

# 3. button onMouseEnter/Leave 多行格式 (e.currentTarget)
content = re.sub(
    r'onMouseEnter=\{(e)\s*=>\s*\n?\s*\(e\.currentTarget\.style\.color = "#E86A17"\)\s*\n?\s*\}',
    r'onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "#E86A17"}',
    content
)
content = re.sub(
    r'onMouseLeave=\{(e)\s*=>\s*\n?\s*\(e\.currentTarget\.style\.color = "#B0AAA0"\)\s*\n?\s*\}',
    r'onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "#B0AAA0"}',
    content
)

# 统计修复后
count_after = len(re.findall(r'e\.target\.style|e\.currentTarget\.style', content))
print(f"修复后: {count_after} 处")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
