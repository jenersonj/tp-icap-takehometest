'use client';

import { RealtimeGroup } from '@blotter/contracts';

export default function BlotterPage() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Trade Blotter</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Skeleton page. The grid subscribes to the {Object.values(RealtimeGroup).join(', ')} groups.
      </p>
    </main>
  );
}
