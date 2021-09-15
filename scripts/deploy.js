function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(fn, ...args) {
  await timeout(3000);
  return fn(...args);
}

function save(chainId, name, value) {

  const fs = require("fs");

  const filename = '../wagyu-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, "utf8")) : {}

  data[name] = value;

  fs.writeFileSync(filename, JSON.stringify(data, null, 4))

}

async function deploy(name, args=[]) {
  console.log("deploy " + name, args)
  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork();
  const Token = await ethers.getContractFactory(name);
  const finalArgs = [...args, { nonce }] 
  const token = await Token.deploy.apply(Token, finalArgs);
  
  save(chainId, name, token.address); 
  console.log("deployed ", name, token.address);
  return token.address

}

async function transferOwnership(address, newOwnwer) {

  const contract = await ethers.getContractAt("Ownable", address)

  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)

  return await contract.transferOwnership(newOwnwer, { nonce })

}

async function main() {
  // We get the contract to deploy

  const signers = await ethers.getSigners();

  const { chainId } = await ethers.provider.getNetwork();

  save(chainId, "owner", signers[0]._address);
  
  // usage is here
  //https://github.com/wagyu-swap/wagyu-swap-interface/blob/dev/src/constants/multicall/index.ts
  
  
  const Multicall = await deploy("Multicall");
  const WagyuToken = await deploy("CakeToken");

  const WVLX = await deploy("WVLX");
  const VETHER = await deploy("VETHER");
  const VUSDT = await deploy("VUSDT");
  const VBNB = await deploy("VBNB");
  const SauceBar = await deploy("SyrupBar", [WagyuToken]);

  const _cakePerBlock = "40000000000000000000"
  const _startBlock = 1
  const _devaddr = "0x02371a616F6148039bB4C7d8c5bF626c6391D084"
  
  //Timelock
  const Timelock = await deploy("Timelock", [_devaddr, 21700]);

  const MasterChef = await deploy("MasterChef", [WagyuToken, SauceBar, _devaddr, _cakePerBlock, _startBlock]);

  //await transferOwnership(MasterChef, Timelock);
  //await transferOwnership(WagyuToken, MasterChef);
  //await transferOwnership(SauceBar, MasterChef);

  const WagyuVault = await deploy("WagyuVault", [WagyuToken, SauceBar, MasterChef, _devaddr, _devaddr]);

  const VaultOwner = await deploy("VaultOwner", [WagyuVault]);

  const VlxStaking = await deploy("BnbStaking", [WVLX, WagyuToken, '42000000000000000', 689000, 1207400, _devaddr, WVLX]);

  const SousChefFactory = await deploy("SousChefFactory");

  //MasterChef _chef, IBEP20 _wagyu, address _admin, address _receiver
  //const LotteryRewardPool = await deploy("LotteryRewardPool", [MasterChef, WagyuToken, _devaddr, _devaddr]);

  
  
  


  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
