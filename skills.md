# UCP Analysis Instructions for AI

## Objective

Analyze a software requirements document and extract:

- Actors
- Use Cases
- Complexity classification
- UCP metrics (UAW, UUCW, UUCP, TCF, ECF, UCP)

---

## Step 1: Identify Actors

### Definition

An **Actor** is an external entity that interacts with the system.

### Classification Rules

| Type    | Description                                                 | Weight |
| ------- | ----------------------------------------------------------- | ------ |
| Simple  | Another system with API interaction                         | 1      |
| Average | Human using system via UI                                   | 2      |
| Complex | Human or system with complex interactions or multiple roles | 3      |

### Important Rules

- Humans using UI → usually **Average (2)**
- External systems (API, services) → usually **Simple (1)** or **Complex (3)** depending on interaction complexity
- Admin roles → often **Complex (3)**

---

## Step 2: Identify Use Cases

### Definition

A **Use Case** is a sequence of actions that provides value to an actor.

---

## Step 3: Count Transactions

### Definition

A **Transaction** is a meaningful interaction between actor and system.

Examples:

- Input data
- System validation
- Data processing
- Output response

---

## Step 4: Classify Use Case Complexity

### STRICT RULES (must follow)

| Complexity | Transactions | Weight |
| ---------- | ------------ | ------ |
| Simple     | 1–3          | 5      |
| Average    | 4–7          | 10     |
| Complex    | 8+           | 15     |

### Critical Instructions

- ALWAYS estimate number of transactions
- DO NOT classify based on description length
- DO NOT guess — infer logically from actions

---

## Step 5: UCP Calculation

### Formulas

- UAW = sum(actor weights)
- UUCW = sum(use case weights)
- UUCP = UAW + UUCW
- TCF = 1.0 (default)
- ECF = 1.0 (default)
- UCP = UUCP × TCF × ECF

---

## Step 6: Output Format (STRICT JSON)

Return ONLY valid JSON. No explanations.

```json
{
  "actors": [
    {
      "name": "Actor Name",
      "complexity": "Simple | Average | Complex",
      "weight": 1
    }
  ],
  "use_cases": [
    {
      "name": "Use Case Name",
      "transactions": 4,
      "complexity": "Average",
      "weight": 10
    }
  ],
  "uaw": 0,
  "uucw": 0,
  "uucp": 0,
  "tcf": 1.0,
  "ecf": 1.0,
  "ucp": 0
}
```

---

## Common Mistakes to Avoid

- Classifying all actors as Complex
- Ignoring external systems as actors
- Underestimating transactions
- Classifying use cases as Simple by default
- Returning text instead of JSON

---

## Quality Checklist

Before returning the result, ensure:

- All actors are identified
- All use cases are extracted
- Each use case has transaction count
- Complexity follows strict rules
- JSON format is valid

---

## Example (Reference Only)

Input:
"User logs in and views dashboard"

Output:

- Transactions: 3
- Complexity: Simple
- Weight: 5

---

## Final Instruction

Be precise, consistent, and deterministic.
Follow rules strictly. Do not improvise.
