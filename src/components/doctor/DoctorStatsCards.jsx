import React from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';

export default function DoctorStatsCards({ stats = {}, activeFilter = 'all', onSelectFilter }) {
  const cards = [
    {
      id: 'all',
      title: 'Total Patients',
      value: stats.total_patients || 0,
      label: 'Registered Today',
      icon: Users,
      color: 'text-[#18A6A1]',
      bg: 'bg-[#EAFafa]',
      border: 'border-[#18A6A1]/20',
      activeRing: 'ring-2 ring-[#18A6A1]'
    },
    {
      id: 'awaiting_review',
      title: 'Awaiting Review',
      value: stats.awaiting_review || 0,
      label: 'Needs Verification',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      activeRing: 'ring-2 ring-amber-500'
    },
    {
      id: 'completed',
      title: 'Completed Histories',
      value: stats.completed_histories || 0,
      label: 'Consultation Ready',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      activeRing: 'ring-2 ring-emerald-500'
    },
    {
      id: 'red_flags',
      title: 'Red Flags',
      value: stats.red_flags_count || 0,
      label: 'Urgent Attention Required',
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      activeRing: 'ring-2 ring-red-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;

        return (
          <div
            key={card.id}
            onClick={() => onSelectFilter && onSelectFilter(card.id)}
            className={`p-5 rounded-3xl bg-white border transition-all cursor-pointer shadow-soft-sm hover:shadow-soft-md hover:-translate-y-0.5 ${
              isActive ? `${card.border} ${card.activeRing}` : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`w-9 h-9 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center shadow-2xs`}>
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#17385E] tracking-tight">
                {card.value}
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {card.label}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Filter view</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
