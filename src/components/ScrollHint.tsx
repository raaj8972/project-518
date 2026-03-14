import './ScrollHint.css';

export default function ScrollHint() {
  return (
    <div className="rc-scroll-hint" role="status" aria-label="Scroll to explore">
      <div className="rc-scroll-mouse">
        <div className="rc-scroll-wheel"></div>
      </div>
      <div className="rc-scroll-arrows">
        <div className="rc-scroll-arrow"></div>
        <div className="rc-scroll-arrow"></div>
        <div className="rc-scroll-arrow"></div>
      </div>
      <div className="rc-scroll-text">SCROLL</div>
    </div>
  );
}
