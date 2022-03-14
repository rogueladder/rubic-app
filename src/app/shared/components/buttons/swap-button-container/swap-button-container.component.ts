import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import BigNumber from 'bignumber.js';
import { ISwapFormInput } from '@shared/models/swaps/swap-form';
import { WalletConnectorService } from 'src/app/core/services/blockchain/wallets/wallet-connector-service/wallet-connector.service';
import { UseTestingModeService } from 'src/app/core/services/use-testing-mode/use-testing-mode.service';
import { TranslateService } from '@ngx-translate/core';
import { BLOCKCHAIN_NAME } from '@shared/models/blockchain/blockchain-name';
import { WALLET_NAME } from '@core/wallets/components/wallets-modal/models/wallet-name';
import { PublicBlockchainAdapterService } from '@core/services/blockchain/blockchain-adapters/public-blockchain-adapter.service';
import { WithRoundPipe } from 'src/app/shared/pipes/with-round.pipe';
import { BIG_NUMBER_FORMAT } from '@shared/constants/formats/big-number-format';
import { IframeService } from 'src/app/core/services/iframe/iframe.service';
import { WalletsModalService } from 'src/app/core/wallets/services/wallets-modal.service';
import { TuiDestroyService } from '@taiga-ui/cdk';
import { startWith, takeUntil, tap } from 'rxjs/operators';
import { InstantTradeService } from 'src/app/features/instant-trade/services/instant-trade-service/instant-trade.service';
import { HeaderStore } from 'src/app/core/header/services/header.store';
import { SwapFormService } from 'src/app/features/swaps/services/swaps-form-service/swap-form.service';
import { TRADE_STATUS } from '@shared/models/swaps/trade-status';
import { TOKENS } from '@features/instant-trade/services/instant-trade-service/providers/solana/raydium-service/models/tokens';
import { NATIVE_SOLANA_MINT_ADDRESS } from '@shared/constants/blockchain/native-token-address';
import { BlockchainsInfo } from '@core/services/blockchain/blockchain-info';
import { TargetNetworkAddressService } from '@features/cross-chain-routing/components/target-network-address/services/target-network-address.service';
import { Web3Pure } from '@core/services/blockchain/blockchain-adapters/common/web3-pure';
import { SWAP_PROVIDER_TYPE } from '@app/features/swaps/models/swap-provider-type';

enum ERROR_TYPE {
  INSUFFICIENT_FUNDS = 'Insufficient balance',
  WRONG_BLOCKCHAIN = 'Wrong user network',
  NOT_SUPPORTED_BRIDGE = 'Not supported bridge',
  LESS_THAN_MINIMUM = 'Entered amount less than minimum',
  MORE_THAN_MAXIMUM = 'Entered amount more than maximum',
  MULTICHAIN_WALLET = 'Multichain wallets are not supported',
  NO_AMOUNT = 'From amount was not entered',
  WRONG_WALLET = 'Wrong wallet',
  INVALID_TARGET_ADDRESS = 'Invalid target network address',
  SOL_SWAP = 'Wrap SOL firstly'
}

@Component({
  selector: 'app-swap-button-container',
  templateUrl: './swap-button-container.component.html',
  styleUrls: ['./swap-button-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TuiDestroyService]
})
export class SwapButtonContainerComponent implements OnInit {
  @Input() swapMode: SWAP_PROVIDER_TYPE;

  @Input() needApprove = false;

  @Input() status: TRADE_STATUS;

  @Input() formService: SwapFormService;

  @Input() idPrefix = '';

  @Input() set fromAmount(value: BigNumber | null) {
    this._fromAmount = value;
    this.errorType[ERROR_TYPE.NO_AMOUNT] = Boolean(value === null ? true : value?.isNaN());
    this.checkInsufficientFundsError();
  }

  @Input() set minAmount(value: false | number | BigNumber) {
    if (value) {
      if (typeof value === 'number') {
        this.minAmountValue = value.toString();
      } else {
        this.minAmountValue = this.withRoundPipe.transform(
          value.toFormat(BIG_NUMBER_FORMAT),
          'toClosestValue'
        );
      }
      this.errorType[ERROR_TYPE.LESS_THAN_MINIMUM] = true;
    } else {
      this.errorType[ERROR_TYPE.LESS_THAN_MINIMUM] = false;
    }
  }

  private minAmountValue: string;

  @Input() set maxAmount(value: false | number | BigNumber) {
    if (this.swapMode !== SWAP_PROVIDER_TYPE.CROSS_CHAIN_ROUTING && value) {
      if (typeof value === 'number') {
        this.maxAmountValue = value.toString();
      } else {
        this.maxAmountValue = this.withRoundPipe.transform(
          (value as BigNumber)?.toFormat(BIG_NUMBER_FORMAT),
          'toClosestValue'
        );
      }
      this.errorType[ERROR_TYPE.MORE_THAN_MAXIMUM] = true;
    } else {
      this.errorType[ERROR_TYPE.MORE_THAN_MAXIMUM] = false;
    }
  }

  private maxAmountValue: string;

  @Input() set isBridgeNotSupported(value: boolean) {
    this.errorType[ERROR_TYPE.NOT_SUPPORTED_BRIDGE] = value;
  }

  @Input() buttonText = 'Swap';

  @Output() approveClick = new EventEmitter<void>();

  @Output() swapClick = new EventEmitter<void>();

  @Output() updateRatesClick = new EventEmitter<void>();

  public TRADE_STATUS = TRADE_STATUS;

  public ERROR_TYPE = ERROR_TYPE;

  public needLogin: boolean;

  public needLoginLoading: boolean;

  public checkingOnErrors: boolean;

  public errorType: Record<ERROR_TYPE, boolean>;

  public readonly isMobile$: Observable<boolean>;

  private isTestingMode: boolean;

  private _fromAmount: BigNumber;

  public tokensFilled: boolean;

  get allowChangeNetwork(): boolean {
    const form = this.formService.inputValue;
    const walletType = BlockchainsInfo.getBlockchainType(form.fromBlockchain);
    if (
      this.walletConnectorService?.provider.walletName !== WALLET_NAME.METAMASK ||
      !form.fromBlockchain ||
      walletType !== 'ethLike'
    ) {
      return false;
    }

    if (form.toBlockchain === form.fromBlockchain) {
      return InstantTradeService.isSupportedBlockchain(form.fromBlockchain);
    }
    return true;
  }

  get switchNetworkText(): void {
    return this.translateService.instant('common.switchTo', {
      networkName: this.formService.inputValue.fromBlockchain
    });
  }

  get errorText$(): Observable<string | null> {
    let translateParams: { key: string; interpolateParams?: object };
    const err = this.errorType;
    const { fromToken, fromBlockchain } = this.formService.inputValue;

    switch (true) {
      case err[ERROR_TYPE.WRONG_WALLET]: {
        translateParams = {
          key: 'errors.wrongWallet',
          interpolateParams: {
            network: BlockchainsInfo.getBlockchainByName(fromToken?.blockchain)?.label || ''
          }
        };
        break;
      }
      case err[ERROR_TYPE.NOT_SUPPORTED_BRIDGE]:
        translateParams = { key: 'errors.chooseSupportedBridge' };
        break;
      case err[ERROR_TYPE.NO_AMOUNT]:
        translateParams = { key: 'errors.noEnteredAmount' };
        break;
      case err[ERROR_TYPE.LESS_THAN_MINIMUM]:
        translateParams = {
          key: 'errors.minimumAmount',
          interpolateParams: { amount: this.minAmountValue, token: fromToken?.symbol }
        };
        break;
      case err[ERROR_TYPE.MORE_THAN_MAXIMUM]:
        translateParams = {
          key: 'errors.maximumAmount',
          interpolateParams: { amount: this.maxAmountValue, token: fromToken?.symbol }
        };
        break;
      case err[ERROR_TYPE.INSUFFICIENT_FUNDS]:
        translateParams = { key: 'errors.InsufficientBalance' };
        break;
      case err[ERROR_TYPE.MULTICHAIN_WALLET]: {
        translateParams = { key: 'errors.multichainWallet' };
        break;
      }
      case err[ERROR_TYPE.WRONG_BLOCKCHAIN]: {
        translateParams = {
          key: 'errors.chooseNetworkWallet',
          interpolateParams: { blockchain: fromBlockchain || fromToken?.blockchain }
        };
        break;
      }
      case err[ERROR_TYPE.INVALID_TARGET_ADDRESS]: {
        translateParams = { key: 'errors.invalidTargetAddress' };
        break;
      }
      case err[ERROR_TYPE.SOL_SWAP]: {
        translateParams = { key: 'errors.solSwap' };
        break;
      }
      default:
    }

    const hasErrors = Object.values(err).filter(Boolean).length;
    if (hasErrors && !translateParams) {
      translateParams = { key: 'errors.unknown' };
    }
    if (!hasErrors && !translateParams) {
      return of(null);
    }
    return this.translateService.stream(translateParams.key, translateParams.interpolateParams);
  }

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService,
    private readonly walletConnectorService: WalletConnectorService,
    private readonly useTestingModeService: UseTestingModeService,
    private readonly walletsModalService: WalletsModalService,
    private readonly translateService: TranslateService,
    private readonly publicBlockchainAdapterService: PublicBlockchainAdapterService,
    private readonly withRoundPipe: WithRoundPipe,
    private readonly iframeService: IframeService,
    private readonly headerStore: HeaderStore,
    private readonly destroy$: TuiDestroyService,
    private readonly targetNetworkAddressService: TargetNetworkAddressService
  ) {
    this.errorType = Object.values(ERROR_TYPE).reduce(
      (acc, key) => ({
        ...acc,
        [key]: false
      }),
      {}
    ) as Record<ERROR_TYPE, boolean>;
    this.isMobile$ = this.headerStore.getMobileDisplayStatus();
  }

  public ngOnInit(): void {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    this.targetNetworkAddressService.targetAddress$
      .pipe(
        tap(el => {
          const { fromBlockchain, toBlockchain } = this.formService.inputValue;
          this.errorType[ERROR_TYPE.INVALID_TARGET_ADDRESS] =
            fromBlockchain !== toBlockchain && el && !el.isValid;
          this.cdr.detectChanges();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
    if (this.iframeService.isIframe) {
      this.needLoginLoading = false;
      this.needLogin = true;
      this.authService
        .getCurrentUser()
        .pipe(takeUntil(this.destroy$))
        .subscribe(user => {
          this.needLogin = !user?.address;
          this.cdr.detectChanges();
        });
    } else {
      this.needLoginLoading = true;
      this.needLogin = true;
      this.authService
        .getCurrentUser()
        .pipe(takeUntil(this.destroy$))
        .subscribe(user => {
          if (user !== undefined) {
            this.needLoginLoading = false;
            this.needLogin = !user?.address;
          }
          this.cdr.detectChanges();
        });
    }

    this.useTestingModeService.isTestingMode
      .pipe(takeUntil(this.destroy$))
      .subscribe(isTestingMode => {
        this.isTestingMode = isTestingMode;
        if (isTestingMode) {
          this.checkErrors();
        }
      });

    this.formService.inputValueChanges
      .pipe(startWith(this.formService.inputValue), takeUntil(this.destroy$))
      .subscribe(form => {
        const { fromToken, toToken } = form;
        this.errorType[ERROR_TYPE.SOL_SWAP] =
          fromToken &&
          toToken &&
          fromToken.address === TOKENS.WSOL.mintAddress &&
          toToken.address !== NATIVE_SOLANA_MINT_ADDRESS;

        this.setFormValues(form);
        this.cdr.markForCheck();
      });

    this.walletConnectorService.networkChange$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.checkWrongBlockchainError();
    });
  }

  private setFormValues(form: ISwapFormInput): void {
    this.checkingOnErrors = true;

    this.tokensFilled = Boolean(form.fromToken && form.toToken);
    this.checkErrors().then(() => {
      this.checkingOnErrors = false;
      this.cdr.markForCheck();
    });
  }

  private async checkErrors(): Promise<void> {
    await this.checkWalletError();
    await this.checkInsufficientFundsError();
  }

  private async checkInsufficientFundsError(): Promise<void> {
    const { fromToken, fromAmount } = this.formService.inputValue;
    if (!this._fromAmount || !fromToken || !this.authService.userAddress) {
      this.errorType[ERROR_TYPE.INSUFFICIENT_FUNDS] = false;
      this.cdr.detectChanges();
      return;
    }

    if (this.checkWrongBlockchainError()) {
      return;
    }
    const balance = !fromToken.amount.isFinite()
      ? Web3Pure.fromWei(
          await this.publicBlockchainAdapterService[fromToken.blockchain].getTokenOrNativeBalance(
            this.authService.user.address,
            fromToken.address
          ),
          fromToken.decimals
        )
      : fromToken.amount;
    this.errorType[ERROR_TYPE.INSUFFICIENT_FUNDS] = balance.lt(fromAmount);
    this.cdr.detectChanges();
  }

  private checkWrongBlockchainError(): boolean {
    if (this.walletConnectorService.provider) {
      const userBlockchain = this.walletConnectorService.network?.name;
      const { fromBlockchain } = this.formService.inputValue;

      const { isMultiChainWallet } = this.walletConnectorService.provider;
      this.errorType[ERROR_TYPE.MULTICHAIN_WALLET] =
        isMultiChainWallet && fromBlockchain !== BLOCKCHAIN_NAME.ETHEREUM;

      this.errorType[ERROR_TYPE.WRONG_BLOCKCHAIN] =
        fromBlockchain !== userBlockchain &&
        !isMultiChainWallet &&
        (!this.isTestingMode || `${fromBlockchain}_TESTNET` !== userBlockchain);

      this.cdr.detectChanges();
      return (
        this.errorType[ERROR_TYPE.MULTICHAIN_WALLET] || this.errorType[ERROR_TYPE.WRONG_BLOCKCHAIN]
      );
    }
    return false;
  }

  public onLogin(): void {
    this.walletsModalService.open().subscribe();
  }

  public async changeNetwork(): Promise<void> {
    const currentStatus = this.status;
    this.status = TRADE_STATUS.LOADING;
    const { fromBlockchain } = this.formService.inputValue;
    try {
      await this.walletConnectorService.switchChain(fromBlockchain);
    } finally {
      this.status = currentStatus;
    }
  }

  private async checkWalletError(): Promise<boolean> {
    const blockchainAdapter =
      this.publicBlockchainAdapterService[this.formService.inputValue.fromBlockchain];
    this.errorType[ERROR_TYPE.WRONG_WALLET] =
      Boolean(this.walletConnectorService.address) &&
      !(await blockchainAdapter.isAddressCorrect(this.walletConnectorService.address));
    this.cdr.detectChanges();
    return this.errorType[ERROR_TYPE.WRONG_WALLET];
  }
}
