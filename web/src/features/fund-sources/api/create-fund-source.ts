import { useMutation, useQueryClient } from '@tanstack/react-query';

import { FUND_SOURCES_URL } from './get-fund-sources';

import type { CreateFundSourceInput, FundSource } from './types';

const createFundSource = async (
  input: CreateFundSourceInput,
): Promise<FundSource> => {
  // TODO: replace with http.post<FundSource>(URL, input)
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log(input);
  return { id: crypto.randomUUID(), ...input };
};

export const useCreateFundSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFundSource,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [FUND_SOURCES_URL] }),
  });
};
