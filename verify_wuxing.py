import re

with open(r'c:\seekname\name_wuxing.sql', encoding='utf-8') as f:
    content = f.read()

# Extract all (char, wuxing) pairs
matches = re.findall(r"\('([^']+)',\s*'([^']+)'\)", content)
print(f'Total entries: {len(matches)}')

# Check for duplicates
char_to_wuxing = {}
conflicts = []
for char, wuxing in matches:
    if char in char_to_wuxing:
        if char_to_wuxing[char] != wuxing:
            conflicts.append((char, char_to_wuxing[char], wuxing))
    else:
        char_to_wuxing[char] = wuxing

print(f'Unique chars: {len(char_to_wuxing)}')
print(f'Conflicts: {len(conflicts)}')
if conflicts:
    for c, w1, w2 in conflicts:
        print(f'  CONFLICT: {c} -> {w1} vs {w2}')

# Distribution
dist = {}
for char, wuxing in char_to_wuxing.items():
    dist[wuxing] = dist.get(wuxing, 0) + 1
print('\nDistribution:')
for w in ['\u91d1','\u6728','\u6c34','\u706b','\u571f']:
    print(f'  {w}: {dist.get(w, 0)}')

print('\nSample by wuxing:')
for w in ['\u91d1','\u6728','\u6c34','\u706b','\u571f']:
    sample = [c for c, wx in char_to_wuxing.items() if wx == w][:10]
    print(f'  {w}: {sample}')
