//go:build component

package ledgers_test

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"backend/internal/ledgers/domain"
	ledgersClients "backend/internal/ledgers/ports/http/clients"
	"backend/internal/shared"
	"backend/tests/utils"
)

// applyEntries adds the signed amount of every entry to the running balances.
func applyEntries(balances map[string]decimal.Decimal, fs domain.FundSourceUUID, entries []ledgersClients.LedgerEntryInput) {
	key := fs.String()
	for _, e := range entries {
		if e.Direction == shared.DirectionInflow {
			balances[key] = balances[key].Add(e.Amount)
		} else {
			balances[key] = balances[key].Sub(e.Amount)
		}
	}
}

// requireBalances asserts every fund source balance equals the expected running balance.
func requireBalances(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	expected map[string]decimal.Decimal,
	fundSources ...domain.FundSourceUUID,
) {
	t.Helper()

	for _, fs := range fundSources {
		got := fundSourceBalance(t, clients, token, fs)
		assert.True(t, got.Equal(expected[fs.String()]), "fund source %s: want %s, got %s", fs.String(), expected[fs.String()], got)
	}
}

// requireStatement asserts closing balance and the reconciled state of a fund source's statement.
func requireStatement(
	t *testing.T,
	clients *utils.TestClients,
	token string,
	period domain.LedgerPeriodUUID,
	fs domain.FundSourceUUID,
	closing decimal.Decimal,
	reconciled bool,
) ledgersClients.FundSourceStatement {
	t.Helper()

	st := statementFor(t, listStatements(t, clients, token, period), fs)
	assert.True(t, st.OpeningBalance.Equal(decimal.NewFromInt(1_000_000)), "opening %s", st.OpeningBalance)
	require.NotNil(t, st.ClosingBalance)
	assert.True(t, st.ClosingBalance.Equal(closing), "closing want %s got %s", closing, st.ClosingBalance)

	if reconciled {
		require.NotNil(t, st.ActualBalance)
		assert.True(t, st.ActualBalance.Equal(closing))
		assert.NotNil(t, st.ReconciledAt)
		require.NotNil(t, st.ReconciledBy)
		assert.NotEmpty(t, *st.ReconciledBy)
	} else {
		assert.Nil(t, st.ActualBalance)
		assert.Nil(t, st.ReconciledAt)
		assert.Nil(t, st.ReconciledBy)
	}

	return st
}

func TestLedgerPeriodCriticalFlow(t *testing.T) {
	utils.ResetLedgerPeriods(t)
	clients, token := utils.NewTestClients(t), newUserToken()

	// 1. Create fund sources.
	_, cash := createFundSource(t, clients, token, domain.FundSourceTypeCash)
	_, bank := createFundSource(t, clients, token, domain.FundSourceTypeBank)
	expected := map[string]decimal.Decimal{
		cash.String(): decimal.NewFromInt(1_000_000),
		bank.String(): decimal.NewFromInt(1_000_000),
	}
	requireBalances(t, clients, token, expected, cash, bank)

	// 2. Open the period.
	period := openPeriod(t, clients, token, cash, bank)
	periods := listLedgerPeriods(t, clients, token, nil)
	require.Len(t, periods.Items, 1)
	assert.Equal(t, "opened", periods.Items[0].Status.String())
	assert.True(t, periods.Items[0].OpeningBalance.Equal(decimal.NewFromInt(2_000_000)))

	// 3. Post 12 entries in two batches; balances are checked after each batch.
	type fsBatch struct {
		fs      domain.FundSourceUUID
		entries []ledgersClients.LedgerEntryInput
	}

	batch1 := []fsBatch{
		{cash, []ledgersClients.LedgerEntryInput{
			entryInput(shared.DirectionOutflow, 300_000),
			entryInput(shared.DirectionInflow, 50_000),
			entryInput(shared.DirectionOutflow, 125_500),
		}},
		{bank, []ledgersClients.LedgerEntryInput{
			entryInput(shared.DirectionInflow, 10_000),
			entryInput(shared.DirectionOutflow, 250_000),
			entryInput(shared.DirectionInflow, 400_000),
		}},
	}
	batch2 := []fsBatch{
		{cash, []ledgersClients.LedgerEntryInput{
			entryInput(shared.DirectionInflow, 20_000),
			entryInput(shared.DirectionOutflow, 10_000),
			entryInput(shared.DirectionInflow, 75_250),
		}},
		{bank, []ledgersClients.LedgerEntryInput{
			entryInput(shared.DirectionOutflow, 1_500),
			entryInput(shared.DirectionInflow, 33_333),
			entryInput(shared.DirectionOutflow, 99_999),
		}},
	}

	for _, batch := range [][]fsBatch{batch1, batch2} {
		for _, b := range batch {
			resp := postLedgerEntries(t, clients, token, period, b.fs, b.entries...)
			require.Equal(t, 201, resp.StatusCode(), "body: %s", string(resp.Body))
			require.NotNil(t, resp.JSON201)
			assert.Len(t, resp.JSON201.LedgerEntryUuids, len(b.entries))

			applyEntries(expected, b.fs, b.entries)
			requireBalances(t, clients, token, expected, cash, bank)
		}

		// A batch overdrawing its fund source is rejected whole and changes nothing.
		overdraw := postLedgerEntries(t, clients, token, period, cash,
			entryInput(shared.DirectionInflow, 1_000),
			entryInput(shared.DirectionOutflow, 50_000_000),
		)
		require.Equal(t, 400, overdraw.StatusCode(), "body: %s", string(overdraw.Body))
		assert.Equal(t, "insufficient-balance", overdraw.JSON400.Slug)
		requireBalances(t, clients, token, expected, cash, bank)
	}

	cashClosing, bankClosing := expected[cash.String()], expected[bank.String()]
	// cash: 1,000,000 - 300,000 + 50,000 - 125,500 + 20,000 - 10,000 + 75,250
	assert.True(t, cashClosing.Equal(decimal.NewFromInt(709_750)), cashClosing.String())
	// bank: 1,000,000 + 10,000 - 250,000 + 400,000 - 1,500 + 33,333 - 99,999
	assert.True(t, bankClosing.Equal(decimal.NewFromInt(1_091_834)), bankClosing.String())

	// 4. Close the period.
	closeResp := closeLedgerPeriod(t, clients, token, period)
	require.Equal(t, 204, closeResp.StatusCode(), "body: %s", string(closeResp.Body))
	periods = listLedgerPeriods(t, clients, token, nil)
	assert.Equal(t, "closed", periods.Items[0].Status.String())

	checkClosed := func(t *testing.T) {
		t.Helper()
		requireBalances(t, clients, token, expected, cash, bank)
		requireStatement(t, clients, token, period, cash, cashClosing, false)
		requireStatement(t, clients, token, period, bank, bankClosing, false)
	}
	checkClosed(t)

	// 5. A closed period rejects posting, closing again and reconciling the period.
	post := postLedgerEntries(t, clients, token, period, cash, entryInput(shared.DirectionInflow, 1))
	require.Equal(t, 409, post.StatusCode(), "body: %s", string(post.Body))
	assert.Equal(t, "period-not-open", post.JSON409.Slug)

	again := closeLedgerPeriod(t, clients, token, period)
	require.Equal(t, 400, again.StatusCode(), "body: %s", string(again.Body))
	assert.Equal(t, "period-not-open", again.JSON400.Slug)

	early := reconcileLedgerPeriod(t, clients, token, period)
	require.Equal(t, 409, early.StatusCode(), "body: %s", string(early.Body))
	assert.Equal(t, "statements-not-reconciled", early.JSON409.Slug)
	require.NotNil(t, early.JSON409.Details)
	assert.Len(t, *early.JSON409.Details, 2)
	checkClosed(t)

	// 6. Reconcile statements: a mismatch rejects the whole batch.
	statements := listStatements(t, clients, token, period)
	cashSt, bankSt := statementFor(t, statements, cash), statementFor(t, statements, bank)

	wrong := ledgersClients.ReconcileStatementInput{StatementUuid: bankSt.Uuid, ActualBalance: bankClosing.Sub(decimal.NewFromInt(1))}
	right := ledgersClients.ReconcileStatementInput{StatementUuid: cashSt.Uuid, ActualBalance: cashClosing}
	mismatch := reconcileStatements(t, clients, token, period, right, wrong)
	require.Equal(t, 400, mismatch.StatusCode(), "body: %s", string(mismatch.Body))
	assert.Equal(t, []string{"balance-mismatch"}, errorSlugs(mismatch.JSON400))
	require.NotNil(t, mismatch.JSON400.Details)
	require.NotNil(t, (*mismatch.JSON400.Details)[0].EntityId)
	assert.Equal(t, bankSt.Uuid.String(), *(*mismatch.JSON400.Details)[0].EntityId)
	checkClosed(t)

	// Partial reconcile: only the cash statement.
	require.Equal(t, 204, reconcileStatements(t, clients, token, period, right).StatusCode())
	requireStatement(t, clients, token, period, cash, cashClosing, true)
	requireStatement(t, clients, token, period, bank, bankClosing, false)

	partial := reconcileLedgerPeriod(t, clients, token, period)
	require.Equal(t, 409, partial.StatusCode(), "body: %s", string(partial.Body))
	assert.Equal(t, "statements-not-reconciled", partial.JSON409.Slug)
	require.NotNil(t, partial.JSON409.Details)
	require.Len(t, *partial.JSON409.Details, 1)
	require.NotNil(t, (*partial.JSON409.Details)[0].EntityId)
	assert.Equal(t, bankSt.Uuid.String(), *(*partial.JSON409.Details)[0].EntityId)

	// Reconcile the remaining statement.
	bankRight := ledgersClients.ReconcileStatementInput{StatementUuid: bankSt.Uuid, ActualBalance: bankClosing}
	require.Equal(t, 204, reconcileStatements(t, clients, token, period, bankRight).StatusCode())

	checkReconciled := func(t *testing.T) {
		t.Helper()
		requireBalances(t, clients, token, expected, cash, bank)
		requireStatement(t, clients, token, period, cash, cashClosing, true)
		requireStatement(t, clients, token, period, bank, bankClosing, true)
	}
	checkReconciled(t)

	// 7. Reconcile the period.
	done := reconcileLedgerPeriod(t, clients, token, period)
	require.Equal(t, 204, done.StatusCode(), "body: %s", string(done.Body))

	periods = listLedgerPeriods(t, clients, token, nil)
	require.Len(t, periods.Items, 1)
	assert.Equal(t, "reconciled", periods.Items[0].Status.String())
	require.NotNil(t, periods.Items[0].ClosingBalance)
	assert.True(t, periods.Items[0].ClosingBalance.Equal(cashClosing.Add(bankClosing)), periods.Items[0].ClosingBalance.String())
	assert.NotNil(t, periods.Items[0].ReconciledAt)
	checkReconciled(t)

	// 8. The locked period lets a new one open.
	next := openLedgerPeriod(t, clients, token, novemberPeriodRequest(time.December, cash, bank))
	assert.Equal(t, 201, next.StatusCode(), "body: %s", string(next.Body))
}
