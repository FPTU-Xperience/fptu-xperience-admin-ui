import { ArrowUpRight } from 'lucide-react';

const TONES = {
  orange: 'text-[#e3935d] bg-[#fff5ec]',
  blue: 'text-[#769bca] bg-[#f1f6fd]',
  green: 'text-[#74a491] bg-[#eff8f3]',
  purple: 'text-[#9a84c5] bg-[#f6f2fb]',
  red: 'text-[#c97874] bg-[#fff1ee]',
};

export function StatCard({ label, value, note, icon: Icon, tone = 'orange', change }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 sm:px-[19px] sm:py-[17px]">
      <div className="flex justify-between items-center gap-[6px] sm:gap-2 text-[10px] sm:text-[11.2px] text-[#7d8591]">
        <span>{label}</span>
        <span
          className={`h-7 w-7 sm:h-[31px] sm:w-[31px] rounded-lg grid place-items-center ${TONES[tone]}`}
        >
          <Icon size={19} />
        </span>
      </div>
      <strong className="block text-[28px] 3xl:text-[32px] font-semibold mt-[9px] tracking-[-0.8px] text-[#303641]">
        {value}
      </strong>
      <div className="flex items-center gap-[5px] text-[9px] sm:text-[10px] text-[#9b9fa7] mt-[9px] leading-[1.5]">
        {change && (
          <span className="flex items-center gap-[2px] text-[#59a383]">
            <ArrowUpRight size={13} />
            {change}
          </span>
        )}
        {note}
      </div>
    </div>
  );
}
