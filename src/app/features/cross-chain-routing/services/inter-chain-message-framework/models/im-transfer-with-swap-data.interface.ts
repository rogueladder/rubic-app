export interface ImTransferWithSwapDataExtended<T> {
  receiver: string;
  amountIn: string;
  dstChainId: number;
  srcSwap: T;
  dstSwap: T;
  maxBridgeSlippage: number;
  nonce?: number;
  nativeOut?: boolean;
}
