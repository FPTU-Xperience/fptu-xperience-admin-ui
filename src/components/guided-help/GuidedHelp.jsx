import { useEffect, useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { resolveGuideSteps, isGuideTargetVisible } from './guide-model.js';
import 'driver.js/dist/driver.css';
import './GuidedHelp.css';

export default function GuidedHelp({
  plan,
  routeKey,
  accountKey,
  inline = false,
  disabled = false,
}) {
  const trigger = useRef(null);
  const instance = useRef(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    mounted.current = true;
    setOpening(false);
    setNotice('');
    return () => {
      mounted.current = false;
      generation.current++;
      instance.current?.destroy();
      instance.current = null;
    };
  }, [routeKey, accountKey]);

  async function start() {
    if (opening || disabled) return;
    if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) {
      setNotice('Đóng hộp thoại hiện tại trước khi mở hướng dẫn.');
      return;
    }
    const request = ++generation.current;
    setOpening(true);
    setNotice('');
    try {
      const { driver } = await import('driver.js');
      if (!mounted.current || request !== generation.current) return;
      instance.current?.destroy();
      const steps = resolveGuideSteps(
        plan,
        (selector) => document.querySelectorAll(selector),
        isGuideTargetVisible,
      );
      if (!steps.length) {
        setNotice('Chưa có hướng dẫn cho màn hình này.');
        return;
      }
      instance.current = driver({
        steps,
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        smoothScroll: false,
        allowClose: true,
        allowKeyboardControl: true,
        disableActiveInteraction: true,
        skipMissingElement: true,
        overlayOpacity: 0.45,
        stagePadding: 6,
        stageRadius: 10,
        popoverClass: 'web-guide-popover',
        showProgress: true,
        progressText: '{{current}} / {{total}}',
        nextBtnText: 'Tiếp theo',
        prevBtnText: 'Quay lại',
        doneBtnText: 'Hoàn tất',
        closeBtnLabel: 'Đóng hướng dẫn',
        onPopoverRender: (popover) => {
          popover.wrapper.setAttribute('lang', 'vi');
        },
        onDestroyStarted: (_element, _step, { driver: tour }) => {
          tour.destroy();
          queueMicrotask(() => {
            if (mounted.current && generation.current === request && trigger.current?.isConnected)
              trigger.current.focus({ preventScroll: true });
          });
        },
      });
      trigger.current?.focus({ preventScroll: true });
      instance.current.drive();
    } catch {
      if (mounted.current && request === generation.current)
        setNotice('Không tải được hướng dẫn. Vui lòng thử lại.');
    } finally {
      if (mounted.current && request === generation.current) setOpening(false);
    }
  }

  return (
    <div className={`web-guide${inline ? ' web-guide--inline' : ''}`}>
      {notice && (
        <p className="web-guide-notice" role="status">
          {notice}
        </p>
      )}
      <button
        ref={trigger}
        className="web-guide-launcher"
        type="button"
        onClick={start}
        disabled={disabled}
        aria-busy={opening}
        aria-label="Hướng dẫn sử dụng"
        title="Hướng dẫn sử dụng"
      >
        <CircleHelp size={19} aria-hidden="true" />
        <span>{opening ? 'Đang mở…' : 'Hướng dẫn'}</span>
      </button>
    </div>
  );
}
