pragma solidity ^0.8.0;

import './access/Ownable.sol';
import './token/BEP20/IBEP20.sol';
import './token/BEP20/SafeBEP20.sol';
import './utils/ReentrancyGuard.sol';

contract WAGStakingPoolInitializable is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // The address of the smart chef factory
    address public SOUS_CHEF_FACTORY;

    // Whether a limit is set for users
    bool public hasUserLimit;

    // Whether it is initialized
    bool public isInitialized;

    // Accrued token per share
    uint256 public accTokenPerShare;

    // The block number when WAGYU mining ends.
    uint256 public bonusEndTimestamp;

    // The block number when WAGYU mining starts.
    uint256 public startTimestamp;

    // The block number of the last pool update
    uint256 public lastRewardTimestamp;

    // The pool limit (0 if none)
    uint256 public poolLimitPerUser;

    // WAGYU tokens created per block.
    uint256 public rewardPerSecond;

    // The precision factor
    uint256 public PRECISION_FACTOR;

    // The reward token
    IBEP20 public rewardToken;

    // The staked token
    IBEP20 public stakedToken;

    // Info of each user that stakes tokens (stakedToken)
    mapping(address => UserInfo) public userInfo;

    struct UserInfo {
        uint256 amount; // How many staked tokens the user has provided
        uint256 rewardDebt; // Reward debt
    }

    event AdminTokenRecovery(address tokenRecovered, uint256 amount);
    event Deposit(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event NewStartAndEndBlocks(uint256 startTimestamp, uint256 endBlock);
    event NewrewardPerSecond(uint256 rewardPerSecond);
    event NewPoolLimit(uint256 poolLimitPerUser);
    event RewardsStop(uint256 blockNumber);
    event Withdraw(address indexed user, uint256 amount);

    constructor() public {
        SOUS_CHEF_FACTORY = msg.sender;
    }

    /*
     * @notice Initialize the contract
     * @param _stakedToken: staked token address
     * @param _rewardToken: reward token address
     * @param _rewardPerSecond: reward per block (in rewardToken)
     * @param _startTimestamp: start block
     * @param _bonusEndTimestamp: end block
     * @param _poolLimitPerUser: pool limit per user in stakedToken (if any, else 0)
     * @param _admin: admin address with ownership
     */
    function initialize(
        IBEP20 _stakedToken,
        IBEP20 _rewardToken,
        uint256 _rewardPerSecond,
        uint256 _startTimestamp,
        uint256 _bonusEndTimestamp,
        uint256 _poolLimitPerUser,
        address _admin
    ) external {
        require(!isInitialized, "Already initialized");
        require(msg.sender == SOUS_CHEF_FACTORY, "Not factory");

        // Make this contract initialized
        isInitialized = true;

        stakedToken = _stakedToken;
        rewardToken = _rewardToken;
        rewardPerSecond = _rewardPerSecond;
        startTimestamp = _startTimestamp;
        bonusEndTimestamp = _bonusEndTimestamp;

        if (_poolLimitPerUser > 0) {
            hasUserLimit = true;
            poolLimitPerUser = _poolLimitPerUser;
        }

        uint256 decimalsRewardToken = uint256(rewardToken.decimals());
        require(decimalsRewardToken < 30, "Must be inferior to 30");

        PRECISION_FACTOR = uint256(10**(uint256(30).sub(decimalsRewardToken)));

        // Set the lastRewardTimestamp as the startTimestamp
        lastRewardTimestamp = startTimestamp;

        // Transfer ownership to the admin address who becomes owner of the contract
        transferOwnership(_admin);
    }

    /*
     * @notice Deposit staked tokens and collect reward tokens (if any)
     * @param _amount: amount to withdraw (in rewardToken)
     */
    function deposit(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];

        if (hasUserLimit) {
            require(_amount.add(user.amount) <= poolLimitPerUser, "User amount above limit");
        }

        _updatePool();

        if (user.amount > 0) {
            uint256 pending = user.amount.mul(accTokenPerShare).div(PRECISION_FACTOR).sub(user.rewardDebt);
            if (pending > 0) {
                rewardToken.safeTransfer(address(msg.sender), pending);
            }
        }

        if (_amount > 0) {
            user.amount = user.amount.add(_amount);
            stakedToken.safeTransferFrom(address(msg.sender), address(this), _amount);
        }

        user.rewardDebt = user.amount.mul(accTokenPerShare).div(PRECISION_FACTOR);

        emit Deposit(msg.sender, _amount);
    }

    /*
     * @notice Withdraw staked tokens and collect reward tokens
     * @param _amount: amount to withdraw (in rewardToken)
     */
    function withdraw(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "Amount to withdraw too high");

        _updatePool();

        uint256 pending = user.amount.mul(accTokenPerShare).div(PRECISION_FACTOR).sub(user.rewardDebt);

        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            stakedToken.safeTransfer(address(msg.sender), _amount);
        }

        if (pending > 0) {
            rewardToken.safeTransfer(address(msg.sender), pending);
        }

        user.rewardDebt = user.amount.mul(accTokenPerShare).div(PRECISION_FACTOR);

        emit Withdraw(msg.sender, _amount);
    }

    /*
     * @notice Withdraw staked tokens without caring about rewards rewards
     * @dev Needs to be for emergency.
     */
    function emergencyWithdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amountToTransfer = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;

        if (amountToTransfer > 0) {
            stakedToken.safeTransfer(address(msg.sender), amountToTransfer);
        }

        emit EmergencyWithdraw(msg.sender, user.amount);
    }

    /*
     * @notice Stop rewards
     * @dev Only callable by owner. Needs to be for emergency.
     */
    function emergencyRewardWithdraw(uint256 _amount) external onlyOwner {
        rewardToken.safeTransfer(address(msg.sender), _amount);
    }

    /**
     * @notice It allows the admin to recover wrong tokens sent to the contract
     * @param _tokenAddress: the address of the token to withdraw
     * @param _tokenAmount: the number of tokens to withdraw
     * @dev This function is only callable by admin.
     */
    function recoverWrongTokens(address _tokenAddress, uint256 _tokenAmount) external onlyOwner {
        require(_tokenAddress != address(stakedToken), "Cannot be staked token");
        require(_tokenAddress != address(rewardToken), "Cannot be reward token");

        IBEP20(_tokenAddress).safeTransfer(address(msg.sender), _tokenAmount);

        emit AdminTokenRecovery(_tokenAddress, _tokenAmount);
    }

    /*
     * @notice Stop rewards
     * @dev Only callable by owner
     */
    function stopReward() external onlyOwner {
        bonusEndTimestamp = block.timestamp;
    }

    /*
     * @notice Update pool limit per user
     * @dev Only callable by owner.
     * @param _hasUserLimit: whether the limit remains forced
     * @param _poolLimitPerUser: new pool limit per user
     */
    function updatePoolLimitPerUser(bool _hasUserLimit, uint256 _poolLimitPerUser) external onlyOwner {
        require(hasUserLimit, "Must be set");
        if (_hasUserLimit) {
            require(_poolLimitPerUser > poolLimitPerUser, "New limit must be higher");
            poolLimitPerUser = _poolLimitPerUser;
        } else {
            hasUserLimit = _hasUserLimit;
            poolLimitPerUser = 0;
        }
        emit NewPoolLimit(poolLimitPerUser);
    }

    /*
     * @notice Update reward per block
     * @dev Only callable by owner.
     * @param _rewardPerSecond: the reward per block
     */
    function updaterewardPerSecond(uint256 _rewardPerSecond) external onlyOwner {
        require(block.timestamp < startTimestamp, "Pool has started");
        rewardPerSecond = _rewardPerSecond;
        emit NewrewardPerSecond(_rewardPerSecond);
    }

    /**
     * @notice It allows the admin to update start and end blocks
     * @dev This function is only callable by owner.
     * @param _startTimestamp: the new start block
     * @param _bonusEndTimestamp: the new end block
     */
    function updateStartAndEndBlocks(uint256 _startTimestamp, uint256 _bonusEndTimestamp) external onlyOwner {
        require(block.timestamp < startTimestamp, "Pool has started");
        require(_startTimestamp < _bonusEndTimestamp, "New startTimestamp must be lower than new endBlock");
        require(block.timestamp < _startTimestamp, "New startTimestamp must be higher than current block");

        startTimestamp = _startTimestamp;
        bonusEndTimestamp = _bonusEndTimestamp;

        // Set the lastRewardTimestamp as the startTimestamp
        lastRewardTimestamp = startTimestamp;

        emit NewStartAndEndBlocks(_startTimestamp, _bonusEndTimestamp);
    }

    /*
     * @notice View function to see pending reward on frontend.
     * @param _user: user address
     * @return Pending reward for a given user
     */
    function pendingReward(address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 stakedTokenSupply = stakedToken.balanceOf(address(this));
        if (block.timestamp > lastRewardTimestamp && stakedTokenSupply != 0) {
            uint256 multiplier = _getMultiplier(lastRewardTimestamp, block.timestamp);
            uint256 wagyuReward = multiplier.mul(rewardPerSecond);
            uint256 adjustedTokenPerShare =
            accTokenPerShare.add(wagyuReward.mul(PRECISION_FACTOR).div(stakedTokenSupply));
            return user.amount.mul(adjustedTokenPerShare).div(PRECISION_FACTOR).sub(user.rewardDebt);
        } else {
            return user.amount.mul(accTokenPerShare).div(PRECISION_FACTOR).sub(user.rewardDebt);
        }
    }

    /*
     * @notice Update reward variables of the given pool to be up-to-date.
     */
    function _updatePool() internal {
        if (block.timestamp <= lastRewardTimestamp) {
            return;
        }

        uint256 stakedTokenSupply = stakedToken.balanceOf(address(this));

        if (stakedTokenSupply == 0) {
            lastRewardTimestamp = block.timestamp;
            return;
        }

        uint256 multiplier = _getMultiplier(lastRewardTimestamp, block.timestamp);
        uint256 wagyuReward = multiplier.mul(rewardPerSecond);
        accTokenPerShare = accTokenPerShare.add(wagyuReward.mul(PRECISION_FACTOR).div(stakedTokenSupply));
        lastRewardTimestamp = block.timestamp;
    }

    /*
     * @notice Return reward multiplier over the given _from to _to block.
     * @param _from: block to start
     * @param _to: block to finish
     */
    function _getMultiplier(uint256 _from, uint256 _to) internal view returns (uint256) {
        if (_to <= bonusEndTimestamp) {
            return _to.sub(_from);
        } else if (_from >= bonusEndTimestamp) {
            return 0;
        } else {
            return bonusEndTimestamp.sub(_from);
        }
    }
}
