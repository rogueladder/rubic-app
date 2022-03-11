import { Injectable } from '@angular/core';
import { IM_CONTRACT_ABI } from './constants/IM_CONTRACT_ABI';
import { PrivateBlockchainAdapterService } from '@app/core/services/blockchain/blockchain-adapters/private-blockchain-adapter.service';
import { Web3Pure } from '@app/core/services/blockchain/blockchain-adapters/common/web3-pure';
import {
  PublicBlockchainAdapterService,
  Web3SupportedBlockchains
} from '@app/core/services/blockchain/blockchain-adapters/public-blockchain-adapter.service';
import networks from '@app/shared/constants/blockchain/networks';
import { TRANSFER_SWAP_CONTRACT_BY_BLOCKCHAIN } from './constants/TRANSFER_SWAP_CONTRACT_BY_BLOCKCHAIN';
import BigNumber from 'bignumber.js';
import { ImSwapInfo } from './models/im-swap-info.interface';
import { TokenAmount } from '@app/shared/models/tokens/token-amount';
import { SmartRouting } from '../cross-chain-routing-service/models/smart-routing.interface';
import { ContractsDataService } from '../cross-chain-routing-service/contracts-data/contracts-data.service';
import { IM_FEE_BASE } from './constants/IM_FEE_BASE';
import { IM_FEE_PER_BYTE } from './constants/IM_FEE_PER_BYTE';
import { SettingsService } from '@app/features/swaps/services/settings-service/settings.service';
import { BLOCKCHAIN_NAME } from '@app/shared/models/blockchain/blockchain-name';

type transferWithSwapArgs = (string | (string | string[])[])[];

@Injectable()
export class InterchainMessageService {
  constructor(
    private readonly privateBlockchainAdapterService: PrivateBlockchainAdapterService,
    private readonly publicBlockchainAdapterService: PublicBlockchainAdapterService,
    private readonly contractsDataService: ContractsDataService,
    private readonly settingsService: SettingsService
  ) {}

  public async interChainMessageSwap(
    fromAmount: BigNumber,
    fromBlockchain: Web3SupportedBlockchains,
    fromToken: TokenAmount,
    toToken: TokenAmount,
    toBlockchain: Web3SupportedBlockchains,
    smartRouting: SmartRouting,
    onTxHash: (txHash: string) => void
  ): Promise<string> {
    const isNativeOut = this.publicBlockchainAdapterService[toBlockchain].isNativeAddress(
      toToken.address
    );

    const transferData = await this.prepareTransfer(
      fromAmount,
      fromBlockchain,
      fromToken,
      toBlockchain,
      smartRouting,
      isNativeOut
    );

    console.log(transferData);

    let transactionHash: string;

    await this.privateBlockchainAdapterService[
      fromBlockchain as Web3SupportedBlockchains
    ].tryExecuteContractMethod(
      transferData.caller,
      IM_CONTRACT_ABI,
      isNativeOut ? 'transferWithSwapNative' : 'transferWithSwap',
      transferData.methodArguments,
      {
        value: transferData.msgValue,
        onTransactionHash: (hash: string) => {
          onTxHash(hash);
          transactionHash = hash;
        }
      }
    );

    return transactionHash;
  }

  public async getMinTokenAmount(fromBlockchain: BLOCKCHAIN_NAME): Promise<string> {
    const imContractAddress = TRANSFER_SWAP_CONTRACT_BY_BLOCKCHAIN[fromBlockchain];
    return await this.publicBlockchainAdapterService[
      fromBlockchain as Web3SupportedBlockchains
    ].callContractMethod(imContractAddress, IM_CONTRACT_ABI, 'minSwapAmount');
  }

  private async prepareTransfer(
    fromAmount: BigNumber,
    fromBlockchain: Web3SupportedBlockchains,
    fromToken: TokenAmount,
    toBlockchain: Web3SupportedBlockchains,
    smartRouting: SmartRouting,
    nativeOut?: boolean
  ): Promise<{
    caller: string;
    msgValue: string;
    methodArguments: transferWithSwapArgs;
  }> {
    const srcNetwork = networks.find(network => network.name === fromBlockchain);
    const dstNetwork = networks.find(network => network.name === toBlockchain);

    const [sourceBestProvider] = smartRouting.sourceBlockchainProviders;
    const [targetBestProvider] = smartRouting.targetBlockchainProviders;

    const sourceProvider = this.contractsDataService.contracts[fromBlockchain].getProvider(
      sourceBestProvider.providerIndex
    );
    const targetProvider = this.contractsDataService.contracts[toBlockchain].getProvider(
      targetBestProvider.providerIndex
    );

    const { timestamp: nonce } = await this.publicBlockchainAdapterService[
      fromBlockchain
    ].getBlock();
    const caller = TRANSFER_SWAP_CONTRACT_BY_BLOCKCHAIN[srcNetwork.name];
    const receiver = TRANSFER_SWAP_CONTRACT_BY_BLOCKCHAIN[dstNetwork.name];
    const amountIn = Web3Pure.toWei(fromAmount, fromToken.decimals);

    // hardcoded
    const maxBridgeSlippage = 1000000;
    const deadline = 999999999999999;
    const minRecvAmt = 0;

    const srcSwap = {
      path: sourceBestProvider.tradeAndToAmount.trade.path.map(path => path.address),
      dex: sourceProvider.contractAddress,
      deadline,
      minRecvAmt
    };
    const dstSwap = {
      path: targetBestProvider.tradeAndToAmount.trade.path.map(path => path.address),
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
      nonce.toString()
    ];

    if (nativeOut) {
      methodArguments.push(String(nativeOut));
    }

    const msgValue = this.calculateMsgValue(methodArguments, Number(amountIn)).toString();

    return {
      caller,
      msgValue,
      methodArguments
    };
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

  private calculateMsgValue(data: transferWithSwapArgs, amountIn: number): number {
    const byteLength = new Blob([JSON.stringify(data)]).size;
    return amountIn * IM_FEE_BASE + byteLength * IM_FEE_PER_BYTE;
  }
}
