import re

with open(r'c:\seekname\name_wuxing.sql', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print(f'Total lines: {len(lines)}')
print(f'Total bytes: {len(content)}')
print()
print('=== First 20 lines ===')
for l in lines[:20]:
    print(repr(l))
print()
print('=== Last 5 lines ===')
for l in lines[-5:]:
    print(repr(l))

# Extract entries
pattern = r"'\x01-\x10fff'\s*,\s*'"
pattern2 = r"'([^']+)'" + r"\s*,\s*'" + r"([^']+)'"
matches = re.findall(r"'([^']+)'" + r"',\s*'" + r"([^']+)'", content)
print(f'\nTotal INSERT entries found: {len(matches)}')
chars = [m[0] for m in matches]
print(f'Unique chars: {len(set(chars))}')

by_wuxing = {}
for m in matches:
    by_wuxing.setdefault(m[1], []).append(m[0])
for w in ['\u91d1','\u6728','\u6c34','\u706b','\u571f']:
    sample = by_wuxing.get(w, [])
    print(f'{w} ({len(sample)} chars): {sample[:15]}')
