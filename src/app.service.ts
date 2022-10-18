import { HttpException, Injectable } from '@nestjs/common';
import { createSecretKey } from 'crypto';
import { ethers, Signer } from 'ethers';
import * as TokenJson from './assets/MyTokenVotes.json';
import * as BallotJson from './assets/TokenizedBallot.json';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const TOKENIZED_BALLOT_CONTRACT_ADDRESS =
  process.env.TOKENIZED_BALLOT_CONTRACT_ADDRESS;

export class PaymentOrder {
  id: string;
  secret: string;
  amount: number;
}
export class Proposal {
  name: string;
  voteCount: string;
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
export class CastVote {
  proposalIndex: number;
  amount: string;
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
  proposal: Proposal[];

  constructor() {
    // this.provider = ethers.getDefaultProvider('goerli');
    this.provider = new ethers.providers.AlchemyProvider(
      'goerli',
      ALCHEMY_API_KEY,
    );
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
    this.database = [];
    this.proposal = [];
  }

  async mint(body: Mint): Promise<string> {
    const signedContract = this.erc20contract.connect(this.wallet);
    const mint = await signedContract.mint(
      body.address,
      ethers.utils.parseEther(body.amount),
    );
    const tx = await mint.wait(1);
    return tx;
  }

  async delegate(body: VotePower): Promise<string> {
    const signedContract = this.erc20contract.connect(this.wallet);
    const delegate = await signedContract.delegate(body.address);
    const tx = await delegate.wait(1);
    return tx;
  }

  async getVote(body: VotePower): Promise<string> {
    const signedContract = this.erc20contract.connect(this.wallet);
    const voteNumber = await signedContract.getVotes(body.address);
    return voteNumber.toString();
  }

  async votePowerSpent(body: VotePower): Promise<string> {
    const signedContract = this.tokenizedBallotContract.connect(this.wallet);
    const votePowerSpent = await signedContract.votePowerSpent(body.address);
    return votePowerSpent.toString();
  }

  async getVotePower(body: VotePower): Promise<string> {
    const signedContract = this.tokenizedBallotContract.connect(this.wallet);
    const votePower = await signedContract.votePower(body.address);
    return votePower;
  }

  async postVote(body: CastVote): Promise<string> {
    const signedContract = this.tokenizedBallotContract.connect(this.wallet);
    const voting = await signedContract.vote(
      body.proposalIndex,
      ethers.utils.parseEther(body.amount),
    );
    const tx = await voting.wait(1);
    return tx;
  }

  async getProposal(): Promise<any> {
    const signedContract = this.tokenizedBallotContract.connect(this.wallet);
    for (let index = 0; index < 3; index++) {
      const proposal = await signedContract.proposals(index);
      const proposalObj: Proposal = {
        name: ethers.utils.parseBytes32String(proposal.name),
        voteCount: ethers.utils.formatEther(proposal.voteCount),
      };
      this.proposal[index] = proposalObj;
    }
    return this.proposal;
  }

  async referenceBlock(body: ReferenceBlock): Promise<string> {
    const signedContract = this.tokenizedBallotContract.connect(this.wallet);
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
