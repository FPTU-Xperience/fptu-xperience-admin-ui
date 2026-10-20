import './DonutChart.css';
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
      <div className="donut-chart-content">
        {title && <h3 className="donut-chart-subheading">{title}</h3>}
        <div className="donut-chart-content-2" style={{ width: size, height: size }}>
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
    <div className="donut-chart-content-3">
      {title && <h3 className="donut-chart-subheading">{title}</h3>}

      <div className="donut-chart-content-4">
        {/* Donut Chart */}
        <div
          className="donut-chart-content-5"
          style={{ width: size, height: size }}
          role="img"
          aria-label={`Biểu đồ phân bố với ${data.length} loại`}
        >
          {/* Background circle */}
          <div
            className="donut-chart-content-6"
            style={{ background: `conic-gradient(${gradient || '#e5e7eb 0% 100%'})` }}
          />
          {/* Center hole */}
          <div
            className="donut-chart-content-7"
            style={{ width: size * 0.55, height: size * 0.55 }}
          >
            <strong className="donut-chart-value">{total}</strong>
            <span className="donut-chart-text">sinh viên</span>
          </div>
        </div>

        {/* Legend */}
        <div className="donut-chart-content-8">
          {data.map((item, index) => (
            <div key={item.title || index} className="donut-chart-content-9">
              <span
                className="donut-chart-text-2"
                style={{ background: palette[index % palette.length] }}
              />
              <span className="donut-chart-text-3">{item.title}</span>
              <strong className="donut-chart-value-2">{item.percentage?.toFixed(1)}%</strong>
              <small className="donut-chart-caption">({item.count})</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DonutChart;
