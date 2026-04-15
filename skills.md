# UCP Analysis Instructions for AI (Production Version)

## Objective

Analyze a software requirements document and extract:

- Actors (external entities)
- Use Cases (functional requirements)
- Transaction counts per use case
- Complexity classification
- UCP metrics (UAW, UUCW, UUCP, TCF, ECF, UCP)

---

# Step 1: Identify Actors

## Definition
An Actor is any **external entity interacting with the system**.

## Classification Rules (STRICT)

| Type | Description | Weight |
|------|------------|--------|
| Simple | External system with simple API interaction (stateless, single function) | 1 |
| Average | Normal human user interacting via UI | 2 |
| Complex | Admin, Manager, or user with multi-step workflows | 3 |

## External System Rules

- Simple (1): Email Service, Notification Service, Logging Service
- Complex (3): Payment Gateway, Banking System, Financial Systems, ERP, SAP

## Human Actor Rules

- Average (2): Normal users (Customer, User, Client)
- Complex (3): Admin, Manager, Supervisor, Operator with control privileges

## IMPORTANT RULE

DO NOT include internal system components as actors.

Valid actors must be external to the system only.

---

# Step 2: Identify Use Cases

Each **functional requirement = one use case**

A use case represents a complete goal achieved by a user interacting with the system.

---

# Step 3: Transaction Counting (CRITICAL CORE RULE)

## Definition

A transaction is any meaningful system interaction:

- User input
- System validation
- Data processing
- Database query
- External API call
- System response

---

## CRITICAL RULE

You MUST NOT assume 1 use case = 1 transaction.

You MUST estimate real workflow steps.

---

## Transaction Examples

### Book Room example:
- Select room
- Validate availability
- Enter booking details
- Calculate price
- Process payment
- Confirm booking
- Send notification

→ 6–7 transactions

---

## Transaction Estimation Table

| Use Case Type | Transactions |
|---------------|-------------|
| Login/Logout | 2–3 |
| Registration | 3–5 |
| Search/Browse | 3–5 |
| View Details | 2–3 |
| Add/Edit/Delete | 4–6 |
| Booking/Checkout | 5–8 |
| Payment | 5–7 |
| Admin Management | 6–10 |
| Reports | 4–7 |
| Notification/Email | 2–3 |

---

## Underestimation Rule (VERY IMPORTANT)

If a use case has fewer than 3 transactions:
→ Re-evaluate and increase estimation

---

# Step 4: Complexity Classification

## STRICT RULES

| Complexity | Transactions | Weight |
|------------|-------------|--------|
| Simple | 1–3 | 5 |
| Average | 4–7 | 10 |
| Complex | 8+ | 15 |

---

## Important Rules

- NEVER default to Simple
- Booking, Payment, Admin flows are rarely Simple
- Complex workflows must include multiple system steps

---

# Step 5: UCP Calculation

- UAW = sum(actor weights)
- UUCW = sum(use case weights)
- UUCP = UAW + UUCW
- TCF = 1.0 (default unless specified)
- ECF = 1.0 (default unless specified)
- UCP = UUCP × TCF × ECF

---

# Step 6: Output Format (STRICT JSON ONLY)

Return ONLY valid JSON. No explanations.

```json
{
  "actors": [
    {
      "name": "Actor Name",
      "type": "simple | average | complex"
    }
  ],
  "use_cases": [
    {
      "name": "Use Case Name",
      "transactions": 5
    }
  ]
}
```
