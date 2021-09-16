function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async function sleep(fn, ...args) {
    await timeout(3000);
    return fn(...args);
  }
  
  
  async function mint(address) {
    console.log("mint " + address)
    const signers = await ethers.getSigners();
    const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
    const { chainId } = await ethers.provider.getNetwork();
    const data = get(chainId)
    const CakeToken = await ethers.getContractAt("CakeToken", data.CakeToken);
    console.log(CakeToken);
    const token = await CakeToken['mint(address,uint256)'](address, "100000000000000000000000", { nonce, gasLimit: 9000000 })
    
    console.log("done ", token);
    return true
  }
  
  
  function get(chainId) {
    const fs = require("fs");
  
    const filename = '../wagyu-addresses/' + chainId + '.json'
  
    const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, "utf8")) : {}
  
    return data;
  }
  
  async function getAllPoolAddresses(index) {

    const { chainId } = await ethers.provider.getNetwork();
    
    const data = get(chainId)

    const SousChefFactory = await ethers.getContractAt("SousChefFactory", data.SousChefFactory);
    
    var poolAddress = null;

    try {
        poolAddress = await SousChefFactory.poolAddresses(index)
    }
    catch(err) {
        return []
    }

    const rest = await getAllPoolAddresses(index + 1)

    return [poolAddress, ...rest]

  }

  async function main() {
    // We get the contract to deploy
  
    const addreses = await getAllPoolAddresses(0)
    
    for (var i = 0; i < addreses.length; i ++) {
        await mint(addreses[i]);
    }

    const admins = JSON.parse(require("fs").readFileSync('../wagyu-addresses/admins.json', 'utf8'))

    for (var i=0; i < admins.airdrop.length; i++) {
      await mint(admins.airdrop[i]);
    }
  
    
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  