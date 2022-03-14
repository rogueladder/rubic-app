import { CrossChainTrade } from '@features/cross-chain-routing/services/cross-chain-routing-service/models/cross-chain-trade';
import {
  Account,
  AccountMeta,
  PublicKey,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import { BLOCKCHAIN_NAME } from '@shared/models/blockchain/blockchain-name';
import {
  NATIVE_SOL,
  TOKENS
} from '@features/instant-trade/services/instant-trade-service/providers/solana/raydium-service/models/tokens';
import {
  PDA_CONFIG,
  PDA_DELEGATE,
  SOLANA_CROSS_CHAIN_CONTRACT
} from '@features/cross-chain-routing/services/cross-chain-routing-service/constants/solana/solana-constants';
import {
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID
} from '@features/instant-trade/services/instant-trade-service/providers/solana/raydium-service/models/accounts';
import { PrivateBlockchainAdapterService } from '@core/services/blockchain/blockchain-adapters/private-blockchain-adapter.service';
import { TokensService } from '@core/services/tokens/tokens.service';
import { RaydiumRoutingService } from '@features/instant-trade/services/instant-trade-service/providers/solana/raydium-service/utils/raydium-routering.service';
import { Buffer } from 'buffer';
import { Injectable } from '@angular/core';
import { ContractsDataService } from '@features/cross-chain-routing/services/cross-chain-routing-service/contracts-data/contracts-data.service';
import { Web3Pure } from '@core/services/blockchain/blockchain-adapters/common/web3-pure';
import { SolanaContractData } from '@features/cross-chain-routing/services/cross-chain-routing-service/contracts-data/contract-data/solana-contract-data';
import { tuiPure } from '@taiga-ui/cdk';
import { NATIVE_SOLANA_MINT_ADDRESS } from '@shared/constants/blockchain/native-token-address';
import { BLOCKCHAIN_UUID } from '@features/cross-chain-routing/services/cross-chain-routing-service/constants/solana/solana-blockchain-accounts-addresses';
import { ContractExecutorFacadeService } from '@features/cross-chain-routing/services/cross-chain-routing-service/contract-executor/contract-executor-facade.service';
import { SolanaWeb3PrivateService } from '@core/services/blockchain/blockchain-adapters/solana/solana-web3-private.service';
import { SOLANA_CCR_LAYOUT } from '@features/cross-chain-routing/services/cross-chain-routing-service/constants/solana/raydium-ccr-sctuct';
import { CROSS_CHAIN_METHODS } from '@features/cross-chain-routing/services/cross-chain-routing-service/constants/solana/cross-chain-methods';

enum TransferDataType {
  NON_TRANSFER_TOKEN = 0,
  TRANSFER_TOKEN = 1,
  NATIVE = 2
}
@Injectable({
  providedIn: 'root'
})
export class SolanaContractExecutorService {
  private static createSolanaInstruction(
    pdaConfig: PublicKey,
    pdaBlockchainConfig: PublicKey,
    splProgramId: PublicKey,
    ammId: PublicKey,
    ammAuthority: PublicKey,
    ammOpenOrders: PublicKey,
    ammTargetOrders: PublicKey,
    poolCoinTokenAccount: PublicKey,
    poolPcTokenAccount: PublicKey,
    serumProgramId: PublicKey,
    serumMarket: PublicKey,
    serumBids: PublicKey,
    serumAsks: PublicKey,
    serumEventQueue: PublicKey,
    serumCoinVaultAccount: PublicKey,
    serumPcVaultAccount: PublicKey,
    serumVaultSigner: PublicKey,
    userSourceTokenAccount: PublicKey,
    userDestTokenAccount: PublicKey,
    userOwner: PublicKey,
    raydiumAmm: PublicKey,
    pdaDelegate: PublicKey,
    systemProgram: PublicKey,
    wrappedSolMint: PublicKey,
    pdaWrapped: PublicKey,
    swapParams: {
      blockchain: number;
      tokenInAmount: number;
      secondPath: string[];
      exactRbcTokenOut: number;
      tokenOutMin: string;
      newAddress: string;
      swapToCrypto: boolean;
      transferType: number;
      methodName: string;
    }
  ): TransactionInstruction {
    const optionalTransferAccounts = [
      { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
      { pubkey: userDestTokenAccount, isSigner: false, isWritable: true },
      { pubkey: splProgramId, isSigner: false, isWritable: false }
    ];
    const optionalSwapAccounts = [
      { pubkey: ammId, isSigner: false, isWritable: true },
      { pubkey: ammAuthority, isSigner: false, isWritable: false },
      { pubkey: ammOpenOrders, isSigner: false, isWritable: true },
      { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
      { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
      { pubkey: serumProgramId, isSigner: false, isWritable: false },
      { pubkey: serumMarket, isSigner: false, isWritable: true },
      { pubkey: serumBids, isSigner: false, isWritable: true },
      { pubkey: serumAsks, isSigner: false, isWritable: true },
      { pubkey: serumEventQueue, isSigner: false, isWritable: true },
      { pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true },
      { pubkey: serumPcVaultAccount, isSigner: false, isWritable: true },
      { pubkey: serumVaultSigner, isSigner: false, isWritable: false },
      { pubkey: raydiumAmm, isSigner: false, isWritable: false }
    ];
    const optionalNativeAccounts: Array<AccountMeta> = [
      { pubkey: wrappedSolMint, isSigner: false, isWritable: false },
      { pubkey: pdaWrapped, isSigner: false, isWritable: true },
      { pubkey: splProgramId, isSigner: false, isWritable: false },
      { pubkey: userDestTokenAccount, isSigner: false, isWritable: true },
      { pubkey: splProgramId, isSigner: false, isWritable: false }
    ];
    const requiredKeys: Array<AccountMeta> = [
      { pubkey: pdaConfig, isSigner: false, isWritable: false },
      { pubkey: pdaBlockchainConfig, isSigner: false, isWritable: false },
      { pubkey: userOwner, isSigner: true, isWritable: false },
      { pubkey: pdaDelegate, isSigner: false, isWritable: true },
      { pubkey: systemProgram, isSigner: false, isWritable: false }
    ];

    const buffer = Buffer.alloc(1000);
    const length = SOLANA_CCR_LAYOUT.encode({ instructionNumber: 1, ...swapParams }, buffer);
    const data = buffer.slice(0, length);

    let keys: AccountMeta[];
    if (swapParams.transferType === TransferDataType.NATIVE) {
      keys = [...requiredKeys, ...optionalNativeAccounts, ...optionalSwapAccounts];
    } else if (swapParams.transferType === TransferDataType.TRANSFER_TOKEN) {
      keys = [...requiredKeys, ...optionalTransferAccounts];
    } else if (swapParams.transferType === TransferDataType.NON_TRANSFER_TOKEN) {
      keys = [...requiredKeys, ...optionalTransferAccounts, ...optionalSwapAccounts];
    }

    return new TransactionInstruction({
      keys,
      programId: new PublicKey(SOLANA_CROSS_CHAIN_CONTRACT),
      data
    });
  }

  /**
   * Checks if TPS greater then minimum limit.
   */
  public static async checkHealth(
    solanaPrivateAdapterService: SolanaWeb3PrivateService
  ): Promise<boolean> {
    const samplesAmount = 10; // Performance samples are taken every 60 seconds.
    const samples = await solanaPrivateAdapterService.getRecentPerformanceSamples(samplesAmount);
    const totalTransactionsCount = samples.reduce((acc, curr) => acc + curr.numTransactions, 0);
    const averageTPS = totalTransactionsCount / samplesAmount / 60;
    const minimumTPSLimit = 1200;
    return averageTPS >= minimumTPSLimit;
  }

  private readonly contracts = this.contractsDataService.contracts;

  @tuiPure
  private get contract(): SolanaContractData {
    return this.contracts[BLOCKCHAIN_NAME.SOLANA] as SolanaContractData;
  }

  constructor(
    private readonly contractsDataService: ContractsDataService,
    private readonly privateAdapter: PrivateBlockchainAdapterService,
    private readonly tokensService: TokensService,
    private readonly raydiumRoutingService: RaydiumRoutingService
  ) {}

  // eslint-disable-next-line complexity
  public async executeTrade(
    trade: CrossChainTrade,
    address: string,
    targetAddress: string,
    isToNative: boolean
  ): Promise<{ transaction: Transaction; signers: Account[] }> {
    const transaction = new Transaction();
    const signers: Account[] = [];
    const owner = new PublicKey(address);
    const privateBlockchainAdapter = this.privateAdapter[BLOCKCHAIN_NAME.SOLANA];
    const mintAccountsAddresses = await privateBlockchainAdapter.getTokenAccounts(address);

    const tokenInAmountAbsolute = Web3Pure.toWei(trade.tokenInAmount, trade.tokenIn.decimals);

    const tokenOutAmountMin = ContractExecutorFacadeService.calculateTokenOutAmountMin(trade);
    const tokenOutAmountAbsolute = Web3Pure.toWei(tokenOutAmountMin, trade.tokenOut.decimals);

    const fromTransitTokenAmountMin =
      ContractExecutorFacadeService.calculateFromTransitTokenAmountMin(trade);
    const fromTransitTokenAmountMinAbsolute = Web3Pure.toWei(
      fromTransitTokenAmountMin,
      this.contract.transitToken.decimals
    );

    const from = this.tokensService.tokens.find(el => el.address === trade.tokenIn.address);
    const to = this.tokensService.tokens.find(el => el.address === trade.tokenOut.address);

    if (!from || !to) {
      throw new Error('Miss token info');
    }

    const fromMint =
      trade.tokenIn.address === NATIVE_SOL.mintAddress
        ? TOKENS.WSOL.mintAddress
        : trade.tokenIn.address;
    const middleMint = this.contract.transitToken.address;

    const fromFinalAmount = parseInt(tokenInAmountAbsolute);
    const middleFinalAmount = parseInt(fromTransitTokenAmountMinAbsolute);

    const poolInfo = this.raydiumRoutingService.currentPoolInfo;

    const isTransfer = trade.tokenIn.address === this.contract.transitToken.address;
    const fromNative = trade.tokenIn.address === NATIVE_SOLANA_MINT_ADDRESS;
    let transferType;
    if (fromNative) {
      transferType = TransferDataType.NATIVE;
    } else if (isTransfer) {
      transferType = TransferDataType.TRANSFER_TOKEN;
    } else {
      transferType = TransferDataType.NON_TRANSFER_TOKEN;
    }

    const toBlockchainInContractNumber = this.contracts[trade.toBlockchain].numOfBlockchain;
    const swapToUserMethodName = this.contracts[trade.toBlockchain].getSwapToUserMethodName(
      trade.toProviderIndex,
      isToNative
    );

    const methodArguments = {
      blockchain: toBlockchainInContractNumber,
      tokenInAmount: fromFinalAmount,
      secondPath: this.contracts[trade.toBlockchain].getSecondPath(
        trade.toTrade,
        trade.toProviderIndex,
        trade.fromBlockchain
      ),
      exactRbcTokenOut: middleFinalAmount,
      tokenOutMin: tokenOutAmountAbsolute,
      newAddress: targetAddress,
      swapToCrypto: isToNative,
      transferType,
      methodName: CROSS_CHAIN_METHODS[swapToUserMethodName].slice(2)
    };

    const { from: fromAccount } =
      transferType !== TransferDataType.NATIVE
        ? await privateBlockchainAdapter.getOrCreatesTokensAccounts(
            mintAccountsAddresses,
            fromMint,
            middleMint,
            owner,
            fromFinalAmount,
            transaction,
            signers
          )
        : { from: { key: PublicKey.default } };

    // @TODO Solana. Fix keys order.
    transaction.add(
      SolanaContractExecutorService.createSolanaInstruction(
        new PublicKey(PDA_CONFIG),
        new PublicKey(BLOCKCHAIN_UUID[toBlockchainInContractNumber]),
        TOKEN_PROGRAM_ID,
        new PublicKey(poolInfo?.ammId || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.ammAuthority || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.ammOpenOrders || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.ammTargetOrders || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.poolCoinTokenAccount || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.poolPcTokenAccount || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.serumProgramId || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.serumMarket || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.serumBids || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.serumAsks || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.serumEventQueue || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.serumCoinVaultAccount || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.serumPcVaultAccount || NATIVE_SOL.mintAddress),
        new PublicKey(poolInfo?.serumVaultSigner || NATIVE_SOL.mintAddress),
        fromAccount.key,
        new PublicKey('6rvuMQ7B3cwpmPHhbMGQFBsfDfkgnxiwmWxxSnkd9FjK'),
        new PublicKey(address),
        new PublicKey(poolInfo?.programId || NATIVE_SOL.mintAddress),
        new PublicKey(PDA_DELEGATE),
        new PublicKey(SYSTEM_PROGRAM_ID),
        new PublicKey(TOKENS.WSOL.mintAddress),
        new PublicKey('6jVSCbM1MVZWCSepdBXY65U4uszY7rY6Lm3oEU5ZeE7q'),
        methodArguments
      )
    );

    return { transaction, signers };
  }
}
