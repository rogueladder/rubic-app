import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { List } from 'immutable';
import { map, tap } from 'rxjs/operators';
import { BlockchainsBridgeProvider } from '../blockchains-bridge-provider';
import { PanamaBridgeProviderService } from '../common/panama-bridge-provider/panama-bridge-provider.service';
import { BridgeToken } from '../../../models/BridgeToken';
import { BLOCKCHAIN_NAME } from '../../../../../../shared/models/blockchain/BLOCKCHAIN_NAME';
import { BridgeTrade } from '../../../models/BridgeTrade';
import { Web3PrivateService } from '../../../../../../core/services/blockchain/web3-private-service/web3-private.service';
import { BridgeApiService } from '../../../../../../core/services/backend/bridge-api/bridge-api.service';
import { ethToXDaiDepositWallet } from '../../../../../../shared/constants/bridge/deposit-wallets';

@Injectable()
export class EthereumXdaiBridgeProviderService extends BlockchainsBridgeProvider {
  private xDaiProviderTokens = [
    {
      symbol: 'DAI',
      image: '',
      rank: 0,

      blockchainToken: {
        [BLOCKCHAIN_NAME.ETHEREUM]: {
          address: '0x6b175474e89094c44da98b954eedeac495271d0f',
          name: 'Dai',
          symbol: 'DAI',
          decimals: 18,

          minAmount: 0.005,
          maxAmount: 9999999
        },
        [BLOCKCHAIN_NAME.XDAI]: {
          address: '0x44fA8E6f47987339850636F88629646662444217',
          name: 'Dai',
          symbol: 'DAI',
          decimals: 18,

          minAmount: 10,
          maxAmount: 9999999
        }
      }
    } as BridgeToken
  ];

  constructor(
    private commonPanamaBridgeProviderService: PanamaBridgeProviderService,
    private web3PrivateService: Web3PrivateService,
    private bridgeApiService: BridgeApiService
  ) {
    super();
  }

  getTokensList(): Observable<List<BridgeToken>> {
    return of(List(this.xDaiProviderTokens));
  }

  getFee(): Observable<number> {
    return of(0);
  }

  public createTrade(
    bridgeTrade: BridgeTrade,
    updateTransactionsList: () => Promise<void>
  ): Observable<string> {
    const { token } = bridgeTrade;
    const tokenAddress = token.blockchainToken[bridgeTrade.fromBlockchain].address;
    const { decimals } = token.blockchainToken[bridgeTrade.fromBlockchain];
    const amountInWei = bridgeTrade.amount.multipliedBy(10 ** decimals);

    const onTradeTransactionHash = async hash => {
      if (bridgeTrade.onTransactionHash) {
        bridgeTrade.onTransactionHash(hash);
      }
      await this.bridgeApiService.postXDaiTransaction(
        bridgeTrade,
        hash,
        this.web3PrivateService.address
      );
      updateTransactionsList();
    };

    return from(
      this.web3PrivateService.transferTokens(
        tokenAddress,
        ethToXDaiDepositWallet,
        amountInWei.toFixed(),
        {
          onTransactionHash: onTradeTransactionHash
        }
      )
    ).pipe(
      map(receipt => receipt.transactionHash),
      tap(transactionHash => {
        this.bridgeApiService.notifyBridgeBot(
          bridgeTrade,
          transactionHash,
          this.web3PrivateService.address
        );
      })
    );
  }
}
