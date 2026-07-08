export interface OverlapOptions {
  strategy?: 'skip' | 'queue' | 'reject';
  onOverlap?: (details: { strategy: 'skip' | 'queue' | 'reject' }) => void;
  onError?: (err: Error) => void;
}

export interface SchedulerOptions extends OverlapOptions {
  intervalMs: number;
}

export function preventOverlap<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  options: OverlapOptions = {}
): (...args: Args) => Promise<T | undefined> {
  const strategy = options.strategy ?? 'skip';
  let isRunning = false;
  let queuedCall: {
    args: Args;
    resolve: (value: T | undefined | PromiseLike<T | undefined>) => void;
    reject: (reason?: any) => void;
  } | null = null;

  async function execute(args: Args, resolve: Function, reject: Function) {
    isRunning = true;
    try {
      const result = await fn(...args);
      resolve(result);
    } catch (err: any) {
      if (options.onError) {
        options.onError(err instanceof Error ? err : new Error(String(err)));
      }
      reject(err);
    } finally {
      isRunning = false;
      if (queuedCall) {
        const next = queuedCall;
        queuedCall = null;
        // Execute the next queued call asynchronously
        execute(next.args, next.resolve, next.reject);
      }
    }
  }

  return function (...args: Args): Promise<T | undefined> {
    if (!isRunning) {
      return new Promise<T | undefined>((resolve, reject) => {
        execute(args, resolve, reject);
      });
    }

    if (strategy === 'reject') {
      if (options.onOverlap) {
        options.onOverlap({ strategy: 'reject' });
      }
      return Promise.reject(new Error('Overlapping execution rejected.'));
    }

    if (strategy === 'queue') {
      if (options.onOverlap) {
        options.onOverlap({ strategy: 'queue' });
      }
      if (queuedCall) {
        // Resolve the overwritten call with undefined
        queuedCall.resolve(undefined);
      }
      return new Promise<T | undefined>((resolve, reject) => {
        queuedCall = { args, resolve, reject };
      });
    }

    // Default strategy: 'skip'
    if (options.onOverlap) {
      options.onOverlap({ strategy: 'skip' });
    }
    return Promise.resolve(undefined);
  };
}

export class OverlapScheduler {
  private fn: () => Promise<any>;
  private intervalMs: number;
  private options: OverlapOptions;
  private wrappedFn: () => Promise<any>;
  private timerId: any = null;
  private active = false;

  constructor(fn: () => Promise<any>, options: SchedulerOptions) {
    this.fn = fn;
    this.intervalMs = options.intervalMs;
    this.options = {
      strategy: options.strategy ?? 'skip',
      onOverlap: options.onOverlap,
      onError: options.onError
    };
    this.wrappedFn = preventOverlap(this.fn, this.options);
  }

  start(immediate = false): void {
    if (this.active) return;
    this.active = true;

    const run = async () => {
      if (!this.active) return;
      await this.wrappedFn();
      if (this.active) {
        this.timerId = setTimeout(run, this.intervalMs);
      }
    };

    if (immediate) {
      run();
    } else {
      this.timerId = setTimeout(run, this.intervalMs);
    }
  }

  stop(): void {
    this.active = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  isActive(): boolean {
    return this.active;
  }
}
