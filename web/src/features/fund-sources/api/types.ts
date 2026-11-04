import type { components } from '@/features/generated/ledgers.gen';

type Schemas = components['schemas'];

/** `balance` is normalized to a number by `getFundSources`. */
export type FundSource = Omit<Schemas['FundSource'], 'balance'> & {
  balance: number;
};
export type ListFundSourcesResponse = Schemas['ListFundSourcesResponse'];
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
