# Dino Wallet Service

A closed-loop digital wallet system built with **Node.js**, **Express**, and **PostgreSQL**. It features ACID-compliant transactions, double-entry bookkeeping, and a full role-based dashboard.

## Prerequisites

To run this project without issues, please ensure your environment meets the following requirements:

* **Node.js:** v24.11.1
* **Docker:** v20.10.24
* **Docker Compose:** v1.29.2

> **Note:** The project uses `postgres:15-alpine` which is automatically handled by Docker.

---

## Quick Start

1. **Clone and Install:**
Run the following command to spin up the database and start the server:
```bash
docker-compose up -d && npm install && npm run dev

```


2. **Access the Application:**
Open your browser and navigate to:
**http://localhost:3001**
3. **Troubleshooting (Port Conflicts):**
If the database fails to start, port `5432` might be in use.
* **Step 1:** Stop existing containers and volumes.
```bash
docker-compose down -v

```


* **Step 2:** Open `docker-compose.yml` and change the port mapping:
```yaml
ports:
  - "5438:5432"  # Change host port to 5438

```


* **Step 3:** Update `.env` file to match the new port:
```env
DATABASE_URL=postgres://dino_user:dino_password@localhost:5438/wallet_db

```


* **Step 4:** Restart the application:
```bash
docker-compose up -d && npm install && npm run dev

```





> **Note:** The `.env` file is included in this repository for ease of review. It does not contain sensitive production keys.

---

## Login Credentials

Use the following credentials to test the different user roles:

| Role | Email | Password | Features |
| --- | --- | --- | --- |
| **User** | `rajnishad24082003@gmail.com` | `raj123` | View Balance, Spend Funds (User -> Revenue) |
| **Admin** | `treasury@dino.com` | `raj123` | View All Users, Grant Funds (Treasury -> User) |

---

## Engineering & Architecture

### 1. ACID Compliance & Atomic Transactions

Money never disappears. Every transaction is a **single atomic unit** of work.

* **Method:** We use `BEGIN`, `COMMIT`, and `ROLLBACK` blocks in PostgreSQL.
* **Safety:** If any step fails (e.g., deducting balance works but adding to ledger fails), the entire transaction is rolled back, ensuring data integrity.
* **Concurrency:** We implement **Pessimistic Locking** (`SELECT ... FOR UPDATE`) on wallet rows. This prevents race conditions where two simultaneous requests could spend the same balance twice.

**Implementation (Source: `src/services/walletService.ts`):**

```typescript
export class WalletService {
  static async executeTransfer(params: TransferParams) {
    const client = await pool.connect();
    // Sort keys to prevent Deadlocks
    const lockOrder = [params.sourceWalletId, params.targetWalletId].sort();

    try {
      await client.query('BEGIN');

      // Idempotency Check
      const check = await client.query('SELECT id FROM transactions WHERE idempotency_key = $1', [params.idempotencyKey]);
      if (check.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: true, message: 'Duplicate' };
      }

      // Pessimistic Locking
      for (const id of lockOrder) {
        await client.query('SELECT id FROM wallets WHERE id = $1 FOR UPDATE', [id]);
      }

      // Balance Check
      const balanceRes = await client.query('SELECT balance FROM wallets WHERE id = $1', [params.sourceWalletId]);
      if (parseFloat(balanceRes.rows[0].balance) < params.amount) {
        throw new Error('Insufficient balance');
      }

      // Atomic Ledger Updates
      const tx = await client.query(
        'INSERT INTO transactions (idempotency_key, type, description) VALUES ($1, $2, $3) RETURNING id',
        [params.idempotencyKey, params.type, params.description]
      );
      const txId = tx.rows[0].id;

      await client.query('INSERT INTO ledger_entries (transaction_id, wallet_id, amount) VALUES ($1, $2, $3), ($1, $4, $5)', 
        [txId, params.sourceWalletId, -params.amount, params.targetWalletId, params.amount]);

      await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [params.amount, params.sourceWalletId]);
      await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [params.amount, params.targetWalletId]);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

```

### 2. Idempotency (Double-Spend Protection)

To ensure reliability over flaky networks, every transaction requires a unique `Idempotency-Key` header.

* **Implementation:** Before processing, we check the `transactions` table for the key.
* **Result:** If a request is retried (e.g., user clicks "Pay" twice), the second request is detected as a duplicate and rejected immediately without touching the balance.

![HLD](assets/HLD.png)

### 3. Double-Entry Ledger

We track money movement using a strict Source/Destination model:

* **System Treasury:** Infinite source of funds (Mint).
* **System Revenue:** Sink for user spending (Profit).
* **User Wallet:** Holds user funds.
* *Rule:* Sum of all `ledger_entries` always equals 0.

---

## Project Structure

```text
src/
├── config/        # Database connection pool
├── controllers/   # Request handlers (Input validation, Response formatting)
├── middleware/    # JWT Auth & Role checks
├── services/      # Core Business Logic (The Atomic Transaction block)
├── routes/        # API & View definitions
└── views/         # Server-Side Rendered UI (EJS + Tailwind)

```

## Dashboard Previews

### System Admin Dashboard

![Admin Dashboard](assets/admin-dashboard.png)

### User Dashboard

![User Dashboard](assets/user-dashboard.png)
