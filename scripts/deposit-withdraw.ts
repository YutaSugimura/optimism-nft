import { JsonRpcProvider } from '@ethersproject/providers'
import { Wallet } from 'ethers'
import { Watcher } from '@eth-optimism/watcher'
import * as dotenv from 'dotenv'
dotenv.config({ path: __dirname + '/../.env' });

import { setupOrRetrieveGateway } from './helpers'

const main = async () => {
  // Grab wallets for both chains
  const l1Provider = new JsonRpcProvider(process.env.L1_WEB3_URL)
  const l2Provider = new JsonRpcProvider(process.env.L2_WEB3_URL)
  const l1Wallet = new Wallet(process.env.USER_PRIVATE_KEY, l1Provider)
  const l2Wallet = new Wallet(process.env.USER_PRIVATE_KEY, l2Provider)
  
  // Grab messenger addresses
  const l1MessengerAddress = process.env.L1_MESSENGER_ADDRESS
  const l2MessengerAddress = '0x4200000000000000000000000000000000000007'

  // Grab existing addresses if specified
  let l1ERC721Address = process.env.L1_ERC721_ADDRESS
  const l1ERC721GatewayAddress = process.env.L1_ERC721_GATEWAY_ADDRESS

  const {
    L1_ERC721,
    OVM_L1ERC721Gateway,
    OVM_L2DepositedERC721
  } = await setupOrRetrieveGateway(
    l1Wallet,
    l2Wallet,
    l1ERC721Address,
    l1ERC721GatewayAddress,
    l1MessengerAddress,
    l2MessengerAddress
  )

  // init watcher
  const watcher = new Watcher({
    l1: {
      provider: l1Provider,
      messengerAddress: l1MessengerAddress
    },
    l2: {
      provider: l2Provider,
      messengerAddress: l2MessengerAddress
    }
  })

  // tokenId
  const tokenId = 1;

  const logBalances = async (description: string = '') => {
    console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ' + description + ' ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
    if(L1_ERC721) {
      const l1Balance = await L1_ERC721.balanceOf(l1Wallet.address)
      console.log('L1 balance of', l1Wallet.address, 'is', l1Balance.toString())
    } else { console.log('no L1_ERC20 configured') }
    if(OVM_L2DepositedERC721) {
      const l2Balance = await OVM_L2DepositedERC721.balanceOf(l2Wallet.address)
      console.log('L2 balance of', l2Wallet.address, 'is', l2Balance.toString())
    } else { console.log('no OVM_L2DepositedERC721 configured') }

    if(L1_ERC721) {
      try {
        const tokenOwner = await L1_ERC721.ownerOf(tokenId);
        console.log('L1 Token Owner:', tokenOwner);
      } catch {}
    }
    if(OVM_L2DepositedERC721) {
      try {
        const tokenOwner = await OVM_L2DepositedERC721.ownerOf(tokenId);
        console.log('L2 Token Owner:', tokenOwner);
      } catch {}
    }
    console.log('~'.repeat(description.length) + '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n')
  }

  console.log('\n\nInitial balance')
  await logBalances()

  // mint
  console.log('Mint nft token');
  const mintTx = await L1_ERC721.mint(l1Wallet.address, tokenId);
  console.log('Mint: https://kovan.etherscan.io/tx/' + mintTx.hash);
  await mintTx.wait();

  await logBalances()

  // Approve
  console.log('Approving L1 deposit contract...')
  const approveTx = await L1_ERC721.approve(OVM_L1ERC721Gateway.address, tokenId);
  console.log('Approved: https://kovan.etherscan.io/tx/' + approveTx.hash)
  await approveTx.wait()

  // Deposit
  console.log('Depositing into L1 deposit contract...')
  const depositTx = await OVM_L1ERC721Gateway.deposit(1, {gasLimit: 1000000})
  console.log('Deposited: https://kovan.etherscan.io/tx/' + depositTx.hash) 
  await depositTx.wait()
  
  await logBalances()

  const [l1ToL2msgHash] = await watcher.getMessageHashesFromL1Tx(depositTx.hash)
  console.log('got L1->L2 message hash', l1ToL2msgHash)
	const l2Receipt = await watcher.getL2TransactionReceipt(l1ToL2msgHash)
  console.log('completed Deposit! L2 tx hash:', l2Receipt.transactionHash)

  await logBalances()

  // Withdraw
  console.log('Withdrawing from L1 deposit contract...')
  const withdrawalTx = await OVM_L2DepositedERC721.withdraw(1, {gasLimit: 5000000})
  await withdrawalTx.wait()
  console.log('Withdrawal tx hash:' + withdrawalTx.hash) 

  await logBalances()

  const [l2ToL1msgHash] = await watcher.getMessageHashesFromL2Tx(withdrawalTx.hash)
  console.log('got L2->L1 message hash', l2ToL1msgHash)
  const l1Receipt = await watcher.getL1TransactionReceipt(l2ToL1msgHash)
  console.log('completed Withdrawal! L1 tx hash:', l1Receipt.transactionHash)
  await logBalances()
}

main()
