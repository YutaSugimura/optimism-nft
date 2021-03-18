// SPDX-License-Identifier: MIT
pragma solidity >0.5.0 <0.8.0;
pragma experimental ABIEncoderV2;

/* Contract Imports */
import { NFT } from "./NFT.sol";

/* Library Imports */
import { Abs_DepositedERC721 } from './OVM/Abs_DepositedERC721.sol';

contract L2DepositedNFT is Abs_DepositedERC721, NFT {

  constructor(
    address _l2CrossDomainMessenger,
    string memory _name,
    string memory _symbol
  )
    Abs_DepositedERC721(_l2CrossDomainMessenger)
    NFT(_name, _symbol)
  {}

  function _handleInitiateWithdrawal(
    address _to,
    uint _tokenId
  )
    internal
    override
  {
    _burn(_tokenId);
  }

  function _handleFinalizeDeposit(
    address _to,
    uint _tokenId,
    string memory _tokenURI
  )
    internal
    override
  {
    _mint(_to, _tokenId);
  }
}
