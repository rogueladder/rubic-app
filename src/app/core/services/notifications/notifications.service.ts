import { Inject, Injectable, NgZone } from '@angular/core';
import {
  TuiNotification,
  TuiNotificationContentContext,
  TuiNotificationOptions,
  TuiNotificationOptionsWithData,
  TuiNotificationsService
} from '@taiga-ui/core';
import { Subscription } from 'rxjs';
import { PolymorpheusContent } from '@tinkoff/ng-polymorpheus';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private readonly LONG_DELAY = 15000;

  private readonly SHORT_DELAY = 5000;

  constructor(
    @Inject(TuiNotificationsService)
    private readonly tuiNotificationsService: TuiNotificationsService,
    private readonly ngZone: NgZone,
    private readonly translateService: TranslateService
  ) {}

  public show<T = undefined>(
    content: PolymorpheusContent<TuiNotificationContentContext>,
    options: TuiNotificationOptions | TuiNotificationOptionsWithData<T>
  ): Subscription {
    return this.ngZone.run(() =>
      this.tuiNotificationsService.show(content, { ...options }).subscribe()
    );
  }

  public showApproveInProgress(options?: TuiNotificationOptions): Subscription {
    return this.show(this.translateService.instant('notifications.approveInProgress'), {
      status: options?.status ?? TuiNotification.Info,
      autoClose: options?.autoClose ?? false
    });
  }

  public showApproveSuccessful(options?: TuiNotificationOptions): Subscription {
    return this.show(this.translateService.instant('notifications.successApprove'), {
      status: options?.status ?? TuiNotification.Success,
      autoClose: options?.autoClose ?? this.LONG_DELAY
    });
  }

  public showOpenMobileWallet(options?: TuiNotificationOptions): Subscription {
    return this.show(this.translateService.instant('notifications.openMobileWallet'), {
      status: options?.status ?? TuiNotification.Info,
      autoClose: options?.autoClose ?? this.SHORT_DELAY
    });
  }
}
