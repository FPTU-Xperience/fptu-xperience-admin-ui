export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="flex items-start sm:items-center justify-between flex-wrap sm:flex-nowrap gap-[17px] sm:gap-[25px] mb-[22px] sm:mb-[25px]">
      <div>
        {eyebrow && (
          <div className="text-[9px] sm:text-[10.5px] tracking-[1.3px] font-semibold text-[#959aa4] mb-[9px]">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[25px] sm:text-[26px] tracking-[-1.15px] leading-[1.3] font-[650] text-[#242b38]">
          {title}
        </h1>
        <p className="text-[11px] sm:text-[11.5px] leading-[1.8] sm:leading-normal text-[#9096a1] mt-[9px]">
          {description}
        </p>
      </div>
      <div className="flex gap-[9px] items-center shrink-0 w-full sm:w-auto">{children}</div>
    </div>
  );
}
