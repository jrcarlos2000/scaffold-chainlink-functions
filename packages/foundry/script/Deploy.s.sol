//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/FunctionsConsumer.sol";
import "./DeployHelpers.s.sol";

contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        uint256 deployerPrivateKey = setupLocalhostEnv();

        vm.startBroadcast(deployerPrivateKey);
        FunctionsConsumer functionsConsumer = new FunctionsConsumer(
            vm.addr(deployerPrivateKey)
        );
        console.logString(
            string.concat(
                "Functions Consumer deployed at: ",
                vm.toString(address(functionsConsumer))
            )
        );
        vm.stopBroadcast();

        /**
         * This function generates the file containing the contracts Abi definitions.
         * These definitions are used to derive the types needed in the custom scaffold-eth hooks, for example.
         * This function should be called last.
         */
        exportDeployments();

        // If your chain is not present in foundry's stdChain, then you need to call function with chainName:
        // exportDeployments("chiado")
    }

    function test() public {}
}
