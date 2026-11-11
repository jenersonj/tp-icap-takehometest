-- Human-readable trade references (TRD-100001, ...) come from a sequence so concurrent
-- creates never collide. The seeder moves it past the seeded references.
CREATE SEQUENCE IF NOT EXISTS "trade_ref_seq" START WITH 100001 INCREMENT BY 1;
