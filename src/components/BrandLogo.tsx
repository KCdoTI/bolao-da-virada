import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
  variant?: 'icon' | 'full';
  showSubtitle?: boolean;
}

/**
 * Logotipo Institucional Geométrico do Bolão da Virada
 * 
 * Conceito visual:
 * - Esferas em hexágono geométrico: representam as 6 dezenas da Mega da Virada
 * - Linhas vetoriais de interconexão: representam a rede do consórcio/cotistas
 * - Núcleo central dourado: representa a premiação máxima e segurança
 * - Proporções calibradas para legibilidade em 24px (favicon/mobile) até 96px+
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 36,
  variant = 'icon',
  showSubtitle = true,
}) => {
  const icon = (
    <div className="relative shrink-0 flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-2xl shadow-xs transition-transform duration-200 group-hover:scale-105"
        aria-hidden="true"
      >
        {/* Fundo do Isotipo com gradiente esmeralda profundo */}
        <rect width="40" height="40" rx="11" fill="url(#blGradBase)" />
        <rect
          x="0.75"
          y="0.75"
          width="38.5"
          height="38.5"
          rx="10.25"
          stroke="url(#blGradBorder)"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />

        {/* Órbita geométrica pontilhada */}
        <circle
          cx="20"
          cy="20"
          r="12.5"
          stroke="#34D399"
          strokeWidth="1"
          strokeOpacity="0.25"
          strokeDasharray="2 3"
        />

        {/* Linhas conectoras do consórcio formando o hexágono de dezenas */}
        <path
          d="M20 9.5L29 14.5V25.5L20 30.5L11 25.5V14.5L20 9.5Z"
          stroke="#10B981"
          strokeWidth="1"
          strokeOpacity="0.35"
        />

        {/* Radiais conectando ao centro */}
        <path
          d="M20 9.5V20M29 14.5L20 20M29 25.5L20 20M20 30.5V20M11 25.5L20 20M11 14.5L20 20"
          stroke="#10B981"
          strokeWidth="1"
          strokeOpacity="0.25"
        />

        {/* As 6 Dezenas Lotéricas (Nós da Rede) */}
        {/* Topo (Dourada) */}
        <circle cx="20" cy="9.5" r="2.75" fill="#F59E0B" />
        <circle cx="20" cy="9.5" r="1.25" fill="#FEF3C7" />

        {/* Superior Direito */}
        <circle cx="29" cy="14.5" r="2.5" fill="#10B981" />
        <circle cx="29" cy="14.5" r="1" fill="#D1FAE5" />

        {/* Inferior Direito */}
        <circle cx="29" cy="25.5" r="2.5" fill="#10B981" />
        <circle cx="29" cy="25.5" r="1" fill="#D1FAE5" />

        {/* Base */}
        <circle cx="20" cy="30.5" r="2.5" fill="#059669" />
        <circle cx="20" cy="30.5" r="1" fill="#A7F3D0" />

        {/* Inferior Esquerdo */}
        <circle cx="11" cy="25.5" r="2.5" fill="#10B981" />
        <circle cx="11" cy="25.5" r="1" fill="#D1FAE5" />

        {/* Superior Esquerdo */}
        <circle cx="11" cy="14.5" r="2.5" fill="#10B981" />
        <circle cx="11" cy="14.5" r="1" fill="#D1FAE5" />

        {/* Núcleo Central: Losango de Ouro / Vitória */}
        <path
          d="M20 16.5L23.5 20L20 23.5L16.5 20L20 16.5Z"
          fill="#FBBF24"
        />
        <circle cx="20" cy="20" r="1.2" fill="#FFFFFF" />

        <defs>
          <linearGradient id="blGradBase" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#064E3B" />
            <stop offset="0.6" stopColor="#022C22" />
            <stop offset="1" stopColor="#0B1320" />
          </linearGradient>
          <linearGradient id="blGradBorder" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34D399" />
            <stop offset="0.5" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{icon}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {icon}
      <div className="flex flex-col">
        <span className="font-extrabold text-base sm:text-lg tracking-tight text-white leading-tight">
          Bolão da Virada
        </span>
        {showSubtitle && (
          <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase mt-0.5">
            Consórcio & Auditoria de Cotas
          </span>
        )}
      </div>
    </div>
  );
};
