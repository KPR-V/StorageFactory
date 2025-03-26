// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Storage {
    mapping(address => bytes32[]) private folderNames;
    mapping(address => mapping(bytes32 => string[])) private folderFiles;
    mapping(address => mapping(bytes32 => string)) private folderNameMap;

    function _stringToBytes32(string memory source) private pure returns (bytes32) {
        bytes memory sourceBytes = bytes(source);
        if (sourceBytes.length == 0) {
            return bytes32(0);
        }
        return keccak256(sourceBytes);
    }

    function uploadFileToFolder(
        string memory folderName, 
        string memory cid
    ) external {
        bytes32 folderHash = _stringToBytes32(folderName);
        if (folderFiles[msg.sender][folderHash].length == 0) {
            folderNames[msg.sender].push(folderHash);
            folderNameMap[msg.sender][folderHash] = folderName;
        }
        folderFiles[msg.sender][folderHash].push(cid);
    }

    function retrieveAllFoldersAndCIDs() external view returns (
        string[] memory folders, 
        string[][] memory cids
    ) {
        uint256 folderCount = folderNames[msg.sender].length;
        folders = new string[](folderCount);
        cids = new string[][](folderCount);
        for (uint i = 0; i < folderCount; i++) {
            bytes32 folderHash = folderNames[msg.sender][i];
            folders[i] = folderNameMap[msg.sender][folderHash];
            string[] memory folderCids = folderFiles[msg.sender][folderHash];
            cids[i] = new string[](folderCids.length);
            for (uint j = 0; j < folderCids.length; j++) {
                cids[i][j] = folderCids[j];
            }
        }
    }


    function deleteParticularFolder(string memory folderName) external {
        bytes32 folderHash = _stringToBytes32(folderName);
        delete folderFiles[msg.sender][folderHash];
        delete folderNameMap[msg.sender][folderHash];
        for (uint256 i = 0; i < folderNames[msg.sender].length; i++) {
            if (folderNames[msg.sender][i] == folderHash) {
                folderNames[msg.sender][i] = folderNames[msg.sender][folderNames[msg.sender].length - 1];
                folderNames[msg.sender].pop();
                break;
            }
        }
    }

   
    function deleteParticularFile(
        string memory folderName, 
        uint256 versionNumber
    ) external {
        bytes32 folderHash = _stringToBytes32(folderName);
        string[] storage files = folderFiles[msg.sender][folderHash];
        require(versionNumber < files.length, "Invalid version number");
        if (versionNumber < files.length - 1) {
            files[versionNumber] = files[files.length - 1];
        }
        files.pop();
        if (files.length == 0) {
            for (uint256 i = 0; i < folderNames[msg.sender].length; i++) {
                if (folderNames[msg.sender][i] == folderHash) {
                    folderNames[msg.sender][i] = folderNames[msg.sender][folderNames[msg.sender].length - 1];
                    folderNames[msg.sender].pop();
                    delete folderNameMap[msg.sender][folderHash];
                    break;
                }
            }
        }
    }
}