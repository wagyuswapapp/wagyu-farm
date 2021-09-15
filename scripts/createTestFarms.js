function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(fn, ...args) {
  await timeout(3000);
  return fn(...args);
}


async function createTestFarms(_lpToken) {
  console.log("create farm " + _lpToken)
  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork();
  //const blockNumber = await ethers.provider.getBlockNumber();
  const data = get(chainId)
  //console.log("MasterChef", data.MasterChef)
  const MasterChef = await ethers.getContractAt("MasterChef", data.MasterChef);
  const _allocPoint  = "1000000000000000000000"
  const _withUpdate = false
  console.log({ _allocPoint, _lpToken, _withUpdate })
  const SousPool = await MasterChef.add(_allocPoint,_lpToken, _withUpdate, { nonce, gasLimit: 9000000 })
  
  //console.log("MasterChef Farm", SousPool);
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

  await createTestFarms(data.VLX_VBNB_LP.pair)
  await createTestFarms(data.VLX_VETHER_LP.pair)
  await createTestFarms(data.VLX_VUSDT_LP.pair)

  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
