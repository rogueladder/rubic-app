import { AbiItem } from 'web3-utils';

export const MESSAGE_BUS_CONTRACT_ABI = [
  {
    inputs: [
      { internalType: 'contract ISigsVerifier', name: '_sigsVerifier', type: 'address' },
      { internalType: 'address', name: '_liquidityBridge', type: 'address' },
      { internalType: 'address', name: '_pegBridge', type: 'address' },
      { internalType: 'address', name: '_pegVault', type: 'address' }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'enum MessageBusReceiver.MsgType',
        name: 'msgType',
        type: 'uint8'
      },
      { indexed: false, internalType: 'bytes32', name: 'id', type: 'bytes32' },
      {
        indexed: false,
        internalType: 'enum MessageBusReceiver.TxStatus',
        name: 'status',
        type: 'uint8'
      }
    ],
    name: 'Executed',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
      { indexed: false, internalType: 'address', name: 'receiver', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'dstChainId', type: 'uint256' },
      { indexed: false, internalType: 'bytes', name: 'message', type: 'bytes' },
      { indexed: false, internalType: 'uint256', name: 'fee', type: 'uint256' }
    ],
    name: 'Message',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
      { indexed: false, internalType: 'address', name: 'receiver', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'dstChainId', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'bridge', type: 'address' },
      { indexed: false, internalType: 'bytes32', name: 'srcTransferId', type: 'bytes32' },
      { indexed: false, internalType: 'bytes', name: 'message', type: 'bytes' },
      { indexed: false, internalType: 'uint256', name: 'fee', type: 'uint256' }
    ],
    name: 'MessageWithTransfer',
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
    inputs: [{ internalType: 'bytes', name: '_message', type: 'bytes' }],
    name: 'calcFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes', name: '_message', type: 'bytes' },
      {
        components: [
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'receiver', type: 'address' },
          { internalType: 'uint64', name: 'srcChainId', type: 'uint64' }
        ],
        internalType: 'struct MessageBusReceiver.RouteInfo',
        name: '_route',
        type: 'tuple'
      },
      { internalType: 'bytes[]', name: '_sigs', type: 'bytes[]' },
      { internalType: 'address[]', name: '_signers', type: 'address[]' },
      { internalType: 'uint256[]', name: '_powers', type: 'uint256[]' }
    ],
    name: 'executeMessage',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes', name: '_message', type: 'bytes' },
      {
        components: [
          { internalType: 'enum MessageBusReceiver.TransferType', name: 't', type: 'uint8' },
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'receiver', type: 'address' },
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint64', name: 'seqnum', type: 'uint64' },
          { internalType: 'uint64', name: 'srcChainId', type: 'uint64' },
          { internalType: 'bytes32', name: 'refId', type: 'bytes32' }
        ],
        internalType: 'struct MessageBusReceiver.TransferInfo',
        name: '_transfer',
        type: 'tuple'
      },
      { internalType: 'bytes[]', name: '_sigs', type: 'bytes[]' },
      { internalType: 'address[]', name: '_signers', type: 'address[]' },
      { internalType: 'uint256[]', name: '_powers', type: 'uint256[]' }
    ],
    name: 'executeMessageWithTransfer',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes', name: '_message', type: 'bytes' },
      {
        components: [
          { internalType: 'enum MessageBusReceiver.TransferType', name: 't', type: 'uint8' },
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'receiver', type: 'address' },
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint64', name: 'seqnum', type: 'uint64' },
          { internalType: 'uint64', name: 'srcChainId', type: 'uint64' },
          { internalType: 'bytes32', name: 'refId', type: 'bytes32' }
        ],
        internalType: 'struct MessageBusReceiver.TransferInfo',
        name: '_transfer',
        type: 'tuple'
      },
      { internalType: 'bytes[]', name: '_sigs', type: 'bytes[]' },
      { internalType: 'address[]', name: '_signers', type: 'address[]' },
      { internalType: 'uint256[]', name: '_powers', type: 'uint256[]' }
    ],
    name: 'executeMessageWithTransferRefund',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'executedMessages',
    outputs: [{ internalType: 'enum MessageBusReceiver.TxStatus', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'feeBase',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'feePerByte',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_liquidityBridge', type: 'address' },
      { internalType: 'address', name: '_pegBridge', type: 'address' },
      { internalType: 'address', name: '_pegVault', type: 'address' }
    ],
    name: 'init',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'liquidityBridge',
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
    inputs: [],
    name: 'pegBridge',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'pegVault',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_receiver', type: 'address' },
      { internalType: 'uint256', name: '_dstChainId', type: 'uint256' },
      { internalType: 'bytes', name: '_message', type: 'bytes' }
    ],
    name: 'sendMessage',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_receiver', type: 'address' },
      { internalType: 'uint256', name: '_dstChainId', type: 'uint256' },
      { internalType: 'address', name: '_srcBridge', type: 'address' },
      { internalType: 'bytes32', name: '_srcTransferId', type: 'bytes32' },
      { internalType: 'bytes', name: '_message', type: 'bytes' }
    ],
    name: 'sendMessageWithTransfer',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: '_fee', type: 'uint256' }],
    name: 'setFeeBase',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: '_fee', type: 'uint256' }],
    name: 'setFeePerByte',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_addr', type: 'address' }],
    name: 'setLiquidityBridge',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_addr', type: 'address' }],
    name: 'setPegBridge',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_addr', type: 'address' }],
    name: 'setPegVault',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'sigsVerifier',
    outputs: [{ internalType: 'contract ISigsVerifier', name: '', type: 'address' }],
    stateMutability: 'view',
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
      { internalType: 'address', name: '_account', type: 'address' },
      { internalType: 'uint256', name: '_cumulativeFee', type: 'uint256' },
      { internalType: 'bytes[]', name: '_sigs', type: 'bytes[]' },
      { internalType: 'address[]', name: '_signers', type: 'address[]' },
      { internalType: 'uint256[]', name: '_powers', type: 'uint256[]' }
    ],
    name: 'withdrawFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'withdrawnFees',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as AbiItem[];
