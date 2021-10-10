//import moment from 'momentjs'

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep() {
  return await timeout(10000);
}

function save(chainId, name, value) {

  const fs = require("fs");

  const filename = '../wagyu-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, "utf8")) : {}

  data[name] = value;

  fs.writeFileSync(filename, JSON.stringify(data, null, 4))

}



async function createTestPool(name) {
  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork();
  //const blockNumber = await ethers.provider.getBlockNumber();
  const data = get(chainId)
  const WAGStakingFactory = await ethers.getContractAt("WAGStakingFactory", data.WAGStakingFactory);
  const _stakedToken  = data[name]   //IBEP20
  const _rewardToken = data.WAGToken //IBEP20

  if (data[name] == null)
    throw "expected " + name;

  if (data.WAGToken == null)
    throw "expected WAGToken";

  const _rewardPerSecond = "1000000000000000000"; //uint256
  //moment().utc().unix() / 1000
  const _startTimestamp = parseInt(new Date().getTime() / 1000) //uint256
  const bonusPeriodInSeconds = 2419200
  const _bonusEndTimestamp = _startTimestamp + bonusPeriodInSeconds; //uint256
  const _poolLimitPerUser = "10000000000000000000000" //uint256
  const _admin = signers[0]._address; //address
  const SousPool = await WAGStakingFactory.deployPool(_stakedToken,_rewardToken, _rewardPerSecond,  _startTimestamp, _bonusEndTimestamp,  _poolLimitPerUser, _admin, { nonce, gasLimit: 9000000 })
  
  const result = await SousPool.wait(1)
  const event = result.events.find((x)=> x.event == "NewSousChefContract");
  console.log("WAG NewSousChefContract", event.args.sousChef)
  console.log("create WAG Pool " + name)
  save(chainId, name + "_SousChef", { address: event.args.sousChef, stakedToken: _stakedToken, rewardToken: _rewardToken })
  await sleep(3000)
  //console.log("SousPool", SousPool);
  return true
}

function get(chainId) {
  const fs = require("fs");

  const filename = '../wagyu-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, "utf8")) : {}

  return data;
}

async function main() {

  const admins = JSON.parse(require("fs").readFileSync('../wagyu-addresses/admins.json', 'utf8'))

  const { chainId } = await ethers.provider.getNetwork();

  const defaultTokens = admins.defaultTokens[chainId.toString()];

  for (var j=0; j < defaultTokens.length; j++) {
      await createTestPool(defaultTokens[j]);
  }
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
