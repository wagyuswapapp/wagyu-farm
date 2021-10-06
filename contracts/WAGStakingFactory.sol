pragma solidity ^0.8.0;

import './WAGStakingPoolInitializable.sol';

contract WAGStakingFactory is Ownable {
    event NewSousChefContract(address indexed sousChef);
    address[] public poolAddresses;

    constructor() public {
        //
    }

    /*
     * @notice Deploy the pool
     * @param _stakedToken: staked token address
     * @param _rewardToken: reward token address
     * @param _rewardPerSecond: reward per block (in rewardToken)
     * @param _startTimestamp: start block
     * @param _endBlock: end block
     * @param _poolLimitPerUser: pool limit per user in stakedToken (if any, else 0)
     * @param _admin: admin address with ownership
     * @return address of new smart chef contract
     */
    function deployPool(
        IBEP20 _stakedToken,
        IBEP20 _rewardToken,
        uint256 _rewardPerSecond,
        uint256 _startTimestamp,
        uint256 _bonusEndTimestamp,
        uint256 _poolLimitPerUser,
        address _admin
    ) external onlyOwner {
        require(_stakedToken.totalSupply() >= 0);
        require(_rewardToken.totalSupply() >= 0);
        require(_stakedToken != _rewardToken, "Tokens must be be different");

        bytes memory bytecode = type(WAGStakingPoolInitializable).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_stakedToken, _rewardToken, _startTimestamp));
        address sousChefAddress;

        assembly {
            sousChefAddress := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        WAGStakingPoolInitializable(sousChefAddress).initialize(
            _stakedToken,
            _rewardToken,
            _rewardPerSecond,
            _startTimestamp,
            _bonusEndTimestamp,
            _poolLimitPerUser,
            _admin
        );

        poolAddresses.push(sousChefAddress);

        emit NewSousChefContract(sousChefAddress);
    }
}
