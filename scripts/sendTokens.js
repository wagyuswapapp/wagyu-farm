function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(fn, ...args) {
  await timeout(3000);
  return fn(...args);
}


async function mint(name) {
  console.log("mint " + name)
  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork();
  const data = get(chainId)
  const Token = await ethers.getContractAt("BEP20", data[name]);
  const token = await Token.mint("100000000000000000000000", { nonce, gasLimit: 9000000 })
  
  console.log("done ", token);
  return true
}


async function send(name, DEV_TEST_ADDRESS) {
  console.log("send " + name)
  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork();
  const data = get(chainId)
  const Token = await ethers.getContractAt("BEP20", data[name]);
  const token = await Token.transfer(DEV_TEST_ADDRESS, "100000000000000000000", { nonce, gasLimit: 9000000 })
  
  console.log("sent ", token);
  return true
}


function get(chainId) {
  const fs = require("fs");

  const filename = '../wagyu-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, "utf8")) : {}

  return data;
}

async function main() {
  // We get the contract to deploy

  const admins = JSON.parse(require("fs").readFileSync('../wagyu-addresses/admins.json', 'utf8'))

  for (var j=0; j < admins.defaultTokens.length; j++) {
    await mint(admins.defaultTokens[j])
  }

  for (var i=0; i < admins.airdrop.length; i++) {
    for (var j=0; j < admins.defaultTokens.length; j++) {
      await send(admins.defaultTokens[j], admins.airdrop[i])
    }
  }
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });