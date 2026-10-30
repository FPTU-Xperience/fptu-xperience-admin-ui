import './MockBoundary.css';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { useWorkflow } from '../../../workflows/WorkflowContext.jsx';
import { MOCK_SEMESTERS } from '../../../workflows/mock-data.js';
import { Button } from '../../ui/index.js';

export default function MockBoundary({ children }) {
  const { semester, setFallbackSemester, usesWorkspaceSemester, state, command, canWrite } =
    useWorkflow();
  return (
    <section className="mock-boundary" aria-label="Dữ liệu mô phỏng">
      <div className="mock-boundary-notice">
        <FlaskConical size={19} aria-hidden="true" />
        <div>
          <strong>Chế độ mô phỏng</strong>
          <p>
            Thay đổi chỉ áp dụng trong phiên này, không cập nhật hồ sơ thật.
          </p>
          <small>
            Học kỳ: {semester}
          </small>
        </div>
        <Button
          icon={RotateCcw}
          onClick={() => {
            if (window.confirm('Khôi phục dữ liệu mô phỏng của học kỳ này?')) command('RESET');
          }}
        >
          Đặt lại mẫu
        </Button>
      </div>
      {!usesWorkspaceSemester && (
        <label className="mock-boundary-semester">
          Học kỳ mô phỏng{' '}
          <select value={semester} onChange={(e) => setFallbackSemester(e.target.value)}>
            {MOCK_SEMESTERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      )}
      {!canWrite && (
        <p className="mock-boundary-readonly">
          Chế độ xem: tài khoản cần vai trò CTSV để thử các quyết định nghiệp vụ.
        </p>
      )}
      {state.result && (
        <p
          role={state.result.ok ? 'status' : 'alert'}
          className={state.result.ok ? 'mock-boundary-result' : 'mock-boundary-error'}
        >
          {state.result.message}
        </p>
      )}
      <div key={semester}>{children}</div>
    </section>
  );
}
