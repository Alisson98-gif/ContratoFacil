
import React from 'react';
import { AttentionLevel } from '../types';

interface AttentionBadgeProps {
  level: AttentionLevel;
  className?: string;
}

export const AttentionBadge: React.FC<AttentionBadgeProps> = ({ level, className = "" }) => {
  const styles = {
    baixo: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5",
    medio: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5",
    alto: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/5"
  };

  const labels = {
    baixo: "Risco Baixo",
    medio: "Atenção Média",
    alto: "Atenção Alta"
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${styles[level]} ${className}`}>
      {labels[level]}
    </span>
  );
};
