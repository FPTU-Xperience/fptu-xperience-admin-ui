export function Panel({ title, description, action, children, className = '' }) {
  return (
    <section className={`bg-white border border-border rounded-xl overflow-hidden ${className}`}>
      {title && (
        <div className="flex justify-between items-center gap-[15px] px-[18px] sm:px-[22px] pt-5 pb-[13px]">
          <div>
            <h2 className="text-[13px] sm:text-[14px] tracking-[-0.15px] font-semibold">{title}</h2>
            {description && (
              <p className="text-[10px] sm:text-[10.5px] text-[#a0a5ae] mt-[6px]">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
