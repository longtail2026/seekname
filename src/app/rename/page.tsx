"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { SITE_CONFIG } from "@/lib/config";

/**
 * 起名改名页
 * 复用首页"立即起名"的完整输入逻辑，但不显示画轴背景图片
 */
export default function RenamePage() {
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState<"男"|"女">("男");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // 标记是否正在使用 IME 输入法（如拼音）
  const [isComposing, setIsComposing] = useState(false);
  // 新增：八字推算 & 五行属性分析开关
  const [enableBazi, setEnableBazi] = useState(true);
  const [enableWuxing, setEnableWuxing] = useState(true);
   
  // 新增状态：多选项
  const [selectedExpectations, setSelectedExpectations] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // 定义相反的词语对
  const oppositeExpectationPairs: string[][] = [
    // 暂时没有定义相反的寓意词语
  ];
  
  const oppositeStylePairs = [
    ["古风典雅", "洋气国际"],
    ["古风典雅", "现代简约"],
    ["现代简约", "洋气国际"],
    ["大气豪迈", "温柔婉约"],
    ["稳重成熟", "可爱灵动"],
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim()) return;
    if (!birthDate) return;
    setIsLoading(true);
    // 携带完整参数跳转到起名页面（性别转 M/F，补充 category=personal）
    const genderCode = gender === "男" ? "M" : "F";
    const params = new URLSearchParams({
      surname,
      gender: genderCode,
      category: "personal",
      birthDate,
    });
    if (birthTime) params.set("birthTime", birthTime);
    if (selectedExpectations.length > 0) {
      params.set("expectations", selectedExpectations.join(","));
    }
    if (selectedStyles.length > 0) {
      params.set("style", selectedStyles.join(","));
    }
    if (selectedExpectations.length > 0) {
      params.set("intentions", JSON.stringify(selectedExpectations));
    }
    if (selectedStyles.length > 0) {
      params.set("styles", JSON.stringify(selectedStyles));
    }
    if (additionalNotes.trim()) params.set("additionalNotes", additionalNotes.trim());
    window.location.href = `/naming?${params.toString()}`;
  };

  // 统一的输入处理函数：提取中文部分（允许拼音输入法中途状态）
  const handleInput = (rawValue: string) => {
    const chineseOnly = rawValue.replace(/[^\u4e00-\u9fa5]/g, '');
    if (chineseOnly.length > 0) {
      return chineseOnly.slice(0, 2);
    }
    return rawValue.slice(0, 10);
  };

  // 处理取名寓意多选切换
  const handleExpectationToggle = (option: string) => {
    if (selectedExpectations.includes(option)) {
      setSelectedExpectations(selectedExpectations.filter(item => item !== option));
    } else {
      setSelectedExpectations([...selectedExpectations, option]);
    }
  };

  // 处理风格偏好多选切换
  const handleStyleToggle = (option: string) => {
    if (selectedStyles.includes(option)) {
      let newStyles = [...selectedStyles];
      const oppositePairs = oppositeStylePairs.filter(pair => 
        pair.includes(option)
      );
      oppositePairs.forEach(pair => {
        const oppositeOption = pair[0] === option ? pair[1] : pair[0];
        newStyles = newStyles.filter(item => item !== oppositeOption);
      });
      setSelectedStyles(newStyles);
    } else {
      let newStyles = [...selectedStyles];
      const oppositePairs = oppositeStylePairs.filter(pair => 
        pair.includes(option)
      );
      oppositePairs.forEach(pair => {
        const oppositeOption = pair[0] === option ? pair[1] : pair[0];
        newStyles = newStyles.filter(item => item !== oppositeOption);
      });
      newStyles.push(option);
      setSelectedStyles(newStyles);
    }
  };

  return (
    <div className="relative min-h-screen" style={{ paddingTop: 80, background: "linear-gradient(180deg, #FFFCF7 0%, #FFF8F0 100%)" }}>
      {/* 简约水墨装饰（无画轴） */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#2D1B0E]/4 to-transparent blur-3xl" />
        <div className="absolute bottom-40 -left-20 w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-[#D4941A]/4 to-transparent blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="w-8 h-[1px] bg-gradient-to-r from-transparent to-[#D4941A]" />
              <span className="text-[13px] tracking-[0.25em] text-[#D4941A] font-medium">起名改名 · AI 智能生成</span>
              <span className="w-8 h-[1px] bg-gradient-to-l from-transparent to-[#D4941A]" />
            </div>
            <h1
              className="text-[2rem] sm:text-[2.5rem] font-bold leading-[1.2] tracking-wide text-[#2D1B0E]"
              style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif" }}
            >
              输入信息，开启起名
            </h1>
            <p className="text-[14px] text-[#5A4334] mt-2">
              填写宝宝或个人信息，AI 将结合典籍与八字五行推荐吉祥好名
            </p>
          </div>

          {/* 起名表单 - 无画轴背景 */}
          <form onSubmit={handleSubmit} className="w-full">
            <div
              className="w-full rounded-xl p-6 sm:p-8 lg:p-10"
              style={{
                background: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(180,160,130,0.25)",
                boxShadow: "0 4px 24px rgba(44,24,16,0.06)",
              }}
            >
              {/* 第一行：姓氏 + 男/女 + 启用八字推算（grid等宽各1/3） */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  inputMode="text"
                  value={surname}
                  onChange={(e) => {
                    if (isComposing) { setSurname(e.target.value); return; }
                    setSurname(handleInput(e.target.value));
                  }}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={(e) => {
                    setIsComposing(false);
                    setSurname(handleInput((e.target as HTMLInputElement).value));
                  }}
                  placeholder="请输入您的姓氏"
                  className="w-full px-4 py-3 text-[15px] rounded-lg"
                  style={{ fontFamily: "'Noto Serif SC', serif", color: '#3D2B1F', background: 'rgba(255, 252, 245, 0.92)', border: '1px solid rgba(180,160,130,0.4)', outline: 'none' }}
                  autoComplete="off"
                />
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(180,160,130,0.4)' }}>
                  {(["男", "女"] as const).map((g) => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className="flex-1 px-4 py-3 text-[15px] font-medium transition-all duration-200"
                      style={{
                        background: gender === g ? (g === "男" ? "#4A90D9" : "#E870A0") : "rgba(255, 252, 245, 0.92)",
                        color: gender === g ? "#fff" : "#5A4334",
                        border: 'none', cursor: 'pointer', fontFamily: "'Noto Sans SC', sans-serif",
                      }}
                    >{g}</button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEnableBazi(!enableBazi)}
                  className="w-full px-2 py-3 text-[12px] rounded-lg transition-all duration-200"
                  style={{
                    background: enableBazi ? "rgba(212, 148, 26, 0.15)" : "rgba(180,160,130,0.15)",
                    color: enableBazi ? "#D4941A" : "#A09080",
                    border: `1px solid ${enableBazi ? "rgba(212, 148, 26, 0.4)" : "rgba(180,160,130,0.3)"}`,
                    cursor: 'pointer',
                    fontFamily: "'Noto Sans SC', sans-serif",
                    whiteSpace: 'nowrap',
                  }}
                >
                  {enableBazi ? "✓" : "✕"} 启用八字推算
                </button>
              </div>
              
              {/* 第二行：年月日 + 时分 + 启用五行属性（grid等宽各1/3） */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3 text-[15px] rounded-lg"
                  style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#2D1B0E', background: 'rgba(255, 252, 245, 0.92)', border: '1px solid rgba(180,160,130,0.4)', outline: 'none' }}
                />
                <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full px-4 py-3 text-[15px] rounded-lg"
                  style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#2D1B0E', background: 'rgba(255, 252, 245, 0.92)', border: '1px solid rgba(180,160,130,0.4)', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setEnableWuxing(!enableWuxing)}
                  className="w-full px-2 py-3 text-[12px] rounded-lg transition-all duration-200"
                  style={{
                    background: enableWuxing ? "rgba(232, 106, 23, 0.15)" : "rgba(180,160,130,0.15)",
                    color: enableWuxing ? "#E86A17" : "#A09080",
                    border: `1px solid ${enableWuxing ? "rgba(232, 106, 23, 0.4)" : "rgba(180,160,130,0.3)"}`,
                    cursor: 'pointer',
                    fontFamily: "'Noto Sans SC', sans-serif",
                    whiteSpace: 'nowrap',
                  }}
                >
                  {enableWuxing ? "✓" : "✕"} 启用五行属性
                </button>
              </div>
              
              {/* 第三行：语义多选框 */}
              <div className="mb-4">
                <div className="text-[14px] font-medium text-[#5A4334] mb-2">起名寓意（可多选）</div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    "平安健康", "聪明智慧", "事业有成", "富贵财富", "品德高尚",
                    "阳光开朗", "美丽俊俏", "勇敢坚强", "幸福美满", "才华艺术"
                  ].map((option) => (
                    <label key={option} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedExpectations.includes(option)}
                        onChange={() => handleExpectationToggle(option)}
                        className="w-3.5 h-3.5"
                      />
                      <span className="text-[13px] text-[#5A4334]">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* 第四行：风格偏好 */}
              <div className="mb-4">
                <div className="text-[14px] font-medium text-[#5A4334] mb-2">风格偏好（可多选）</div>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {[
                    "古风典雅", "现代简约", "清新自然", "大气豪迈", "温柔婉约",
                    "独特个性", "可爱灵动", "稳重成熟", "诗意浪漫", "洋气国际"
                  ].map((option) => (
                    <label key={option} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStyles.includes(option)}
                        onChange={() => handleStyleToggle(option)}
                        className="w-3.5 h-3.5"
                      />
                      <span className="text-[13px] text-[#5A4334]">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* 第五行：补充说明 */}
              <div className="mb-5">
                <input
                  type="text"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="补充说明（可不填）"
                  className="w-full px-4 py-2.5 text-[15px] rounded-lg"
                  style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#3D2B1F', background: 'rgba(255, 252, 245, 0.92)', border: '1px solid rgba(180,160,130,0.4)', outline: 'none' }}
                  autoComplete="off"
                />
              </div>
              
              {/* 立即起名按钮 */}
              <button
                type="submit"
                disabled={!surname.trim() || !birthDate || isLoading}
                className="w-full py-3.5 rounded-lg text-[16px] font-medium text-white transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#1a1a18',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  border: 'none',
                  cursor: surname.trim() && birthDate ? 'pointer' : 'not-allowed',
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    分析中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Sparkles className="w-5 h-5" />
                    立即起名
                  </span>
                )}
              </button>
            </div>

            {/* 已有用户数提示 */}
            <p className="text-sm text-[#B0AAA0] mt-5 text-center">
              已有 <span className="text-[#E86A17] font-semibold">{SITE_CONFIG.stats.totalUsers.toLocaleString()}</span> 位用户找到心仪好名
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}