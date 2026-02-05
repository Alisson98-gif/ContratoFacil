
export type AttentionLevel = 'baixo' | 'medio' | 'alto';

export interface PointOfAttention {
  titulo: string;
  trecho_do_contrato: string;
  porque_importa: string;
  nivel_de_atencao: AttentionLevel;
}

export interface ContractAnalysis {
  tipo_de_contrato: string;
  resumo_rapido: string;
  nivel_de_atencao_geral: AttentionLevel;
  pontos_principais: string[];
  pontos_de_atencao: PointOfAttention[];
  o_que_fazer_antes_de_assinar: string[];
  aviso_importante: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
