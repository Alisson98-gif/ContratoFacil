
import React, { useState, useRef, useEffect } from 'react';
import { analyzeContract } from './services/geminiService';
import { extractTextFromFile } from './services/fileService';
import { ContractAnalysis, HistoryItem, ChatMessage } from './types';
import { AnalysisView } from './components/AnalysisView';

// Fallback simples para UUID se necessário
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const App: React.FC = () => {
  const [contractText, setContractText] = useState('');
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const HISTORY_KEY = 'contrato_facil_history';

  // Carrega histórico do localStorage ao montar o componente
  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch (e) {
        console.error("Erro ao carregar histórico", e);
      }
    }
  }, []);

  // Sincroniza o histórico com o localStorage sempre que ele mudar
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const handleAnalyze = async (textToAnalyze?: string) => {
    const finalContent = textToAnalyze || contractText;
    if (!finalContent.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeContract(finalContent);
      
      const newItem: HistoryItem = {
        id: generateId(),
        timestamp: Date.now(),
        tipo_de_contrato: result.tipo_de_contrato,
        contractText: finalContent,
        analysis: result,
        messages: []
      };

      setHistory(prev => [newItem, ...prev]);
      setActiveHistoryId(newItem.id);
      setAnalysis(result);
      setChatMessages([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setError("Ops! Houve um erro ao processar seu contrato. Verifique sua conexão e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateHistoryMessages = (messages: ChatMessage[]) => {
    setChatMessages(messages);
    if (activeHistoryId) {
      setHistory(prev => prev.map(item => 
        item.id === activeHistoryId ? { ...item, messages } : item
      ));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setError(null);
    try {
      const text = await extractTextFromFile(file);
      setContractText(text);
    } catch (err: any) {
      setError(err.message || "Erro ao ler o arquivo.");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setContractText('');
    setChatMessages([]);
    setActiveHistoryId(null);
    setError(null);
    setIsSidebarOpen(false);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setContractText(item.contractText);
    setAnalysis(item.analysis);
    setChatMessages(item.messages);
    setActiveHistoryId(item.id);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteFromHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir esta análise do histórico?')) {
      const newHistory = history.filter(item => item.id !== id);
      setHistory(newHistory);
      
      // Se estivermos visualizando o item que foi excluído, resetamos a tela
      if (activeHistoryId === id) {
        handleReset();
      }
    }
  };

  const clearAllHistory = () => {
    if (window.confirm('Tem certeza que deseja apagar TODO o seu histórico? Esta ação não pode ser desfeita.')) {
      setHistory([]);
      localStorage.setItem(HISTORY_KEY, '[]');
      handleReset();
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-black text-slate-200">
      {/* Overlay de Carregamento Global */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-300">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 scale-125"></div>
            <div className="absolute inset-0 rounded-full border-t-4 border-indigo-500 animate-spin scale-125"></div>
            <div className="absolute inset-4 rounded-full border-4 border-slate-800 animate-pulse"></div>
          </div>
          <div className="text-center space-y-4 max-w-sm px-6">
            <h2 className="text-2xl font-black text-white tracking-tight">Analisando Contrato</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Nossa IA está traduzindo o juridiquês e identificando pontos de atenção para você.
            </p>
            <div className="flex gap-2 justify-center">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Histórico */}
      <div 
        className={`fixed inset-y-0 left-0 w-80 bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-r border-slate-800 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2 text-lg">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Histórico
            </h3>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {history.length > 0 && (
              <div className="flex justify-end px-2 pb-2">
                <button 
                  onClick={clearAllHistory}
                  className="text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Limpar Tudo
                </button>
              </div>
            )}

            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm">Nenhum histórico ainda.</p>
              </div>
            ) : (
              history.map(item => {
                const isActive = activeHistoryId === item.id;
                return (
                  <div 
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden group ${
                      isActive 
                        ? 'bg-slate-800 border-indigo-500 shadow-indigo-900/20 shadow-lg' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                    )}
                    
                    <div className={`pr-8 ${isActive ? 'pl-2' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold text-sm truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {item.tipo_de_contrato}
                        </h4>
                        {isActive && (
                          <span className="flex-shrink-0 bg-indigo-500 text-[8px] text-white font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] ${isActive ? 'text-indigo-400/80' : 'text-slate-500'}`}>
                        {new Date(item.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    
                    <button 
                      onClick={(e) => deleteFromHistory(e, item.id)}
                      title="Excluir do histórico"
                      className={`absolute top-1/2 -translate-y-1/2 right-3 p-2 rounded-lg transition-all z-20 ${
                        isActive 
                          ? 'text-slate-500 hover:text-red-400 hover:bg-slate-700 opacity-100' 
                          : 'text-slate-600 hover:text-red-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Overlay Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              title="Abrir Histórico"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div 
              onClick={handleReset}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Contrato<span className="text-indigo-400">Fácil</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleReset}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 text-slate-300 font-bold rounded-lg border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all text-sm shadow-md"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Início
            </button>
            <span className="hidden md:inline text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              v1.2 Dark
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {!analysis ? (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16 space-y-6">
              <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
                Entenda seu contrato <br/> 
                <span className="text-indigo-400 drop-shadow-sm">sem complicação.</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Nossa IA analisa juridiquês e traduz tudo para você instantaneamente. 
                Segurança, clareza e controle no seu navegador.
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden backdrop-blur-sm">
              <div className="p-1 bg-slate-800/30 border-b border-slate-800 flex items-center justify-between px-6 py-4">
                <span className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Documento
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile || isLoading}
                    className="text-xs font-bold bg-slate-800 border border-slate-700 px-4 py-1.5 rounded-lg text-indigo-400 hover:bg-slate-700 hover:text-indigo-300 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {isProcessingFile ? "Extraindo..." : "Importar Arquivo"}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".pdf,.docx,.txt" 
                    className="hidden" 
                  />
                </div>
              </div>
              
              <div className="p-6 md:p-8 space-y-8">
                <div className="relative">
                  <textarea
                    value={contractText}
                    onChange={(e) => setContractText(e.target.value)}
                    placeholder="Cole aqui o texto do contrato ou importe um arquivo acima..."
                    disabled={isLoading}
                    className="w-full h-80 p-6 text-slate-300 bg-slate-950/50 rounded-2xl border-2 border-dashed border-slate-800 focus:border-indigo-500/50 focus:bg-slate-950 focus:ring-0 transition-all resize-none font-medium placeholder:text-slate-600 shadow-inner"
                  />
                  {isProcessingFile && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-4">
                      <div className="relative w-12 h-12">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
                      </div>
                      <span className="text-sm font-bold text-white tracking-widest uppercase">Lendo Arquivo...</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-xl flex items-start gap-3 text-red-300 text-sm animate-pulse">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  onClick={() => handleAnalyze()}
                  disabled={isLoading || isProcessingFile || !contractText.trim()}
                  className={`w-full py-5 px-6 rounded-2xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-3 ${
                    isLoading || isProcessingFile || !contractText.trim()
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.99] shadow-indigo-500/10'
                  }`}
                >
                  {isLoading ? "Iniciando Processamento..." : (
                    <>
                      Iniciar Análise Inteligente
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { 
                  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", 
                  title: "Histórico Local", 
                  desc: "Suas análises ficam salvas com segurança apenas no seu navegador.",
                  color: "bg-blue-500/10 text-blue-400" 
                },
                { 
                  icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04M12 2.944a11.955 11.955 0 01-8.618 3.04M12 21.481c-2.733 0-5.466-1.041-7.5-3.121", 
                  title: "Privacidade Total", 
                  desc: "Nenhum documento é armazenado permanentemente. Você tem o controle.",
                  color: "bg-emerald-500/10 text-emerald-400" 
                },
                { 
                  icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", 
                  title: "Chat Contextual", 
                  desc: "Tire dúvidas específicas sobre cláusulas conversando com o assistente.",
                  color: "bg-indigo-500/10 text-indigo-400" 
                }
              ].map((feature, i) => (
                <div key={i} className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl border border-slate-800/50 bg-slate-900/20">
                  <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center shadow-inner`}>
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                    </svg>
                  </div>
                  <h3 className="font-bold text-white text-lg">{feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <AnalysisView 
            analysis={analysis} 
            contractText={contractText} 
            initialMessages={chatMessages}
            onMessagesUpdate={updateHistoryMessages}
            onReset={handleReset} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-slate-900 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-6">
          <p className="text-slate-600 text-sm">
            © 2024 Contrato Fácil. Ferramenta de apoio baseada em IA generativa.
          </p>
          <div className="flex items-center justify-center gap-6 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
            <button onClick={handleReset} className="hover:text-white transition-colors cursor-pointer">Início</button>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
            <button onClick={() => setIsSidebarOpen(true)} className="hover:text-white transition-colors cursor-pointer">Histórico</button>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
            <button onClick={clearAllHistory} className="hover:text-red-400 transition-colors cursor-pointer">Limpar Histórico</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
