// 批量修复 register/page.tsx 中的 e.target.style 类型错误（字符串替换）
const fs = require('fs');
const path = 'src/app/register/page.tsx';

let content = fs.readFileSync(path, 'utf-8');
const before = (content.match(/e\.target\.style|e\.currentTarget\.style/g) || []).length;
console.log('Before:', before);

// 1) onFocus/onBlur - input fields (6 occurrences)
content = content.replaceAll(
    'onFocus={(e) => (e.target.style.borderColor = "#E86A17")}',
    'onFocus={(e) => { (e.target as HTMLElement).style.borderColor = "#E86A17"; }}'
);
content = content.replaceAll(
    'onBlur={(e) => (e.target.style.borderColor = "#DDD0C0")}',
    'onBlur={(e) => { (e.target as HTMLElement).style.borderColor = "#DDD0C0"; }}'
);

// 2) onMouseEnter/Leave - Link text-decoration
content = content.replaceAll(
    'onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}',
    'onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}'
);
content = content.replaceAll(
    'onMouseLeave={(e) => (e.target.style.textDecoration = "none")}',
    'onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.textDecoration = "none"}'
);

// 3) onMouseEnter/Leave - return-home Link color
content = content.replaceAll(
    'onMouseEnter={(e) => (e.target.style.color = "#E86A17")}',
    'onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "#E86A17"}'
);
content = content.replaceAll(
    'onMouseLeave={(e) => (e.target.style.color = "#B0AAA0")}',
    'onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "#B0AAA0"}'
);

// 4) button multi-line currentTarget
content = content.replaceAll(
    `onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#E86A17")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#B0AAA0")
                  }`,
    `onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "#E86A17"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "#B0AAA0"}`
);

const after = (content.match(/e\.target\.style|e\.currentTarget\.style/g) || []).length;
console.log('After:', after);
fs.writeFileSync(path, content, 'utf-8');
console.log('Done!');
