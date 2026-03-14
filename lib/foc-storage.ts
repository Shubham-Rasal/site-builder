import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { filecoinCalibration } from 'viem/chains';

export interface SiteStorageResult {
  cid: string;
  cdnUrl: string;
  costWei: bigint;
  dryRun: boolean;
}

export async function storeSiteHtml(
  htmlBytes: Uint8Array,
  dryRun = process.env.FOC_DRY_RUN === 'true',
): Promise<SiteStorageResult> {
  if (dryRun) {
    const mockCid = `bafyDRYRUN${htmlBytes.length}x${Date.now().toString(36)}`;
    return {
      cid: mockCid,
      cdnUrl: `https://ipfs.io/ipfs/${mockCid}`,
      costWei: BigInt(5_000_000_000_000_000),
      dryRun: true,
    };
  }

  const { Synapse } = await import('@filoz/synapse-sdk');
  const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
  const account = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: filecoinCalibration,
    transport: http(process.env.FILECOIN_CALIBRATION_RPC_URL),
  });

  const synapse = Synapse.create({ account, withCDN: true, source: null });
  const result = await synapse.storage.upload(htmlBytes);
  const cid = result.pieceCid.toString();
  const cdnUrl =
    (result as any).url ??
    (result as any).cdnUrl ??
    (result as any).gatewayUrl ??
    `https://ipfs.io/ipfs/${cid}`;

  return {
    cid,
    cdnUrl,
    costWei: BigInt(result.size) * BigInt(5_000_000_000_000),
    dryRun: false,
  };
}
