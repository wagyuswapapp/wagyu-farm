


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
  const blockNumber = await ethers.provider.getBlockNumber();
  const data = get(chainId)
  const WAGStakingFactory = await ethers.getContractAt("WAGStakingFactory", data.WAGStakingFactory);
  const _stakedToken  = data[name]   //IBEP20
  const _rewardToken = data.WAGToken //IBEP20
  const _rewardPerBlock = "10000000000"; //uint256
  const _startBlock = blockNumber //uint256
  const _bonusEndBlock = _startBlock + 100000; //uint256
  const _poolLimitPerUser = "1000000000000000000000" //uint256
  const _admin = signers[0]._address; //address
  const SousPool = await WAGStakingFactory.deployPool(_stakedToken,_rewardToken, _rewardPerBlock,  _startBlock, _bonusEndBlock,  _poolLimitPerUser, _admin, { nonce, gasLimit: 9000000 })
  
  const result = await SousPool.wait(1)
  const event = result.events.find((x)=> x.event == "NewSousChefContract");
  console.log("WAG NewSousChefContract", event.args.sousChef)
  console.log("create WAG Pool " + name)
  console.log({ _stakedToken, _rewardToken, _rewardPerBlock, _startBlock, _bonusEndBlock, _poolLimitPerUser })
  save(chainId, name + "_SousChef", { address: event.args.sousChef, stakedToken: _stakedToken, rewardToken: _rewardToken })

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
