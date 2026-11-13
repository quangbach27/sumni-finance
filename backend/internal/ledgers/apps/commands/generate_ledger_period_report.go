package commands

import (
	"context"

	"github.com/quangbach27/golang-common/http/auth"
	"github.com/quangbach27/golang-common/log"

	"backend/internal/authorization/ports/module/client"
	"backend/internal/ledgers/apps/models"
	"backend/internal/ledgers/domain"
	"backend/internal/shared"
)

// LedgerPeriodReportRepository generates and stores a period's report.
type LedgerPeriodReportRepository interface {
	GenerateLedgerPeriodReport(ctx context.Context, orgID string, ledgerPeriodUUID domain.LedgerPeriodUUID) (models.ReportUUID, error)
}

type GenerateLedgerPeriodReport struct {
	Session          *auth.Session
	LedgerPeriodUUID domain.LedgerPeriodUUID
}

// GenerateLedgerPeriodReport generates a report for the period and returns its UUID.
func (h *Handlers) GenerateLedgerPeriodReport(ctx context.Context, cmd GenerateLedgerPeriodReport) (models.ReportUUID, error) {
	res, err := h.modules.Authorize(ctx, client.AuthorizeRequest{
		Session:  cmd.Session,
		Resource: shared.ResourceLedgerPeriod,
		Action:   shared.ActionUpdate,
	})
	if err != nil {
		return models.ReportUUID{}, err
	}

	reportUUID, err := h.reportRepo.GenerateLedgerPeriodReport(ctx, res.OrgID, cmd.LedgerPeriodUUID)
	if err != nil {
		return models.ReportUUID{}, err
	}

	log.FromContext(ctx).
		With("periodUUID", cmd.LedgerPeriodUUID.String(), "reportUUID", reportUUID.String()).
		Info("ledger period report generated")

	return reportUUID, nil
}
