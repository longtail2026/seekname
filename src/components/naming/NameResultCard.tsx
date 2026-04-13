/**
 * 名字结果卡片组件
 * 用于展示起名引擎生成的名字结果
 */

import { Star, Award, BookOpen, Shield, Zap, Heart, TrendingUp, TrendingDown, CheckCircle, AlertCircle } from "lucide-react";
import { NameCandidate } from "@/lib/naming-engine";

interface NameResultCardProps {
  candidate: NameCandidate;
  index: number;
  onSelect?: (candidate: NameCandidate) => void;
  selected?: boolean;
}

export default function NameResultCard({ candidate, index, onSelect, selected }: NameResultCardProps) {
  // 格式化五行显示
  const formatWuxing = (wuxing: string) => {
    const wuxingColors: Record<string, string> = {
      '金': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      '木': 'text-green-600 bg-green-50 border-green-200',
      '水': 'text-blue-600 bg-blue-50 border-blue-200',
      '火': 'text-red-600 bg-red-50 border-red-200',
      '土': 'text-amber-600 bg-amber-50 border-amber-200',
    };
    
    return wuxing.split('').map((char, i) => {
      const colorClass = wuxingColors[char] || 'text-gray-600 bg-gray-50 border-gray-200';
      return (
        <span
          key={i}
          className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full border ${colorClass}`}
          title={`五行: ${char}`}
        >
          {char}
        </span>
      );
    });
  };

  // 格式化评分显示
  const renderScore = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100;
    let colorClass = '';
    
    if (percentage >= 80) colorClass = 'bg-green-500';
    else if (percentage >= 60) colorClass = 'bg-yellow-500';
    else colorClass = 'bg-red-500';
    
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${colorClass} rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-700">{score}</span>
      </div>
    );
  };

  // 格式化独特性显示
  const renderUniqueness = (uniqueness: string) => {
    const config = {
      high: { color: 'text-green-600 bg-green-50', icon: TrendingUp, label: '独特小众' },
      medium: { color: 'text-yellow-600 bg-yellow-50', icon: TrendingUp, label: '适中' },
      low: { color: 'text-red-600 bg-red-50', icon: TrendingDown, label: '常见' },
    };
    
    const { color, icon: Icon, label } = config[uniqueness as keyof typeof config] || config.medium;
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        <span>{label}</span>
      </div>
    );
  };

  // 格式化警告显示
  const renderWarnings = (warnings: string[]) => {
    if (warnings.length === 0) return null;
    
    return (
      <div className="mt-2 space-y-1">
        {warnings.map((warning, i) => (
          <div key={i} className="flex items-start gap-1 text-xs text-amber-600">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{warning}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      className={`relative bg-white rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
        selected 
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-100' 
          : 'border-gray-200 hover:border-blue-300'
      }`}
      onClick={() => onSelect?.(candidate)}
    >
      {/* 排名徽章 */}
      <div className="absolute -top-2 -left-2">
        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-lg">
          <span className="text-sm font-bold">{index + 1}</span>
        </div>
      </div>
      
      {/* 选择指示器 */}
      {selected && (
        <div className="absolute -top-2 -right-2">
          <CheckCircle className="w-6 h-6 text-green-500 bg-white rounded-full" />
        </div>
      )}
      
      <div className="space-y-4">
        {/* 名字和拼音 */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-1">{candidate.fullName}</h3>
          <div className="text-lg text-gray-600 font-medium">{candidate.pinyin}</div>
        </div>
        
        {/* 五行和笔画 */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">五行:</span>
            <div className="flex gap-1">{formatWuxing(candidate.wuxing)}</div>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">笔画:</span>
            <span className="text-sm font-medium text-gray-700">{candidate.strokeCount}画</span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">独特性:</span>
            {renderUniqueness(candidate.uniqueness)}
          </div>
        </div>
        
        {/* 含义 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-gray-700">名字寓意</span>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{candidate.meaning}</p>
        </div>
        
        {/* 评分详情 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">文化底蕴</span>
            </div>
            {renderScore(candidate.scoreBreakdown.cultural)}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700">常用度</span>
            </div>
            {renderScore(candidate.scoreBreakdown.popularity)}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">音律和谐</span>
            </div>
            {renderScore(candidate.scoreBreakdown.harmony)}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">安全性</span>
            </div>
            {renderScore(candidate.scoreBreakdown.safety)}
          </div>
        </div>
        
        {/* 综合评分 */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="text-lg font-bold text-gray-900">综合评分</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{candidate.score}</div>
          </div>
        </div>
        
        {/* 来源 */}
        {candidate.sources.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">文化出处</span>
            </div>
            <div className="space-y-2">
              {candidate.sources.slice(0, 2).map((source, i) => (
                <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                  <div className="font-medium text-gray-700">{source.book}</div>
                  <div className="mt-1 italic">"{source.text}"</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 警告 */}
        {candidate.warnings.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            {renderWarnings(candidate.warnings)}
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="pt-4 border-t border-gray-200">
          <button
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              selected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(candidate);
            }}
          >
            {selected ? '已选择' : '选择此名字'}
          </button>
        </div>
      </div>
    </div>
  );
}