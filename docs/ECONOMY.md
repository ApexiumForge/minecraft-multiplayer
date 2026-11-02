# Economy

All values are integer Coins. New players receive 250 once through an idempotent ledger entry. Personal wallets are authoritative; BentoBox Bank is not a second currency source.

Buy price must exceed sell price. The server looks up price and material; browsers never submit trusted prices. Wallet changes use transactions, nonnegative checks, and unique idempotency keys. Ledger entries are append-only. Sale credit occurs only after durable inventory-removal confirmation. Ambiguous bridge operations are quarantined.
