
import React, { useState, useRef, useEffect } from 'react';
import { ContractAnalysis, ChatMessage } from '../types';
import { AttentionBadge } from './AttentionBadge';
import { createContractChat } from '../services/geminiService';

interface AnalysisViewProps {
  analysis: ContractAnalysis;
  contractText: string;
  initialMessages?: ChatMessage[];
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
  onReset: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ 
  analysis, 
  contractText, 
  initialMessages = [], 
  onMessagesUpdate,
  onReset 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!chatRef.current) {
      chatRef.current = createContractChat(contractText);
    }
  }, [contractText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatLoading]);

  const handleSendMessage = async (text?: string) => {
    const userMessage = text || input.trim();
    if (!userMessage || isChatLoading) return;

    if (!text) setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    onMessagesUpdate?.(newMessages);
    setIsChatLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMessage });
      const modelText = response.text || "Desculpe, não consegui processar sua pergunta.";
      const updatedWithModel: ChatMessage[] = [...newMessages, { role: 'model', text: modelText }];
      setMessages(updatedWithModel);
      onMessagesUpdate?.(updatedWithModel);
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage[] = [...newMessages, { role: 'model', text: "Houve um erro ao tentar obter uma resposta. Tente novamente." }];
      setMessages(errorMsg);
      onMessagesUpdate?.(errorMsg);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handlePointClick = (point: string) => {
    handleSendMessage(`Pode me explicar melhor este ponto: "${point}"?`);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <section className="bg-slate-900/50 rounded-3xl shadow-xl border border-slate-800 p-8 md:p-10 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-3">
              Contrato Identificado
            </h2>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              {analysis.tipo_de_contrato}
            </h1>
          </div>
          <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Nível Geral:</span>
            <AttentionBadge level={analysis.nivel_de_atencao_geral} />
          </div>
        </div>
        
        <div className="relative pl-6 border-l-2 border-indigo-500/30">
          <p className="text-xl text-slate-300 leading-relaxed italic">
            "{analysis.resumo_rapido}"
          </p>
        </div>
      </section>

      {/* Main Points */}
      <section className="bg-slate-900/50 rounded-3xl shadow-xl border border-slate-800 p-8 md:p-10">
        <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          Principais Pontos
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {analysis.pontos_principais.map((ponto, idx) => (
            <li 
              key={idx} 
              className="group flex items-start gap-4 p-5 bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl border border-slate-800/50 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all shadow-inner">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Insight {idx + 1}</span>
                <span className="text-slate-200 text-sm leading-relaxed font-semibold group-hover:text-white transition-colors">
                  {ponto}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Points of Attention */}
      <section className="space-y-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          Pontos Críticos
        </h3>
        <div className="space-y-6">
          {analysis.pontos_de_atencao.map((ponto, idx) => (
            <div key={idx} className="bg-slate-900/50 rounded-3xl shadow-xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
                <h4 className="font-bold text-white text-lg">{ponto.titulo}</h4>
                <AttentionBadge level={ponto.nivel_de_atencao} />
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cláusula Original</h5>
                    <button 
                      onClick={() => handleCopy(ponto.trecho_do_contrato, idx)}
                      className="text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1.5 group/copy"
                      title="Copiar trecho"
                    >
                      <span className={`text-[10px] font-bold uppercase transition-opacity duration-300 ${copiedIdx === idx ? 'opacity-100 text-emerald-400' : 'opacity-0 group-hover/copy:opacity-100'}`}>
                        {copiedIdx === idx ? 'Copiado!' : 'Copiar'}
                      </span>
                      {copiedIdx === idx ? (
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="p-5 bg-slate-950/80 rounded-2xl text-sm text-slate-400 font-mono border border-slate-800 leading-relaxed italic shadow-inner relative group">
                    "{ponto.trecho_do_contrato}"
                  </div>
                </div>
                <div>
                  <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3">O que isso significa?</h5>
                  <p className="text-slate-200 text-base leading-relaxed">
                    {ponto.porque_importa}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Checklist */}
      <section className="bg-indigo-600 rounded-3xl shadow-2xl p-10 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        </div>
        <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 relative z-10">
          Recomendações Finais
        </h3>
        <ul className="space-y-4 relative z-10">
          {analysis.o_que_fazer_antes_de_assinar.map((item, idx) => (
            <li key={idx} className="flex items-start gap-4 bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/15 transition-all">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mt-1">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-indigo-50 leading-relaxed font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Conversational Assistant */}
      <section className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 flex flex-col h-[750px] overflow-hidden">
        <div className="p-8 border-b border-slate-800 flex items-center gap-4 bg-slate-800/30">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Consultor de Contratos</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Sessão Inteligente Ativa</p>
          </div>
        </div>

        {/* Quick Reference Highlight Panel */}
        <div className="px-8 py-5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Principais Dúvidas</span>
          </div>
          <div className="flex flex-nowrap overflow-x-auto gap-3 pb-2 no-scrollbar">
            {analysis.pontos_principais.slice(0, 4).map((ponto, idx) => (
              <button 
                key={idx}
                onClick={() => handlePointClick(ponto)}
                className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-left hover:border-indigo-500/50 hover:bg-slate-800 transition-all group"
              >
                <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center text-[10px] font-black text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {idx + 1}
                </div>
                <span className="text-xs text-slate-400 font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] group-hover:text-slate-200">
                  {ponto}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-grow overflow-y-auto p-8 space-y-6 bg-slate-950/20 shadow-inner">
          {messages.length === 0 && (
            <div className="text-center py-20 px-6 max-w-sm mx-auto">
              <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
                <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-400 font-bold text-lg mb-2">Inicie uma conversa</p>
              <p className="text-slate-600 text-sm leading-relaxed">Pergunte sobre multas, prazos, rescisão ou qualquer cláusula que não ficou clara.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] p-5 rounded-3xl text-sm leading-relaxed shadow-lg ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-900/10' 
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 p-5 rounded-3xl rounded-tl-none border border-slate-700 shadow-lg">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
          className="p-6 border-t border-slate-800 bg-slate-900"
        >
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Como funciona a multa por atraso?"
              disabled={isChatLoading}
              className="w-full pl-6 pr-14 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-white text-sm shadow-inner placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={!input.trim() || isChatLoading}
              className={`absolute right-3 p-2.5 rounded-xl transition-all ${
                !input.trim() || isChatLoading 
                  ? 'text-slate-700 cursor-not-allowed' 
                  : 'text-indigo-400 hover:bg-indigo-500/10 hover:scale-110 active:scale-95'
              }`}
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </section>

      {/* Footer Actions */}
      <div className="text-center pt-10 pb-20 space-y-8">
        <div className="p-6 bg-slate-900/50 rounded-2xl text-slate-500 text-xs leading-relaxed max-w-xl mx-auto border border-slate-800 shadow-lg italic">
          <strong>Isenção de responsabilidade:</strong> {analysis.aviso_importante}
        </div>
        <button 
          onClick={onReset}
          className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 border border-slate-800 text-slate-300 font-black text-sm uppercase tracking-widest rounded-full hover:bg-slate-800 hover:text-white hover:border-slate-600 transition-all shadow-xl active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z" />
          </svg>
          Analisar Novo Documento
        </button>
      </div>
    </div>
  );
};
