import { buildAutoSteps, scoreConversionEvent, detectSiteType } from '../auto-funnel';
import { goalKey, funnelKey, reportKey } from '../report-identity';

const vc = (value: any, count = 1) => ({ value, count });

describe('scoreConversionEvent', () => {
  it('drops UI noise', () => {
    expect(scoreConversionEvent('Clicked: Close', 100, 100)).toBe(-1);
    expect(scoreConversionEvent('Clicked: Menu', 50, 100)).toBe(-1);
    expect(scoreConversionEvent('Clicked: Accept cookies', 50, 100)).toBe(-1);
  });

  it('prefers real conversions over consideration', () => {
    const conv = scoreConversionEvent('Clicked: Start free trial', 10, 100);
    const cons = scoreConversionEvent('Clicked: Pricing', 10, 100);
    expect(conv).toBeGreaterThan(cons);
  });

  it('boosts Submitted: forms', () => {
    const sub = scoreConversionEvent('Submitted: signup', 10, 100);
    const click = scoreConversionEvent('Clicked: signup', 10, 100);
    expect(sub).toBeGreaterThan(click);
  });

  it('is null-safe', () => {
    expect(scoreConversionEvent(null as any, 5, 10)).toBe(-1);
    expect(scoreConversionEvent(undefined as any, 5, 10)).toBe(-1);
    expect(scoreConversionEvent('', 5, 10)).toBe(-1);
  });
});

describe('detectSiteType', () => {
  it('single-page when few meaningful paths', () => {
    expect(detectSiteType([vc('/', 100), vc('/privacy', 2)]).isSinglePage).toBe(true);
  });

  it('multipage when many paths', () => {
    const pages = [
      vc('/', 9),
      vc('/pricing', 8),
      vc('/features', 7),
      vc('/docs', 6),
      vc('/blog', 5),
    ];
    expect(detectSiteType(pages).isSinglePage).toBe(false);
  });
});

describe('buildAutoSteps', () => {
  const pages = [vc('/', 100)];

  it('never picks noise as the conversion', () => {
    const { steps } = buildAutoSteps(pages, [
      vc('Clicked: Close', 500),
      vc('Clicked: Claim founding spot', 3),
    ]);
    expect(steps.map(s => s.value)).toContain('Clicked: Claim founding spot');
    expect(steps.map(s => s.value)).not.toContain('Clicked: Close');
  });

  it('survives null/undefined event values', () => {
    const { steps } = buildAutoSteps(
      [vc('/', 10), vc(null, 2)],
      [vc(null, 5), vc(undefined, 2), vc('Clicked: Sign up', 4)],
    );
    expect(steps.map(s => s.value)).toEqual(['/', 'Clicked: Sign up']);
  });

  it('a saved goal beats a higher-keyword-scored event', () => {
    const events = [
      vc('Clicked: Start free trial', 50), // conversion keyword, popular
      vc('Clicked: Claim founding spot', 5), // saved goal
    ];
    const without = buildAutoSteps(pages, events);
    expect(without.steps[without.steps.length - 1].value).toBe('Clicked: Start free trial');

    const withGoal = buildAutoSteps(pages, events, ['Clicked: Claim founding spot']);
    expect(withGoal.steps[withGoal.steps.length - 1].value).toBe('Clicked: Claim founding spot');
  });

  it('goal boost never resurrects noise', () => {
    const { steps } = buildAutoSteps(
      pages,
      [vc('Clicked: Close', 500), vc('Clicked: Sign up', 2)],
      ['Clicked: Close'],
    );
    expect(steps.map(s => s.value)).not.toContain('Clicked: Close');
  });
});

describe('report-identity', () => {
  it('goalKey is case/whitespace-insensitive', () => {
    expect(goalKey({ type: 'event', value: ' Clicked: Sign Up ' })).toBe(
      goalKey({ type: 'event', value: 'clicked: sign up' }),
    );
  });

  it('funnelKey covers window + ordered steps', () => {
    const a = funnelKey({
      window: 60,
      steps: [
        { type: 'path', value: '/' },
        { type: 'event', value: 'X' },
      ],
    });
    const b = funnelKey({
      window: 60,
      steps: [
        { type: 'path', value: '/' },
        { type: 'event', value: 'x' },
      ],
    });
    const c = funnelKey({
      window: 30,
      steps: [
        { type: 'path', value: '/' },
        { type: 'event', value: 'X' },
      ],
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('reportKey only dedupes goals and funnels', () => {
    expect(reportKey('goal', { type: 'event', value: 'x' })).not.toBeNull();
    expect(reportKey('funnel', { window: 60, steps: [] })).not.toBeNull();
    expect(reportKey('journey', { steps: 5 })).toBeNull();
  });

  it('keys are null-safe', () => {
    expect(goalKey(null)).toBe('|');
    expect(funnelKey(undefined)).toBe('0|');
  });
});
