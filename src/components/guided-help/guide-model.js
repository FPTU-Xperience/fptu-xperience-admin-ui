export function resolveGuideSteps(plan, queryAll, isVisible) {
  return plan.flatMap((step) => {
    if (!step.element) return [step];
    const element = Array.from(queryAll(step.element)).find(isVisible);
    return element ? [{ ...step, element }] : [];
  });
}

export function isGuideTargetVisible(element) {
  if (
    !element.getClientRects().length ||
    element.closest('[hidden], [inert], [aria-hidden="true"]')
  )
    return false;
  const style = element.ownerDocument.defaultView.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}
