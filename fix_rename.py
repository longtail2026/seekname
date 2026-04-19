with open(r'c:\seekname\name_wuxing.sql','r',encoding='utf-8') as f:
    content = f.read()

# Replace "char" column name with name_char everywhere
content = content.replace('"char"', 'name_char')
content = content.replace('name_wuxing_wuxing', 'idx_wuxing')

with open(r'c:\seekname\name_wuxing.sql','w',encoding='utf-8',newline='') as f:
    f.write(content)
print('Done')
