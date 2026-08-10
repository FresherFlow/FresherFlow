/**
 * Tiny disjoint-set / union-find with path-compression and union-by-rank.
 *
 * Used by `DedupHybridService` to merge cluster partitions produced by the
 * sequence of dedup strategies. With both optimisations the amortised cost
 * per `find`/`union` is O(α(N)) — effectively constant for any realistic N.
 *
 * Internal-only — keep allocation-free in the hot loop (no array `push`).
 */
export class UnionFind {
  private readonly parent: Int32Array;
  private readonly rank: Int32Array;

  constructor(size: number) {
    this.parent = new Int32Array(size);
    this.rank = new Int32Array(size);
    for (let i = 0; i < size; i++) this.parent[i] = i;
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];

    // Path compression — point every node on the lookup chain at `root`.
    let node = x;
    while (this.parent[node] !== root) {
      const next = this.parent[node];
      this.parent[node] = root;
      node = next;
    }
    return root;
  }

  /** Merge the sets containing `a` and `b`. Returns `true` iff they differed. */
  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb;
    } else if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra;
    } else {
      this.parent[rb] = ra;
      this.rank[ra]++;
    }
    return true;
  }

  /**
   * Group elements `[0, size)` by their representative. Resulting array
   * contains one inner array per cluster; intra-cluster order matches the
   * input ordering for stability.
   */
  toClusters(): ReadonlyArray<ReadonlyArray<number>> {
    const buckets = new Map<number, number[]>();
    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i);
      const list = buckets.get(root);
      if (list) list.push(i);
      else buckets.set(root, [i]);
    }
    return Array.from(buckets.values());
  }
}
