import {Component, Input, OnInit} from '@angular/core';
import BigNumber from 'bignumber.js';
import {TOKENS_ADDRESSES} from '../../services/web3/web3.constants';
import {Web3Service} from '../../services/web3/web3.service';

@Component({
  selector: 'app-contract-form-pay',
  templateUrl: './contract-form-pay.component.html',
  styleUrls: ['./contract-form-pay.component.scss']
})
export class ContractFormPayComponent implements OnInit {

  @Input () public contractCosts;
  @Input () public currentUser;

  public copiedAddresses = {};
  public trxDataFields: any = {};
  public providedAddresses: any = {};
  public replenishMethod: string;
  public costValue;

  public tokensAddresses = TOKENS_ADDRESSES;

  constructor(
    private web3Service: Web3Service,
  ) {
  }


  ngOnInit() {
    this.trxDataFields.WISH = this.checkTRXData(this.contractCosts.WISH);
    this.trxDataFields.BNB = this.checkTRXData(this.contractCosts.BNB);
    this.replenishMethod = 'WISH';
    this.costValue = new BigNumber(this.contractCosts.ETH).toString(10);
    this.web3Service.getAccounts().then((addresses) => {
      this.providedAddresses = addresses;
    });
  }

  public copyText(val: string, field) {
    if (this.copiedAddresses[field]) {
      return;
    }
    this.copiedAddresses[field] = true;
    setTimeout(() => {
      this.copiedAddresses[field] = false;
    }, 1000);

    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = val;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);

  }


  public fromBigNumber(num, decimals) {
    return new BigNumber(num).div(Math.pow(10, decimals)).toString(10);
  }

  private checkTRXData(cost) {
    return this.web3Service.encodeFunctionCall(
      {
        name: 'transfer',
        type: 'function',
        inputs: [{
          type: 'address',
          name: 'to'
        }, {
          type: 'uint256',
          name: 'value'
        }]
      }, [
        this.currentUser.internal_address,
        new BigNumber(cost).toString(10)
      ]
    );
  }

  public payContractVia(coin) {

    if (coin !== 'ETH') {
      this.payContractViaTokens(coin);
    } else {
      this.payContractViaEth();
    }

  }


  private payContractViaTokens(token) {
    this.web3Service.sendTransaction({
      from: this.providedAddresses.metamask[0],
      to: TOKENS_ADDRESSES[token],
      data: this.trxDataFields[token]
    }, 'metamask').then((result) => {
      console.log(result);
    }, (err) => {
      console.log(err);
    });
  }


  public payContractViaEth() {
    this.web3Service.sendTransaction({
      from: this.providedAddresses.metamask[0],
      to: this.currentUser.internal_address,
      value: this.costValue
    }, 'metamask').then((result) => {
      console.log(result);
    }, (err) => {
      console.log(err);
    });
  }


}
