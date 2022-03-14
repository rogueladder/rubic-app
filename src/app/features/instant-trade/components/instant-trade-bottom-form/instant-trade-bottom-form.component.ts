import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Self
} from '@angular/core';
import { SwapFormService } from 'src/app/features/swaps/services/swaps-form-service/swap-form.service';
import { InstantTradeService } from 'src/app/features/instant-trade/services/instant-trade-service/instant-trade.service';
import { BLOCKCHAIN_NAME } from '@shared/models/blockchain/blockchain-name';
import { INSTANT_TRADES_STATUS } from '@features/instant-trade/models/instant-trades-trade-status';
import { SwapFormInput } from '@features/swaps/models/swap-form';
import { INSTANT_TRADE_PROVIDERS } from '@features/instant-trade/constants/providers';
import { ErrorsService } from 'src/app/core/errors/errors.service';
import BigNumber from 'bignumber.js';
import { BehaviorSubject, forkJoin, from, of, Subject, Subscription } from 'rxjs';
import InstantTrade from '@features/instant-trade/models/instant-trade';
import { TRADE_STATUS } from '@shared/models/swaps/trade-status';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { PublicBlockchainAdapterService } from '@core/services/blockchain/blockchain-adapters/public-blockchain-adapter.service';
import { TokensService } from 'src/app/core/services/tokens/tokens.service';
import { NotSupportedItNetwork } from 'src/app/core/errors/models/instant-trade/not-supported-it-network';
import { INSTANT_TRADES_PROVIDERS } from '@shared/models/instant-trade/instant-trade-providers';
import {
  ItSettingsForm,
  SettingsService
} from 'src/app/features/swaps/services/settings-service/settings.service';
import { DEFAULT_SLIPPAGE_TOLERANCE } from '@features/instant-trade/constants/default-slippage-tolerance';
import { AvailableTokenAmount } from '@shared/models/tokens/available-token-amount';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { TokenAmount } from '@shared/models/tokens/token-amount';
import { REFRESH_BUTTON_STATUS } from 'src/app/shared/components/rubic-refresh-button/rubic-refresh-button.component';
import { CounterNotificationsService } from 'src/app/core/services/counter-notifications/counter-notifications.service';
import { IframeService } from 'src/app/core/services/iframe/iframe.service';
import { NATIVE_TOKEN_ADDRESS } from '@shared/constants/blockchain/native-token-address';
import { ProviderControllerData } from '@features/instant-trade/models/providers-controller-data';
import { TuiDestroyService } from '@taiga-ui/cdk';
import { InstantTradeInfo } from '@features/instant-trade/models/instant-trade-info';
import { PERMITTED_PRICE_DIFFERENCE } from '@shared/constants/common/permited-price-difference';
import { SwapInfoService } from '@features/swaps/components/swap-info/services/swap-info.service';
import NoSelectedProviderError from '@core/errors/models/instant-trade/no-selected-provider-error';
import { ERROR_TYPE } from '@core/errors/models/error-type';
import { RubicError } from '@core/errors/models/rubic-error';
import { GoogleTagManagerService } from '@core/services/google-tag-manager/google-tag-manager.service';
import { SWAP_PROVIDER_TYPE } from '@features/swaps/models/swap-provider-type';
import { WalletConnectorService } from '@core/services/blockchain/wallets/wallet-connector-service/wallet-connector.service';
import { SwapsService } from '@app/features/swaps/services/swaps-service/swaps.service';

export interface CalculationResult {
  status: 'fulfilled' | 'rejected';
  value?: InstantTrade | null;
  reason?: RubicError<ERROR_TYPE>;
}

@Component({
  selector: 'app-instant-trade-bottom-form',
  templateUrl: './instant-trade-bottom-form.component.html',
  styleUrls: ['./instant-trade-bottom-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TuiDestroyService]
})
export class InstantTradeBottomFormComponent implements OnInit, OnDestroy {
  // eslint-disable-next-line rxjs/finnish,rxjs/no-exposed-subjects
  @Input() onRefreshTrade: Subject<void>;

  @Input() loading: boolean;

  @Input() tokens: AvailableTokenAmount[];

  @Input() favoriteTokens: AvailableTokenAmount[];

  @Output() onRefreshStatusChange = new EventEmitter<REFRESH_BUTTON_STATUS>();

  @Output() allowRefreshChange = new EventEmitter<boolean>();

  /**
   * Emits info of currently selected trade.
   */
  @Output() instantTradeInfoChange = new EventEmitter<InstantTradeInfo>();

  @Output() tradeStatusChange = new EventEmitter<TRADE_STATUS>();

  private readonly IT_PROXY_FEE = 0.003;

  // eslint-disable-next-line rxjs/no-exposed-subjects
  public readonly onCalculateTrade$: Subject<'normal' | 'hidden'>;

  public readonly swapMode$ = this.swapsService.swapMode$;

  private hiddenDataAmounts$: BehaviorSubject<
    { name: INSTANT_TRADES_PROVIDERS; amount: BigNumber; error?: RubicError<ERROR_TYPE> | Error }[]
  >;

  public providerControllers: ProviderControllerData[];

  private _selectedProvider: ProviderControllerData;

  private currentBlockchain: BLOCKCHAIN_NAME;

  private fromToken: TokenAmount;

  public toToken: TokenAmount;

  public fromAmount: BigNumber;

  public ethAndWethTrade: InstantTrade | null;

  public isEth: {
    from: boolean;
    to: boolean;
  };

  private _tradeStatus: TRADE_STATUS;

  public needApprove: boolean;

  private settingsForm: ItSettingsForm;

  private calculateTradeSubscription$: Subscription;

  private hiddenCalculateTradeSubscription$: Subscription;

  public isIframe: boolean;

  public TRADE_STATUS = TRADE_STATUS;

  private autoSelect: boolean;

  public get selectedProvider(): ProviderControllerData {
    return this._selectedProvider;
  }

  public set selectedProvider(selectedProvider: ProviderControllerData) {
    this._selectedProvider = selectedProvider;
    this.instantTradeInfoChange.emit({
      trade: selectedProvider?.trade,
      isWrappedType: !!this.ethAndWethTrade
    });
  }

  public get tradeStatus(): TRADE_STATUS {
    return this._tradeStatus;
  }

  public set tradeStatus(value: TRADE_STATUS) {
    this._tradeStatus = value;
    this.tradeStatusChange.emit(value);
  }

  get allowTrade(): boolean {
    const form = this.swapFormService.inputValue;
    return Boolean(
      form.fromBlockchain &&
        form.fromToken &&
        form.toBlockchain &&
        form.toToken &&
        form.fromAmount?.gt(0)
    );
  }

  public get toAmount(): BigNumber {
    if (
      !this.iframeService.isIframeWithFee(
        this.currentBlockchain,
        this.selectedProvider.tradeProviderInfo.value
      )
    ) {
      return this.selectedProvider.trade.to.amount;
    }

    return this.selectedProvider.trade.to.amount.multipliedBy(1 - this.IT_PROXY_FEE);
  }

  constructor(
    public readonly swapFormService: SwapFormService,
    private readonly instantTradeService: InstantTradeService,
    private readonly cdr: ChangeDetectorRef,
    private readonly errorService: ErrorsService,
    private readonly authService: AuthService,
    private readonly publicBlockchainAdapterService: PublicBlockchainAdapterService,
    private readonly tokensService: TokensService,
    private readonly settingsService: SettingsService,
    private readonly counterNotificationsService: CounterNotificationsService,
    private readonly iframeService: IframeService,
    @Self() private readonly destroy$: TuiDestroyService,
    private readonly swapInfoService: SwapInfoService,
    private readonly walletConnectorService: WalletConnectorService,
    private readonly gtmService: GoogleTagManagerService,
    private readonly swapsService: SwapsService
  ) {
    this.autoSelect = true;
    this.isIframe = this.iframeService.isIframe;
    this.onCalculateTrade$ = new Subject();
    this.hiddenDataAmounts$ = new BehaviorSubject([]);
  }

  public ngOnInit(): void {
    this.setupCalculatingTrades();
    this.setupHiddenCalculatingTrades();

    this.tradeStatus = TRADE_STATUS.DISABLED;

    this.swapFormService.inputValueChanges
      .pipe(
        startWith(this.swapFormService.inputValue),
        distinctUntilChanged((prev, next) => {
          return (
            prev.toBlockchain === next.toBlockchain &&
            prev.fromBlockchain === next.fromBlockchain &&
            prev.fromToken?.address === next.fromToken?.address &&
            prev.toToken?.address === next.toToken?.address &&
            prev.fromAmount === next.fromAmount
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(form => {
        this.setupSwapForm(form);
      });

    this.swapFormService.input.controls.toToken.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(toToken => {
        if (
          TokensService.areTokensEqual(this.toToken, toToken) &&
          this.toToken?.price !== toToken?.price$
        ) {
          this.toToken = toToken;
          this.cdr.markForCheck();
        }
      });

    this.settingsService.instantTradeValueChanges
      .pipe(startWith(this.settingsService.instantTradeValue), takeUntil(this.destroy$))
      .subscribe(form => this.setupSettingsForm(form));

    this.authService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user?.address) {
          this.conditionalCalculate();
        }
      });

    this.onRefreshTrade.pipe(takeUntil(this.destroy$)).subscribe(() => this.conditionalCalculate());
  }

  ngOnDestroy() {
    this.calculateTradeSubscription$.unsubscribe();
    this.hiddenCalculateTradeSubscription$.unsubscribe();
  }

  private setupSwapForm(form: SwapFormInput): void {
    this.fromAmount = form.fromAmount;
    this.fromToken = form.fromToken;
    this.toToken = form.toToken;

    this.isEth = {
      from: this.fromToken?.address === NATIVE_TOKEN_ADDRESS,
      to: this.toToken?.address === NATIVE_TOKEN_ADDRESS
    };

    this.ethAndWethTrade = this.instantTradeService.getEthAndWethTrade();
    this.allowRefreshChange.emit(!this.ethAndWethTrade);

    if (
      this.currentBlockchain !== form.fromBlockchain &&
      form.fromBlockchain === form.toBlockchain
    ) {
      this.currentBlockchain = form.fromBlockchain;
      this.initiateProviders(this.currentBlockchain);
    }
    this.cdr.detectChanges();

    this.conditionalCalculate('normal');
  }

  private initiateProviders(blockchain: BLOCKCHAIN_NAME): void {
    if (!InstantTradeService.isSupportedBlockchain(blockchain)) {
      this.errorService.catch(new NotSupportedItNetwork());
      return;
    }
    this.providerControllers = INSTANT_TRADE_PROVIDERS[blockchain];
  }

  private setupSettingsForm(form: ItSettingsForm): void {
    let needRecalculation = false;
    if (
      this.settingsForm &&
      (this.settingsForm.rubicOptimisation !== form.rubicOptimisation ||
        this.settingsForm.disableMultihops !== form.disableMultihops) &&
      this.tradeStatus !== TRADE_STATUS.APPROVE_IN_PROGRESS &&
      this.tradeStatus !== TRADE_STATUS.SWAP_IN_PROGRESS
    ) {
      needRecalculation = true;
    }

    if (
      this.settingsForm &&
      this.settingsForm.autoSlippageTolerance !== form.autoSlippageTolerance &&
      !this.iframeService.isIframe
    ) {
      const providerIndex = this.providerControllers.findIndex(el => el.isSelected);
      if (providerIndex !== -1) {
        setTimeout(() => {
          this.setSlippageTolerance(this.providerControllers[providerIndex]);
        });
      }
    }

    this.settingsForm = form;

    if (needRecalculation) {
      this.conditionalCalculate('normal');
    }
  }

  private conditionalCalculate(type?: 'normal' | 'hidden'): void {
    const { fromBlockchain, toBlockchain } = this.swapFormService.inputValue;

    if (fromBlockchain !== toBlockchain) {
      return;
    }
    if (!InstantTradeService.isSupportedBlockchain(toBlockchain)) {
      this.errorService.catch(new NotSupportedItNetwork());
      this.cdr.detectChanges();
      return;
    }
    if (
      this.tradeStatus === TRADE_STATUS.APPROVE_IN_PROGRESS ||
      this.tradeStatus === TRADE_STATUS.SWAP_IN_PROGRESS
    ) {
      return;
    }

    const { autoRefresh } = this.settingsService.instantTradeValue;
    const haveHiddenCalc = this.hiddenDataAmounts$.value.length > 0;
    this.onCalculateTrade$.next(type || (autoRefresh || !haveHiddenCalc ? 'normal' : 'hidden'));
  }

  private setupCalculatingTrades(): void {
    if (this.calculateTradeSubscription$) {
      return;
    }

    this.calculateTradeSubscription$ = this.onCalculateTrade$
      .pipe(
        filter(el => el === 'normal'),
        debounceTime(200),
        switchMap(() => {
          if (!this.allowTrade) {
            this.tradeStatus = TRADE_STATUS.DISABLED;
            this.selectedProvider = null;
            this.autoSelect = true;
            this.swapFormService.output.patchValue({
              toAmount: new BigNumber(NaN)
            });
            this.cdr.markForCheck();
            return of(null);
          }

          if (this.ethAndWethTrade) {
            this.selectedProvider = null;
            this.autoSelect = true;
            this.needApprove = false;
            this.tradeStatus = TRADE_STATUS.READY_TO_SWAP;

            this.swapFormService.output.patchValue({
              toAmount: this.fromAmount
            });

            this.cdr.markForCheck();
            return of(null);
          }

          this.prepareControllers();
          this.onRefreshStatusChange.emit(REFRESH_BUTTON_STATUS.REFRESHING);

          const providersNames = this.providerControllers.map(
            provider => provider.tradeProviderInfo.value
          );
          const approveData$ = this.authService.user?.address
            ? this.instantTradeService.getAllowance(providersNames)
            : of(new Array(this.providerControllers.length).fill(null));
          const tradeData$ = from(this.instantTradeService.calculateTrades(providersNames));
          const balance$ = from(
            this.tokensService.getAndUpdateTokenBalance(this.swapFormService.inputValue.fromToken)
          );

          return forkJoin([approveData$, tradeData$, balance$]).pipe(
            map(([approveData, tradeData]) => {
              this.setupControllers(tradeData, approveData);
              this.hiddenDataAmounts$.next(
                (tradeData as CalculationResult[]).map((trade, index) => {
                  if (trade.status === 'fulfilled' && trade.value) {
                    return {
                      amount: trade.value.to.amount,
                      name: providersNames[index]
                    };
                  }
                  return {
                    amount: null,
                    name: providersNames[index],
                    error: trade.reason
                  };
                })
              );
              this.onRefreshStatusChange.emit(REFRESH_BUTTON_STATUS.STOPPED);
            })
          );
        })
      )
      .subscribe();
  }

  public setupHiddenCalculatingTrades(): void {
    if (this.hiddenCalculateTradeSubscription$) {
      return;
    }
    this.hiddenCalculateTradeSubscription$ = this.onCalculateTrade$
      .pipe(
        filter(el => el === 'hidden' && Boolean(this.authService.userAddress)),
        switchMap(() => {
          if (!this.allowTrade) {
            return of(null);
          }

          const providersNames = this.providerControllers.map(
            provider => provider.tradeProviderInfo.value
          );
          const tradeData$ = from(this.instantTradeService.calculateTrades(providersNames));
          const balance$ = from(
            this.tokensService.getAndUpdateTokenBalance(this.swapFormService.inputValue.fromToken)
          );
          this.onRefreshStatusChange.emit(REFRESH_BUTTON_STATUS.REFRESHING);

          return forkJoin([tradeData$, balance$]).pipe(
            map(([tradeData]) => {
              return tradeData.map((trade: CalculationResult, index: number) => {
                if (trade.status === 'fulfilled') {
                  return {
                    amount: trade.value.to.amount,
                    name: providersNames[index]
                  };
                }
                return {
                  amount: null,
                  name: providersNames[index],
                  error: trade.reason
                };
              });
            })
          );
        })
      )
      .subscribe(el => {
        if (el && this.selectedProvider) {
          this.onRefreshStatusChange.emit(REFRESH_BUTTON_STATUS.STOPPED);
          this.hiddenDataAmounts$.next(el);
          const hiddenProviderData = el.find(
            (it: { name: INSTANT_TRADES_PROVIDERS }) =>
              it.name === this.selectedProvider.tradeProviderInfo.value
          );
          if (!this.selectedProvider.trade.to.amount.eq(hiddenProviderData.amount)) {
            this.tradeStatus = TRADE_STATUS.OLD_TRADE_DATA;
          }
          this.cdr.markForCheck();
        }
      });
  }

  private prepareControllers(): void {
    this.tradeStatus = TRADE_STATUS.LOADING;
    this.providerControllers = this.providerControllers.map(controller => ({
      ...controller,
      tradeState: INSTANT_TRADES_STATUS.CALCULATION
    }));
    this.cdr.detectChanges();
  }

  /**
   * Sets to providers calculated trade data, approve data and trade status.
   * @param tradeData Calculated trade data.
   * @param approveData Calculated info about whether provider must be approved or not.
   */
  private setupControllers(
    tradeData: CalculationResult[],
    approveData: Array<boolean | null>
  ): void {
    this.providerControllers = this.providerControllers.map((controller, index) => {
      const trade = tradeData[index]?.status === 'fulfilled' ? tradeData[index]?.value : null;
      return {
        ...controller,
        isSelected: false,
        trade,
        needApprove: approveData[index],
        tradeState:
          tradeData[index]?.status === 'fulfilled' && trade
            ? INSTANT_TRADES_STATUS.APPROVAL
            : INSTANT_TRADES_STATUS.ERROR,
        error: tradeData[index]?.status === 'rejected' ? tradeData[index]?.reason : null
      };
    });

    this.chooseBestController();
  }

  /**
   * Selects best provider controller and updates trade status.
   */
  private chooseBestController(): void {
    this.sortProviders();
    const bestProvider = this.providerControllers[0];

    if (bestProvider.trade) {
      this.selectController(0);

      this.tradeStatus = this.selectedProvider.needApprove
        ? TRADE_STATUS.READY_TO_APPROVE
        : TRADE_STATUS.READY_TO_SWAP;
      this.needApprove = this.selectedProvider.needApprove;

      this.swapFormService.output.patchValue({
        toAmount: this.selectedProvider.trade.to.amount
      });

      this.setSlippageTolerance(this.selectedProvider);
    } else {
      this.tradeStatus = TRADE_STATUS.DISABLED;
      this.instantTradeInfoChange.emit(null);
      this.swapInfoService.emitInfoCalculated();
      if (this.providerControllers.length === 1) {
        this.selectedProvider = null;
      }
    }
    this.cdr.detectChanges();
  }

  /**
   * Sorts providers based on usd$ price.
   */
  private sortProviders(): void {
    const calculateProfit = (trade: InstantTrade): BigNumber => {
      const { gasFeeInUsd, to } = trade;
      if (!to.token.price) {
        return to.amount;
      }
      const amountInUsd = to.amount?.multipliedBy(to.token.price);
      return gasFeeInUsd ? amountInUsd.minus(gasFeeInUsd) : amountInUsd;
    };

    this.providerControllers.sort((providerA, providerB) => {
      const tradeA = providerA.trade;
      const tradeB = providerB.trade;

      if (!tradeA || !tradeB) {
        if (!tradeA) {
          if (!tradeB) {
            return 0;
          }
          return 1;
        }
        return -1;
      }

      const profitA = calculateProfit(tradeA);
      const profitB = calculateProfit(tradeB);

      return profitB.comparedTo(profitA);
    });
  }

  /**
   * Focuses some of providers. If user have selected provider, keeps old index.
   * @param providerIndex Provider's index to select.
   */
  private selectController(providerIndex: number): void {
    if (this.autoSelect) {
      this.selectedProvider = this.providerControllers[providerIndex];
      this.providerControllers[providerIndex].isSelected = true;
    } else {
      const currentSelectedProviderIndex = this.providerControllers.findIndex(
        el => el.tradeProviderInfo.value === this.selectedProvider.tradeProviderInfo.value
      );

      this.selectedProvider = this.providerControllers[currentSelectedProviderIndex];
      if (!this.selectedProvider.trade) {
        this.selectedProvider = this.providerControllers[providerIndex];
        this.providerControllers[providerIndex].isSelected = true;
      } else {
        this.providerControllers[currentSelectedProviderIndex].isSelected = true;
      }
    }
  }

  public selectProvider(selectedProvider: ProviderControllerData): void {
    if (
      this.tradeStatus === TRADE_STATUS.LOADING ||
      this.tradeStatus === TRADE_STATUS.APPROVE_IN_PROGRESS ||
      this.tradeStatus === TRADE_STATUS.SWAP_IN_PROGRESS
    ) {
      return;
    }

    const providerName = selectedProvider.tradeProviderInfo.value;
    this.providerControllers = this.providerControllers.map(provider => {
      const isSelected = provider.tradeProviderInfo.value === providerName;
      return {
        ...provider,
        isSelected
      };
    });
    this.selectedProvider = this.providerControllers.find(provider => provider.isSelected);
    this.autoSelect = false;

    if (this.selectedProvider.needApprove !== null) {
      this.tradeStatus = this.selectedProvider.needApprove
        ? TRADE_STATUS.READY_TO_APPROVE
        : TRADE_STATUS.READY_TO_SWAP;
      this.needApprove = this.selectedProvider.needApprove;
    }
    this.swapFormService.output.patchValue({
      toAmount: this.selectedProvider.trade.to.amount
    });

    this.setSlippageTolerance(this.selectedProvider);
  }

  private setSlippageTolerance(provider: ProviderControllerData): void {
    if (
      this.settingsService.instantTradeValue.autoSlippageTolerance &&
      !this.iframeService.isIframe
    ) {
      const currentBlockchainDefaultSlippage =
        DEFAULT_SLIPPAGE_TOLERANCE[
          this.currentBlockchain as keyof typeof DEFAULT_SLIPPAGE_TOLERANCE
        ];
      const providerName = provider.tradeProviderInfo.value;
      this.settingsService.instantTrade.patchValue({
        slippageTolerance:
          currentBlockchainDefaultSlippage[
            providerName as keyof typeof currentBlockchainDefaultSlippage
          ]
      });
    }
  }

  public getUsdPrice(amount?: BigNumber): BigNumber {
    if ((!amount && !this.selectedProvider?.trade.to.amount) || !this.toToken) {
      return null;
    }
    if (!this.toToken?.price) {
      return new BigNumber(NaN);
    }

    const fromTokenCost = this.fromAmount.multipliedBy(this.fromToken?.price);
    const toAmount = amount || this.selectedProvider?.trade.to.amount;
    const toTokenCost = toAmount.multipliedBy(this.toToken.price);
    if (toTokenCost.minus(fromTokenCost).dividedBy(fromTokenCost).gt(PERMITTED_PRICE_DIFFERENCE)) {
      return new BigNumber(NaN);
    }
    return toTokenCost;
  }

  private setProviderState(
    tradeStatus: TRADE_STATUS,
    providerIndex: number,
    providerState?: INSTANT_TRADES_STATUS,
    needApprove?: boolean
  ): void {
    if (needApprove === undefined) {
      needApprove = this.providerControllers[providerIndex].needApprove;
    }

    this.tradeStatus = tradeStatus;
    this.providerControllers[providerIndex] = {
      ...this.providerControllers[providerIndex],
      ...(providerState && { tradeState: providerState }),
      needApprove
    };
    this.cdr.detectChanges();
  }

  public async approveTrade(): Promise<void> {
    const providerIndex = this.providerControllers.findIndex(el => el.isSelected);
    if (providerIndex === -1) {
      this.errorService.catch(new NoSelectedProviderError());
    }

    const provider = this.providerControllers[providerIndex];
    this.setProviderState(TRADE_STATUS.APPROVE_IN_PROGRESS, providerIndex);
    this.onRefreshStatusChange.emit(REFRESH_BUTTON_STATUS.IN_PROGRESS);

    try {
      await this.instantTradeService.approve(provider.tradeProviderInfo.value, provider.trade);

      await this.tokensService.calculateTokensBalances();

      this.setProviderState(
        TRADE_STATUS.READY_TO_SWAP,
        providerIndex,
        INSTANT_TRADES_STATUS.COMPLETED,
        false
      );
      this.needApprove = false;

      this.gtmService.updateFormStep(SWAP_PROVIDER_TYPE.INSTANT_TRADE, 'approve');
    } catch (err) {
      this.errorService.catch(err);

      this.setProviderState(
        TRADE_STATUS.READY_TO_APPROVE,
        providerIndex,
        INSTANT_TRADES_STATUS.APPROVAL,
        true
      );
    }
    this.cdr.detectChanges();
    this.onRefreshStatusChange.emit(REFRESH_BUTTON_STATUS.STOPPED);
  }

  public async createTrade(): Promise<void> {
    this.onRefreshStatusChange.emit(REFRESH_BUTTON_STATUS.IN_PROGRESS);

    let providerIndex = -1;
    let instantTradeProvider: INSTANT_TRADES_PROVIDERS;
    let instantTrade: InstantTrade;
    if (!this.ethAndWethTrade) {
      providerIndex = this.providerControllers.findIndex(el => el.isSelected);
      if (providerIndex === -1) {
        this.errorService.catch(new NoSelectedProviderError());
      }

      const provider = this.providerControllers[providerIndex];
      this.setProviderState(
        TRADE_STATUS.SWAP_IN_PROGRESS,
        providerIndex,
        INSTANT_TRADES_STATUS.TX_IN_PROGRESS
      );

      instantTradeProvider = provider.tradeProviderInfo.value;
      instantTrade = provider.trade;
    } else {
      this.tradeStatus = TRADE_STATUS.SWAP_IN_PROGRESS;
      instantTradeProvider = INSTANT_TRADES_PROVIDERS.WRAPPED;
      instantTrade = this.ethAndWethTrade;
    }

    try {
      await this.instantTradeService.createTrade(instantTradeProvider, instantTrade, () => {
        this.tradeStatus = TRADE_STATUS.READY_TO_SWAP;
        if (providerIndex !== -1) {
          this.setProviderState(
            TRADE_STATUS.READY_TO_SWAP,
            providerIndex,
            INSTANT_TRADES_STATUS.COMPLETED
          );
        } else {
          this.tradeStatus = TRADE_STATUS.READY_TO_SWAP;
        }
        this.cdr.detectChanges();
      });

      this.counterNotificationsService.updateUnread();

      await this.tokensService.calculateTokensBalances();

      this.tradeStatus = TRADE_STATUS.READY_TO_SWAP;
      this.conditionalCalculate();
    } catch (err) {
      this.errorService.catch(err);

      if (providerIndex !== -1) {
        this.setProviderState(
          TRADE_STATUS.READY_TO_SWAP,
          providerIndex,
          INSTANT_TRADES_STATUS.COMPLETED
        );
      } else {
        this.tradeStatus = TRADE_STATUS.READY_TO_SWAP;
      }
      this.cdr.detectChanges();
      this.onRefreshStatusChange.emit(REFRESH_BUTTON_STATUS.STOPPED);
    }
  }
}
