import { describe, it, expect, vi } from 'vitest';
import { preventOverlap, OverlapScheduler } from '../src/index.js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('preventOverlap', () => {
  it('should run a simple function normally', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const wrapped = preventOverlap(fn);
    const result = await wrapped();
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should skip overlapping execution by default', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      await delay(50);
      return 'done';
    };
    const onOverlap = vi.fn();
    const wrapped = preventOverlap(fn, { strategy: 'skip', onOverlap });

    // Call first (runs)
    const p1 = wrapped();
    // Call second (overlaps, should be skipped)
    const p2 = wrapped();

    const r1 = await p1;
    const r2 = await p2;

    expect(r1).toBe('done');
    expect(r2).toBeUndefined();
    expect(callCount).toBe(1);
    expect(onOverlap).toHaveBeenCalledWith({ strategy: 'skip' });
  });

  it('should reject overlapping execution when strategy is reject', async () => {
    const fn = async () => {
      await delay(50);
      return 'done';
    };
    const onOverlap = vi.fn();
    const wrapped = preventOverlap(fn, { strategy: 'reject', onOverlap });

    const p1 = wrapped();
    const p2 = wrapped();

    // Attach a dummy catch handler to prevent V8 from complaining about unhandled rejection before assertion
    p2.catch(() => {});

    await expect(p1).resolves.toBe('done');
    await expect(p2).rejects.toThrow('Overlapping execution rejected.');
    expect(onOverlap).toHaveBeenCalledWith({ strategy: 'reject' });
  });

  it('should queue execution when strategy is queue', async () => {
    let callCount = 0;
    const fn = async (val: string) => {
      callCount++;
      await delay(50);
      return val;
    };
    const onOverlap = vi.fn();
    const wrapped = preventOverlap(fn, { strategy: 'queue', onOverlap });

    const p1 = wrapped('first');
    const p2 = wrapped('second');
    const p3 = wrapped('third'); // Overwrites second

    const r1 = await p1;
    const r2 = await p2;
    const r3 = await p3;

    expect(r1).toBe('first');
    expect(r2).toBeUndefined(); // Overwritten
    expect(r3).toBe('third');
    expect(callCount).toBe(2); // 'first' then 'third'
    expect(onOverlap).toHaveBeenCalledTimes(2);
  });

  it('should release lock even if function throws', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const onError = vi.fn();
    const wrapped = preventOverlap(fn, { onError });

    await expect(wrapped()).rejects.toThrow('fail');
    expect(onError).toHaveBeenCalledTimes(1);

    // Should be able to execute again because lock was released
    const fn2 = vi.fn().mockResolvedValue('success');
    const wrapped2 = preventOverlap(fn2);
    await expect(wrapped2()).resolves.toBe('success');
  });
});

describe('OverlapScheduler', () => {
  it('should run recurring task with intervals', async () => {
    let runs = 0;
    const scheduler = new OverlapScheduler(async () => {
      runs++;
      await delay(10);
    }, { intervalMs: 20 });

    scheduler.start(true); // immediate run
    await delay(35);
    scheduler.stop();

    expect(runs).toBeGreaterThanOrEqual(1);
    expect(scheduler.isActive()).toBe(false);
  });
});
