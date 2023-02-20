import {WithOptionalBytes, allForks, deneb} from "@lodestar/types";
import {toHex} from "@lodestar/utils";
import {BeaconChain} from "../chain.js";
import {BlockInput, BlockInputType} from "./types.js";

/**
 * Persists block input data to DB. This operation must be eventually completed if a block is imported to the fork-choice.
 * Else the node will be in an inconsistent state that can lead to being stuck.
 *
 * This operation may be performed before, during or after importing to the fork-choice. As long as errors
 * are handled properly for eventual consistency.
 */
export async function writeBlockInputToDb(
  this: BeaconChain,
  blocksInput: WithOptionalBytes<BlockInput>[]
): Promise<void> {
  const fnPromises: Promise<void>[] = [];

  for (const blockInput of blocksInput) {
    const {block, serializedData, type} = blockInput;
    const blockRoot = this.config.getForkTypes(block.message.slot).BeaconBlock.hashTreeRoot(block.message);
    const blockRootHex = toHex(blockRoot);
    if (serializedData) {
      // skip serializing data if we already have it
      this.metrics?.importBlock.persistBlockWithSerializedDataCount.inc();
      fnPromises.push(this.db.block.putBinary(this.db.block.getId(block), serializedData));
    } else {
      this.metrics?.importBlock.persistBlockNoSerializedDataCount.inc();
      fnPromises.push(this.db.block.add(block));
    }
    this.logger.debug("Persist block to hot DB", {
      slot: block.message.slot,
      root: blockRootHex,
    });

    if (type === BlockInputType.postDeneb) {
      const {blobs: blobSidecars} = blockInput;
      // NOTE: Old blobs are pruned on archive
      fnPromises.push(this.db.blobSidecars.add({blockRoot, slot: block.message.slot, blobSidecars}));
      this.logger.debug("Persisted blobSidecars to hot DB", {
        blobsLen: blobSidecars.length,
        slot: block.message.slot,
        root: blockRootHex,
      });
    }
  }

  await Promise.all(fnPromises);
}

/**
 * Prunes eagerly persisted block inputs only if not known to the fork-choice
 */
export async function removeEagerlyPersistedBlockInputs(
  this: BeaconChain,
  blockInputs: WithOptionalBytes<BlockInput>[]
): Promise<void> {
  const blockToRemove: allForks.SignedBeaconBlock[] = [];
  const blobsToRemove: deneb.BlobSidecarsWrapper[] = [];

  for (const blockInput of blockInputs) {
    const {block, type} = blockInput;
    const blockRoot = this.config.getForkTypes(block.message.slot).BeaconBlock.hashTreeRoot(block.message);
    const blockRootHex = toHex(blockRoot);
    if (!this.forkChoice.hasBlockHex(blockRootHex)) {
      blockToRemove.push(block);

      if (type === BlockInputType.postDeneb) {
        const blobSidecars = blockInput.blobs;
        blobsToRemove.push({blockRoot, slot: block.message.slot, blobSidecars});
      }
    }
  }

  await Promise.all([
    // TODO: Batch DB operations not with Promise.all but with level db ops
    this.db.block.batchRemove(blockToRemove),
    this.db.blobSidecars.batchRemove(blobsToRemove),
  ]);
}
