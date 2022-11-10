import {IChainForkConfig} from "@lodestar/config";
import {BeaconStateAllForks} from "@lodestar/state-transition";
import {phase0, ssz} from "@lodestar/types";
import {interopDeposits} from "./interop/deposits.js";
import {getInteropState, InteropStateOpts} from "./interop/state.js";
import {IBeaconDb} from "@lodestar/beacon-node";

export function initDevState(
  config: IChainForkConfig,
  validatorCount: number,
  interopStateOpts: InteropStateOpts
): {deposits: phase0.Deposit[]; state: BeaconStateAllForks} {
  const deposits = interopDeposits(config, ssz.phase0.DepositDataRootList.defaultViewDU(), validatorCount);
  const state = getInteropState(config, interopStateOpts, deposits);
  return {deposits, state};
}

export async function writeDeposits(db: IBeaconDb, deposits: phase0.Deposit[]): Promise<void> {
  for (let i = 0; i < deposits.length; i++) {
    await Promise.all([
      db.depositEvent.put(i, {
        blockNumber: i,
        index: i,
        depositData: deposits[i].data,
      }),
      db.depositDataRoot.put(i, ssz.phase0.DepositData.hashTreeRoot(deposits[i].data)),
    ]);
  }
}
