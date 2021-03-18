import { Provider } from '@ethersproject/providers'
import { Wallet, ContractFactory, Contract } from 'ethers'
import { getContractFactory } from '@eth-optimism/contracts'

import * as NFT from '../artifacts/contracts/NFT.sol/NFT.json';
import * as Def__L2DepositedERC721 from '../artifacts/contracts/L2DepositedNFT.sol/L2DepositedNFT-ovm.json';
import * as Def__L1ERC721Gateway from '../artifacts/contracts/OVM/OVM_ERC721Gateway.sol/OVM_ERC721Gateway.json';

export type ConfiguredGateway = {
  L1_ERC721: Contract
  OVM_L1ERC721Gateway: Contract
  OVM_L2DepositedERC721: Contract
}

export type ERC721Config = {
  name: string
  ticker: string
}

export const defaultERC721Config: ERC721Config = {
  name: 'REEERC20',
  ticker: 'REE',
}

export const getDeployedERC721Config = async(
  provider: Provider,
  erc20: Contract
): Promise<ERC721Config> => {
  // TODO: actually grab from the contract's fields
  return defaultERC721Config
}

export const deployNewGateway = async (
  l1Wallet: Wallet,
  l2Wallet: Wallet,
  l1ERC721: Contract,
  l1MessengerAddress: string,
  l2MessengerAddress: string,
): Promise<{
  OVM_L1ERC721Gateway: Contract,
  OVM_L2DepositedERC721: Contract,
}> => {
  let OVM_L1ERC721Gateway
  let OVM_L2DepositedERC721

  const ERC721Config: ERC721Config = await getDeployedERC721Config(l1Wallet.provider, l1ERC721)

  // Deploy L2 ERC721 Gateway
  const Factory__OVM_L2DepositedERC721 = new ContractFactory(Def__L2DepositedERC721.abi, Def__L2DepositedERC721.bytecode, l2Wallet)
  OVM_L2DepositedERC721 = await Factory__OVM_L2DepositedERC721.deploy(
    l2MessengerAddress,
    'OVM_' + ERC721Config.name,
    'ovm' + ERC721Config.ticker
  )
  await OVM_L2DepositedERC721.deployTransaction.wait()
  console.log('OVM_L2DepositedERC721 deployed to:', OVM_L2DepositedERC721.address)

  // Deploy L1 ERC721 Gateway
  const Factory__OVM_L1ERC721Gateway = new ContractFactory(Def__L1ERC721Gateway.abi, Def__L1ERC721Gateway.bytecode, l1Wallet);
  OVM_L1ERC721Gateway = await Factory__OVM_L1ERC721Gateway.deploy(
    l1ERC721.address,
    OVM_L2DepositedERC721.address,
    l1MessengerAddress
  )
  await OVM_L1ERC721Gateway.deployTransaction.wait()
  console.log('OVM_L1ERC20Gateway deployed to:', OVM_L1ERC721Gateway.address)

  // Init L2 ERC20 Gateway
  console.log('Connecting L2 WETH with L1 Deposit contract...')
  const initTx = await OVM_L2DepositedERC721.init(OVM_L1ERC721Gateway.address)
  await initTx.wait()

  return {
    OVM_L1ERC721Gateway,
    OVM_L2DepositedERC721
  }
}

export const setupOrRetrieveGateway = async (
  l1Wallet: Wallet,
  l2Wallet: Wallet,
  l1ERC721Address?: string,
  l1ERC721GatewayAddress?: string,
  l1MessengerAddress?: string,
  l2MessengerAddress?: string,
  ERC721Config: ERC721Config = defaultERC721Config,
): Promise<ConfiguredGateway> => {
  // Deploy or retrieve L1 ERC721
  let L1_ERC721: Contract
  if (!l1ERC721Address) {
    console.log('No L1 ERC721 specified--deploying a new test ERC721 on L1.')
    const L1ERC721Factory = new ContractFactory(NFT.abi, NFT.bytecode, l1Wallet)
    L1_ERC721 = await L1ERC721Factory.deploy(ERC721Config.name, ERC721Config.ticker)
    console.log('New L1_ERC721 deployed to:', L1_ERC721.address)
    l1ERC721Address = L1_ERC721.address
  } else {
    console.log('Connecting to existing L1 ERC721 at:', l1ERC721Address)
    L1_ERC721 = new Contract(l1ERC721Address, NFT.abi, l1Wallet)
  }

  let OVM_L1ERC721Gateway: Contract
  let OVM_L2DepositedERC721: Contract
  if (!l1ERC721GatewayAddress) {
    console.log('No gateway contract specified, deploying a new one...')
    const newGateway = await deployNewGateway(l1Wallet, l2Wallet, L1_ERC721, l1MessengerAddress, l2MessengerAddress)
    OVM_L1ERC721Gateway = newGateway.OVM_L1ERC721Gateway
    OVM_L2DepositedERC721 = newGateway.OVM_L2DepositedERC721
  } else {
    OVM_L1ERC721Gateway = new Contract(l1ERC721GatewayAddress, Def__L2DepositedERC721.abi, l1Wallet)
    const l2ERC721GatewayAddress = await OVM_L1ERC721Gateway.l2ERC721Gateway()
    OVM_L2DepositedERC721 = new Contract(l2ERC721GatewayAddress, Def__L2DepositedERC721.abi, l2Wallet)
  }

  console.log('Completed getting full ERC20 gateway.')
  return {
    L1_ERC721,
    OVM_L1ERC721Gateway,
    OVM_L2DepositedERC721
  }
}
