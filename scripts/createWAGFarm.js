function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep() {
  return await timeout(10000);
}


async function createTestFarms(_lpToken) {
  console.log("create farm " + _lpToken)
  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork();
  //const blockNumber = await ethers.provider.getBlockNumber();
  const data = get(chainId)
  const WAGFarm = await ethers.getContractAt("WAGFarm", data.WAGFarm);
  const _allocPoint  = "100"
  const _withUpdate = true
  const SousPool = await WAGFarm.add(_allocPoint,_lpToken, _withUpdate, { nonce, gasLimit: 9000000 })
  await sleep()
  return true
}

function get(chainId) {
  const fs = require("fs");

  const filename = '../wagyu-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, "utf8")) : {}

  return data;
}

async function main() {

  const { chainId } = await ethers.provider.getNetwork();
  
  const data = get(chainId)
  
  const name = "VLX_WAG_LP"
  await createTestFarms(data[name].pair);

  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
