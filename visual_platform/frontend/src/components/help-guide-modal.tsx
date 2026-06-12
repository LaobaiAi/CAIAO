import { Languages, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { HELP_GUIDE_EN, HELP_GUIDE_ZH } from '@/data/help-guide';

type Lang = 'en' | 'zh';

export function HelpGuideModal() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

  const content = useMemo(() => lang === 'en' ? HELP_GUIDE_EN : HELP_GUIDE_ZH, [lang]);
  const title = lang === 'en' ? 'CAIAO Visual — User Guide' : 'CAIAO Visual — 操作指南';

  // Register global open function synchronously (before useEffect, for immediate availability)
  const openRef = useRef<() => void>(() => {});
  openRef.current = () => setOpen(true);
  (window as any).__showHelpGuide = () => openRef.current();

  useEffect(() => {
    return () => { delete (window as any).__showHelpGuide; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const toggleLang = () => setLang(prev => prev === 'en' ? 'zh' : 'en');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-popover border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-panel">
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <div className="flex items-center gap-1">
            {/* Language Toggle */}
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={toggleLang}
              title={lang === 'en' ? 'Switch to Chinese' : '切换为英文'}
            >
              <Languages size={16} />
              <span className="text-xs font-medium">{lang === 'en' ? 'EN' : '中文'}</span>
            </button>
            {/* Close */}
            <button
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:text-primary prose-headings:font-semibold
            prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
            prose-code:text-blue-400 prose-code:bg-blue-400/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-table:border prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2
            prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-primary
            [&_table]:w-full [&_table]:border-collapse">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
