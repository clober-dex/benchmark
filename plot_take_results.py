import os
import json
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator, FuncFormatter

RESULTS_DIR = "./results"
metric_key = "gasUsage"

data = {}
all_counts = set()

for filename in os.listdir(RESULTS_DIR):
    if not filename.endswith(".json"):
        continue

    parts = filename.replace(".json", "").split("-")
    if len(parts) != 3:
        continue

    dex, action, count = parts
    if action != "take":
        continue

    filepath = os.path.join(RESULTS_DIR, filename)
    with open(filepath, "r") as f:
        try:
            content = json.load(f)
            gas_str = content.get(metric_key)
            if gas_str is None:
                continue
            gas_val = int(gas_str)
        except (json.JSONDecodeError, ValueError):
            continue

    count_int = int(count)
    all_counts.add(count_int)

    if dex not in data:
        data[dex] = {}
    data[dex][count_int] = gas_val

print(data)
xticks = sorted(all_counts)
plt.figure(figsize=(8, 5))

for dex, results in data.items():
    counts = sorted(results.keys())
    gas_values = [results[c] for c in counts]
    plt.plot(counts, gas_values, marker='o', label=dex)

plt.title("Gas Usage vs Number of Taker Orders per Price Tick")
plt.xlabel("Number of Matched Orders")
plt.ylabel("Gas Usage")
plt.xticks(xticks)
plt.grid(True)
plt.legend()

plt.gca().yaxis.set_major_locator(MaxNLocator(integer=True))
plt.gca().yaxis.set_major_formatter(FuncFormatter(lambda x, _: f"{int(x):,}"))

plt.tight_layout()
plt.show()