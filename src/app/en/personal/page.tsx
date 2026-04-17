"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";

export default function PersonalENPage() {
  const router = useRouter();
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState<"男"|"女">("男");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [expectations, setExpectations] = useState("");
  const [style, setStyle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim()) return;
    if (!birthDate) return;
    setIsLoading(true);

    const genderCode = gender === "男" ? "M" : "F";
    const params = new URLSearchParams({
      surname,
      gender: genderCode,
      category: "personal",
      birthDate,
    });
    if (birthTime) params.set("birthTime", birthTime);
    if (expectations.trim()) params.set("expectations", expectations.trim());
    if (style.trim()) params.set("style", style.trim());

    window.location.href = `/naming?${params.toString()}`;
  };

  const handleInput = (rawValue: string) => {
    const chinese = rawValue.replace(/[^\u4e00-\u9fa5]/g, "");
    if (chinese.length > 0) return chinese.slice(0, 2);
    return rawValue.slice(0, 10);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #FDF8F3 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FDF8F3]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/en" className="flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#E86A17]" />
            <span className="font-bold text-[#2C1810]">Personal Naming</span>
          </div>
          <Link href="/en" className="text-sm text-[#E86A17] hover:underline">EN / 中文</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2C1810] mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            AI Personal Name Generation
          </h1>
          <p className="text-[#5C4A42]">
            Enter your information below, and our AI will generate the perfect Chinese name for you
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg" style={{ border: '1px solid #E5DDD3' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Surname */}
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-2">
                Surname <span className="text-red-500">*</span>
              </label>
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
                placeholder="Enter your surname"
                className="w-full px-4 py-3 rounded-lg text-[#2C1810]"
                style={{ fontFamily: "'Noto Serif SC', serif", background: '#FFFCF7', border: '1px solid #DDD0C0', outline: 'none' }}
                autoComplete="off"
              />
              <p className="text-xs text-[#888] mt-1">Chinese surnames only, max 2 characters</p>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-2">
                Gender <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {(["男", "女"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className="flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: gender === g
                        ? (g === "男" ? '#4A90D9' : '#E870A0')
                        : '#F5EDE0',
                      color: gender === g ? '#fff' : '#5C4A42',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {g === "男" ? "Male (男)" : "Female (女)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Birth Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Birth Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-[#2C1810]"
                  style={{ fontFamily: "'Noto Sans SC', sans-serif", background: '#FFFCF7', border: '1px solid #DDD0C0', outline: 'none' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Birth Time (Optional)
                </label>
                <input
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-[#2C1810]"
                  style={{ fontFamily: "'Noto Sans SC', sans-serif", background: '#FFFCF7', border: '1px solid #DDD0C0', outline: 'none' }}
                />
                <p className="text-xs text-[#888] mt-1">Helps with BaZi analysis</p>
              </div>
            </div>

            {/* Style Preference */}
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-2">
                Style Preference
              </label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="e.g. classical, elegant, modern..."
                className="w-full px-4 py-3 rounded-lg text-[#2C1810]"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", background: '#FFFCF7', border: '1px solid #DDD0C0', outline: 'none' }}
                autoComplete="off"
              />
            </div>

            {/* Expectations */}
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-2">
                Desired Meaning
              </label>
              <textarea
                value={expectations}
                onChange={(e) => setExpectations(e.target.value)}
                placeholder="What qualities or meanings do you hope the name conveys? e.g. wisdom, courage, kindness..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg text-[#2C1810] resize-none"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", background: '#FFFCF7', border: '1px solid #DDD0C0', outline: 'none' }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!surname.trim() || !birthDate || isLoading}
              className="w-full py-4 rounded-xl text-white font-medium text-lg transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)',
                border: 'none',
                cursor: surname.trim() && birthDate ? 'pointer' : 'not-allowed',
                boxShadow: '0 4px 16px rgba(232,106,23,0.3)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI is generating names...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate Names
                </span>
              )}
            </button>
          </form>

          {/* Note */}
          <div className="mt-6 p-4 rounded-lg" style={{ background: '#FFF8F4', border: '1px solid #FFE4CC' }}>
            <p className="text-sm text-[#8B5A2B]">
              <strong>Note:</strong> The more details you provide, the better the AI can match your preferences. BaZi and Five Elements analysis will be based on your birth information.
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link href="/en" className="text-sm text-[#5C4A42] hover:text-[#E86A17] transition-colors">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
