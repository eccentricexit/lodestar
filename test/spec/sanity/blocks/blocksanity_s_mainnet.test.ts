import {join} from "path";
import {describeSpecTest} from "@chainsafe/eth2.0-spec-test-util";
import {stateFromYaml} from "../../../utils/state";
import {expect} from "chai";
// @ts-ignore
import {restore, rewire} from "@chainsafe/bls-js";
import sinon from "sinon";
import {blockFromYaml} from "../../../utils/block";
import {BeaconBlock, BeaconState, Validator} from "../../../../src/types";
import {executeStateTransition} from "../../../../src/chain/stateTransition";
import {equals, hashTreeRoot} from "@chainsafe/ssz";

describeSpecTest(
  join(__dirname, "../../test-cases/tests/sanity/blocks/blocksanity_s_mainnet.yaml"),
  (state: BeaconState, blocks: BeaconBlock[]) => {
    blocks.forEach((block) => {
      executeStateTransition(state, block, false);
    });
    return state;
  },
  (input) => {
    if(input.bls_setting && input.bls_setting.toNumber() === 2) {
      rewire({
        verify: sinon.stub().returns(true),
        verifyMultiple: sinon.stub().returns(true),
        aggregatePubkeys: sinon.stub().returns(Buffer.alloc(48))
      });
    }
    return [stateFromYaml(input.pre), input.blocks.map(blockFromYaml)];
  },
  (expected) => {
    return stateFromYaml(expected.post);
  },
  result => result,
  (testCase) => {
    return !testCase.post;
  },
  () => false,
  (_1, _2, expected, actual) => {
    expect(equals(expected, actual, BeaconState)).to.be.true;
    restore();
  },
  0
);

