import { ImSwapInfo } from './im-swap-info.interface';

export interface ImTransferWithSwapData {
  receiver: string;
  amountIn: string;
  dstChainId: number;
  srcSwap: ImSwapInfo;
  dstSwap: ImSwapInfo;
  maxBridgeSlippage: number;
  nonce?: number;
  nativeOut?: boolean;
}
