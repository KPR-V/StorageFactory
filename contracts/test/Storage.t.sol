// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/Storage.sol";

contract StorageTest is Test {
    Storage public storage_contract; 
    address public testUser;

   
    function setUp() public {
        storage_contract = new Storage(); 
        testUser = address(0x1234);
        
    
        vm.startPrank(testUser);
    }

   
    function testUploadFiles() public {

        storage_contract.uploadFileToFolder("Documents", "cid1");
        storage_contract.uploadFileToFolder("Documents", "cid2");

     
        (string[] memory folders, string[][] memory cids) = storage_contract.retrieveAllFoldersAndCIDs();

   
        assertEq(folders.length, 1, "Should have one folder");
        assertEq(folders[0], "Documents", "Folder name should match");
        assertEq(cids[0].length, 2, "Should have two files in folder");
        assertEq(cids[0][0], "cid1", "First CID should match");
        assertEq(cids[0][1], "cid2", "Second CID should match");
    }

  
    function testMultipleFolders() public {
        storage_contract.uploadFileToFolder("Documents", "doc_cid1");
        storage_contract.uploadFileToFolder("Pictures", "pic_cid1");

        (string[] memory folders, string[][] memory cids) = storage_contract.retrieveAllFoldersAndCIDs();

        assertEq(folders.length, 2, "Should have two folders");
        assertEq(folders[0], "Documents", "First folder name should match");
        assertEq(folders[1], "Pictures", "Second folder name should match");
    }


    function testDeleteFolder() public {
        storage_contract.uploadFileToFolder("Documents", "doc_cid1");
        storage_contract.uploadFileToFolder("Pictures", "pic_cid1");

        storage_contract.deleteParticularFolder("Documents");

        (string[] memory folders, ) = storage_contract.retrieveAllFoldersAndCIDs();

        assertEq(folders.length, 1, "Should have one folder after deletion");
        assertEq(folders[0], "Pictures", "Remaining folder should be Pictures");
    }

  
    function testDeleteFile() public {
        storage_contract.uploadFileToFolder("Documents", "cid1");
        storage_contract.uploadFileToFolder("Documents", "cid2");
        storage_contract.uploadFileToFolder("Documents", "cid3");

        storage_contract.deleteParticularFile("Documents", 1);

        (, string[][] memory cids) = storage_contract.retrieveAllFoldersAndCIDs();

        assertEq(cids[0].length, 2, "Should have two files after deletion");
        assertEq(cids[0][0], "cid1", "First CID should remain");
        assertEq(cids[0][1], "cid3", "Third CID should be in second position");
    }

  
    function testDeleteLastFile() public {
        storage_contract.uploadFileToFolder("Documents", "cid1");
        storage_contract.deleteParticularFile("Documents", 0);

        (string[] memory folders, string[][] memory cids) = storage_contract.retrieveAllFoldersAndCIDs();

        assertEq(folders.length, 0, "No folders should remain");
        assertEq(cids.length, 0, "No CIDs should remain");
    }

    function testInvalidFileDelete() public {
        storage_contract.uploadFileToFolder("Documents", "cid1");

        vm.expectRevert("Invalid version number");
        storage_contract.deleteParticularFile("Documents", 1);
    }
}