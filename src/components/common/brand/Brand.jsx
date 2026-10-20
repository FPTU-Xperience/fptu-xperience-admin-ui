import './Brand.css';
import brandLogo from '../../../assets/fptux.png';

export default function Brand() {
  return (
    <span className="clubhub-brand">
      <img src={brandLogo} alt="FPTU Xperience" width="50" height="50" />
      <span className="clubhub-brand-copy">
        <small className="clubhub-brand-eyebrow">FPTU Xperience</small>
        <span className="clubhub-brand-name">Admin</span>
      </span>
    </span>
  );
}
