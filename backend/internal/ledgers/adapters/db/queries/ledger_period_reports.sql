-- name: CreateLedgerPeriodReport :exec
INSERT INTO ledgers.ledger_period_reports (uuid, org_id, snapshot)
VALUES (@uuid, @org_id, @snapshot);

-- name: ListReportFundSourceRows :many
-- One row per fund source of the period. The entry sums include every entry (voided
-- originals and their reversals too), so opening + inflow - outflow = closing holds.
SELECT
    st.fund_source_uuid,
    fs.name AS fund_source_name,
    st.opening_balance,
    st.closing_balance,
    st.reconciled_by,
    st.reconciled_at,
    COALESCE(SUM(e.amount) FILTER (WHERE e.direction = 'inflow'), 0)::numeric(20, 2) AS total_inflow,
    COALESCE(SUM(e.amount) FILTER (WHERE e.direction = 'outflow'), 0)::numeric(20, 2) AS total_outflow
FROM ledgers.fund_source_statements st
JOIN ledgers.fund_sources fs ON fs.uuid = st.fund_source_uuid
LEFT JOIN ledgers.ledger_entries e
       ON e.ledger_period_uuid = st.ledger_period_uuid
      AND e.fund_source_uuid = st.fund_source_uuid
WHERE fs.org_id = @org_id
  AND st.ledger_period_uuid = @ledger_period_uuid
GROUP BY st.uuid, fs.uuid
ORDER BY fs.name, st.uuid;

-- name: ListReportCategoryRows :many
-- Inflow and outflow per category an entry was posted to. Only live entries count: a
-- voided entry and its reversal (status posted, kind reversal) cancel out, so both are skipped.
-- parent_* are set when the entry's category is a sub-category (a tag).
SELECT
    c.uuid AS category_uuid,
    c.name AS category_name,
    c.parent_uuid,
    p.name AS parent_name,
    COALESCE(SUM(e.amount) FILTER (WHERE e.direction = 'inflow'), 0)::numeric(20, 2) AS total_inflow,
    COALESCE(SUM(e.amount) FILTER (WHERE e.direction = 'outflow'), 0)::numeric(20, 2) AS total_outflow
FROM ledgers.ledger_entries e
JOIN ledgers.categories c ON c.uuid = e.category_uuid
LEFT JOIN ledgers.categories p ON p.uuid = c.parent_uuid
WHERE e.org_id = @org_id
  AND e.ledger_period_uuid = @ledger_period_uuid
  AND e.status = 'posted'
  AND e.kind = 'normal'
GROUP BY c.uuid, p.uuid
ORDER BY c.name, c.uuid;

-- name: GetLedgerPeriodReportSnapshot :one
SELECT snapshot
FROM ledgers.ledger_period_reports
WHERE org_id = @org_id
  AND uuid = @uuid;
