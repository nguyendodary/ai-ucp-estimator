# UCP Analysis Instructions for AI

## Objective

Analyze a software requirements document and extract:

- Actors
- Use Cases (with transaction counts)
- Complexity classification
- UCP metrics (UAW, UUCW, UUCP, TCF, ECF, UCP)

---

## Step 1: Identify Actors

### Definition

An **Actor** is an external entity that interacts with the system.

### Classification Rules

| Type    | Description                                                 | Weight |
| ------- | ----------------------------------------------------------- | ------ |
| Simple  | External system with simple API interaction                  | 1      |
| Average | Human using system via UI                                    | 2      |
| Complex | Human with complex interactions or Admin/Manager roles     | 3      |

### Important Rules

- Customer/User → **Average (2)**
- Admin/Manager → **Complex (3)**
- External systems (Payment Gateway, Email Service) → **Simple (1)**

---

## Step 2: Identify Use Cases

Each functional requirement listed in the document is a use case.

---

## Step 3: Count Transactions (CRITICAL)

### Definition

A **Transaction** is a meaningful interaction between actor and system. This includes:

- User input/validation
- Data processing
- Database access
- System response/output

### Common Transaction Estimates

| Use Case Type          | Typical Transactions |
| ---------------------- | -------------------- |
| Login/Logout          | 2–3                  |
| Registration           | 3–5                  |
| Search/Browse          | 3–4                  |
| View Details           | 2–3                  |
| Add/Edit Record        | 4–6                  |
| Delete/Cancel          | 3–4                  |
| Checkout/Payment       | 5–7                  |
| Admin Management       | 5–10                 |
| Reports                | 4–7                  |
| Send Email/Notification| 2–3                  |

### Key Rule

DO NOT assume 1 use case = 1 transaction. A single use case like "Book Room" involves:
- Select room
- Enter details
- Validate availability
- Calculate price
- Process payment
- Confirm booking
- Send confirmation

That is 6–7 transactions, making it COMPLEX (weight: 15).

---

## Step 4: Classify Use Case Complexity

### STRICT RULES

| Complexity | Transactions | Weight |
| ---------- | ------------ | ------ |
| Simple     | 1–3          | 5      |
| Average    | 4–7          | 10     |
| Complex    | 8+           | 15     |

---

## Step 5: UCP Calculation

- UAW = sum(actor weights)
- UUCW = sum(use case weights)
- UUCP = UAW + UUCW
- TCF = 1.0 (default)
- ECF = 1.0 (default)
- UCP = UUCP × TCF × ECF

---

## Step 6: Output Format (STRICT JSON)

Return ONLY valid JSON with this schema:

```json
{
  "actors": [
    {"name": "Actor Name", "type": "simple|average|complex"}
  ],
  "use_cases": [
    {"name": "Use Case Name", "transactions": number}
  ]
}
```

---

## Example Analysis

### Input:
"Online Hotel Booking: Customers can search hotels, view room details, book rooms and make payments. Hotel managers manage rooms and bookings. Admin manages users."

### Analysis:

**Actors:**
- Customer → Average (2)
- Hotel Manager → Complex (3)
- Admin → Complex (3)
- Payment Gateway → Simple (1)
- Email Service → Simple (1)

**Use Cases (with transactions):**
- Search Hotels → 4 transactions → Average (10)
- View Room Details → 3 transactions → Simple (5)
- Book Room → 6 transactions → Average (10)
- Make Payment → 5 transactions → Average (10)
- Cancel Booking → 4 transactions → Average (10)
- Manage Rooms → 7 transactions → Average (10)
- Manage Bookings → 6 transactions → Average (10)
- Manage Users → 6 transactions → Average (10)
- Send Confirmation → 2 transactions → Simple (5)

**Calculation:**
- UAW = 2+3+3+1+1 = 10
- UUCW = 10+5+10+10+10+10+10+10+5 = 80
- UUCP = 90
- UCP = 90

---

## Common Mistakes to Avoid

- ❌ Setting all transactions to 1
- ❌ Setting all use cases as Simple
- ❌ Ignoring Admin/Manager complexity
- ❌ Underestimating booking/checkout transactions

---

## Final Instruction

Analyze each use case independently. Estimate transactions based on what the use case actually does. Be realistic — do not under-estimate.
