import { ProviderType } from '../models/provider-type.enum';

export const IM_SWAP_NATIVE_METHODS = {
  [ProviderType.INCH]: 'transferWithSwapInchNative',
  [ProviderType.V2]: 'transferWithSwapV2Native',
  [ProviderType.V3]: 'transferWithSwapV3Native'
};
