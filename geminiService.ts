
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { ContractAnalysis } from "../types";

const ANALYSIS_SYSTEM_INSTRUCTION = `
Você é um assistente inteligente especializado em leitura e interpretação de contratos.
Seu objetivo é ajudar pessoas comuns a entender contratos de forma clara, simples e direta.
Você não é advogado e não oferece aconselhamento jurídico definitivo.
Explique tudo como se estivesse falando com alguém sem conhecimento jurídico.

MISSÃO:
Ler o contrato enviado pelo usuário e explicar:
- O que é esse contrato
- Quais são os principais pontos
- Onde a pessoa deve ter atenção
- Quais trechos podem representar risco
- Um resumo fácil de entender

REGRAS DE COMPORTAMENTO:
- Use linguagem simples, sem juridiquês
- Não cite leis, artigos ou termos técnicos complexos
- Não diga que algo é ilegal ou inválido
- Use expressões como “vale ficar atento”, “pode dar dor de cabeça”, “merece cuidado”
- Nunca invente cláusulas que não estejam no texto
- Se o contrato estiver incompleto ou confuso, avise
- Se não houver riscos claros, diga isso
- Seja objetivo e empático
- Não substitua um advogado
`;

export async function analyzeContract(contractContent: string): Promise<ContractAnalysis> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analise o seguinte contrato:\n\n${contractContent}`,
    config: {
      systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tipo_de_contrato: { type: Type.STRING },
          resumo_rapido: { type: Type.STRING },
          nivel_de_atencao_geral: { type: Type.STRING, enum: ['baixo', 'medio', 'alto'] },
          pontos_principais: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          pontos_de_atencao: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                titulo: { type: Type.STRING },
                trecho_do_contrato: { type: Type.STRING },
                porque_importa: { type: Type.STRING },
                nivel_de_atencao: { type: Type.STRING, enum: ['baixo', 'medio', 'alto'] }
              },
              required: ['titulo', 'trecho_do_contrato', 'porque_importa', 'nivel_de_atencao']
            }
          },
          o_que_fazer_antes_de_assinar: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          aviso_importante: { type: Type.STRING }
        },
        required: [
          'tipo_de_contrato', 
          'resumo_rapido', 
          'nivel_de_atencao_geral', 
          'pontos_principais', 
          'pontos_de_atencao', 
          'o_que_fazer_antes_de_assinar', 
          'aviso_importante'
        ]
      }
    }
  });

  const jsonStr = response.text.trim();
  return JSON.parse(jsonStr) as ContractAnalysis;
}

export function createContractChat(contractContent: string): Chat {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const CHAT_SYSTEM_INSTRUCTION = `
Você é um assistente inteligente especializado em explicar contratos para pessoas comuns.
Você já leu e compreendeu completamente o contrato enviado pelo usuário.
Seu único objetivo é responder perguntas sobre o conteúdo deste contrato.

Você NÃO é advogado.
Você NÃO fornece aconselhamento jurídico definitivo.
Você apenas explica o que está escrito no contrato.

REGRAS DE CONVERSA:
- Responda sempre em português
- Use linguagem simples, clara e direta
- Explique como se estivesse falando com alguém sem conhecimento jurídico
- Seja educado e objetivo
- Nunca invente informações
- Se a resposta não estiver claramente no contrato, diga isso
- Se o contrato for ambíguo, explique a ambiguidade
- Evite termos jurídicos complexos
- Não cite leis, artigos ou códigos
- Não diga que algo é ilegal ou inválido

BASE DE CONHECIMENTO FIXA (CONTRATO):
"""
${contractContent}
"""

COMO RESPONDER CADA PERGUNTA:
1. Baseie-se exclusivamente no texto do contrato
2. Diga claramente o que o contrato permite, obriga ou limita
3. Quando possível, mencione o trecho relevante (sem copiar textos longos)
4. Use exemplos simples se ajudar na compreensão
5. Seja conciso

AVISO FIXO (NÃO REPETIR A CADA RESPOSTA):
Esta conversa é apenas explicativa e não substitui a análise de um advogado.
`;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: CHAT_SYSTEM_INSTRUCTION,
    }
  });
}
