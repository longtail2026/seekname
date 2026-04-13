"use client";

import { useState } from "react";
import { Sparkles, Calendar, User, Baby, Clock, BookOpen, Shield, Zap, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PersonalNamingPage() {
  const [formData, setFormData] = useState({
    surname: "",
    gender: "F",
    birthDate: "",
    birthTime: "",
    expectations: "",
    style: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/name/generate-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error || "起名失败，请稍后重试");
      }
    } catch (err) {
      setError("网络错误，请检查连接");
      console.error("起名请求错误:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFAF4] to-[#F0EBE3]">
      {/* 导航栏 */}
      <div className="container mx-auto px-4 py-6">
        <Link 
          href="/" 
          className="inline-flex items-center text-[#5C4A42] hover:text-[#C84A2A] transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          返回首页
        </Link>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 mx-auto mb-4" style={{ background: '#C9A84C', border: '1px solid #A68A3C' }}>
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              AI智能起名体验
            </h1>
            <p className="text-xl text-[#5C4A42] max-w-3xl mx-auto">
              融合易经五行、生辰八字、文化典籍与现代AI技术，为您生成吉祥好名
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* 左侧：表单 */}
            <div className="lg:col-span-2">
              <div className="ancient-card p-8">
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 flex items-center justify-center mr-4" style={{ background: '#F8F3EA', border: '1px solid #C9A84C' }}>
                    <User className="w-6 h-6 text-[#C9A84C]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#2C1810]">填写起名信息</h2>
                    <p className="text-[#5C4A42]">请提供基本信息，AI将为您生成个性化名字</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#5C4A42] mb-2">
                        <span className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          姓氏
                        </span>
                      </label>
                      <input
                        type="text"
                        name="surname"
                        value={formData.surname}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-[#C9A84C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent bg-white"
                        placeholder="请输入姓氏，如：张"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#5C4A42] mb-2">
                        <span className="flex items-center">
                          <Baby className="w-4 h-4 mr-2" />
                          性别
                        </span>
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-[#C9A84C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent bg-white"
                        required
                      >
                        <option value="F">女孩</option>
                        <option value="M">男孩</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#5C4A42] mb-2">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          出生日期
                        </span>
                      </label>
                      <input
                        type="date"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-[#C9A84C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#5C4A42] mb-2">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          出生时辰（可选）
                        </span>
                      </label>
                      <input
                        type="text"
                        name="birthTime"
                        value={formData.birthTime}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-[#C9A84C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent bg-white"
                        placeholder="如：子时、午时"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#5C4A42] mb-2">
                      <span className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-2" />
                        期望寓意
                      </span>
                    </label>
                    <textarea
                      name="expectations"
                      value={formData.expectations}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-[#C9A84C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent bg-white min-h-[100px]"
                      placeholder="请描述您对名字的期望，如：温柔诗意、大气阳刚、聪明伶俐等"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#5C4A42] mb-2">
                      <span className="flex items-center">
                        <Sparkles className="w-4 h-4 mr-2" />
                        风格偏好（可选）
                      </span>
                    </label>
                    <input
                      type="text"
                      name="style"
                      value={formData.style}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-[#C9A84C]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent bg-white"
                      placeholder="如：古典、现代、清新、文雅"
                    />
                  </div>

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 px-6 bg-gradient-to-r from-[#C84A2A] to-[#C9A84C] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          正在生成名字...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6 mr-3" />
                          立即生成名字
                          <ChevronRight className="ml-2 w-6 h-6" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {error && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：说明和特点 */}
            <div className="space-y-6">
              <div className="ancient-card p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 flex items-center justify-center mr-3" style={{ background: '#F8F3EA', border: '1px solid #C9A84C' }}>
                    <Shield className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#2C1810]">四层过滤保障</h3>
                </div>
                <ul className="space-y-3">
                  <li className="text-sm text-[#5C4A42] flex items-start">
                    <span className="w-2 h-2 rounded-full bg-[#C9A84C] mt-1 mr-2 flex-shrink-0" />
                    典籍匹配：从百万级文化典籍中提取优美词汇
                  </li>
                  <li className="text-sm text-[#5C4A42] flex items-start">
                    <span className="w-2 h-2 rounded-full bg-[#C9A84C] mt-1 mr-2 flex-shrink-0" />
                    人名合规：基于5600万真实人名库过滤生僻字
                  </li>
                  <li className="text-sm text-[#5C4A42] flex items-start">
                    <span className="w-2 h-2 rounded-full bg-[#C9A84C] mt-1 mr-2 flex-shrink-0" />
                    安全过滤：敏感词和谐音检测，避免不雅含义
                  </li>
                  <li className="text-sm text-[#5C4A42] flex items-start">
                    <span className="w-2 h-2 rounded-full bg-[#C9A84C] mt-1 mr-2 flex-shrink-0" />
                    AI精排：大模型组合润色，保证音律和谐
                  </li>
                </ul>
              </div>

              <div className="ancient-card p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 flex items-center justify-center mr-3" style={{ background: '#F8F3EA', border: '1px solid #C9A84C' }}>
                    <Zap className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#2C1810]">快速生成</h3>
                </div>
                <p className="text-sm text-[#5C4A42] mb-4">
                  AI智能算法，30秒内生成多个优质名字方案，每个名字都附带：
                </p>
                <ul className="space-y-2">
                  <li className="text-sm text-[#5C4A42]">✓ 完整姓名和拼音</li>
                  <li className="text-sm text-[#5C4A42]">✓ 五行属性和笔画数</li>
                  <li className="text-sm text-[#5C4A42]">✓ 文化出处（来自古籍）</li>
                  <li className="text-sm text-[#5C4A42]">✓ 综合评分和分项评分</li>
                  <li className="text-sm text-[#5C4A42]">✓ 重名风险提示</li>
                </ul>
              </div>

              <div className="ancient-card p-6 bg-gradient-to-br from-[#F8F3EA] to-[#F0EBE3]">
                <h3 className="text-lg font-semibold text-[#2C1810] mb-3">温馨提示</h3>
                <p className="text-sm text-[#5C4A42]">
                  本服务为免费体验版，生成的名字仅供参考。如需更专业的起名服务，包括详细的八字分析、五行补缺、个性化定制等，请联系我们的专业起名师。
                </p>
              </div>
            </div>
          </div>

          {/* 结果展示区域 */}
          {results && (
            <div className="mt-12">
              <div className="ancient-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-[#2C1810]">为您生成的名字</h2>
                    <p className="text-[#5C4A42]">
                      基于您的信息，AI生成了{results.candidates.length}个候选名字
                    </p>
                  </div>
                  <div className="flex items-center text-[#C9A84C]">
                    <Sparkles className="w-5 h-5 mr-2" />
                    <span className="font-semibold">AI智能生成</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {results.candidates.map((candidate: any, index: number) => (
                    <div
                      key={index}
                      className="ancient-card p-6 hover:border-[#C9A84C] transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="text-3xl font-bold text-[#2C1810] mb-1">{candidate.fullName}</div>
                          <div className="text-sm text-[#5C4A42]">{candidate.pinyin}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#C84A2A]">{candidate.score}</div>
                          <div className="text-xs text-[#5C4A42]">综合评分</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#5C4A42]">五行：</span>
                          <span className="font-medium">{candidate.wuxing}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#5C4A42]">笔画：</span>
                          <span className="font-medium">{candidate.strokeCount}画</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#5C4A42]">重名风险：</span>
                          <span className={`font-medium ${
                            candidate.uniqueness === "high" ? "text-green-600" :
                            candidate.uniqueness === "medium" ? "text-yellow-600" :
                            "text-red-600"
                          }`}>
                            {candidate.uniqueness === "high" ? "低" :
                             candidate.uniqueness === "medium" ? "中" : "高"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-[#C9A84C]/20">
                        <p className="text-sm text-[#5C4A42] mb-2">含义：{candidate.meaning}</p>
                        {candidate.sources && candidate.sources.length > 0 && (
                          <div className="text-xs text-[#5C4A42]">
                            <span className="font-medium">出处：</span>
                            {candidate.sources[0].book} - {candidate.sources[0].text.slice(0, 30)}...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
