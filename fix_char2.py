with open(r'c:\seekname\name_wuxing.sql','r',encoding='utf-8') as f:
    content = f.read()
# Fix all INSERT INTO lines - replace (char, wuxing) with ("char", wuxing)
import re
content = re.sub(r'INSERT INTO name_wuxing \(char, wuxing\) VALUES', 'INSERT INTO name_wuxing ("char", wuxing) VALUES', content)
with open(r'c:\seekname\name_wuxing.sql','w',encoding='utf-8',newline='') as f:
    f.write(content)
print('Done, fixed all occurrences')
