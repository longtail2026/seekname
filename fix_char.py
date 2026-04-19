with open(r'c:\seekname\name_wuxing.sql','r',encoding='utf-8') as f:
    content = f.read()
# Quote char in INSERT column list (only the first one, the rest are data values)
content = content.replace('INSERT INTO name_wuxing (char, wuxing) VALUES','INSERT INTO name_wuxing ("char", wuxing) VALUES', 1)
# Quote char in CREATE INDEX
content = content.replace('ON name_wuxing(char)','ON name_wuxing("char")')
with open(r'c:\seekname\name_wuxing.sql','w',encoding='utf-8',newline='') as f:
    f.write(content)
print('Done')
