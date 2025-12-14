/**
 * Wallet Utilities
 * 
 * Helper functions for the immutable ledger wallet system
 */

// ==========================================
// Types
// ==========================================

export interface Transaction {
  id: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  timestamp: string;
  reference: {
    assetUid?: string;
    stripePaymentId?: string;
    description?: string;
  };
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  transactions: Transaction[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Transaction ID Generation
// ==========================================

/**
 * Generate a unique, hash-like transaction ID
 * Format: TX_<timestamp>_<random>_<checksum>
 * 
 * This mimics blockchain-style CIDs without actual blockchain
 */
export function createTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const random2 = Math.random().toString(36).substring(2, 6).toUpperCase();

  // Simple checksum (sum of char codes mod 36)
  const combined = timestamp + random;
  const checksum = Array.from(combined)
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
    .toString(36)
    .toUpperCase()
    .slice(-2);

  return `TX_${timestamp}_${random}_${random2}_${checksum}`;
}

/**
 * Validate transaction ID format
 */
export function isValidTransactionId(id: string): boolean {
  return /^TX_[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]{2}$/.test(id);
}

// ==========================================
// Ledger Validation
// ==========================================

/**
 * Verify the integrity of a wallet's transaction ledger
 * Ensures:
 * - All transactions have valid IDs
 * - Running balance matches final balance
 * - No gaps in transaction timestamps
 */
export function verifyLedgerIntegrity(wallet: Wallet): {
  valid: boolean;
  errors: string[];
  calculatedBalance: number;
} {
  const errors: string[] = [];
  let calculatedBalance = 0;
  let lastTimestamp = 0;

  for (let i = 0; i < wallet.transactions.length; i++) {
    const tx = wallet.transactions[i];

    // Validate transaction ID
    if (!tx.id || tx.id.length < 10) {
      errors.push(`Transaction ${i}: Invalid ID format`);
    }

    // Validate type
    if (!["DEBIT", "CREDIT"].includes(tx.type)) {
      errors.push(`Transaction ${i}: Invalid type "${tx.type}"`);
    }

    // Validate amount
    if (typeof tx.amount !== "number" || tx.amount <= 0) {
      errors.push(`Transaction ${i}: Invalid amount "${tx.amount}"`);
    }

    // Update balance
    if (tx.type === "CREDIT") {
      calculatedBalance += tx.amount;
    } else {
      calculatedBalance -= tx.amount;
    }

    // Check timestamp ordering (append-only verification)
    const txTimestamp = new Date(tx.timestamp).getTime();
    if (txTimestamp < lastTimestamp) {
      errors.push(
        `Transaction ${i}: Timestamp out of order (possible tampering)`
      );
    }
    lastTimestamp = txTimestamp;
  }

  // Verify final balance
  if (Math.abs(calculatedBalance - wallet.balance) > 0.01) {
    errors.push(
      `Balance mismatch: stored ${wallet.balance}, calculated ${calculatedBalance}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    calculatedBalance,
  };
}

// ==========================================
// Transaction Builders
// ==========================================

/**
 * Create a purchase transaction object
 */
export function createPurchaseTransaction(
  amount: number,
  assetUid: string,
  stripePaymentId: string,
  description?: string
): Omit<Transaction, "timestamp"> {
  return {
    id: createTransactionId(),
    type: "DEBIT",
    amount,
    reference: {
      assetUid,
      stripePaymentId,
      description: description || `Artwork purchase: ${assetUid}`,
    },
  };
}

/**
 * Create a deposit transaction object
 */
export function createDepositTransaction(
  amount: number,
  stripePaymentId?: string,
  description?: string
): Omit<Transaction, "timestamp"> {
  return {
    id: createTransactionId(),
    type: "CREDIT",
    amount,
    reference: {
      stripePaymentId,
      description: description || "Wallet deposit",
    },
  };
}

// ==========================================
// Balance Utilities
// ==========================================

/**
 * Calculate balance from transactions (for verification)
 */
export function calculateBalanceFromTransactions(
  transactions: Transaction[]
): number {
  return transactions.reduce((balance, tx) => {
    if (tx.type === "CREDIT") {
      return balance + tx.amount;
    } else {
      return balance - tx.amount;
    }
  }, 0);
}

/**
 * Get transaction history summary
 */
export function getTransactionSummary(transactions: Transaction[]): {
  totalDeposits: number;
  totalPurchases: number;
  transactionCount: number;
  lastTransaction?: Transaction;
} {
  let totalDeposits = 0;
  let totalPurchases = 0;

  transactions.forEach((tx) => {
    if (tx.type === "CREDIT") {
      totalDeposits += tx.amount;
    } else {
      totalPurchases += tx.amount;
    }
  });

  return {
    totalDeposits,
    totalPurchases,
    transactionCount: transactions.length,
    lastTransaction: transactions[transactions.length - 1],
  };
}

