import React, { useState, useCallback } from 'react';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { Upload, FileText, Download, Trash2, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

export default function App() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const convertFile = async (file: File) => {
    const isDocx = file.name.endsWith('.docx');
    const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm');

    if (!isDocx && !isHtml) {
      setError('Please upload a .docx or .html file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      let html = '';
      if (isDocx) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        html = result.value;
      } else {
        html = await file.text();
      }
      
      const md = turndownService.turndown(html);
      setMarkdown(md);
    } catch (err) {
      console.error(err);
      setError('Failed to convert the document. Make sure it is a valid file.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) convertFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) convertFile(file);
  };

  const downloadMarkdown = () => {
    if (!markdown || !fileName) return;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.(docx|html|htm)$/i, '.md');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setMarkdown(null);
    setFileName(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-black selection:text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight mb-4"
          >
            Doc to Markdown
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted text-lg"
          >
            Convert your .docx or .html files to clean Markdown instantly.
          </motion.p>
        </header>

        <main>
          <AnimatePresence mode="wait">
            {!markdown ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`
                  relative group cursor-pointer
                  border-2 border-dashed rounded-3xl p-12
                  transition-all duration-300 ease-in-out
                  flex flex-col items-center justify-center text-center
                  ${isDragging ? 'border-black bg-black/5' : 'border-black/10 bg-white hover:border-black/20'}
                  ${error ? 'border-red-200 bg-red-50' : ''}
                `}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <input
                  id="fileInput"
                  type="file"
                  accept=".docx,.html,.htm"
                  className="hidden"
                  onChange={onFileChange}
                />
                
                <div className="mb-6 p-4 rounded-2xl bg-black/5 group-hover:bg-black/10 transition-colors">
                  {isLoading ? (
                    <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-12 h-12 text-black/40 group-hover:text-black transition-colors" />
                  )}
                </div>

                <h3 className="text-xl font-medium mb-2">
                  {isLoading ? 'Converting...' : 'Drop your Word or HTML file here'}
                </h3>
                <p className="text-muted mb-6">or click to browse from your computer</p>
                
                <div className="flex items-center gap-2 text-xs font-mono text-muted uppercase tracking-widest">
                  <FileText size={14} />
                  Supports .docx, .html, .htm
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-full text-sm"
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden"
              >
                <div className="px-6 py-4 border-bottom border-black/5 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm truncate max-w-[200px] sm:max-w-md">
                        {fileName}
                      </h3>
                      <p className="text-xs text-muted uppercase tracking-wider">Converted successfully</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyToClipboard}
                      className={`p-2 rounded-xl transition-all duration-200 flex items-center gap-2 text-sm font-medium ${isCopied ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-black/5 text-muted hover:text-black'}`}
                      title="Copy to clipboard"
                    >
                      {isCopied ? <Check size={18} /> : <Copy size={18} />}
                      {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={reset}
                      className="p-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors text-muted"
                      title="Remove file"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button
                      onClick={downloadMarkdown}
                      className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-black/80 transition-colors font-medium text-sm"
                    >
                      <Download size={18} />
                      Download .md
                    </button>
                  </div>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto bg-white">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-black/70 bg-[#f9f9f9] p-6 rounded-2xl border border-black/5">
                      {markdown}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-12 text-center text-muted text-sm">
          <p>© {new Date().getFullYear()} Word to Markdown Converter</p>
        </footer>
      </div>
    </div>
  );
}
