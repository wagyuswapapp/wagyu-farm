function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep() {
  return await timeout(10000);
}


async function mint(name) {
  console.log("mint " + name)
  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork();
  const data = get(chainId)

  if (data[name] == null)
    throw "expected" + data[name];

  const Token = await ethers.getContractAt("BEP20", data[name]);
  const token = await Token.mint("100000000000000000000000", { nonce, gasLimit: 9000000 })
  
  console.log("done ", token);
  await sleep(3000)
  return true
}


async function send(name, DEV_TEST_ADDRESS) {
  console.log("send " + name)
  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork();
  const data = get(chainId)

  if (data[name] == null)
    throw "expected" + data[name];


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

  const { chainId } = await ethers.provider.getNetwork();

  const defaultTokens = admins.defaultTokens[chainId.toString()];
  const airdrop = admins.airdrop[chainId.toString()];


  for (var j=0; j < defaultTokens.length; j++) {
    await mint(defaultTokens[j])
  }

  for (var i=0; i < airdrop.length; i++) {
    for (var j=0; j < defaultTokens.length; j++) {
      await send(defaultTokens[j], airdrop[i])
    }
  }
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
