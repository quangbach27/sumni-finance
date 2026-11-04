import type { components } from '@/features/generated/ledgers.gen';

type FundSourceBase = {
  id: string;
  name: string;
  balance: number;
  currency: string;
};

export type BankDetails = {
  owner_name: string;
  account_number: string;
  code: string;
  bin: number;
  short_name: string;
};

export type CashDetails = {
  owner_name: string;
};

export type FundSource = FundSourceBase &
  (
    | { type: 'bank'; details: BankDetails }
    | { type: 'cash'; details: CashDetails }
  );

type Schemas = components['schemas'];

export type CreateFundSourceRequest = Schemas['CreateFundSourceRequest'];
export type CreateFundSourceResponse = Schemas['CreateFundSourceResponse'];
export type FundSourceDetailsRequest = Schemas['FundSourceDetails'];
export type FundSourceType = Schemas['FundSourceType'];
export type Currency = Schemas['Currency'];

export type Bank = {
  id: string;
  name: string;
  bin: number;
  code: string;
  short_name: string;
  logo_url: string;
  icon_url: string;
};
