import { APP_INITIALIZER, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MaintenanceComponent } from './header/components/maintenance/maintenance.component';
import { HeaderComponent } from './header/components/header/header.component';
import { HeaderModule } from './header/header.module';
import { SharedModule } from '../shared/shared.module';
import { configLoader, httpLoaderFactory } from './app.loaders';
import { ContentLoaderService } from './services/content-loader/content-loader.service';

@NgModule({
  declarations: [MaintenanceComponent],
  providers: [
    CookieService,
    {
      provide: APP_INITIALIZER,
      useFactory: configLoader,
      deps: [ContentLoaderService],
      multi: true
    }
  ],
  imports: [
    CommonModule,
    HeaderModule,
    SharedModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  exports: [MaintenanceComponent, RouterModule, HeaderComponent]
})
export class CoreModule {}