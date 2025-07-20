# Gas Usage Benchmark for Take Operations

This benchmark measures the gas cost of executing a taker order that matches against N maker orders resting at the same price level.

| DEX                                  | N = 1   | N = 10  | N = 100  |
|--------------------------------------|---------|---------|----------|
| [Clober](https://app.clober.io/)     | 153,941 | 153,941 | 153,941  |
| [Crystal](https://crystal.exchange/) | 143,854 | 228,627 | 1,264,872|
| [Kuru](https://www.kuru.io/)         | 143,738 | 287,695 | 3,925,232|

![result](result.png)

As illustrated in the table and the chart below, Clober’s gas usage remains flat regardless of the number of maker orders matched at the same price tick. This is due to Clober’s architectural design, which guarantees O(1) gas complexity for take operations.

By contrast, other DEX implementations show linear or worse growth in gas cost as the number of matched maker orders increases.

This difference is more than just a performance optimization:
> Clober ensures consistently low execution costs even in realistic market environments, where liquidity is fragmented across many small maker orders submitted by a wide range of participants.

Such fragmented liquidity patterns are common in both traditional and DeFi markets. Without architecture designed for this reality, takers face unpredictable and rising costs. Clober's design avoids this by making gas usage independent of the number of matches.

The core of this efficiency lies in Clober’s custom-built matching engine, LOBSTER, which is designed to operate under strict gas constraints while maintaining high throughput and deterministic performance.

[Understanding LOBSTER: A gas-efficient Onchain Order Book Mechanism](https://blog.monad.xyz/blog/understanding-lobster)

## 🚀 How to Run

1. Install dependencies:

```bash
bun i
```

2. Run benchmark with desired order count:

```bash
N=100 bun run monad-testnet.ts
```

Replace `100` with any number to test with a different number of orders.

3. View results:

```bash
python plot_take_results.py
```

## 🧪 Description

This benchmark script:

- Places `N` limit orders in the same tick on each DEX
- Executes a single `take` operation
- Measures the total gas used
- Stores results in `results/{dex}-take-{N}.json`

## 📁 Output Structure

The output files are saved as JSON in the `results/` directory:

```
results/
├── clober-take-1.json
├── clober-take-10.json
├── clober-take-100.json
├── ...
```

Each file looks like this:

```json
{
  "alias": "clober-take-100",
  "gasUsage": "153941"
}
```