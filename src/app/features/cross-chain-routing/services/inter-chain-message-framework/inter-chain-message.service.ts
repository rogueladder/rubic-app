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
import { TokensService } from '@app/core/services/tokens/tokens.service';
import { transitTokens } from '../cross-chain-routing-service/contracts-data/contract-data/constants/transit-tokens';

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
    private readonly tokensService: TokensService,
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
    const dstSwap = await this.getDstSwapObject(targetProviderType, toToken, toBlockchain);
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
    console.log('msgValue', msgValue);
    console.log('args', preparedArguments);

    let transactionHash: string;

    await this.privateBlockchainAdapterService[
      fromBlockchain as Web3SupportedBlockchains
    ].tryExecuteContractMethod(
      caller,
      IM_CONTRACT_ABI,
      nativeIn ? IM_SWAP_NATIVE_METHODS[sourceProviderType] : IM_SWAP_METHODS[sourceProviderType],
      preparedArguments,
      {
        value: msgValue.toString(),
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
          dex: sourceProvider.contractAddress,
          path: bestSourceTradeAndToAmount.trade?.path?.map(path => path.address),
          deadline: 999999999999999,
          amountOutMinimum: 0
        };
      }
      case ProviderType.V3: {
        const pathV3 = EthLikeWeb3Pure.asciiToBytes32(
          JSON.stringify(bestSourceTradeAndToAmount.trade?.path?.map(token => token.address))
        );
        return {
          dex: sourceProvider.contractAddress,
          path: pathV3,
          deadline: 999999999999999,
          amountOutMinimum: 0
        };
      }
    }
  }

  private async getDstSwapObject(
    targetProviderType: ProviderType,
    toToken: TokenAmount,
    toBlockchain: Web3SupportedBlockchains
    // amountIn: BigNumber
  ): Promise<unknown> {
    const [
      { providerIndex: bestTargetProviderIndex, tradeAndToAmount: bestTargetTradeAndToAmount }
    ] = this.smartRouting.targetBlockchainProviders;
    const targetProvider =
      this.contractsDataService.contracts[toBlockchain].getProvider(bestTargetProviderIndex);
    const toTokenUsdcPrice = await this.tokensService.getAndUpdateTokenPrice({
      address: toToken.address,
      blockchain: toBlockchain
    });
    const minRecvAmt = bestTargetTradeAndToAmount.toAmount
      .multipliedBy(toTokenUsdcPrice)
      .multipliedBy(1 - this.ccrSlippage);

    const dstSwapObject: {
      dex: string;
      path: string[] | null;
      pathV3: string;
      deadline: number;
      data: string | null;
      amountOutMinimum: string;
      version: number;
    } = {
      dex: targetProvider.contractAddress,
      path: ['0x0000000000000000000000000000000000000000'],
      pathV3: '0x',
      deadline: 999999999999999,
      data: '0x',
      amountOutMinimum: Web3Pure.toWei(minRecvAmt, transitTokens[toBlockchain].decimals),
      version: Object.values(ProviderType).indexOf(targetProviderType)
    };
    switch (targetProviderType) {
      case ProviderType.INCH: {
        const instantTrade = bestTargetTradeAndToAmount.trade as OneinchInstantTrade;
        dstSwapObject.data = instantTrade.data;
        dstSwapObject.path = instantTrade.path.map(token => token.address);
        break;
      }
      case ProviderType.V2: {
        dstSwapObject.path = bestTargetTradeAndToAmount.trade?.path?.map(path => path.address);
        break;
      }
      case ProviderType.V3: {
        const pathV3 = EthLikeWeb3Pure.asciiToBytes32(
          JSON.stringify(bestTargetTradeAndToAmount.trade?.path?.map(path => path.address))
        );
        dstSwapObject.pathV3 = pathV3;
        break;
      }
    }

    return dstSwapObject;
  }

  private async calculateMsgValue(
    fromBlockchain: Web3SupportedBlockchains,
    toBlockchain: Web3SupportedBlockchains,
    data: unknown,
    nativeIn: boolean,
    amountIn: string
  ): Promise<number> {
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

    if (nativeIn) {
      return Number(amountIn) + Number(feeBase) + Number(cryptoFee);
    }
    return Number(feeBase) + Number(cryptoFee);
  }

  private prepareArgs(args: unknown[]): unknown[] {
    return args.map(arg => {
      return Array.isArray(arg) ? this.prepareArgs(arg) : String(arg);
    });
  }
}
