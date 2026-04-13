/**
 * 起名表单组件
 * 支持两种输入模式：自然语言描述 或 结构化表单
 */

import { useState } from "react";
import { Wand2, FileText, Calendar, Clock, User, Heart, Sparkles, Loader2, BookOpen, Shield } from "lucide-react";

interface NamingFormProps {
  onSubmit: (data: {
    rawInput?: string;
    surname?: string;
    gender?: "M" | "F";
    birthDate?: string;
    birthTime?: string;
    expectations?: string;
    style?: string;
  }) => void;
  isLoading?: boolean;
}

export default function NamingForm({ onSubmit, isLoading = false }: NamingFormProps) {
  const [inputMode, setInputMode] = useState<"simple" | "advanced">("simple");
  const [rawInput, setRawInput] = useState("");
  
  // 结构化表单数据
  const [formData, setFormData] = useState({
    surname: "",
    gender: "" as "" | "M" | "F",
    birthDate: "",
    birthTime: "",
    expectations: "",
    style: "",
  });

  // 处理简单模式提交
  const handleSimpleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) {
      alert("请输入起名需求描述");
      return;
    }
    onSubmit({ rawInput: rawInput.trim() });
  };

  // 处理高级模式提交
  const handleAdvancedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.surname || !formData.gender || !formData.birthDate) {
      alert("请填写姓氏、性别和出生日期");
      return;
    }
    onSubmit({
      surname: formData.surname,
      gender: formData.gender,
      birthDate: formData.birthDate,
      birthTime: formData.birthTime || undefined,
      expectations: formData.expectations || undefined,
      style: formData.style || undefined,
    });
  };

  // 更新表单数据
  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 示例文本
  const examples = [
    "女孩，姓张，2025年3月15日出生，希望名字温柔诗意，喜欢水意象",
    "男孩，姓李，2024年8月20日出生，想要大气阳刚的名字，五行补火",
    "宝宝，姓王，2025年5月1日出生，希望名字有文化底蕴，出自诗经",
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      {/* 标题 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
          <Wand2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">智能起名</h2>
        <p className="text-gray-600">四层过滤 + AI精排，为您生成文化底蕴深厚、音律和谐的好名字</p>
      </div>

      {/* 输入模式切换 */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            inputMode === "simple"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setInputMode("simple")}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            自然语言描述
          </div>
        </button>
        <button
          className={`flex-1 py-3 text-center font-medium transition-colors ${
            inputMode === "advanced"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setInputMode("advanced")}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            结构化表单
          </div>
        </button>
      </div>

      {/* 简单模式 */}
      {inputMode === "simple" && (
        <form onSubmit={handleSimpleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              请描述您的起名需求
            </label>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="例如：女孩，姓张，2025年3月15日出生，希望名字温柔诗意，喜欢水意象"
              className="w-full h-40 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={5}
            />
            <p className="mt-2 text-sm text-gray-500">
              请尽量详细描述，包括：性别、姓氏、出生日期、期望风格、五行偏好等
            </p>
          </div>

          {/* 示例 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">参考示例：</h4>
            <div className="space-y-2">
              {examples.map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRawInput(example)}
                  className="w-full text-left p-3 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !rawInput.trim()}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                正在生成名字...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Wand2 className="w-5 h-5" />
                开始智能起名
              </div>
            )}
          </button>
        </form>
      )}

      {/* 高级模式 */}
      {inputMode === "advanced" && (
        <form onSubmit={handleAdvancedSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 姓氏 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  姓氏 *
                </div>
              </label>
              <input
                type="text"
                value={formData.surname}
                onChange={(e) => updateFormData("surname", e.target.value)}
                placeholder="请输入姓氏"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={2}
              />
            </div>

            {/* 性别 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                性别 *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateFormData("gender", "M")}
                  className={`flex-1 py-3 text-center rounded-xl border transition-colors ${
                    formData.gender === "M"
                      ? "bg-blue-50 text-blue-600 border-blue-600"
                      : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  男孩
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData("gender", "F")}
                  className={`flex-1 py-3 text-center rounded-xl border transition-colors ${
                    formData.gender === "F"
                      ? "bg-pink-50 text-pink-600 border-pink-600"
                      : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  女孩
                </button>
              </div>
            </div>

            {/* 出生日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  出生日期 *
                </div>
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => updateFormData("birthDate", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 出生时辰 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  出生时辰（可选）
                </div>
              </label>
              <select
                value={formData.birthTime}
                onChange={(e) => updateFormData("birthTime", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择时辰</option>
                <option value="子时">子时 (23:00-01:00)</option>
                <option value="丑时">丑时 (01:00-03:00)</option>
                <option value="寅时">寅时 (03:00-05:00)</option>
                <option value="卯时">卯时 (05:00-07:00)</option>
                <option value="辰时">辰时 (07:00-09:00)</option>
                <option value="巳时">巳时 (09:00-11:00)</option>
                <option value="午时">午时 (11:00-13:00)</option>
                <option value="未时">未时 (13:00-15:00)</option>
                <option value="申时">申时 (15:00-17:00)</option>
                <option value="酉时">酉时 (17:00-19:00)</option>
                <option value="戌时">戌时 (19:00-21:00)</option>
                <option value="亥时">亥时 (21:00-23:00)</option>
              </select>
            </div>
          </div>

          {/* 期望寓意 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                期望寓意（可选）
              </div>
            </label>
            <textarea
              value={formData.expectations}
              onChange={(e) => updateFormData("expectations", e.target.value)}
              placeholder="例如：希望名字温柔诗意、大气阳刚、有文化底蕴等"
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* 风格偏好 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              风格偏好（可选）
            </label>
            <div className="flex flex-wrap gap-2">
              {["温柔", "诗意", "大气", "文雅", "古典", "现代", "清新", "阳光", "智慧", "勇敢"].map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => updateFormData("style", style)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    formData.style === style
                      ? "bg-blue-50 text-blue-600 border-blue-600"
                      : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !formData.surname || !formData.gender || !formData.birthDate}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                正在生成名字...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                开始智能起名
              </div>
            )}
          </button>
        </form>
      )}

      {/* 技术优势说明 */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-4">我们的技术优势：</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">文化典籍数据库</div>
              <div className="text-xs text-gray-600">百万级典籍库，智能提取优美词汇</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">5600万人名库</div>
              <div className="text-xs text-gray-600">真实人名数据分析，避免生僻字</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Wand2 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">AI音律优化</div>
              <div className="text-xs text-gray-600">平仄声韵分析，保证名字顺口</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">安全过滤系统</div>
              <div className="text-xs text-gray-600">谐音敏感词检测，确保名字安全</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}