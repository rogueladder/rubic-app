import { ProviderType } from '../models/provider-type.enum';

export const IM_SWAP_METHODS = {
  [ProviderType.INCH]: 'transferWithSwapInch',
  [ProviderType.V2]: 'transferWithSwapV2',
  [ProviderType.V3]: 'transferWithSwapV3'
};
