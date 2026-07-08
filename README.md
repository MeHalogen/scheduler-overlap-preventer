# scheduler-overlap-preventer

A lightweight, zero-dependency, TypeScript-first utility to prevent overlapping executions of scheduled tasks or async functions in Node.js.

## Installation

```bash
npm install scheduler-overlap-preventer
```

## Features
* **Single Concurrency Execution**: Wrap any asynchronous function to guarantee it never executes concurrently.
* **Flexible Overlap Strategies**: Configure what happens when a task overlaps:
  * `'skip'` (default): Silently skip the execution and return `undefined`.
  * `'queue'`: Queue the latest invocation to run after the active run completes (buffers exactly one execution, overwriting previous ones).
  * `'reject'`: Reject the returned promise with an error immediately.
* **Overlap & Error Hooks**: Get notified on overlap occurrences or task failures.
* **Interval Scheduler**: A lightweight wrapper around `setTimeout` that runs intervals sequentially without overlapping.
* **Zero Dependencies**: Highly performant and small footprint.

## Usage

### 1. Simple Function Wrapper (`skip` strategy)

```typescript
import { preventOverlap } from 'scheduler-overlap-preventer';

const runTask = preventOverlap(async () => {
  console.log('Task started...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('Task finished.');
}, {
  strategy: 'skip',
  onOverlap: ({ strategy }) => console.warn(`Overlap detected! Handled with: ${strategy}`)
});

// Run task twice concurrently
runTask(); // Executes
runTask(); // Overlaps, prints: Overlap detected! Handled with: skip
```

### 2. Queueing Strategy

Queues the last execution to run after the active one completes.

```typescript
import { preventOverlap } from 'scheduler-overlap-preventer';

const processQueue = preventOverlap(async (id: number) => {
  console.log(`Processing ${id}`);
  await new Promise(resolve => setTimeout(resolve, 1000));
}, { strategy: 'queue' });

processQueue(1); // Runs immediately
processQueue(2); // Queued
processQueue(3); // Overwrites 2 in the queue buffer

// Output:
// Processing 1
// (1 second later...)
// Processing 3
```

### 3. Reject Strategy

Rejects the promise if execution overlaps.

```typescript
import { preventOverlap } from 'scheduler-overlap-preventer';

const criticalTask = preventOverlap(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
}, { strategy: 'reject' });

criticalTask().catch(err => {
  // Overlapping execution rejected.
});
```

### 4. Overlap Scheduler

A lightweight interval scheduling wrapper.

```typescript
import { OverlapScheduler } from 'scheduler-overlap-preventer';

const scheduler = new OverlapScheduler(
  async () => {
    // Perform database cleanup or health check
    await new Promise(resolve => setTimeout(resolve, 5000));
  },
  {
    intervalMs: 1000, // Trigger run every 1 second
    strategy: 'skip',
    onError: (err) => console.error('Task failed', err)
  }
);

// Start the scheduler
scheduler.start();

// ... later:
scheduler.stop();
```

## License

MIT
