-- The wallet path in POST /jobs writes payments.payment_provider = 'WALLET',
-- but the enum never had that value, so every wallet-funded job 500'd on the
-- payments insert. Add it. (ADD VALUE IF NOT EXISTS is idempotent.)
ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'WALLET';
