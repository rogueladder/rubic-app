import {
  ChangeDetectionStrategy,
  Component,
  Output,
  EventEmitter,
  Input,
  OnInit
} from '@angular/core';
import BigNumber from 'bignumber.js';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LpFormError } from '../../models/lp-form-error.enum';
import { PoolToken } from '../../models/pool-token.enum';
import { LiquidityProvidingService } from '../../services/liquidity-providing.service';

@Component({
  selector: 'app-deposit-button',
  templateUrl: './deposit-button.component.html',
  styleUrls: ['./deposit-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepositButtonComponent implements OnInit {
  @Input() usdcAmount$: Observable<BigNumber>;

  @Input() brbcAmount$: Observable<BigNumber>;

  @Input() liquidityPeriod$: Observable<number>;

  @Input() loading: boolean;

  @Output() onLogin = new EventEmitter<void>();

  @Output() onSwitchNetwork = new EventEmitter<void>();

  @Output() onApprove = new EventEmitter<PoolToken>();

  @Output() onCreateDeposit = new EventEmitter<void>();

  public readonly poolToken = PoolToken;

  private readonly _error$ = new BehaviorSubject<LpFormError | null>(null);

  public readonly error$ = this._error$.asObservable();

  public readonly errors = LpFormError;

  public readonly needUsdcApprove$ = this.service.needUsdcApprove$;

  public readonly needBrbcApprove$ = this.service.needBrbcApprove$;

  public readonly needSwitchNetwork$ = this.service.needSwitchNetwork$;

  public readonly needLogin$ = this.service.needLogin$;

  public readonly currentMaxLimit = this.service.currentMaxLimit;

  public readonly minLimit = this.service.minEnterAmount;

  constructor(private readonly service: LiquidityProvidingService) {}

  ngOnInit(): void {
    combineLatest([this.brbcAmount$, this.service.brbcBalance$, this.liquidityPeriod$])
      .pipe(
        tap(([brbcAmount, brbcBalance, period]) => {
          this._error$.next(
            this.service.checkAmountAndPeriodForErrors(brbcAmount, brbcBalance, period)
          );
        })
      )
      .subscribe();

    combineLatest([this.usdcAmount$, this.service.usdcBalance$, this.liquidityPeriod$])
      .pipe(
        tap(([usdcAmount, usdcBalance, period]) => {
          this._error$.next(
            this.service.checkAmountAndPeriodForErrors(usdcAmount, usdcBalance, period)
          );
        })
      )
      .subscribe();
  }
}