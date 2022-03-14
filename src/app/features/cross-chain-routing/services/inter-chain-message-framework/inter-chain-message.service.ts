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
import { ImSwapInfo } from './models/im-swap-info.interface';
import { TokenAmount } from '@app/shared/models/tokens/token-amount';
import { SmartRouting } from '../cross-chain-routing-service/models/smart-routing.interface';
import { ContractsDataService } from '../cross-chain-routing-service/contracts-data/contracts-data.service';
import { SettingsService } from '@app/features/swaps/services/settings-service/settings.service';
import { BLOCKCHAIN_NAME } from '@app/shared/models/blockchain/blockchain-name';
import { MESSAGE_BUS_CONTRACT_ABI } from './constants/MESSAGE_BUS_CONTRACT_ABI';
import { EthLikeWeb3Pure } from '@app/core/services/blockchain/blockchain-adapters/eth-like/web3-pure/eth-like-web3-pure';

type transferWithSwapArgs = (string | (string | string[])[])[];

@Injectable()
export class InterchainMessageService {
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
    const imContractAddress = IM_CONTRACT_BY_BLOCKCHAIN[fromBlockchain];
    return await this.publicBlockchainAdapterService[
      fromBlockchain as Web3SupportedBlockchains
    ].callContractMethod(imContractAddress, IM_CONTRACT_ABI, 'minSwapAmount');
  }

  public async interChainMessageSwap(
    fromAmount: BigNumber,
    fromBlockchain: Web3SupportedBlockchains,
    fromToken: TokenAmount,
    toToken: TokenAmount,
    toBlockchain: Web3SupportedBlockchains,
    smartRouting: SmartRouting,
    onTxHash: (txHash: string) => void
  ): Promise<string> {
    const isNativeTokenInSrcNetwork = this.publicBlockchainAdapterService[
      toBlockchain
    ].isNativeAddress(fromToken.address);

    const transferData = await this.prepareTransfer(
      fromAmount,
      fromBlockchain,
      fromToken,
      toBlockchain,
      toToken,
      smartRouting,
      isNativeTokenInSrcNetwork
    );

    console.log(transferData);

    let transactionHash: string;

    await this.privateBlockchainAdapterService[
      fromBlockchain as Web3SupportedBlockchains
    ].tryExecuteContractMethod(
      transferData.caller,
      IM_CONTRACT_ABI,
      isNativeTokenInSrcNetwork ? 'transferWithSwapNative' : 'transferWithSwap',
      transferData.methodArguments,
      {
        value: transferData.msgValue,
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

  private async prepareTransfer(
    fromAmount: BigNumber,
    fromBlockchain: Web3SupportedBlockchains,
    fromToken: TokenAmount,
    toBlockchain: Web3SupportedBlockchains,
    toToken: TokenAmount,
    smartRouting: SmartRouting,
    isNativeTokenInSrcNetwork: boolean
  ): Promise<{
    caller: string;
    msgValue: string;
    methodArguments: transferWithSwapArgs;
  }> {
    const srcNetwork = networks.find(network => network.name === fromBlockchain);
    const dstNetwork = networks.find(network => network.name === toBlockchain);

    const [
      { providerIndex: bestSourceProviderIndex, tradeAndToAmount: bestSourceTradeAndToAmount }
    ] = smartRouting.sourceBlockchainProviders;
    const [
      { providerIndex: bestTargetProviderIndex, tradeAndToAmount: bestTargetTradeAndToAmount }
    ] = smartRouting.targetBlockchainProviders;

    const sourceProvider =
      this.contractsDataService.contracts[fromBlockchain].getProvider(bestSourceProviderIndex);
    const targetProvider =
      this.contractsDataService.contracts[toBlockchain].getProvider(bestTargetProviderIndex);

    const { timestamp: nonce } = await this.publicBlockchainAdapterService[
      fromBlockchain
    ].getBlock();
    const caller = IM_CONTRACT_BY_BLOCKCHAIN[srcNetwork.name];
    const receiver = IM_CONTRACT_BY_BLOCKCHAIN[dstNetwork.name];
    const amountIn = Web3Pure.toWei(fromAmount, fromToken.decimals);
    const nativeOut = this.publicBlockchainAdapterService[toBlockchain].isNativeAddress(
      toToken.address
    );

    // hardcoded
    const maxBridgeSlippage = 1000000;
    const deadline = 999999999999999;
    const minRecvAmt = 0;

    const srcSwap = {
      path: bestSourceTradeAndToAmount.trade?.path?.map(path => path.address) || [
        fromToken.address
      ],
      dex: sourceProvider.contractAddress,
      deadline,
      minRecvAmt
    };
    const dstSwap = {
      path: bestTargetTradeAndToAmount.trade?.path?.map(path => path.address) || [toToken.address],
      dex: targetProvider.contractAddress,
      deadline,
      minRecvAmt
    };

    const methodArguments = [
      receiver,
      amountIn,
      dstNetwork.id.toString(),
      this.prepareSwapObject(srcSwap),
      this.prepareSwapObject(dstSwap),
      maxBridgeSlippage.toString(),
      nonce.toString(),
      String(nativeOut)
    ];

    const msgValue = await this.calculateMsgValue(
      fromBlockchain,
      dstNetwork.id,
      methodArguments,
      isNativeTokenInSrcNetwork,
      amountIn
    );

    return {
      caller,
      msgValue,
      methodArguments
    };
  }

  private async calculateMsgValue(
    fromBlockchain: Web3SupportedBlockchains,
    targetNetworkId: number,
    swapArguments: transferWithSwapArgs,
    isNativeTokenInSrcNetwork: boolean,
    amountIn: string
  ): Promise<string> {
    const cryptoFee = await this.publicBlockchainAdapterService[fromBlockchain].callContractMethod(
      IM_CONTRACT_BY_BLOCKCHAIN[fromBlockchain],
      IM_CONTRACT_ABI,
      'dstCryptoFee',
      {
        methodArguments: [targetNetworkId]
      }
    );
    console.log('cryptoFee', cryptoFee);

    const message = EthLikeWeb3Pure.asciiToBytes32(JSON.stringify(swapArguments));
    const messageBusAddress = await this.publicBlockchainAdapterService[
      fromBlockchain
    ].callContractMethod(IM_CONTRACT_BY_BLOCKCHAIN[fromBlockchain], IM_CONTRACT_ABI, 'messageBus');
    const feeBase = await this.publicBlockchainAdapterService[fromBlockchain].callContractMethod(
      messageBusAddress,
      MESSAGE_BUS_CONTRACT_ABI,
      'calcFee',
      { methodArguments: [message] }
    );
    console.log('fee', feeBase);

    if (isNativeTokenInSrcNetwork) {
      return amountIn + feeBase + cryptoFee;
    } else {
      return feeBase + cryptoFee;
    }
  }

  private prepareSwapObject(swap: ImSwapInfo): (string | string[])[] {
    return Object.values(swap).map(value => {
      if (Array.isArray(value)) {
        return value as string[];
      } else {
        return String(value);
      }
    });
  }
}
