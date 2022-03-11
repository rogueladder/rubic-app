import BigNumber from 'bignumber.js';
import { IndexedTradeAndToAmount } from '../cross-chain-routing.service';

export interface SmartRouting {
  sourceBlockchainProviders: IndexedTradeAndToAmount[];
  targetBlockchainProviders: IndexedTradeAndToAmount[];
  fromProvider: string;
  toProvider: string;
  fromHasTrade: boolean;
  toHasTrade: boolean;
  savings: BigNumber;
}
