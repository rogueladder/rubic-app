import { Injectable } from '@angular/core';
import { IM_CONTRACT_ABI } from './constants/IM_CONTRACT_ABI';
import { PrivateBlockchainAdapterService } from '@app/core/services/blockchain/blockchain-adapters/private-blockchain-adapter.service';
import { Web3Pure } from '@app/core/services/blockchain/blockchain-adapters/common/web3-pure';
import {
  PublicBlockchainAdapterService,
  Web3SupportedBlockchains
} from '@app/core/services/blockchain/blockchain-adapters/public-blockchain-adapter.service';
import networks from '@app/shared/constants/blockchain/networks';
import { IM_CONTRACT_BY_BLOCKCHAIN } from './constants/IM_CONTRACT_BY_BLOCKCHAIN';
import BigNumber from 'bignumber.js';
import { TokenAmount } from '@app/shared/models/tokens/token-amount';
import { SmartRouting } from '../cross-chain-routing-service/models/smart-routing.interface';
import { ContractsDataService } from '../cross-chain-routing-service/contracts-data/contracts-data.service';
import { SettingsService } from '@app/features/swaps/services/settings-service/settings.service';
import { MESSAGE_BUS_CONTRACT_ABI } from './constants/MESSAGE_BUS_CONTRACT_ABI';
import { EthLikeWeb3Pure } from '@app/core/services/blockchain/blockchain-adapters/eth-like/web3-pure/eth-like-web3-pure';
import { OneinchInstantTrade } from '@app/features/instant-trade/services/instant-trade-service/providers/common/oneinch/common-oneinch/models/oneinch-instant-trade';
import { ProviderType } from './models/provider-type.enum';
import { IM_SWAP_NATIVE_METHODS } from './constants/IM_SWAP_NATIVE_METHODS';
import { IM_SWAP_METHODS } from './constants/IM_SWAP_METHODS';
import { BLOCKCHAIN_NAME } from '@app/shared/models/blockchain/blockchain-name';

@Injectable()
export class InterchainMessageService {
  private _smartRouting: SmartRouting;

  set smartRouting(smartRouting: SmartRouting) {
    this._smartRouting = smartRouting;
  }

  get smartRouting(): SmartRouting {
    return this._smartRouting;
  }

  get ccrSlippage(): number {
    return this.settingsService.crossChainRoutingValue.slippageTolerance / 100;
  }

  constructor(
    private readonly privateBlockchainAdapterService: PrivateBlockchainAdapterService,
    private readonly publicBlockchainAdapterService: PublicBlockchainAdapterService,
    private readonly contractsDataService: ContractsDataService,
    private readonly settingsService: SettingsService
  ) {}

  public async getMinTokenAmount(fromBlockchain: BLOCKCHAIN_NAME): Promise<string> {
    const imContractAddress = this.getImContractAddress(fromBlockchain as Web3SupportedBlockchains);
    return await this.publicBlockchainAdapterService[
      fromBlockchain as Web3SupportedBlockchains
    ].callContractMethod(imContractAddress, IM_CONTRACT_ABI, 'minSwapAmount');
  }

  public async makeImTransferWithSwap(
    fromAmount: BigNumber,
    fromBlockchain: Web3SupportedBlockchains,
    fromToken: TokenAmount,
    toToken: TokenAmount,
    toBlockchain: Web3SupportedBlockchains,
    onTxHash: (hash: string) => void
  ): Promise<string> {
    const [{ providerIndex: bestSourceProviderIndex }] =
      this.smartRouting.sourceBlockchainProviders;
    const [{ providerIndex: bestTargetProviderIndex }] =
      this.smartRouting.targetBlockchainProviders;
    const sourceProviderType = this.getProviderType(fromBlockchain, bestSourceProviderIndex);
    const targetProviderType = this.getProviderType(toBlockchain, bestTargetProviderIndex);
    const receiver = this.getImContractAddress(toBlockchain);
    const amountIn = Web3Pure.toWei(fromAmount, fromToken.decimals);
    const dstChainId = networks.find(network => network.name === toBlockchain).id;
    const caller = this.getImContractAddress(fromBlockchain);
    const nonce = await this.getNonce(fromBlockchain);
    const srcSwap = await this.getSrcSwapObject(sourceProviderType, fromBlockchain);
    const dstSwap = await this.getDstSwapObject(targetProviderType, toBlockchain);
    const nativeOut = this.isNativeToken(toBlockchain, toToken);
    const nativeIn = this.isNativeToken(fromBlockchain, fromToken);

    // hardcoded
    const maxBridgeSlippage = 1000000;

    const methodArguments = [
      receiver,
      amountIn,
      dstChainId,
      Object.values(srcSwap),
      Object.values(dstSwap),
      maxBridgeSlippage,
      nonce,
      nativeOut
    ];

    const preparedArguments = this.prepareArgs(methodArguments);

    const msgValue = await this.calculateMsgValue(
      fromBlockchain,
      toBlockchain,
      preparedArguments,
      nativeIn,
      amountIn
    );

    let transactionHash: string;

    await this.privateBlockchainAdapterService[
      fromBlockchain as Web3SupportedBlockchains
    ].tryExecuteContractMethod(
      caller,
      IM_CONTRACT_ABI,
      nativeIn ? IM_SWAP_NATIVE_METHODS[sourceProviderType] : IM_SWAP_METHODS[sourceProviderType],
      preparedArguments,
      {
        value: msgValue,
        onTransactionHash: (hash: string) => {
          if (onTxHash) {
            onTxHash(hash);
          }
          transactionHash = hash;
        }
      }
    );

    return transactionHash;
  }

  private getImContractAddress(blockchain: Web3SupportedBlockchains): string {
    return IM_CONTRACT_BY_BLOCKCHAIN[blockchain];
  }

  private getProviderType(
    blockchain: Web3SupportedBlockchains,
    providerIndex: number
  ): ProviderType {
    const ccrContract = this.contractsDataService.contracts[blockchain];

    if (ccrContract.isProviderOneinch(providerIndex)) {
      return ProviderType.INCH;
    }

    if (ccrContract.isProviderUniV3(providerIndex)) {
      return ProviderType.V3;
    }

    return ProviderType.V2;
  }

  private async getNonce(fromBlockchain: Web3SupportedBlockchains): Promise<string> {
    const { timestamp: nonce } = await this.publicBlockchainAdapterService[
      fromBlockchain
    ].getBlock();

    return String(nonce);
  }

  private isNativeToken(blockchain: Web3SupportedBlockchains, token: TokenAmount): boolean {
    return this.publicBlockchainAdapterService[blockchain].isNativeAddress(token.address);
  }

  private getSrcSwapObject(
    sourceProviderType: ProviderType,
    fromBlockchain: Web3SupportedBlockchains
  ): unknown {
    const [
      { providerIndex: bestSourceProviderIndex, tradeAndToAmount: bestSourceTradeAndToAmount }
    ] = this.smartRouting.sourceBlockchainProviders;

    const sourceProvider =
      this.contractsDataService.contracts[fromBlockchain].getProvider(bestSourceProviderIndex);

    switch (sourceProviderType) {
      case ProviderType.INCH: {
        const instantTrade = bestSourceTradeAndToAmount.trade as OneinchInstantTrade;
        return {
          dex: sourceProvider.contractAddress,
          path: instantTrade.path.map(token => token.address),
          data: instantTrade.data,
          amountOutMinimum: 0
        };
      }
      case ProviderType.V2: {
        return {
          path: bestSourceTradeAndToAmount.trade?.path?.map(path => path.address),
          dex: sourceProvider.contractAddress,
          deadline: 999999999999999,
          minRecvAmt: 0
        };
      }
      case ProviderType.V3: {
        return {
          dex: sourceProvider.contractAddress,
          path: EthLikeWeb3Pure.encodeParameter('bytes', bestSourceTradeAndToAmount.trade?.path),
          deadline: 999999999999999,
          amountOutMinimum: 0
        };
      }
    }
  }

  private getDstSwapObject(
    targetProviderType: ProviderType,
    toBlockchain: Web3SupportedBlockchains
  ): unknown {
    const [{ providerIndex: bestTargetProviderIndex }] =
      this.smartRouting.targetBlockchainProviders;
    const targetProvider =
      this.contractsDataService.contracts[toBlockchain].getProvider(bestTargetProviderIndex);

    switch (targetProviderType) {
      case ProviderType.INCH: {
        return targetProvider;
      }
      case ProviderType.V2: {
        return '';
      }
      case ProviderType.V3: {
        return '';
      }
    }
  }

  private async calculateMsgValue(
    fromBlockchain: Web3SupportedBlockchains,
    toBlockchain: Web3SupportedBlockchains,
    data: unknown,
    nativeIn: boolean,
    amountIn: string
  ): Promise<string> {
    const targetNetworkId = networks.find(network => network.name === toBlockchain).id.toString();
    const imContractAddress = this.getImContractAddress(fromBlockchain);

    const cryptoFee = await this.publicBlockchainAdapterService[fromBlockchain].callContractMethod(
      imContractAddress,
      IM_CONTRACT_ABI,
      'dstCryptoFee',
      {
        methodArguments: [targetNetworkId]
      }
    );
    console.log('cryptoFee', cryptoFee);

    const message = EthLikeWeb3Pure.asciiToBytes32(JSON.stringify(data));
    const messageBusAddress = await this.publicBlockchainAdapterService[
      fromBlockchain
    ].callContractMethod(imContractAddress, IM_CONTRACT_ABI, 'messageBus');
    const feeBase = await this.publicBlockchainAdapterService[fromBlockchain].callContractMethod(
      messageBusAddress,
      MESSAGE_BUS_CONTRACT_ABI,
      'calcFee',
      { methodArguments: [message] }
    );
    console.log('fee', feeBase);

    if (nativeIn) {
      return amountIn + feeBase + cryptoFee;
    }
    return feeBase + cryptoFee;
  }

  private prepareArgs(args: unknown[]): unknown[] {
    return args.map(arg => {
      return Array.isArray(arg) ? this.prepareArgs(arg) : String(arg);
    });
  }
}
