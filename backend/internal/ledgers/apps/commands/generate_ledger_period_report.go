package commands

import (
	"context"

	"github.com/quangbach27/golang-common/log"

	"backend/internal/ledgers/apps/models"
	"backend/internal/ledgers/domain"
)

// LedgerPeriodReportRepository generates and stores a period's report.
type LedgerPeriodReportRepository interface {
	GenerateLedgerPeriodReport(ctx context.Context, ledgerPeriodUUID domain.LedgerPeriodUUID) (models.ReportUUID, error)
}

type GenerateLedgerPeriodReport struct {
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

// GenerateLedgerPeriodReport generates a report for the period and returns its UUID.
func (h *Handlers) GenerateLedgerPeriodReport(ctx context.Context, cmd GenerateLedgerPeriodReport) (models.ReportUUID, error) {
	reportUUID, err := h.reportRepo.GenerateLedgerPeriodReport(ctx, cmd.LedgerPeriodUUID)
	if err != nil {
		return models.ReportUUID{}, err
	}

	log.FromContext(ctx).
		With("periodUUID", cmd.LedgerPeriodUUID.String(), "reportUUID", reportUUID.String()).
		Info("ledger period report generated")

	return reportUUID, nil
}
