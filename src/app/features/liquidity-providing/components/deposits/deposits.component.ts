import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { WalletConnectorService } from '@app/core/services/blockchain/wallets/wallet-connector-service/wallet-connector.service';
import { BlockchainData } from '@app/shared/models/blockchain/blockchain-data';
import { TuiDestroyService } from '@taiga-ui/cdk';
import BigNumber from 'bignumber.js';
import { BehaviorSubject, of } from 'rxjs';
import { finalize, switchMap, take, takeUntil } from 'rxjs/operators';
import { DepositType } from '../../models/deposit-type.enum';
import { LiquidityProvidingModalService } from '../../services/liquidity-providing-modals.service';
import { LiquidityProvidingNotificationService } from '../../services/liquidity-providing-notification.service';
import { LiquidityProvidingService } from '../../services/liquidity-providing.service';

@Component({
  selector: 'app-deposits',
  templateUrl: './deposits.component.html',
  styleUrls: ['./deposits.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TuiDestroyService]
})
export class DepositsComponent implements OnInit {
  public readonly isWhitelistUser$ = this.lpService.isWhitelistUser$;

  public readonly deposits$ = this.lpService.deposits$;

  public readonly depositsLoading$ = this.lpService.depositsLoading$;

  private readonly _processingTokenId$ = new BehaviorSubject<string>(undefined);

  public readonly processingTokenId$ = this._processingTokenId$.asObservable();

  public readonly isPoolFull = this.lpService.isPoolFull;

  public readonly isLpEnded = this.lpService.isLpEneded;

  public needSwitchNetwork: boolean;

  constructor(
    private readonly lpService: LiquidityProvidingService,
    private readonly lpNotificationService: LiquidityProvidingNotificationService,
    private readonly lpModalService: LiquidityProvidingModalService,
    private readonly walletConnectorService: WalletConnectorService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroy$: TuiDestroyService
  ) {}

  ngOnInit(): void {
    this.walletConnectorService.networkChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe((network: BlockchainData) => {
        this.needSwitchNetwork = network?.name !== this.lpService.blockchain;
        this.cdr.detectChanges();
      });
  }

  public collectReward(tokenId: string): void {
    this._processingTokenId$.next(tokenId);
    this.lpService
      .collectRewards(tokenId)
      .pipe(finalize(() => this._processingTokenId$.next(undefined)))
      .subscribe(() => {
        this._processingTokenId$.next(undefined);
        this.lpService.setDepositsLoading(false);
        this.lpNotificationService.showSuccessRewardsClaimNotification();
      });
  }

  public requestWithdraw(tokenId: string, amount: BigNumber): void {
    of(this.lpService.isLpEneded)
      .pipe(
        switchMap(isLpEnded => {
          if (isLpEnded) {
            return this.lpService.requestWithdraw(tokenId).pipe(
              finalize(() => {
                this.lpNotificationService.showSuccessWithdrawRequestNotification();
                this._processingTokenId$.next(undefined);
              })
            );
          } else {
            return this.lpModalService.showRequestWithdrawModal(amount).pipe(
              switchMap(result => {
                if (result) {
                  this._processingTokenId$.next(tokenId);
                  return this.lpService.requestWithdraw(tokenId).pipe(
                    finalize(() => {
                      this._processingTokenId$.next(undefined);
                    })
                  );
                } else {
                  return of(result);
                }
              })
            );
          }
        })
      )
      .subscribe();
  }

  public withdraw(tokenId: string): void {
    this._processingTokenId$.next(tokenId);
    this.lpService
      .withdraw(tokenId)
      .pipe(finalize(() => this._processingTokenId$.next(undefined)))
      .subscribe(() => {
        this.lpNotificationService.showSuccessWithdrawNotification();
      });
  }

  public navigateToDepositForm(asWhitelist: boolean): void {
    this.lpService.navigateToDepositForm(asWhitelist ? DepositType.WHITELIST : DepositType.REGULAR);
  }

  public showTransferModal(): void {
    this.lpModalService.showTransferModal().subscribe();
  }

  public reloadDeposits(): void {
    this.lpService
      .getDeposits()
      .pipe(take(1))
      .subscribe(() => this.lpService.setDepositsLoading(false));
  }
}