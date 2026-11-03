package domain

import common "github.com/quangbach27/golang-common"

type FundSourceType struct {
	common.Enum[FundSourceTypeValues]
}

type FundSourceTypeValues string

func (v FundSourceTypeValues) Values() []string {
	return []string{"bank", "cash"}
}

var (
	FundSourceTypeBank = common.MustEnum[FundSourceType]("bank")
	FundSourceTypeCash = common.MustEnum[FundSourceType]("cash")
)

// FundSourceDetails holds the data specific to one fund source type.
// The unexported sealed method restricts implementations to this package.
type FundSourceDetails interface {
	Type() FundSourceType
	sealed()
}

type BankDetails struct {
	bankCode      string
	bankBin       int32
	bankShortName string
	ownerName     string
	accountNumber string
}

var _ FundSourceDetails = (*BankDetails)(nil)

func (d *BankDetails) Type() FundSourceType  { return FundSourceTypeBank }
func (d *BankDetails) sealed()               {}
func (d *BankDetails) BankCode() string      { return d.bankCode }
func (d *BankDetails) BankBin() int32        { return d.bankBin }
func (d *BankDetails) BankShortName() string { return d.bankShortName }
func (d *BankDetails) OwnerName() string     { return d.ownerName }
func (d *BankDetails) AccountNumber() string { return d.accountNumber }

type CashDetails struct {
	ownerName string
}

var _ FundSourceDetails = (*CashDetails)(nil)

func (d *CashDetails) Type() FundSourceType { return FundSourceTypeCash }
func (d *CashDetails) sealed()              {}
func (d *CashDetails) OwnerName() string    { return d.ownerName }
