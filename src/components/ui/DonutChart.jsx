/**
 * DonutChart - CSS conic-gradient based donut chart for profile/distribution display
 * @param {Object} props
 * @param {Array} props.data - Array of { title, count, percentage }
 * @param {string} props.title - Chart title
 * @param {number} props.size - Size of the donut (default: 140)
 * @param {Array} props.colors - Array of colors (default: predefined palette)
 */
export function DonutChart({ data = [], title, size = 140, colors }) {
  // Default color palette
  const defaultColors = [
    '#ed7133', // Orange - Người Toàn Diện
    '#f4b27b', // Light orange - Thế mạnh
    '#93b8a2', // Green - Chưa khám phá
    '#8c93b7', // Purple
    '#6c9c89', // Teal
    '#c97874', // Red
  ];

  const palette = colors || defaultColors;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center">
        {title && <h3 className="text-[13px] text-[#7a8799] font-semibold mb-3">{title}</h3>}
        <div className="flex items-center justify-center text-[11px] text-[#a2a6ae]" style={{ width: size, height: size }}>
          Chưa có dữ liệu
        </div>
      </div>
    );
  }

  // Calculate conic-gradient
  const segments = [];
  let currentAngle = 0;

  data.forEach((item, index) => {
    const angle = (item.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    const color = palette[index % palette.length];

    // Convert degrees to percentage for conic-gradient
    const startPercent = (startAngle / 360) * 100;
    const endPercent = (endAngle / 360) * 100;

    segments.push(`${color} ${startPercent}% ${endPercent}%`);
    currentAngle = endAngle;
  });

  const gradient = segments.join(', ');

  // Calculate total count
  const total = data.reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <div className="w-full">
      {title && <h3 className="text-[13px] text-[#7a8799] font-semibold mb-3">{title}</h3>}

      <div className="flex items-center gap-5">
        {/* Donut Chart */}
        <div
          className="relative rounded-full shrink-0 grid place-items-center"
          style={{ width: size, height: size }}
          role="img"
          aria-label={`Biểu đồ phân bố với ${data.length} loại`}
        >
          {/* Background circle */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: `conic-gradient(${gradient || '#e5e7eb 0% 100%'})` }}
          />
          {/* Center hole */}
          <div className="absolute rounded-full bg-white flex flex-col items-center justify-center"
            style={{ width: size * 0.55, height: size * 0.55 }}
          >
            <strong className="text-[22px] font-semibold text-[#303641]">
              {total}
            </strong>
            <span className="text-[9px] text-[#a2a6ae]">sinh viên</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0 space-y-2">
          {data.map((item, index) => (
            <div key={item.title || index} className="flex items-center gap-[8px] text-[10.7px] text-[#8d94a0]">
              <span
                className="w-1.5 h-1.5 rounded-[2px] shrink-0"
                style={{ background: palette[index % palette.length] }}
              />
              <span className="truncate">{item.title}</span>
              <strong className="ml-auto text-[11px] text-[#596370] font-medium whitespace-nowrap">
                {item.percentage?.toFixed(1)}%
              </strong>
              <small className="w-[30px] text-right text-[10px] text-[#b4b8c0] whitespace-nowrap">
                ({item.count})
              </small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DonutChart;
