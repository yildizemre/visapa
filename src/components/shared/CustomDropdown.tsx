import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LucideIcon, Eye } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  icon?: LucideIcon;
  className?: string;
  onEyeClick?: (value: string) => void;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Seçiniz...',
  icon: Icon,
  className = '',
  onEyeClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={dropdownRef} className={`relative min-w-[180px] ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 text-white text-sm font-medium transition-all shadow-md"
      >
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Options Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 mt-2 z-50 p-1.5 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/40 shadow-2xl max-h-60 overflow-y-auto scrollbar-thin space-y-0.5"
          >
            {options.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-slate-500 font-medium text-center">
                Seçenek yok
              </div>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <div key={option.value} className="relative flex items-center w-full group">
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center pr-3 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left ${
                        onEyeClick && option.value !== 'all' ? 'pl-9' : 'pl-3'
                      } ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                    </button>

                    {/* Eye icon on the absolute left of the option */}
                    {onEyeClick && option.value !== 'all' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering the main select button click
                          onEyeClick(option.value);
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors z-10"
                        title={option.label}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomDropdown;
