import { AbiItem } from 'web3-utils';

export const IM_CONTRACT_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '_messageBus', type: 'address' },
      { internalType: 'address', name: '_supportedDex', type: 'address' },
      { internalType: 'address', name: '_nativeWrap', type: 'address' }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: false, internalType: 'uint64', name: 'srcChainId', type: 'uint64' },
      { indexed: false, internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'tokenIn', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'tokenOut', type: 'address' }
    ],
    name: 'DirectSwap',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: false, internalType: 'uint64', name: 'srcChainId', type: 'uint64' },
      { indexed: false, internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'tokenIn', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'tokenOut', type: 'address' }
    ],
    name: 'DirectSwapV2',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: false, internalType: 'uint64', name: 'srcChainId', type: 'uint64' },
      { indexed: false, internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'tokenIn', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'tokenOut', type: 'address' }
    ],
    name: 'DirectSwapV3',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, internalType: 'address', name: 'messageBus', type: 'address' }],
    name: 'MessageBusUpdated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'previousOwner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'newOwner', type: 'address' }
    ],
    name: 'OwnershipTransferred',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: false, internalType: 'uint256', name: 'dstAmount', type: 'uint256' },
      { indexed: false, internalType: 'enum SwapBase.SwapStatus', name: 'status', type: 'uint8' }
    ],
    name: 'SwapRequestDone',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: false, internalType: 'uint256', name: 'dstAmount', type: 'uint256' },
      { indexed: false, internalType: 'enum SwapBase.SwapStatus', name: 'status', type: 'uint8' }
    ],
    name: 'SwapRequestDoneV2',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: false, internalType: 'uint256', name: 'dstAmount', type: 'uint256' },
      { indexed: false, internalType: 'enum SwapBase.SwapStatus', name: 'status', type: 'uint8' }
    ],
    name: 'SwapRequestDoneV3',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: false, internalType: 'uint64', name: 'dstChainId', type: 'uint64' },
      { indexed: false, internalType: 'uint256', name: 'srcAmount', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'srcToken', type: 'address' },
      { indexed: false, internalType: 'address', name: 'dstToken', type: 'address' }
    ],
    name: 'SwapRequestSentInch',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: false, internalType: 'uint64', name: 'dstChainId', type: 'uint64' },
      { indexed: false, internalType: 'uint256', name: 'srcAmount', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'srcToken', type: 'address' },
      { indexed: false, internalType: 'address', name: 'dstToken', type: 'address' }
    ],
    name: 'SwapRequestSentV2',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      { indexed: false, internalType: 'uint64', name: 'dstChainId', type: 'uint64' },
      { indexed: false, internalType: 'uint256', name: 'srcAmount', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'srcToken', type: 'address' },
      { indexed: false, internalType: 'address', name: 'dstToken', type: 'address' }
    ],
    name: 'SwapRequestSentV3',
    type: 'event'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    name: 'dstCryptoFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_sender', type: 'address' },
      { internalType: 'uint64', name: '_srcChainId', type: 'uint64' },
      { internalType: 'bytes', name: '_message', type: 'bytes' }
    ],
    name: 'executeMessage',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '_token', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      { internalType: 'uint64', name: '_srcChainId', type: 'uint64' },
      { internalType: 'bytes', name: '_message', type: 'bytes' },
      { internalType: 'enum SwapBase.SwapVersion', name: 'version', type: 'uint8' }
    ],
    name: 'executeMessageWithTransfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_sender', type: 'address' },
      { internalType: 'address', name: '_token', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      { internalType: 'uint64', name: '_srcChainId', type: 'uint64' },
      { internalType: 'bytes', name: '_message', type: 'bytes' }
    ],
    name: 'executeMessageWithTransfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      { internalType: 'uint64', name: '_srcChainId', type: 'uint64' },
      { internalType: 'bytes', name: '_message', type: 'bytes' }
    ],
    name: 'executeMessageWithTransferFallback',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      { internalType: 'bytes', name: '_message', type: 'bytes' }
    ],
    name: 'executeMessageWithTransferRefund',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'feeRubic',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'messageBus',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'minSwapAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'nativeWrap',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint64', name: '_networkID', type: 'uint64' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' }
    ],
    name: 'setCryptoFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint8', name: '_decimals', type: 'uint8' }],
    name: 'setDecimalsUSD',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_messageBus', type: 'address' }],
    name: 'setMessageBus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: '_minSwapAmount', type: 'uint256' }],
    name: 'setMinSwapAmount',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_nativeWrap', type: 'address' }],
    name: 'setNativeWrap',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: '_feeRubic', type: 'uint256' }],
    name: 'setRubicFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_dex', type: 'address' },
      { internalType: 'bool', name: '_enabled', type: 'bool' }
    ],
    name: 'setSupportedDex',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'contract IERC20', name: 'token', type: 'address' }],
    name: 'sweepTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_receiver', type: 'address' },
      { internalType: 'uint256', name: '_amountIn', type: 'uint256' },
      { internalType: 'uint64', name: '_dstChainId', type: 'uint64' },
      {
        components: [
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'address[]', name: 'path', type: 'address[]' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoInch',
        name: '_srcSwap',
        type: 'tuple'
      },
      {
        components: [
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'address[]', name: 'path', type: 'address[]' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoInch',
        name: '_dstSwap',
        type: 'tuple'
      },
      { internalType: 'uint32', name: '_maxBridgeSlippage', type: 'uint32' },
      { internalType: 'uint64', name: '_nonce', type: 'uint64' },
      { internalType: 'bool', name: '_nativeOut', type: 'bool' }
    ],
    name: 'transferWithSwapInch',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_receiver', type: 'address' },
      { internalType: 'uint256', name: '_amountIn', type: 'uint256' },
      { internalType: 'uint64', name: '_dstChainId', type: 'uint64' },
      {
        components: [
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'address[]', name: 'path', type: 'address[]' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoInch',
        name: '_srcSwap',
        type: 'tuple'
      },
      {
        components: [
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'address[]', name: 'path', type: 'address[]' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoInch',
        name: '_dstSwap',
        type: 'tuple'
      },
      { internalType: 'uint32', name: '_maxBridgeSlippage', type: 'uint32' },
      { internalType: 'uint64', name: '_nonce', type: 'uint64' },
      { internalType: 'bool', name: '_nativeOut', type: 'bool' }
    ],
    name: 'transferWithSwapInchNative',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_receiver', type: 'address' },
      { internalType: 'uint256', name: '_amountIn', type: 'uint256' },
      { internalType: 'uint64', name: '_dstChainId', type: 'uint64' },
      {
        components: [
          { internalType: 'address[]', name: 'path', type: 'address[]' },
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'minRecvAmt', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoV2',
        name: '_srcSwap',
        type: 'tuple'
      },
      {
        components: [
          { internalType: 'address[]', name: 'path', type: 'address[]' },
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'minRecvAmt', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoV2',
        name: '_dstSwap',
        type: 'tuple'
      },
      { internalType: 'uint32', name: '_maxBridgeSlippage', type: 'uint32' },
      { internalType: 'uint64', name: '_nonce', type: 'uint64' },
      { internalType: 'bool', name: '_nativeOut', type: 'bool' }
    ],
    name: 'transferWithSwapV2',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_receiver', type: 'address' },
      { internalType: 'uint256', name: '_amountIn', type: 'uint256' },
      { internalType: 'uint64', name: '_dstChainId', type: 'uint64' },
      {
        components: [
          { internalType: 'address[]', name: 'path', type: 'address[]' },
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'minRecvAmt', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoV2',
        name: '_srcSwap',
        type: 'tuple'
      },
      {
        components: [
          { internalType: 'address[]', name: 'path', type: 'address[]' },
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'minRecvAmt', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoV2',
        name: '_dstSwap',
        type: 'tuple'
      },
      { internalType: 'uint32', name: '_maxBridgeSlippage', type: 'uint32' },
      { internalType: 'uint64', name: '_nonce', type: 'uint64' },
      { internalType: 'bool', name: '_nativeOut', type: 'bool' }
    ],
    name: 'transferWithSwapV2Native',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_receiver', type: 'address' },
      { internalType: 'uint256', name: '_amountIn', type: 'uint256' },
      { internalType: 'uint64', name: '_dstChainId', type: 'uint64' },
      {
        components: [
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'bytes', name: 'path', type: 'bytes' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoV3',
        name: '_srcSwap',
        type: 'tuple'
      },
      {
        components: [
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'bytes', name: 'path', type: 'bytes' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoV3',
        name: '_dstSwap',
        type: 'tuple'
      },
      { internalType: 'uint32', name: '_maxBridgeSlippage', type: 'uint32' },
      { internalType: 'uint64', name: '_nonce', type: 'uint64' },
      { internalType: 'bool', name: '_nativeOut', type: 'bool' }
    ],
    name: 'transferWithSwapV3',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_receiver', type: 'address' },
      { internalType: 'uint256', name: '_amountIn', type: 'uint256' },
      { internalType: 'uint64', name: '_dstChainId', type: 'uint64' },
      {
        components: [
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'bytes', name: 'path', type: 'bytes' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoV3',
        name: '_srcSwap',
        type: 'tuple'
      },
      {
        components: [
          { internalType: 'address', name: 'dex', type: 'address' },
          { internalType: 'bytes', name: 'path', type: 'bytes' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' }
        ],
        internalType: 'struct SwapBase.SwapInfoV3',
        name: '_dstSwap',
        type: 'tuple'
      },
      { internalType: 'uint32', name: '_maxBridgeSlippage', type: 'uint32' },
      { internalType: 'uint64', name: '_nonce', type: 'uint64' },
      { internalType: 'bool', name: '_nativeOut', type: 'bool' }
    ],
    name: 'transferWithSwapV3Native',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  { stateMutability: 'payable', type: 'receive' }
] as AbiItem[];
