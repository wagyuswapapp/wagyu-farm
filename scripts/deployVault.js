function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep() {
  return await timeout(10000);
}

function get(chainId) {
  const fs = require("fs");

  const filename = '../wagyu-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, "utf8")) : {}

  return data;
}

function save(chainId, name, value) {

  const fs = require("fs");

  const filename = '../wagyu-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, "utf8")) : {}

  data[name] = value;

  fs.writeFileSync(filename, JSON.stringify(data, null, 4))

}


async function deploy(name, args=[]) {
  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork();
  const Token = await ethers.getContractFactory(name);
  const finalArgs = [...args, { nonce }] 
  const token = await Token.deploy.apply(Token, finalArgs);
  
  save(chainId, name, token.address); 
  console.log("deployed ", name, "args", args, "contract address: ", token.address);
  await sleep()
  return token.address

}

async function main() {
  // We get the contract to deploy

  //const signers = await ethers.getSigners();

  const { chainId } = await ethers.provider.getNetwork();


  // usage is here
  //https://github.com/wagyu-swap/wagyu-swap-interface/blob/dev/src/constants/multicall/index.ts
  
  const data = get(chainId)
  const admins = JSON.parse(require("fs").readFileSync('../wagyu-addresses/admins.json', 'utf8'))
  const _devaddr = admins._devaddr

  const WagyuVault = await deploy("WagyuVault", [data.WAGToken, data.WAGStake, data.WAGFarm, _devaddr, _devaddr]);

  await deploy("VaultOwner", [WagyuVault]);


  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
