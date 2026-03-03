
import React from 'react';
import { BookOpen, Table, Lightbulb } from 'lucide-react';

interface ResourceButtonsProps {
  onSabiasQue: () => void;
}

const ResourceButtons: React.FC<ResourceButtonsProps> = ({ onSabiasQue }) => {
  const resources = [
    {
      label: 'Recetario',
      icon: <BookOpen size={16} />,
      href: 'https://es.ayuniko.shop/recetario/',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      label: 'Tablas Nutricionales',
      icon: <Table size={16} />,
      href: 'https://es.ayuniko.shop/tablas-alimentos/',
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: '¿Sabías que?',
      icon: <Lightbulb size={16} />,
      onClick: onSabiasQue,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {resources.map((res, idx) => (
        res.href ? (
          <a
            key={idx}
            href={res.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all group"
          >
            <div className={`p-1.5 rounded-lg ${res.bg} ${res.color} mb-1 group-hover:scale-110 transition-transform`}>
              {res.icon}
            </div>
            <span className="text-[9px] md:text-[10px] font-bold text-slate-700 text-center leading-tight">
              {res.label}
            </span>
          </a>
        ) : (
          <button
            key={idx}
            onClick={res.onClick}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all group"
          >
            <div className={`p-1.5 rounded-lg ${res.bg} ${res.color} mb-1 group-hover:scale-110 transition-transform`}>
              {res.icon}
            </div>
            <span className="text-[9px] md:text-[10px] font-bold text-slate-700 text-center leading-tight">
              {res.label}
            </span>
          </button>
        )
      ))}
    </div>
  );
};

export default ResourceButtons;
