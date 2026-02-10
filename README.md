# Dino Wallet Service

A production-grade, closed-loop digital wallet system built with **Node.js**, **Express**, and **PostgreSQL**. It features ACID-compliant transactions, double-entry bookkeeping, and a full role-based dashboard.

## Prerequisites

To run this project without issues, please ensure your environment meets the following requirements:

* **Node.js:** v24.11.1
* **Docker:** v20.10.24
* **Docker Compose:** v1.29.2

> **Note:** The project uses `postgres:15-alpine` which is automatically handled by Docker.

---

## Quick Start

1.  **Clone and Install:**
    Run the following command to spin up the database and start the server:
    ```bash
    docker-compose up -d && npm install && npm run dev
    ```

2.  **Access the Application:**
    Open your browser and navigate to:
    **http://localhost:3001**

> **Note:** The `.env` file is included in this repository for ease of review. It does not contain sensitive production keys.

---

## Login Credentials

Use the following credentials to test the different user roles:

| Role | Email | Password | Features |
| :--- | :--- | :--- | :--- |
| **User** | `rajnishad24082003@gmail.com` | `raj123` | View Balance, Spend Funds (User -> Revenue) |
| **Admin** | `treasury@dino.com` | `raj123` | View All Users, Grant Funds (Treasury -> User) |

---

## Engineering & Architecture

### 1. ACID Compliance & Atomic Transactions
Money never disappears. Every transaction is a **single atomic unit** of work.
* **Method:** We use `BEGIN`, `COMMIT`, and `ROLLBACK` blocks in PostgreSQL.
* **Safety:** If any step fails (e.g., deducting balance works but adding to ledger fails), the entire transaction is rolled back, ensuring data integrity.
* **Concurrency:** We implement **Pessimistic Locking** (`SELECT ... FOR UPDATE`) on wallet rows. This prevents race conditions where two simultaneous requests could spend the same balance twice.

### 2. Idempotency (Double-Spend Protection)
To ensure reliability over flaky networks, every transaction requires a unique `Idempotency-Key` header.
* **Implementation:** Before processing, we check the `transactions` table for the key.
* **Result:** If a request is retried (e.g., user clicks "Pay" twice), the second request is detected as a duplicate and rejected immediately without touching the balance.

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