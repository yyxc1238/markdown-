import React, { useState, useCallback } from 'react';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import JSZip from 'jszip';
import { Upload, FileText, Download, Trash2, CheckCircle2, AlertCircle, Copy, Check, Files, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

interface ConvertedFile {
  id: string;
  fileName: string;
  markdown: string | null;
  status: 'pending' | 'converting' | 'success' | 'error';
  error?: string;
}

export default function App() {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const selectedFile = files.find(f => f.id === selectedFileId);

  const convertFile = async (file: File) => {
    const id = Math.random().toString(36).substring(7);
    const isDocx = file.name.endsWith('.docx');
    const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm');

    if (!isDocx && !isHtml) {
      return {
        id,
        fileName: file.name,
        markdown: null,
        status: 'error' as const,
        error: 'Unsupported format'
      };
    }

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
      return {
        id,
        fileName: file.name,
        markdown: md,
        status: 'success' as const
      };
    } catch (err) {
      console.error(err);
      return {
        id,
        fileName: file.name,
        markdown: null,
        status: 'error' as const,
        error: 'Conversion failed'
      };
    }
  };

  const handleFiles = async (newFiles: FileList | null) => {
    if (!newFiles) return;
    setGlobalError(null);

    const fileArray = Array.from(newFiles);
    const initialFiles: ConvertedFile[] = fileArray.map(f => ({
      id: Math.random().toString(36).substring(7),
      fileName: f.name,
      markdown: null,
      status: 'converting'
    }));

    setFiles(prev => [...prev, ...initialFiles]);

    const results = await Promise.all(fileArray.map(f => convertFile(f)));

    setFiles(prev => {
      const updated = [...prev];
      results.forEach((res, i) => {
        const index = updated.findIndex(f => f.fileName === fileArray[i].name && f.status === 'converting');
        if (index !== -1) {
          updated[index] = { ...updated[index], ...res };
        }
      });
      return updated;
    });

    if (results.length === 1 && results[0].status === 'success') {
      setSelectedFileId(results[0].id);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = ''; // Reset input
  };

  const downloadSingle = (file: ConvertedFile) => {
    if (!file.markdown) return;
    const blob = new Blob([file.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName.replace(/\.(docx|html|htm)$/i, '.md');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    const successFiles = files.filter(f => f.status === 'success' && f.markdown);
    if (successFiles.length === 0) return;

    if (successFiles.length === 1) {
      downloadSingle(successFiles[0]);
      return;
    }

    const zip = new JSZip();
    successFiles.forEach(f => {
      const name = f.fileName.replace(/\.(docx|html|htm)$/i, '.md');
      zip.file(name, f.markdown!);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted_markdown_${new Date().getTime()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (file: ConvertedFile) => {
    if (!file.markdown) return;
    try {
      await navigator.clipboard.writeText(file.markdown);
      setIsCopied(file.id);
      setTimeout(() => setIsCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (selectedFileId === id) setSelectedFileId(null);
  };

  const clearAll = () => {
    setFiles([]);
    setSelectedFileId(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-black selection:text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
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
            Batch convert your .docx or .html files to clean Markdown.
          </motion.p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload & List */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`
                relative group cursor-pointer
                border-2 border-dashed rounded-3xl p-8
                transition-all duration-300 ease-in-out
                flex flex-col items-center justify-center text-center
                ${isDragging ? 'border-black bg-black/5' : 'border-black/10 bg-white hover:border-black/20'}
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
                multiple
                className="hidden"
                onChange={onFileChange}
              />
              
              <div className="mb-4 p-3 rounded-2xl bg-black/5 group-hover:bg-black/10 transition-colors">
                <Upload className="w-8 h-8 text-black/40 group-hover:text-black transition-colors" />
              </div>

              <h3 className="text-lg font-medium mb-1">Upload Files</h3>
              <p className="text-sm text-muted mb-4">Drop files here or click to browse</p>
              
              <div className="flex items-center gap-2 text-[10px] font-mono text-muted uppercase tracking-widest">
                <Files size={12} />
                Supports multiple files
              </div>
            </motion.div>

            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm"
              >
                <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
                  <h3 className="font-semibold text-sm">Files ({files.length})</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={clearAll}
                      className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Clear All
                    </button>
                    <button 
                      onClick={downloadAll}
                      disabled={!files.some(f => f.status === 'success')}
                      className="text-xs bg-black text-white px-3 py-1.5 rounded-lg hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      Export All
                    </button>
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto divide-y divide-black/5">
                  {files.map((file) => (
                    <div 
                      key={file.id}
                      onClick={() => file.status === 'success' && setSelectedFileId(file.id)}
                      className={`
                        group px-6 py-4 flex items-center justify-between cursor-pointer transition-colors
                        ${selectedFileId === file.id ? 'bg-black/5' : 'hover:bg-black/[0.02]'}
                        ${file.status === 'error' ? 'opacity-70' : ''}
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {file.status === 'converting' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-black/40" />
                        ) : file.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium truncate max-w-[150px]">{file.fileName}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                          className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {selectedFile ? (
                <motion.div
                  key={selectedFile.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden h-full flex flex-col"
                >
                  <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between bg-white">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{selectedFile.fileName}</h3>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Previewing Markdown</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(selectedFile)}
                        className={`p-2 rounded-xl transition-all duration-200 flex items-center gap-2 text-xs font-medium ${isCopied === selectedFile.id ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-black/5 text-muted hover:text-black'}`}
                      >
                        {isCopied === selectedFile.id ? <Check size={16} /> : <Copy size={16} />}
                        {isCopied === selectedFile.id ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => downloadSingle(selectedFile)}
                        className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-black/80 transition-colors font-medium text-xs"
                      >
                        <Download size={16} />
                        Download
                      </button>
                    </div>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto bg-[#fafafa]">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-black/70">
                      {selectedFile.markdown}
                    </pre>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full min-h-[400px] border-2 border-dashed border-black/5 rounded-3xl flex flex-col items-center justify-center text-center p-12 text-muted">
                  <div className="mb-4 p-4 rounded-full bg-black/[0.02]">
                    <FileText size={32} className="opacity-20" />
                  </div>
                  <p className="text-sm">Select a converted file to preview its content here.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <footer className="mt-12 text-center text-muted text-sm">
          <p>© {new Date().getFullYear()} Doc to Markdown Converter</p>
        </footer>
      </div>
    </div>
  );
}

