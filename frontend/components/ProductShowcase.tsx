
import React from 'react';
import { PRODUCTS } from '../constants';
import { Info, CheckCircle2 } from 'lucide-react';

const ProductShowcase: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {PRODUCTS.map((product) => (
        <div key={product.id} className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-md transition-shadow">
          <img src={product.imageUrl} alt={product.name} className="w-full h-32 object-cover" />
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-slate-800">{product.name}</h3>
              <span className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium uppercase">
                {product.category}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{product.description}</p>
            <div className="space-y-1">
              {product.benefits.slice(0, 2).map((benefit, idx) => (
                <div key={idx} className="flex items-center text-[11px] text-slate-600">
                  <CheckCircle2 size={12} className="text-emerald-500 mr-1" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductShowcase;
