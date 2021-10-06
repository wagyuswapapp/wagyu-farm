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

async function transferOwnership(address, newOwnwer) {

  const contract = await ethers.getContractAt("Ownable", address)

  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)

  console.log("transfer ownership, contract ", address, " new owner", newOwnwer)
  await sleep(3000)
  return await contract.transferOwnership(newOwnwer, { nonce })
  
  

}

//we need it to make farming and staking work
async function main() {

  const { chainId } = await ethers.provider.getNetwork();
  
  const data = get(chainId)


  //await transferOwnership(data.MasterChef, data.Timelock);
  await transferOwnership(data.WAGToken, data.WAGFarm);
  await transferOwnership(data.WAGStake, data.WAGFarm);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
