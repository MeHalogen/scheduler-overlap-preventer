# scheduler-overlap-preventer

> **Why use scheduler-overlap-preventer?**
> Standard `setInterval` runs tasks blindly based on clock time. If an asynchronous task (like a database backup or API sync) takes longer than the interval time, multiple execution cycles run concurrently. This leads to race conditions, double operations, memory leaks, and database locks.

This library enforces a mutex-like single-concurrency lock on interval tasks. It guarantees that the next execution cycle will only start *after* the previous async promise resolves, safely delaying overlapping runs.

---

## ⚡ Features
* **Mutex lock for async intervals and timers**
* **Prevents concurrent executions of overlapping runs**
* **Configurable queueing or dropping of overlapping executions**
* **Detailed event logging hook for delayed tasks**
* **TypeScript-first ESM with correct typings**

---

## 📦 Installation
```bash
npm i scheduler-overlap-preventer
```

---

## 🚀 Usage
```javascript
import { preventOverlap, OverlapScheduler } from 'scheduler-overlap-preventer';

// Example 1: Basic Wrapper
const safeTask = preventOverlap(async () => {
  console.log('Task started...');
  await new Promise(r => setTimeout(r, 2000)); // Simulating long task
  console.log('Task completed.');
});

// Even if called multiple times rapidly, it only executes one at a time
setInterval(safeTask, 500);
```

---

## ⚙️ API Reference
### preventOverlap(fn, options?)
* `fn`: `() => Promise<any>` - The async function to guard.
* `options`: `{ onOverlap?: () => void }` - Callback when overlap is prevented.
* Returns a guarded async function.

---

## 📺 Demonstration
![Terminal Demo](./demo.gif)

---

## 📄 License
MIT License.
