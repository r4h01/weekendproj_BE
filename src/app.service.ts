import { HttpException, Injectable } from '@nestjs/common';
import { createSecretKey } from 'crypto';
import { ethers, Signer } from 'ethers';
import * as TokenJson from './assets/MyTokenVotes.json';
import * as BallotJson from './assets/TokenizedBallot.json';

const PRIVATE_KEY = '';
const CONTRACT_ADDRESS = '0xDA08a51b8186eD0BF4e048355B8287f382E07828';
const TOKENIZED_BALLOT_CONTRACT_ADDRESS =
  '0xb56449b4C646099035D4eB8B0bA821d36D8007D2';

export class PaymentOrder {
  id: string;
  secret: string;
  amount: number;
}

export class ClaimPaymentDTO {
  id: string;
  secret: string;
  address: string;
}

export class Mint {
  address: string;
  amount: string;
}
export class VotePower {
  address: string;
}

export class ReferenceBlock {
  block: bigint;
}

@Injectable()
export class AppService {
  provider: ethers.providers.Provider;
  erc20contract: ethers.Contract;
  tokenizedBallotContract: ethers.Contract;
  wallet: ethers.Wallet;
  signer: ethers.Signer;

  database: PaymentOrder[];

  constructor() {
    this.provider = ethers.getDefaultProvider('goerli');
    this.erc20contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      TokenJson.abi,
      this.provider,
    );

    this.tokenizedBallotContract = new ethers.Contract(
      TOKENIZED_BALLOT_CONTRACT_ADDRESS,
      BallotJson.abi,
      this.provider,
    );
    this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
    this.signer = this.wallet.connect(this.provider);
    this.database = [];
  }

  async mint(body: Mint): Promise<string> {
    const signedContract = this.erc20contract.connect(this.signer);
    const mint = await signedContract.mint(
      body.address,
      ethers.utils.parseEther(body.amount),
    );
    return mint;
  }

  async delegate(body: VotePower): Promise<string> {
    const signedContract = this.erc20contract.connect(this.signer);
    const delegate = await signedContract.delegates(body.address);
    return delegate;
  }

  async getVote(body: VotePower): Promise<string> {
    const signedContract = this.erc20contract.connect(this.signer);
    const voteNumber = await signedContract.getVotes(body.address);
    return voteNumber;
  }

  async getVotePower(body: VotePower): Promise<string> {
    const signedContract = this.tokenizedBallotContract.connect(this.signer);
    const votePower = await signedContract.votePower(body.address);
    return votePower.toString();
  }

  async referenceBlock(body: ReferenceBlock): Promise<string> {
    const signedContract = this.tokenizedBallotContract.connect(this.signer);
    const votePower = await signedContract.setReferenceBlock(body.block);
    return votePower;
  }

  async getTotalSupply(): Promise<string> {
    const totalSupply = await this.erc20contract.totalSupply();
    const parseTotalSupply = ethers.utils.formatEther(totalSupply);
    return parseTotalSupply;
  }

  async getAllowance(from: string, to: string): Promise<string> {
    const allowanceBN = await this.erc20contract.allowance(from, to);
    const allowance = ethers.utils.formatEther(allowanceBN);
    return allowance;
  }

  async getTransactionByHash(hash: string) {
    return this.provider.getTransaction(hash);
  }

  async getTransactionReceiptByHash(hash: string) {
    const tx = await this.getTransactionByHash(hash);
    return await tx.wait(1);
  }

  async postCreatePaymentOrder(body: PaymentOrder) {
    return this.database.push(body);
  }

  getPaymentOrderById(id: string) {
    const element = this.database.find((entry) => entry.id === id);
    if (!element) return false;
    return { id: element.id, amount: element.amount };
  }

  listPaymentOrders() {
    const filteredDatabase = [];
    this.database.forEach((element) => {
      filteredDatabase.push({ id: element.id, amount: element.amount });
    });
    return filteredDatabase;
  }

  async claimPayment(body: ClaimPaymentDTO) {
    const element = this.database.find((enter) => enter.secret === body.secret);
    if (!element) throw new HttpException('Not Foud!!', 404);
    if (body.secret != element.secret) return false;
    const seed = process.env.MNEMONIC_SEED;
    const wallet = ethers.Wallet.fromMnemonic(seed);
    const signer = wallet.connect(this.provider);
    const signedContract = this.erc20contract.connect(signer);
    const tx = await this.erc20contract.mint(
      body.address,
      ethers.utils.parseEther(element.amount.toString()),
    );
    return tx.hash;
  }
}
