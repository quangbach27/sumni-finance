export type FundSource = {
  id: string;
  name: string;
  code: string;
  type: 'cash' | 'bank' | 'e-wallet';
  balance: number;
  currency: string;
};
