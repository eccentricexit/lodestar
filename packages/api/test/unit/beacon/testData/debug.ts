import {ForkName} from "@lodestar/params";
import {ssz} from "@lodestar/types";
import {toHexString} from "@chainsafe/ssz";
import {Api} from "../../../../src/beacon/routes/debug.js";
import {GenericServerTestCases} from "../../../utils/genericServerTest.js";

const root = Buffer.alloc(32, 1);

export const testData: GenericServerTestCases<Api> = {
  getHeads: {
    args: [],
    res: {data: [{slot: 1, root: toHexString(root)}]},
  },
  getState: {
    args: ["head", "json"],
    res: {executionOptimistic: true, data: ssz.phase0.BeaconState.defaultValue()},
  },
  getStateV2: {
    args: ["head", "json"],
    res: {executionOptimistic: true, data: ssz.altair.BeaconState.defaultValue(), version: ForkName.altair},
  },
};
