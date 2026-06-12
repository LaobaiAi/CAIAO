import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { BookOpen, Languages, Palette } from 'lucide-react';
import { HELP_GUIDE_EN, HELP_GUIDE_ZH } from '@/data/help-guide';
import { ThemeSettings } from './appearance';

type SettingsNav = 'theme' | 'docs';
type Lang = 'en' | 'zh';

interface SettingsProps {
  className?: string;
}

export function Settings({ className }: SettingsProps) {
  const [activeNav, setActiveNav] = useState<SettingsNav>('theme');
  const [docLang, setDocLang] = useState<Lang>('en');

  const guideContent = useMemo(() => docLang === 'en' ? HELP_GUIDE_EN : HELP_GUIDE_ZH, [docLang]);

  return (
    <div className={cn("flex justify-center h-full overflow-hidden bg-panel", className)}>
      <div className="flex w-full max-w-7xl mx-auto">
        {/* Left Navigation Pane */}
        <div className="w-60 bg-panel flex-shrink-0 border-r">
          <div className="p-4 border-b">
            <h1 className="text-lg font-semibold text-primary">Settings</h1>
          </div>
          <nav className="p-2 space-y-0.5">
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left rounded-md text-sm transition-colors",
                activeNav === 'theme' ? "text-blue-500 bg-blue-500/10" : "text-primary hover:bg-accent"
              )}
              onClick={() => setActiveNav('theme')}
            >
              <Palette className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Theme</span>
            </button>
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left rounded-md text-sm transition-colors",
                activeNav === 'docs' ? "text-blue-500 bg-blue-500/10" : "text-primary hover:bg-accent"
              )}
              onClick={() => setActiveNav('docs')}
            >
              <BookOpen className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Documentation</span>
            </button>
          </nav>
        </div>

        {/* Right Content Pane */}
        <div className="flex-1 overflow-auto bg-panel">
          {activeNav === 'theme' ? (
            <div className="p-8 max-w-4xl">
              <ThemeSettings />
            </div>
          ) : (
            <div className="p-8 max-w-4xl">
              {/* Header with lang toggle */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-primary">Documentation</h2>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  onClick={() => setDocLang(prev => prev === 'en' ? 'zh' : 'en')}
                  title={docLang === 'en' ? 'Switch to Chinese' : 'Switch to English'}
                >
                  <Languages size={16} />
                  <span className="text-xs font-medium">{docLang === 'en' ? 'EN' : '中文'}</span>
                </button>
              </div>

              {/* Help Guide Section */}
              <div className="mb-8 p-5 border rounded-lg bg-card hover:border-blue-400/30 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <BookOpen className="h-5 w-5 text-blue-400" />
                  <div>
                    <h3 className="text-base font-semibold text-primary">
                      {docLang === 'en' ? 'CAIAO Visual — User Guide' : 'CAIAO Visual — 操作指南'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {docLang === 'en'
                        ? 'Complete user manual covering mouse operations, keyboard shortcuts, node management, and workflow instructions'
                        : '完整的操作手册，包含鼠标操作、键盘快捷键、节点管理、工作流说明'}
                    </p>
                  </div>
                </div>
                <button
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  onClick={() => {
                    const fn = (window as any).__showHelpGuide;
                    if (fn) fn();
                  }}
                >
                  {docLang === 'en' ? 'Open in popup →' : '在弹窗中打开 →'}
                </button>
              </div>

              {/* Inline Guide Preview */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/50 border-b text-sm font-medium text-primary">
                  {docLang === 'en' ? 'Quick Preview' : '快速预览'}
                </div>
                <div className="p-5 prose prose-sm dark:prose-invert max-w-none max-h-[60vh] overflow-y-auto
                  prose-headings:text-primary prose-headings:font-semibold
                  prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                  prose-code:text-blue-400 prose-code:bg-blue-400/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  prose-table:border prose-th:bg-muted prose-th:px-2 prose-th:py-1.5 prose-td:px-2 prose-td:py-1.5
                  [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse">
                  <ReactMarkdown>{guideContent}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
