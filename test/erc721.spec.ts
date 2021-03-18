import { expect } from './setup'

import { ethers } from 'hardhat'
import { Contract, Signer } from 'ethers'

describe('NFT', () => {
  let account1: Signer
  let account2: Signer
  let account3: Signer
  before(async () => {
    ;[account1, account2, account3] = await ethers.getSigners()
  })

  const name = 'Non Fungible Token'
  const symbol = 'NFT'

  let ERC721: Contract
  beforeEach(async () => {
    ERC721 = await (await ethers.getContractFactory('NFT'))
      .connect(account1)
      .deploy( name, symbol)
  })

  describe('the basics', () => {
    it('should have a name', async () => {
      expect(await ERC721.name()).to.equal(name)
    })


    it("should give the initial supply to the creator's address", async () => {
      expect(await ERC721.balanceOf(await account1.getAddress())).to.equal(0)
      expect(await ERC721.balanceOf(await account2.getAddress())).to.equal(0)
    })
  })

  describe('mint', () => {
    it('should succeed when the recipient have issued and possessed a token with an id of 1', async() => {
      const recipient = account1;
      const tokenId = 1;

      await ERC721.connect(recipient).mint(await recipient.getAddress(), tokenId);

      expect(await ERC721.balanceOf(await account1.getAddress())).to.equal(1);
      expect(await ERC721.ownerOf(tokenId)).to.equal(await recipient.getAddress());
    });
  });

  describe('burn', () => {
    it('should succeed when the tokens in owner possession should have been incinerated', async() => {
      const recipient = account1;
      const tokenId = 1;

      await ERC721.connect(recipient).mint(await recipient.getAddress(), tokenId);
      await ERC721.connect(recipient).burn(tokenId);

      expect(await ERC721.balanceOf(await account1.getAddress())).to.equal(0);
    });
  });

  describe('transfer', () => {
    it('If successful, ownership should be transferred to the recipient', async() => {
      const sender = account1;
      const recipient = account2;
      const tokenId = 1;

      // mint
      await ERC721.connect(sender).mint(await sender.getAddress(), tokenId);
      expect(await ERC721.balanceOf(await sender.getAddress())).to.equal(1);
      expect(await ERC721.balanceOf(await recipient.getAddress())).to.equal(0);
      expect(await ERC721.ownerOf(tokenId)).to.equal(await sender.getAddress());

      // transfer
      await ERC721.connect(sender).transferFrom(await sender.getAddress(), recipient.getAddress(), tokenId);
      expect(await ERC721.balanceOf(await sender.getAddress())).to.equal(0);
      expect(await ERC721.balanceOf(await recipient.getAddress())).to.equal(1);
      expect(await ERC721.ownerOf(tokenId)).to.equal(await recipient.getAddress());
    });

    it('approve', async() => {
      const sender = account1;
      const recipient = account2;
      const tokenId = 1;

      // mint
      await ERC721.connect(sender).mint(await sender.getAddress(), tokenId);
      expect(await ERC721.balanceOf(await sender.getAddress())).to.equal(1);
      expect(await ERC721.balanceOf(await recipient.getAddress())).to.equal(0);
      expect(await ERC721.ownerOf(tokenId)).to.equal(await sender.getAddress());

      // approve
      await ERC721.connect(sender).approve(await recipient.getAddress(), tokenId);
      expect(await ERC721.balanceOf(await sender.getAddress())).to.equal(1);
      expect(await ERC721.ownerOf(tokenId)).to.equal(await sender.getAddress());
      expect(await ERC721.getApproved(tokenId)).to.equal(await recipient.getAddress());

      // transfer
      await ERC721.connect(recipient).transferFrom(await sender.getAddress(), recipient.getAddress(), tokenId);
      expect(await ERC721.balanceOf(await sender.getAddress())).to.equal(0);
      expect(await ERC721.balanceOf(await recipient.getAddress())).to.equal(1);
      expect(await ERC721.ownerOf(tokenId)).to.equal(await recipient.getAddress());
    });
  });
})
