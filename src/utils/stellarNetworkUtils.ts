/**
 * Utility functions for resolving Stellar network-dependent values
 * based on the checker network configuration (STELLAR_TESTNET or STELLAR_PUBLIC).
 */

export function getSorobanRpcUrl(network: string): string {
  return network === 'STELLAR_PUBLIC'
    ? 'https://stellar-soroban-public.nodies.app'
    : 'https://soroban-testnet.stellar.org';
}

export function getNetworkPassphrase(network: string): string {
  return network === 'STELLAR_PUBLIC'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';
}

export function getExplorerUrl(network: string, hash: string): string {
  const segment = network === 'STELLAR_PUBLIC' ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${segment}/search?term=${hash}`;
}
