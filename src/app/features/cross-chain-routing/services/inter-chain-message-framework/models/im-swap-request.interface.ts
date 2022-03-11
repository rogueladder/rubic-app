import { ImSwapInfo } from './im-swap-info.interface';

export interface ImSwapRequest extends ImSwapInfo {
  receiver: string;
  nonce: number;
  nativeOut: boolean;
}
