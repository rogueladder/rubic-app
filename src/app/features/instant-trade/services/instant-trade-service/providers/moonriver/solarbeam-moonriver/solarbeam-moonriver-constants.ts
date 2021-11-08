import { ContractAddressNetMode } from 'src/app/shared/models/blockchain/NetMode';
import { UniswapV2Constants } from 'src/app/features/instant-trade/services/instant-trade-service/models/uniswap-v2/UniswapV2Constants';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';

const sushiSwapSolarBeamContracts: ContractAddressNetMode = {
  mainnet: '0xAA30eF758139ae4a7f798112902Bf6d65612045f',
  // TODO: add  testnet address
  testnet: ''
};

const wethAddressNetMode: ContractAddressNetMode = {
  mainnet: '0x98878B06940aE243284CA214f92Bb71a2b032B8A', // WMOVR
  // TODO: add testnet address
  testnet: ''
};

const routingProvidersNetMode = {
  mainnet: [
    '0x98878B06940aE243284CA214f92Bb71a2b032B8A', // WMOVR
    '0xB44a9B6905aF7c801311e8F4E76932ee959c663C', // USDT
    '0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D', // USDC
    '0x80A16016cC4A2E6a2CACA8a4a498b1699fF0f844', // DAI
    '0x5D9ab5522c64E1F6ef5e3627ECCc093f56167818', // BUSD
    '0x6bD193Ee6D2104F14F94E2cA6efefae561A4334B' // SOLAR
  ],
  testnet: ['']
};

export const solarBeamMoonRiverConstants: UniswapV2Constants = {
  blockchain: BLOCKCHAIN_NAME.MOONRIVER,
  contractAddressNetMode: sushiSwapSolarBeamContracts,
  wethAddressNetMode,
  routingProvidersNetMode,
  maxTransitTokens: 2
};