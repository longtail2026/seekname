/**
 * 起名功能测试页面
 * 展示完整的四层过滤 + AI精排起名流程
 */

"use client";

import { useState } from "react";
import NamingForm from "@/components/naming/NamingForm";
import NameResultCard from "@/components/naming/NameResultCard";
import { NameCandidate, NamingResult } from "@/lib/naming-engine";
import { Wand2, Sparkles, BookOpen, Users, Shield, Zap, Download, Share2, Copy, CheckCircle } from "lucide-react";

export default function TestNamingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NamingResult | null>(null);
  const [selectedName, setSelectedName] = useState<NameCandidate | null>(null);
  const [copied, setCopied] = useState(false);

  // 处理表单提交
  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    setResult(null);
    setSelectedName(null);
    
    try {
      const response = await fetch("/api/name/generate-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setResult(result.data);
        if (result.data.candidates.length > 0) {
          setSelectedName(result.data.candidates[0]);
        }
      } else {
        alert(`起名失败: ${result.error}`);
      }
    } catch (error) {
      console.error("起名请求失败:", error);
      alert("起名请求失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 复制名字
  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 下载名字报告
  const downloadReport = () => {
    if (!selectedName) return;
    
    const report = `
名字报告：${selectedName.fullName}

基本信息：
- 全名：${selectedName.fullName}
- 拼音：${selectedName.pinyin}
- 五行：${selectedName.wuxing}
- 笔画：${selectedName.strokeCount}画
- 独特性：${selectedName.uniqueness === 'high' ? '独特小众' : selectedName.uniqueness === 'medium' ? '适中' : '常见'}

评分详情：
- 综合评分：${selectedName.score}/100
- 文化底蕴：${selectedName.scoreBreakdown.cultural}/100
- 常用度：${selectedName.scoreBreakdown.popularity}/100
- 音律和谐：${selectedName.scoreBreakdown.harmony}/100
- 安全性：${selectedName.scoreBreakdown.safety}/100

名字寓意：
${selectedName.meaning}

${selectedName.warnings.length > 0 ? `注意事项：\n${selectedName.warnings.join('\n')}` : ''}

${selectedName.sources.length > 0 ? `文化出处：\n${selectedName.sources.map(s => `《${s.book}》：${s.text}`).join('\n')}` : ''}

生成时间：${new Date().toLocaleString()}
    `.trim();
    
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedName.fullName}_名字报告.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 分享名字
  const shareName = () => {
    if (!selectedName) return;
    
    if (navigator.share) {
      navigator.share({
        title: `为您推荐的好名字：${selectedName.fullName}`,
        text: `名字：${selectedName.fullName}\n拼音：${selectedName.pinyin}\n寓意：${selectedName.meaning}`,
        url: window.location.href,
      });
    } else {
      copyName(`${selectedName.fullName} - ${selectedName.pinyin}\n${selectedName.meaning}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full backdrop-blur-sm mb-6">
              <Wand2 className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">四层过滤 + AI精排起名系统</h1>
            <p className="text-xl text-blue-100 mb-8">文化底蕴 + 真实人名数据 + 音律优化 + 安全过滤</p>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <BookOpen className="w-8 h-8 mx-auto mb-2" />
                <div className="text-lg font-semibold">典籍匹配</div>
                <div className="text-sm text-blue-100">百万级文化典籍库</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <div className="text-lg font-semibold">人名合规</div>
                <div className="text-sm text-blue-100">5600万真实人名库</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Zap className="w-8 h-8 mx-auto mb-2" />
                <div className="text-lg font-semibold">音律优化</div>
                <div className="text-sm text-blue-100">平仄声韵智能分析</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Shield className="w-8 h-8 mx-auto mb-2" />
                <div className="text-lg font-semibold">安全过滤</div>
                <div className="text-sm text-blue-100">谐音敏感词检测</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="container mx-auto px-4 py-12 -mt-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左侧：起名表单 */}
            <div className="lg:col-span-1">
              <NamingForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>

            {/* 右侧：结果展示 */}
            <div className="lg:col-span-2">
              {isLoading ? (
                <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6">
                    <Sparkles className="w-10 h-10 text-white animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">正在为您智能起名</h3>
                  <p className="text-gray-600 mb-8">正在执行四层过滤 + AI精排流程，请稍候...</p>
                  
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">典籍匹配层</span>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '25%' }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">人名合规层</span>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: '50%' }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">音律优化层</span>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: '75%' }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">AI精排层</span>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full animate-pulse" style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-8">
                  {/* 结果统计 */}
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">起名结果</h3>
                        <p className="text-gray-600">为您生成了 {result.candidates.length} 个优质名字</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">处理时间</div>
                        <div className="text-lg font-bold text-gray-900">{result.statistics.generationTime}ms</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <div className="text-2xl font-bold text-blue-600">{result.statistics.totalCharactersConsidered}</div>
                        <div className="text-sm text-gray-600">候选字符数</div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4">
                        <div className="text-2xl font-bold text-green-600">{result.statistics.totalClassicsEntriesMatched}</div>
                        <div className="text-sm text-gray-600">典籍匹配数</div>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-4">
                        <div className="text-2xl font-bold text-purple-600">{result.statistics.totalNameSamplesAnalyzed}</div>
                        <div className="text-sm text-gray-600">人名分析数</div>
                      </div>
                      <div className="bg-red-50 rounded-xl p-4">
                        <div className="text-2xl font-bold text-red-600">{result.statistics.safetyChecksPerformed}</div>
                        <div className="text-sm text-gray-600">安全检查数</div>
                      </div>
                    </div>
                  </div>

                  {/* 选中的名字详情 */}
                  {selectedName && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl shadow-xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">当前选择</h3>
                          <p className="text-gray-600">您已选择以下名字</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyName(selectedName.fullName)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                          >
                            {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? "已复制" : "复制"}
                          </button>
                          <button
                            onClick={downloadReport}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            下载报告
                          </button>
                          <button
                            onClick={shareName}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                            分享
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-center mb-6">
                        <div className="text-5xl font-bold text-gray-900 mb-2">{selectedName.fullName}</div>
                        <div className="text-2xl text-gray-600 font-medium">{selectedName.pinyin}</div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm font-medium text-gray-500 mb-1">名字寓意</div>
                            <div className="text-gray-700">{selectedName.meaning}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-500 mb-1">文化出处</div>
                            <div className="space-y-2">
                              {selectedName.sources.length > 0 ? (
                                selectedName.sources.map((source, i) => (
                                  <div key={i} className="text-sm text-gray-600 bg-white/50 rounded p-3">
                                    <div className="font-medium text-gray-700">{source.book}</div>
                                    <div className="mt-1 italic">"{source.text}"</div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-gray-500">暂无具体出处</div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm font-medium text-gray-500 mb-1">评分详情</div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700">文化底蕴</span>
                                <span className="font-medium">{selectedName.scoreBreakdown.cultural}/100</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700">常用度</span>
                                <span className="font-medium">{selectedName.scoreBreakdown.popularity}/100</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700">音律和谐</span>
                                <span className="font-medium">{selectedName.scoreBreakdown.harmony}/100</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700">安全性</span>
                                <span className="font-medium">{selectedName.scoreBreakdown.safety}/100</span>
                              </div>
                            </div>
                          </div>
                          {selectedName.warnings.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-amber-600 mb-1">注意事项</div>
                              <div className="space-y-1">
                                {selectedName.warnings.map((warning, i) => (
                                  <div key={i} className="text-sm text-amber-600">{warning}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 所有候选名字 */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">所有候选名字</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.candidates.map((candidate, index) => (
                        <NameResultCard
                          key={index}
                          candidate={candidate}
                          index={index}
                          onSelect={setSelectedName}
                          selected={selectedName?.fullName === candidate.fullName}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6">
                    <Wand2 className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">开始智能起名</h3>
                  <p className="text-gray-600 mb-8">填写起名需求，体验四层过滤 + AI精排的强大功能</p>
                  
                  <div className="max-w-md mx-auto space-y-6">
                    <div className="text-left space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">典籍匹配层</div>
                          <div className="text-sm text-gray-600">从百万级文化典籍中提取优美词汇</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">人名合规层</div>
                          <div className="text-sm text-gray-600">基于5600万真实人名数据过滤</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Zap className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">音律优化层</div>
                          <div className="text-sm text-gray-600">平仄声韵分析，保证名字顺口</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <Shield className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">安全过滤层</div>
                          <div className="text-sm text-gray-600">谐音敏感词检测，确保名字安全</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
