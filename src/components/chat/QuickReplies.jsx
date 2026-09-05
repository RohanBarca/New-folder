import React from 'react';

export default function QuickReplies({ options, onSelect, disabled }) {
  if (!options || options.length === 0) return null;

  return (
    <div className="py-2.5 px-1 flex flex-wrap items-center gap-2 animate-fadeIn">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
        Quick reply:
      </span>
      {options.map((option, idx) => (
        <button
          key={idx}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(option)}
          className="px-4 py-2 rounded-full text-xs font-bold text-[#17385E] bg-white hover:bg-[#EAFafa] border border-[#18A6A1]/40 hover:border-[#18A6A1] shadow-2xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
