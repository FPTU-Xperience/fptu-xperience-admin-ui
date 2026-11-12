import { Field } from '../../components/ui/index.js';

const experiences = [
  ['Academic', 'Học tập'], ['Research', 'Nghiên cứu'], ['Global', 'Quốc tế'],
  ['CultureSports', 'Thể thao & văn hóa'], ['Community', 'Cộng đồng'],
  ['Entrepreneurship', 'Khởi nghiệp'], ['RealWorldWork', 'Thực chiến dự án (+1)'],
];
const categories = [
  ['', 'Hoạt động khác'], ['workshop', 'Workshop'], ['competition', 'Cuộc thi'], ['talk', 'Hội thảo'],
  ['volunteering', 'Tình nguyện'], ['networking', 'Giao lưu'], ['performance', 'Biểu diễn'], ['sports', 'Thể thao'],
];

export function campusActivityTagSelection(fields) {
  const custom = String(fields.get('discoveryCustom') || '').split(',')
    .map((value) => value.normalize().trim().replace(/\s+/g, ' ')).filter(Boolean);
  if (custom.length > 10 || custom.some((value) => !/^[\p{L}\p{N}][\p{L}\p{M}\p{N} .&+#/_-]{0,39}$/u.test(value))
    || new Set(custom.map((value) => value.toUpperCase())).size !== custom.length) {
    throw new Error('Nhập tối đa 10 tag khác nhau, mỗi tag 1–40 ký tự. Phân cách bằng dấu phẩy.');
  }
  return {
    experience: fields.getAll('discoveryExperience'),
    activityCategory: fields.get('discoveryCategory') || null,
    custom,
  };
}

export default function CampusActivityTags({ selection }) {
  return (
    <fieldset className="activity-lifecycle-description">
      <legend>Tag khám phá</legend>
      <Field label="Thể loại hoạt động">
        <select name="discoveryCategory" defaultValue={selection?.activityCategory === 'other' ? '' : selection?.activityCategory ?? ''}>
          {categories.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </Field>
      <div className="flex flex-wrap gap-3" role="group" aria-label="Loại trải nghiệm">
        {experiences.map(([code, label]) => (
          <label key={code} className="inline-flex items-center gap-1">
            <input type="checkbox" name="discoveryExperience" value={code} defaultChecked={selection?.experience?.includes(code)} />
            {label}
          </label>
        ))}
      </div>
      <Field label="Tag tự thêm" hint="Phân cách bằng dấu phẩy.">
        <input name="discoveryCustom" maxLength={420} defaultValue={selection?.custom?.join(', ')} />
      </Field>
    </fieldset>
  );
}
